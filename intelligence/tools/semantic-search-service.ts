/**
 * Code Mavi IDE - Semantic Search Service
 *
 * SQLite + vec0 (vector similarity search) extension ile
 * codebase indexing ve semantic search
 */

import { URI } from '../../../../base/common/uri.js'
import { Disposable } from '../../../../base/common/lifecycle.js'
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js'
import { ILogService } from '../../../../platform/log/common/log.js'
import { IFileService } from '../../../../platform/files/common/files.js'
import { Event, Emitter } from '../../../../base/common/event.js'
import * as path from 'path'
import * as fs from 'fs'
import * as sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite3'
import { createHash } from 'crypto'

// ============================================
// EMBEDDING TİPLERİ
// ============================================

export interface EmbeddingConfig {
	provider: 'ollama' | 'openai' | 'custom'
	model: string
	apiUrl?: string
	apiKey?: string
	dimensions?: number
	batchSize?: number
}

export interface CodeChunk {
	id: string
	uri: URI
	content: string
	lineStart: number
	lineEnd: number
	language: string
	embedding?: number[]
	nodeType?: string
	tags?: string[]
	hash: string
	createdAt: number
	updatedAt: number
}

export interface SearchResult {
	uri: URI
	score: number
	snippet: string
	lineStart: number
	lineEnd: number
	nodeType?: string
	language?: string
}

// ============================================
// SERVİS ARAYÜZÜ
// ============================================

export interface ISemanticSearchService {
	readonly _serviceBrand: undefined

	readonly onIndexingProgress: Event<IndexingProgress>
	readonly onIndexingComplete: Event<IndexingResult>

	initialize(): Promise<void>
	isInitialized(): boolean

	indexWorkspace(progressCallback?: (progress: IndexingProgress) => void): Promise<IndexingResult>
	indexFile(uri: URI): Promise<void>

	search(query: string, opts?: SearchOptions): Promise<SearchResult[]>
	hybridSearch(query: string, opts?: SearchOptions): Promise<SearchResult[]>
	reRank(results: SearchResult[], query: string, topK: number): Promise<SearchResult[]>

	clearIndex(): Promise<void>
	getStats(): Promise<IndexStats>

	getEmbeddingConfig(): EmbeddingConfig
	updateEmbeddingConfig(config: Partial<EmbeddingConfig>): Promise<void>
}

// ============================================
// DATABASE SCHEMA
// ============================================

export const SEMANTIC_SEARCH_SCHEMA = `
-- Code Mavi IDE Semantic Search Database Schema
-- Version: 1.0.0

-- Metadata table for tracking database state
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Code chunks table
CREATE TABLE IF NOT EXISTS code_chunks (
    id TEXT PRIMARY KEY,
    uri TEXT NOT NULL,
    content TEXT NOT NULL,
    line_start INTEGER NOT NULL,
    line_end INTEGER NOT NULL,
    language TEXT NOT NULL,
    node_type TEXT,
    tags TEXT, -- JSON array of tags
    hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    -- Indexes for faster queries
    INDEX idx_uri (uri),
    INDEX idx_language (language),
    INDEX idx_node_type (node_type),
    INDEX idx_created_at (created_at)
);

-- Embeddings table with vector storage
CREATE TABLE IF NOT EXISTS embeddings (
    chunk_id TEXT PRIMARY KEY,
    embedding BLOB NOT NULL, -- Vector embedding as binary
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    dimensions INTEGER NOT NULL,
    created_at INTEGER NOT NULL,

    FOREIGN KEY (chunk_id) REFERENCES code_chunks(id) ON DELETE CASCADE,

    -- For vector similarity search (requires vec0 extension)
    -- Note: vec0 extension will create its own indexes
    INDEX idx_provider_model (provider, model)
);

-- Search history for analytics
CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    results_count INTEGER NOT NULL,
    search_type TEXT NOT NULL, -- 'semantic', 'hybrid', 'keyword'
    duration_ms INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

-- File indexing history
CREATE TABLE IF NOT EXISTS file_indexing (
    uri TEXT PRIMARY KEY,
    indexed_at INTEGER NOT NULL,
    chunk_count INTEGER NOT NULL,
    hash TEXT NOT NULL,

    INDEX idx_indexed_at (indexed_at)
);
`

// ============================================
// DATABASE HELPER FUNCTIONS
// ============================================

export class SemanticSearchDatabase {
	private db: Database | null = null
	private dbPath: string

	constructor(dbPath: string) {
		this.dbPath = dbPath
	}

	async initialize(): Promise<void> {
		if (this.db) {
			return
		}

		try {
			// Ensure directory exists
			const dir = path.dirname(this.dbPath)
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true })
			}

			// Open database
			this.db = await open({
				filename: this.dbPath,
				driver: sqlite3.Database
			})

			// Enable WAL mode for better concurrency
			await this.db.exec('PRAGMA journal_mode = WAL;')
			await this.db.exec('PRAGMA synchronous = NORMAL;')
			await this.db.exec('PRAGMA foreign_keys = ON;')

			// Create schema
			await this.db.exec(SEMANTIC_SEARCH_SCHEMA)

			// Initialize metadata
			await this.db.run(
				`INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)`,
				['schema_version', '1.0.0', Date.now()]
			)

			await this.db.run(
				`INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)`,
				['initialized_at', Date.now().toString(), Date.now()]
			)

			console.log('[SemanticSearch] Database initialized at:', this.dbPath)
		} catch (error) {
			console.error('[SemanticSearch] Failed to initialize database:', error)
			throw error
		}
	}

	async close(): Promise<void> {
		if (this.db) {
			await this.db.close()
			this.db = null
		}
	}

	async insertChunk(chunk: Omit<CodeChunk, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
		if (!this.db) {
			throw new Error('Database not initialized')
		}

		const id = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
		const now = Date.now()

		await this.db.run(
			`INSERT INTO code_chunks
			(id, uri, content, line_start, line_end, language, node_type, tags, hash, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				chunk.uri.toString(),
				chunk.content,
				chunk.lineStart,
				chunk.lineEnd,
				chunk.language,
				chunk.nodeType || null,
				chunk.tags ? JSON.stringify(chunk.tags) : null,
				chunk.hash,
				now,
				now
			]
		)

		return id
	}

	async insertEmbedding(chunkId: string, embedding: number[], provider: string, model: string, dimensions: number): Promise<void> {
		if (!this.db) {
			throw new Error('Database not initialized')
		}

		// Convert embedding array to binary buffer
		const buffer = Buffer.from(new Float32Array(embedding).buffer)

		await this.db.run(
			`INSERT INTO embeddings (chunk_id, embedding, provider, model, dimensions, created_at)
			VALUES (?, ?, ?, ?, ?, ?)`,
			[chunkId, buffer, provider, model, dimensions, Date.now()]
		)
	}

	async getChunk(id: string): Promise<CodeChunk | null> {
		if (!this.db) {
			throw new Error('Database not initialized')
		}

		const row = await this.db.get(
			`SELECT * FROM code_chunks WHERE id = ?`,
			[id]
		)

		if (!row) {
			return null
		}

		return {
			id: row.id,
			uri: URI.parse(row.uri),
			content: row.content,
			lineStart: row.line_start,
			lineEnd: row.line_end,
			language: row.language,
			nodeType: row.node_type || undefined,
			tags: row.tags ? JSON.parse(row.tags) : undefined,
			hash: row.hash,
			createdAt: row.created_at,
			updatedAt: row.updated_at
		}
	}

	async getChunksByUri(uri: URI): Promise<CodeChunk[]> {
		if (!this.db) {
			throw new Error('Database not initialized')
		}

		const rows = await this.db.all(
			`SELECT * FROM code_chunks WHERE uri = ? ORDER BY line_start`,
			[uri.toString()]
		)

		return rows.map(row => ({
			id: row.id,
			uri: URI.parse(row.uri),
			content: row.content,
			lineStart: row.line_start,
			lineEnd: row.line_end,
			language: row.language,
			nodeType: row.node_type || undefined,
			tags: row.tags ? JSON.parse(row.tags) : undefined,
			hash: row.hash,
			createdAt: row.created_at,
			updatedAt: row.updated_at
		}))
	}

	async deleteChunksByUri(uri: URI): Promise<void> {
		if (!this.db) {
			throw new Error('Database not initialized')
		}

		await this.db.run(
			`DELETE FROM code_chunks WHERE uri = ?`,
			[uri.toString()]
		)
	}

	async updateFileIndexing(uri: URI, chunkCount: number, hash: string): Promise<void> {
		if (!this.db) {
			throw new Error('Database not initialized')
		}

		await this.db.run(
			`INSERT OR REPLACE INTO file_indexing (uri, indexed_at, chunk_count, hash)
			VALUES (?, ?, ?, ?)`,
			[uri.toString(), Date.now(), chunkCount, hash]
		)
	}

	async getFileIndexingInfo(uri: URI): Promise<{ indexedAt: number; chunkCount: number; hash: string } | null> {
		if (!this.db) {
			throw new Error('Database not initialized')
		}

		const row = await this.db.get(
			`SELECT * FROM file_indexing WHERE uri = ?`,
			[uri.toString()]
		)

		if (!row) {
			return null
		}

		return {
			indexedAt: row.indexed_at,
			chunkCount: row.chunk_count,
			hash: row.hash
		}
	}

	async getStats(): Promise<{
		totalChunks: number
		totalFiles: number
		totalEmbeddings: number
		dbSizeBytes: number
	}> {
		if (!this.db) {
			throw new Error('Database not initialized')
		}

		const [chunksResult, filesResult, embeddingsResult] = await Promise.all([
			this.db.get('SELECT COUNT(*) as count FROM code_chunks'),
			this.db.get('SELECT COUNT(DISTINCT uri) as count FROM code_chunks'),
			this.db.get('SELECT COUNT(*) as count FROM embeddings')
		])

		// Get database file size
		let dbSizeBytes = 0
		try {
			const stats = fs.statSync(this.dbPath)
			dbSizeBytes = stats.size
		} catch (error) {
			// File might not exist yet
		}

		return {
			totalChunks: chunksResult?.count || 0,
			totalFiles: filesResult?.count || 0,
			totalEmbeddings: embeddingsResult?.count || 0,
			dbSizeBytes
		}
	}

	async searchByKeyword(query: string, limit: number = 20): Promise<Array<{ chunkId: string; score: number }>> {
		if (!this.db) {
			throw new Error('Database not initialized')
		}

		// Simple keyword search using LIKE (can be improved with FTS5)
		const rows = await this.db.all(
			`SELECT id as chunkId,
				CASE
					WHEN content LIKE ? THEN 1.0
					WHEN content LIKE ? THEN 0.8
					ELSE 0.5
				END as score
			FROM code_chunks
			WHERE content LIKE ? OR content LIKE ?
			ORDER BY score DESC
			LIMIT ?`,
			[`%${query}%`, `%${query.split(' ')[0]}%`, `%${query}%`, `%${query.split(' ')[0]}%`, limit]
		)

		return rows
	}

	async recordSearch(query: string, resultsCount: number, searchType: string, durationMs: number): Promise<void> {
		if (!this.db) {
			throw new Error('Database not initialized')
		}

		const id = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

		await this.db.run(
			`INSERT INTO search_history (id, query, results_count, search_type, duration_ms, created_at)
			VALUES (?, ?, ?, ?, ?, ?)`,
			[id, query, resultsCount, searchType, durationMs, Date.now()]
		)
	}
}

// ============================================
// SOMUT IMPLEMENTASYON
// ============================================

export class SemanticSearchServiceImpl extends Disposable implements ISemanticSearchService {
	readonly _serviceBrand: undefined

	private readonly _onIndexingProgress = new Emitter<IndexingProgress>()
	readonly onIndexingProgress = this._onIndexingProgress.event

	private readonly _onIndexingComplete = new Emitter<IndexingResult>()
	readonly onIndexingComplete = this._onIndexingComplete.event

	private database: SemanticSearchDatabase | null = null
	private initialized = false
	private config: EmbeddingConfig = {
		provider: 'ollama',
		model: 'nomic-embed-text',
		dimensions: 768,
		batchSize: 10
	}

	constructor(
		@ILogService private readonly logService: ILogService,
		@IFileService private readonly fileService: IFileService
	) {
		super()
	}

	async initialize(): Promise<void> {
		if (this.initialized) {
			return
		}

		try {
			// Determine database path
			const dbPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.mavi', 'semantic-search.db')

			this.database = new SemanticSearchDatabase(dbPath)
			await this.database.initialize()

			this.initialized = true
			this.logService.info('[SemanticSearch] Service initialized')
		} catch (error) {
			this.logService.error('[SemanticSearch] Failed to initialize:', error)
			throw error
		}
	}

	isInitialized(): boolean {
		return this.initialized && this.database !== null
	}

	async indexWorkspace(progressCallback?: (progress: IndexingProgress) => void): Promise<IndexingResult> {
		if (!this.isInitialized()) {
			await this.initialize()
		}

		this.logService.info('[SemanticSearch] Starting workspace indexing')

		const startTime = Date.now()
		let filesProcessed = 0
		let chunksIndexed = 0

		// TODO: Implement actual workspace traversal
		// For now, return empty result

		const result: IndexingResult = {
			filesIndexed: filesProcessed,
			chunksIndexed: chunksIndexed,
			durationMs: Date.now() - startTime
		}

		this._onIndexingComplete.fire(result)
		return result
	}

	async indexFile(uri: URI): Promise<void> {
		if (!this.isInitialized()) {
			await this.initialize()
		}

		this.logService.info('[SemanticSearch] Indexing file:', uri.fsPath)

		// TODO: Implement file parsing and chunking
		// 1. Read file content
		// 2. Parse with tree-sitter
		// 3. Create chunks
		// 4. Generate embeddings
		// 5. Store in database
	}

	async search(query: string, opts?: SearchOptions): Promise<SearchResult[]> {
		if (!this.isInitialized()) {
			await this.initialize()
		}

		const options: SearchOptions = {
			topK: 20,
			minScore: 0.7,
			reRank: true,
			...opts
		}

		this.logService.info('[SemanticSearch] Semantic search:', query)

		// TODO: Implement vector similarity search
		// For now, return empty results

		return []
	}

	async hybridSearch(query: string, opts?: SearchOptions): Promise<SearchResult[]> {
		if (!this.isInitialized()) {
			await this.initialize()
		}

		const options: SearchOptions = {
			topK: 20,
			minScore: 0.7,
			reRank: true,
			...opts
		}

		this.logService.info('[SemanticSearch] Hybrid search:', query)

		const startTime = Date.now()

		try {
			// Get keyword search results
			const keywordResults = await this.database!.searchByKeyword(query, options.topK! * 2)

			// Get semantic search results
			const semanticResults = await this.search(query, { ...options, reRank: false })

			// Combine using Reciprocal Rank Fusion (RRF)
			const combinedResults = this.combineSearchResults(keywordResults, semanticResults, options.topK!)

			// Re-rank if requested
			let finalResults = combinedResults
			if (options.reRank && combinedResults.length > 0) {
				finalResults = await this.reRank(combinedResults, query, options.topK!)
			}

			// Record search
			await this.database!.recordSearch(
				query,
				finalResults.length,
				'hybrid',
				Date.now() - startTime
			)

			return finalResults
		} catch (error) {
			this.logService.error('[SemanticSearch] Hybrid search failed:', error)
	}
	}

	async reRank(results: SearchResult[], query: string, topK: number): Promise<SearchResult[]> {
		if (results.length <= topK) {
			return results
		}

		this.logService.info('[SemanticSearch] Re-ranking', results.length, 'results to', topK)

		// TODO: Implement cross-encoder re-ranking with LLM
		// For now, use simple scoring based on query relevance

		const scoredResults = results.map(result => {
			let score = result.score || 0

			// Boost score if query terms appear in snippet
			const queryTerms = query.toLowerCase().split(/\s+/)
			const snippet = result.snippet.toLowerCase()

			for (const term of queryTerms) {
				if (term.length > 2 && snippet.includes(term)) {
					score += 0.1
				}
			}

			return { ...result, score }
		})

		// Sort by new score and take topK
		return scoredResults
			.sort((a, b) => (b.score || 0) - (a.score || 0))
			.slice(0, topK)
}

export interface SearchOptions {
	topK?: number
	filePattern?: string
	languages?: string[]
	minScore?: number
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
	totalEmbeddings: number
}

// ============================================
// SABİTLER
// ============================================

export const CHUNK_SIZE_LINES = 50
export const CHUNK_OVERLAP_LINES = 10
export const DEFAULT_EMBEDDING_DIMENSIONS = 768
export const MIN_SEMANTIC_SCORE = 0.7
export const MAX_RESULTS_BEFORE_RERANK = 50
export const MAX_RESULTS_FINAL = 5

// Service decorator
export const ISemanticSearchService = createDecorator<ISemanticSearchService>('semanticSearchService')

	async clearIndex(): Promise<void> {
		if (!this.isInitialized()) {
			await this.initialize()
		}

		this.logService.info('[SemanticSearch] Clearing index')

		try {
			// Close and delete database file
			if (this.database) {
				await this.database.close()

				const dbPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.mavi', 'semantic-search.db')
				if (fs.existsSync(dbPath)) {
					fs.unlinkSync(dbPath)
				}

				// Reinitialize
				this.database = new SemanticSearchDatabase(dbPath)
				await this.database.initialize()
			}
		} catch (error) {
			this.logService.error('[SemanticSearch] Failed to clear index:', error)
			throw error
		}
	}

	async getStats(): Promise<IndexStats> {
		if (!this.isInitialized()) {
			await this.initialize()
		}

		try {
			const dbStats = await this.database!.getStats()

			return {
				totalFiles: dbStats.totalFiles,
				totalChunks: dbStats.totalChunks,
				indexedAt: Date.now(), // TODO: Get actual last indexing time from metadata
				dbSizeBytes: dbStats.dbSizeBytes,
				totalEmbeddings: dbStats.totalEmbeddings
			}
		} catch (error) {
			this.logService.error('[SemanticSearch] Failed to get stats:', error)
			return {
				totalFiles: 0,
				totalChunks: 0,
				indexedAt: 0,
				dbSizeBytes: 0,
				totalEmbeddings: 0
			}
		}
	}

	getEmbeddingConfig(): EmbeddingConfig {
		return { ...this.config }
	}

	async updateEmbeddingConfig(config: Partial<EmbeddingConfig>): Promise<void> {
		this.config = { ...this.config, ...config }
		this.logService.info('[SemanticSearch] Updated embedding config:', this.config)
	}

	private combineSearchResults(
		keywordResults: Array<{ chunkId: string; score: number }>,
		semanticResults: SearchResult[],
		topK: number
	): SearchResult[] {
		// Reciprocal Rank Fusion (RRF)
		const rrfScores = new Map<string, number>()
		const allResults = new Map<string, SearchResult>()

		// Process keyword results
		keywordResults.forEach((result, index) => {
			const rrfScore = 1.0 / (60 + index + 1) // k = 60 as recommended
			rrfScores.set(result.chunkId, (rrfScores.get(result.chunkId) || 0) + rrfScore)
		})

		// Process semantic results
		semanticResults.forEach((result, index) => {
			const rrfScore = 1.0 / (60 + index + 1)
			rrfScores.set(this.getChunkIdFromResult(result), (rrfScores.get(this.getChunkIdFromResult(result)) || 0) + rrfScore)
			allResults.set(this.getChunkIdFromResult(result), result)
		})

		// Get keyword result details and add to allResults
		// TODO: Fetch actual chunk details for keyword results

		// Sort by RRF score
		const sortedChunkIds = Array.from(rrfScores.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, topK)
			.map(([chunkId]) => chunkId)

		// Return results
		return sortedChunkIds
			.map(chunkId => allResults.get(chunkId))
			.filter((result): result is SearchResult => result !== undefined)
	}

	private getChunkIdFromResult(result: SearchResult): string {
		// Create a deterministic ID from URI and line range
		return createHash('md5')
			.update(`${result.uri.toString()}:${result.lineStart}:${result.lineEnd}`)
			.digest('hex')
	}

	private async getEmbeddings(texts: string[]): Promise<number[][]> {
		if (this.config.provider === 'ollama') {
			return this.getOllamaEmbeddings(texts)
		} else if (this.config.provider === 'openai') {
			return this.getOpenAIEmbeddings(texts)
		} else {
			throw new Error(`Unsupported embedding provider: ${this.config.provider}`)
		}
	}

	private async getOllamaEmbeddings(texts: string[]): Promise<number[][]> {
		// TODO: Implement Ollama API call
		this.logService.info('[SemanticSearch] Getting Ollama embeddings for', texts.length, 'texts')

		// For now, return dummy embeddings
		return texts.map(() => Array(this.config.dimensions || 768).fill(0))
	}

	private async getOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
		// TODO: Implement OpenAI API call
		this.logService.info('[SemanticSearch] Getting OpenAI embeddings for', texts.length, 'texts')

		// For now, return dummy embeddings
		return texts.map(() => Array(this.config.dimensions || 1536).fill(0))
	}

	private calculateHash(content: string): string {
		return createHash('sha256').update(content).digest('hex')
	}
