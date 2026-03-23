/**
 * Code Mavi - Semantic Search Types
 * 
 * SQLite + vec0 extension ile codebase indexing ve search
 */

import { URI } from '../../../../base/common/uri.js'
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js'

export const ISemanticSearchService = createDecorator<ISemanticSearchService>('semanticSearchService')

// ============================================
// EMBEDDING CONFIG
// ============================================

export interface IEmbeddingConfig {
	/** Varsayılan: 'ollama' */
	provider: 'ollama' | 'openai' | 'custom'
	
	/** Ollama: 'nomic-embed-text', OpenAI: 'text-embedding-3-small' */
	model: string
	
	/** Özel API URL */
	apiUrl?: string
	
	/** API key (cloud için) */
	apiKey?: string
	
	/** Embedding boyutu */
	dimensions: number
}

export const DEFAULT_EMBEDDING_CONFIG: IEmbeddingConfig = {
	provider: 'ollama',
	model: 'nomic-embed-text',
	dimensions: 768
}

// ============================================
// CODE CHUNK
// ============================================

export interface ICodeChunk {
	id: string
	uri: URI
	content: string
	lineStart: number
	lineEnd: number
	language: string
	embedding?: number[]
	nodeType?: string
	tags?: string[]
}

// ============================================
// SEARCH RESULTS
// ============================================

export interface ISearchResult {
	uri: URI
	score: number
	snippet: string
	lineStart: number
	lineEnd: number
	nodeType?: string
}

export interface ISearchOptions {
	/** Kaç sonuç (varsayılan: 20) */
	topK?: number
	
	/** Dosya pattern */
	filePattern?: string
	
	/** Diller */
	languages?: string[]
	
	/** Min score (0-1) */
	minScore?: number
	
	/** Re-rank yapılsın mı */
	reRank?: boolean
}

// ============================================
// INDEXING
// ============================================

export interface IIndexingProgress {
	filesProcessed: number
	filesTotal: number
	currentFile?: URI
	chunksIndexed: number
}

export interface IIndexingResult {
	filesIndexed: number
	chunksIndexed: number
	durationMs: number
}

export interface IIndexStats {
	totalFiles: number
	totalChunks: number
	indexedAt: number
	dbSizeBytes: number
}

// ============================================
// SERVICE INTERFACE
// ============================================

export interface ISemanticSearchService {
	readonly _serviceBrand: undefined
	
	/** Config'i ayarla */
	setConfig(config: IEmbeddingConfig): void
	
	/** Workspace'i indexle */
	indexWorkspace(
		progressCallback?: (progress: IIndexingProgress) => void
	): Promise<IIndexingResult>
	
	/** Tek dosyayı indexle */
	indexFile(uri: URI): Promise<void>
	
	/** Semantic search */
	search(
		query: string,
		opts?: ISearchOptions
	): Promise<ISearchResult[]>
	
	/** Hibrit search */
	hybridSearch(
		query: string,
		opts?: ISearchOptions
	): Promise<ISearchResult[]>
	
	/** Re-rank */
	reRank(
		results: ISearchResult[],
		query: string,
		topK: number
	): Promise<ISearchResult[]>
	
	/** Index'i temizle */
	clearIndex(): Promise<void>
	
	/** İstatistikler */
	getStats(): Promise<IIndexStats>
}

// ============================================
// CONSTANTS
// ============================================

export const CHUNK_SIZE_LINES = 50
export const CHUNK_OVERLAP_LINES = 10
export const MIN_SEMANTIC_SCORE = 0.7
export const MAX_RESULTS_BEFORE_RERANK = 50
export const MAX_RESULTS_FINAL = 5
export const DB_NAME = 'codemavi-semantic.db'