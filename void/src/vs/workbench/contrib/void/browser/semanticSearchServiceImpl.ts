/**
 * Code Mavi - Semantic Search Service (Browser Implementation)
 * 
 * Browser process'te çalışan semantic search implementasyonu.
 * Main process'e IPC ile DB işlemleri için istek atar.
 */

import { URI } from '../../../../base/common/uri.js'
import { IDisposable, Disposable } from '../../../../base/common/lifecycle.js'
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js'
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js'
import { IFileService } from '../../../../platform/files/common/files.js'
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js'
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js'

import { SemanticSearchService } from '../common/semanticSearchService.js'
import { ISemanticSearchService, IEmbeddingConfig, ISearchResult, ISearchOptions, IIndexingProgress, IIndexingResult, IIndexStats, MAX_RESULTS_BEFORE_RERANK, MAX_RESULTS_FINAL } from '../common/semanticSearchTypes.js'

import { IVoidSettingsService } from '../common/voidSettingsService.js'
import { CancellationToken } from '../../../../base/common/cancellation.js'
import { timeout } from '../../../../base/common/async.js'

// ============================================
// EMBEDDING PROVIDER INTERFACE
// ============================================

interface IEmbeddingProvider {
	embed(texts: string[]): Promise<number[][]>
	getDimensions(): number
}

// ============================================
// OLLAMA EMBEDDING PROVIDER
// ============================================

class OllamaEmbeddingProvider implements IEmbeddingProvider {
	private _apiUrl: string
	private _model: string
	private _dimensions: number
	
	constructor(config: IEmbeddingConfig) {
		this._apiUrl = config.apiUrl || 'http://localhost:11434'
		this._model = config.model
		this._dimensions = config.dimensions
	}
	
	async embed(texts: string[]): Promise<number[][]> {
		const embeddings: number[][] = []
		
		// Ollama rate limiting için tek tek gönder
		for (const text of texts) {
			try {
				const response = await fetch(`${this._apiUrl}/api/embeddings`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						model: this._model,
						prompt: text.slice(0, 8000) // Token limit
					})
				})
				
				if (!response.ok) {
					throw new Error(`Ollama error: ${response.status}`)
				}
				
				const data = await response.json()
				embeddings.push(data.embedding)
				
				// Rate limiting
				await timeout(100)
			} catch (e) {
				console.error('Ollama embedding error:', e)
				// Fallback: zero vector
				embeddings.push(new Array(this._dimensions).fill(0))
			}
		}
		
		return embeddings
	}
	
	getDimensions(): number {
		return this._dimensions
	}
}

// ============================================
// OPENAI EMBEDDING PROVIDER
// ============================================

class OpenAIEmbeddingProvider implements IEmbeddingProvider {
	private _apiKey: string
	private _model: string
	private _dimensions: number
	
	constructor(config: IEmbeddingConfig) {
		this._apiKey = config.apiKey || ''
		this._model = config.model
		this._dimensions = config.dimensions
	}
	
	async embed(texts: string[]): Promise<number[][]> {
		try {
			const response = await fetch('https://api.openai.com/v1/embeddings', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this._apiKey}`
				},
				body: JSON.stringify({
					model: this._model,
					input: texts.map(t => t.slice(0, 8000)),
					dimensions: this._dimensions
				})
			})
			
			if (!response.ok) {
				throw new Error(`OpenAI error: ${response.status}`)
			}
			
			const data = await response.json()
			return data.data.map((d: any) => d.embedding)
		} catch (e) {
			console.error('OpenAI embedding error:', e)
			return texts.map(() => new Array(this._dimensions).fill(0))
		}
	}
	
	getDimensions(): number {
		return this._dimensions
	}
}

// ============================================
// BROWSER IMPLEMENTATION
// ============================================

import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js'
import { IChannel } from '../../../../base/parts/ipc/common/ipc.js'

// =...
class SemanticSearchServiceImpl extends SemanticSearchService implements IDisposable {
	private _embeddingProvider?: IEmbeddingProvider
	private _voidSettingsService: IVoidSettingsService
	private _fileService: IFileService
	private _workspaceService: IWorkspaceContextService
	private _envService: IEnvironmentService
	private _channel: IChannel
	
	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@IVoidSettingsService voidSettingsService: IVoidSettingsService,
		@IFileService fileService: IFileService,
		@IWorkspaceContextService workspaceService: IWorkspaceContextService,
		@IEnvironmentService envService: IEnvironmentService,
		@IMainProcessService private readonly _mainProcessService: IMainProcessService
	) {
		super()
		this._voidSettingsService = voidSettingsService
		this._fileService = fileService
		this._workspaceService = workspaceService
		this._envService = envService
		this._channel = this._mainProcessService.getChannel('void-channel-semanticSearch')
		
		this._initFromSettings()
	}
	
	private _initFromSettings(): void {
		const settings = this._voidSettingsService.state.settingsOfProvider
		// TODO: Settings'ten embedding config oku
		this._config = {
			provider: 'ollama',
			model: 'nomic-embed-text',
			dimensions: 768
		}
		this._updateProvider()
		this._channel.call('initialize', this._config).catch(err => console.error('Failed to init semantic search DB:', err))
	}
	
	private _updateProvider(): void {
		switch (this._config.provider) {
			case 'ollama':
				this._embeddingProvider = new OllamaEmbeddingProvider(this._config)
				break
			case 'openai':
				this._embeddingProvider = new OpenAIEmbeddingProvider(this._config)
				break
			default:
				this._embeddingProvider = new OllamaEmbeddingProvider(this._config)
			}
	}
	
	setConfig(config: IEmbeddingConfig): void {
		this._config = config
		this._updateProvider()
		this._channel.call('initialize', config)
	}
	
	async indexWorkspace(
		progressCallback?: (progress: IIndexingProgress) => void
	): Promise<IIndexingResult> {
		if (this._isIndexing) {
			throw new Error('Indexing already in progress')
		}
		
		this._isIndexing = true
		const startTime = Date.now()
		
		try {
			const workspaceFolders = this._workspaceService.getWorkspace().folders
			const filesToIndex: URI[] = []
			
			for (const folder of workspaceFolders) {
				await this._collectFiles(folder.uri, filesToIndex)
			}
			
			let chunksIndexed = 0
			const batchSize = 5
			
			for (let i = 0; i < filesToIndex.length; i += batchSize) {
				const batch = filesToIndex.slice(i, i + batchSize)
				
				if (progressCallback) {
					progressCallback({
						filesProcessed: i,
						filesTotal: filesToIndex.length,
						currentFile: batch[0],
						chunksIndexed
					})
				}
				
				await this._indexBatch(batch)
				chunksIndexed += batch.length
			}
			
			return {
				filesIndexed: filesToIndex.length,
				chunksIndexed,
				durationMs: Date.now() - startTime
			}
		} finally {
			this._isIndexing = false
		}
	}
	
	private async _collectFiles(uri: URI, files: URI[]): Promise<void> {
		const children = await this._fileService.resolve(uri)
		if (children.children) {
			for (const child of children.children) {
				if (child.isDirectory) {
					// .git, node_modules gibi yerleri atla
					if (child.name === '.git' || child.name === 'node_modules' || child.name === 'out' || child.name === 'dist') continue
					await this._collectFiles(child.resource, files)
				} else {
					const ext = child.name.split('.').pop()?.toLowerCase()
					const supported = ['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h', 'md']
					if (ext && supported.includes(ext)) {
						files.push(child.resource)
					}
				}
			}
		}
	}
	
	private async _indexBatch(uris: URI[]): Promise<void> {
		const allChunks: ICodeChunk[] = []
		
		for (const uri of uris) {
			try {
				const content = await this._fileService.readFile(uri)
				const text = content.value.toString()
				const language = uri.fsPath.split('.').pop() || 'text'
				const chunks = this._chunkFile(uri, text, language)
				allChunks.push(...chunks)
			} catch (e) {
				console.error(`Failed to read file for indexing: ${uri.toString()}`, e)
			}
		}
		
		if (allChunks.length === 0) return

		// Embeddings üret (ollama/openai)
		if (this._embeddingProvider) {
			const texts = allChunks.map(c => `File: ${c.uri.fsPath}\nContent:\n${c.content}`)
			const embeddings = await this._embeddingProvider.embed(texts)
			for (let i = 0; i < allChunks.length; i++) {
				allChunks[i].embedding = embeddings[i]
			}
		}
		
		// Main process'e gönder
		await this._channel.call('insertChunks', allChunks)
	}
	
	async indexFile(uri: URI): Promise<void> {
		await this._channel.call('deleteFileIndices', uri)
		await this._indexBatch([uri])
	}
	
	async search(query: string, opts?: ISearchOptions): Promise<ISearchResult[]> {
		if (!this._embeddingProvider) return []
		
		const [queryEmbedding] = await this._embeddingProvider.embed([query])
		return await this._channel.call('search', { embedding: queryEmbedding, opts })
	}
	
	async hybridSearch(query: string, opts?: ISearchOptions): Promise<ISearchResult[]> {
		return this.search(query, opts)
	}
	
	async reRank(results: ISearchResult[], query: string, topK: number): Promise<ISearchResult[]> {
		return results.slice(0, topK)
	}
	
	async clearIndex(): Promise<void> {
		await this._channel.call('clearAllIndices')
	}
	
	async getStats(): Promise<IIndexStats> {
		return await this._channel.call('getStats')
	}
}

// ============================================
// REGISTRATION
// ============================================

registerSingleton(ISemanticSearchService, SemanticSearchServiceImpl, InstantiationType.Delayed)