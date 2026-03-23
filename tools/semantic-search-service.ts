/**
 * Code Mavi - Semantic Search Service
 * 
 * SQLite + vec0 (vector similarity search) extension ile
 * codebase indexing ve semantic search
 */

import { URI } from '../../../../base/common/uri.js'

// ============================================
// EMBEDDING TİPLERİ
// ============================================

export interface EmbeddingConfig {
	/** Varsayılan: 'ollama' */
	provider: 'ollama' | 'openai' | 'custom'
	
	/** Ollama için: 'nomic-embed-text' (varsayılan) */
	/** OpenAI için: 'text-embedding-3-small' (varsayılan) */
	model: string
	
	/** Özel API URL (opsiyonel) */
	apiUrl?: string
	
	/** API key (cloud provider'lar için) */
	apiKey?: string
	
	/** Embedding boyutu (model'e göre otomatik) */
	dimensions?: number
}

export interface CodeChunk {
	id: string
	uri: URI
	content: string
	lineStart: number
	lineEnd: number
	language: string
	embedding?: number[]
	
	/** AST node tipi (function, class, import, vb.) */
	nodeType?: string
	
	/** Semantic etiketler */
	tags?: string[]
}

export interface SearchResult {
	uri: URI
	score: number
	snippet: string
	lineStart: number
	lineEnd: number
	nodeType?: string
}

// ============================================
// SQLITE VEC ŞEMA
// ============================================

/**
 * CREATE TABLE embeddings (
 *   id TEXT PRIMARY KEY,
 *   uri TEXT NOT NULL,
 *   content TEXT NOT NULL,
 *   line_start INTEGER NOT NULL,
 *   line_end INTEGER NOT NULL,
 *   language TEXT NOT NULL,
 *   node_type TEXT,
 *   tags TEXT, -- JSON array
 *   embedding F32_BLOB(768) -- model'e göre değişir
 * );
 * 
 * CREATE INDEX idx_uri ON embeddings(uri);
 * CREATE INDEX idx_language ON embeddings(language);
 * CREATE INDEX idx_node_type ON embeddings(node_type);
 * 
 * CREATE VIRTUAL TABLE vec_embeddings USING vec0(
 *   embedding float[768]
 * );
 */

// ============================================
// SERVİS ARAYÜZÜ
// ============================================

export interface ISemanticSearchService {
	readonly _serviceBrand: undefined

	/**
	 * Workspace'i indexle (tree-sitter + embedding)
	 */
	indexWorkspace(
		progressCallback?: (progress: IndexingProgress) => void
	): Promise<IndexingResult>

	/**
	 * Tek dosyayı indexle
	 */
	indexFile(uri: URI): Promise<void>

	/**
	 * Semantic search yap
	 */
	search(
		query: string,
		opts: SearchOptions
	): Promise<SearchResult[]>

	/**
	 * Hibrit search: semantic + text search
	 */
	hybridSearch(
		query: string,
		opts: SearchOptions
	): Promise<SearchResult[]>

	/**
	 * Re-rank sonuçları (ucuz model ile)
	 */
	reRank(
		results: SearchResult[],
		query: string,
		topK: number
	): Promise<SearchResult[]>

	/**
	 * Index'i temizle
	 */
	clearIndex(): Promise<void>

	/**
	 * Index istatistikleri
	 */
	getStats(): Promise<IndexStats>
}

export interface SearchOptions {
	/** Kaç sonuç döndürülsün (varsayılan: 20) */
	topK?: number
	
	/** Sadece bu dosya uzantılarında ara */
	filePattern?: string
	
	/** Sadece bu dillerde ara */
	languages?: string[]
	
	/** Semantic score eşiği (0-1) */
	minScore?: number
	
	/** Re-rank yapılsın mı? */
	reRank?: boolean
}

export interface IndexingProgress {
	filesProcessed: number
	filesTotal: number
	currentFile?: URI
	chunksIndexed: number
}

export interface IndexingResult {
	filesIndexed: number
	chunksIndexed: number
	durationMs: number
}

export interface IndexStats {
	totalFiles: number
	totalChunks: number
	indexedAt: number
	dbSizeBytes: number
}

// ============================================
// SABİTLER
// ============================================

/** Chunk boyutu (satır) */
export const CHUNK_SIZE_LINES = 50

/** Chunk overlap (satır) */
export const CHUNK_OVERLAP_LINES = 10

/** Varsayılan embedding boyutu (nomic-embed-text) */
export const DEFAULT_EMBEDDING_DIMENSIONS = 768

/** Minimum semantic score */
export const MIN_SEMANTIC_SCORE = 0.7

/** Re-rank öncesi max sonuç */
export const MAX_RESULTS_BEFORE_RERANK = 50

/** Final max sonuç */
export const MAX_RESULTS_FINAL = 5