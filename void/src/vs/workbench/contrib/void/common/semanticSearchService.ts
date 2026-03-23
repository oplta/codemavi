/**
 * Code Mavi - Semantic Search Service
 * 
 * SQLite + vec0 extension ile codebase indexing ve search
 * Common layer - hem browser hem main process'te kullanılabilir
 */

import { URI } from '../../../../base/common/uri.js'
import { IDisposable } from '../../../../base/common/lifecycle.js'
import { ISemanticSearchService, IEmbeddingConfig, ICodeChunk, ISearchResult, ISearchOptions, IIndexingProgress, IIndexingResult, IIndexStats, DEFAULT_EMBEDDING_CONFIG, CHUNK_SIZE_LINES, CHUNK_OVERLAP_LINES, MIN_SEMANTIC_SCORE, MAX_RESULTS_BEFORE_RERANK, MAX_RESULTS_FINAL } from './semanticSearchTypes.js'
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js'

// ============================================
// ABSTRACT SERVICE - PLATFORM SPECIFIC IMPLEMENTATION REQUIRED
// ============================================

export abstract class SemanticSearchService implements ISemanticSearchService, IDisposable {
	readonly _serviceBrand: undefined
	
	protected _config: IEmbeddingConfig = DEFAULT_EMBEDDING_CONFIG
	protected _isIndexing: boolean = false
	protected _disposables: IDisposable[] = []
	
	// Platform-specific implementations must override these
	abstract setConfig(config: IEmbeddingConfig): void
	abstract indexWorkspace(progressCallback?: (progress: IIndexingProgress) => void): Promise<IIndexingResult>
	abstract indexFile(uri: URI): Promise<void>
	abstract search(query: string, opts?: ISearchOptions): Promise<ISearchResult[]>
	abstract hybridSearch(query: string, opts?: ISearchOptions): Promise<ISearchResult[]>
	abstract reRank(results: ISearchResult[], query: string, topK: number): Promise<ISearchResult[]>
	abstract clearIndex(): Promise<void>
	abstract getStats(): Promise<IIndexStats>
	
	dispose(): void {
		this._disposables.forEach(d => d.dispose())
		this._disposables = []
	}
	
	/**
	 * Dosyayı chunk'lara böl
	 */
	protected _chunkFile(uri: URI, content: string, language: string): ICodeChunk[] {
		const lines = content.split('\n')
		const chunks: ICodeChunk[] = []
		
		let lineNum = 0
		let chunkIndex = 0
		
		while (lineNum < lines.length) {
			const endLine = Math.min(lineNum + CHUNK_SIZE_LINES, lines.length)
			const chunkLines = lines.slice(lineNum, endLine)
			
			// AST node tipi tespiti (basit regex ile)
			const nodeType = this._detectNodeType(chunkLines.join('\n'), language)
			
			chunks.push({
				id: `${uri.toString()}-${chunkIndex}`,
				uri,
				content: chunkLines.join('\n'),
				lineStart: lineNum + 1,
				lineEnd: endLine,
				language,
				nodeType,
				tags: this._extractTags(chunkLines.join('\n'), language)
			})
			
			lineNum += CHUNK_SIZE_LINES - CHUNK_OVERLAP_LINES
			chunkIndex++
		}
		
		return chunks
	}
	
	/**
	 * Basit node tipi tespiti
	 */
	private _detectNodeType(content: string, language: string): string | undefined {
		const patterns: Record<string, Array<{ type: string; regex: RegExp }>> = {
			typescript: [
				{ type: 'function', regex: /(?:async\s+)?function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/ },
				{ type: 'class', regex: /class\s+\w+/ },
				{ type: 'interface', regex: /interface\s+\w+/ },
				{ type: 'import', regex: /import\s+.*?from\s+['"]/ },
			],
			javascript: [
				{ type: 'function', regex: /(?:async\s+)?function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/ },
				{ type: 'class', regex: /class\s+\w+/ },
				{ type: 'import', regex: /import\s+.*?from\s+['"]/ },
			],
			rust: [
				{ type: 'function', regex: /fn\s+\w+|impl.*\{.*fn\s+\w+/s },
				{ type: 'struct', regex: /struct\s+\w+/ },
				{ type: 'trait', regex: /trait\s+\w+/ },
				{ type: 'use', regex: /use\s+\w+/ },
			],
			python: [
				{ type: 'function', regex: /def\s+\w+\s*\(/ },
				{ type: 'class', regex: /class\s+\w+/ },
				{ type: 'import', regex: /(?:from|import)\s+\w+/ },
			],
		}
		
		const langPatterns = patterns[language] || []
		for (const { type, regex } of langPatterns) {
			if (regex.test(content)) {
				return type
			}
		}
		
		return undefined
	}
	
	/**
	 * Etiketleri çıkar
	 */
	private _extractTags(content: string, language: string): string[] {
		const tags: string[] = []
		
		// TODO/TODO/FIXME gibi etiketler
		const todoMatches = content.match(/(?:TODO|FIXME|HACK|XXX|NOTE)[\s:]*/gi)
		if (todoMatches) {
			tags.push(...todoMatches.map(t => t.toLowerCase().trim()))
		}
		
		// JSDoc/Javadoc docstring'ler
		if (content.includes('/**') || content.includes('"""') || content.includes("'''")) {
			tags.push('documented')
		}
		
		// Public API işaretleri
		if (content.includes('export ') || content.includes('pub ')) {
			tags.push('public')
		}
		
		return [...new Set(tags)]
	}
}

// ============================================
// REGISTRATION
// ============================================

// Platform-specific implementation will be registered separately
// registerSingleton(ISemanticSearchService, SemanticSearchServiceImpl, InstantiationType.Delayed)