/**
 * Code Mavi - Semantic Search Main Service
 * 
 * SQLite + vec0 (fallback: JS Cosine Similarity) ile vektör veritabanı yönetimi (Main Process)
 */

import { IDisposable, Disposable } from '../../../../base/common/lifecycle.js'
import { URI } from '../../../../base/common/uri.js'
import { IFileService } from '../../../../platform/files/common/files.js'
import { ILogService } from '../../../../platform/log/common/log.js'
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js'
import { ICodeChunk, IEmbeddingConfig, IIndexStats, ISearchOptions, ISearchResult, DB_NAME } from '../common/semanticSearchTypes.js'
import { join } from '../../../../base/common/path.js'
import * as fs from 'fs'

export interface ISemanticSearchMainService extends IDisposable {
	readonly _serviceBrand: undefined
	initialize(config: IEmbeddingConfig): Promise<void>
	insertChunks(chunks: ICodeChunk[]): Promise<void>
	search(queryEmbedding: number[], opts?: ISearchOptions): Promise<ISearchResult[]>
	deleteFileIndices(uri: URI): Promise<void>
	clearAllIndices(): Promise<void>
	getStats(): Promise<IIndexStats>
}

export class SemanticSearchMainService extends Disposable implements ISemanticSearchMainService {
	readonly _serviceBrand: undefined
	
	private _db: any 
	private _dbPath: string
	private _initialized: boolean = false
	
	constructor(
		@IEnvironmentService private readonly _envService: IEnvironmentService,
		@ILogService private readonly _logService: ILogService,
		@IFileService private readonly _fileService: IFileService
	) {
		super()
		this._dbPath = join(this._envService.userDataPath, DB_NAME)
	}
	
	async initialize(config: IEmbeddingConfig): Promise<void> {
		if (this._initialized) return
		
		try {
			const sqlite3 = await import('@vscode/sqlite3')
			
			return new Promise((resolve, reject) => {
				this._db = new sqlite3.default.Database(this._dbPath, async (err) => {
					if (err) return reject(err)
					
					try {
						await this._setupTables()
						this._initialized = true
						resolve()
					} catch (setupErr) {
						reject(setupErr)
					}
				})
			})
		} catch (e) {
			this._logService.error(`[Code Mavi] Failed to load sqlite3: ${e}`)
			throw e
		}
	}
	
	private async _setupTables(): Promise<void> {
		return new Promise((resolve, reject) => {
			this._db.serialize(() => {
				this._db.run(`
					CREATE TABLE IF NOT EXISTS chunks (
						id TEXT PRIMARY KEY,
						uri TEXT,
						content TEXT,
						line_start INTEGER,
						line_end INTEGER,
						language TEXT,
						node_type TEXT,
						tags TEXT,
						embedding BLOB
					)
				`)
				this._db.run(`CREATE INDEX IF NOT EXISTS idx_chunks_uri ON chunks(uri)`)
				resolve()
			})
		})
	}
	
	async insertChunks(chunks: ICodeChunk[]): Promise<void> {
		if (!this._initialized) throw new Error('DB not initialized')
		
		return new Promise((resolve, reject) => {
			const stmt = this._db.prepare(`
				INSERT OR REPLACE INTO chunks (id, uri, content, line_start, line_end, language, node_type, tags, embedding)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`)
			
			this._db.serialize(() => {
				this._db.run('BEGIN TRANSACTION')
				for (const chunk of chunks) {
					const embeddingBuffer = chunk.embedding ? Buffer.from(new Float32Array(chunk.embedding).buffer) : null
					stmt.run(
						chunk.id,
						chunk.uri.toString(),
						chunk.content,
						chunk.lineStart,
						chunk.lineEnd,
						chunk.language,
						chunk.nodeType || '',
						JSON.stringify(chunk.tags || []),
						embeddingBuffer
					)
				}
				this._db.run('COMMIT', (err: any) => {
					if (err) reject(err)
					else resolve()
				})
			})
		})
	}
	
	async search(queryEmbedding: number[], opts?: ISearchOptions): Promise<ISearchResult[]> {
		if (!this._initialized) throw new Error('DB not initialized')
		
		const topK = opts?.topK || 20
		const minScore = opts?.minScore || 0.5
		
		return new Promise((resolve, reject) => {
			this._db.all('SELECT uri, content, line_start, line_end, node_type, embedding FROM chunks', (err: any, rows: any[]) => {
				if (err) return reject(err)
				
				const results: ISearchResult[] = []
				
				for (const row of rows) {
					if (!row.embedding) continue
					
					const chunkEmbedding = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4)
					const score = this._cosineSimilarity(queryEmbedding, Array.from(chunkEmbedding))
					
					if (score >= minScore) {
						results.push({
							uri: URI.parse(row.uri),
							score,
							snippet: row.content,
							lineStart: row.line_start,
							lineEnd: row.line_end,
							nodeType: row.node_type
						})
					}
				}
				
				// Skora göre sırala ve topK döndür
				results.sort((a, b) => b.score - a.score)
				resolve(results.slice(0, topK))
			})
		})
	}
	
	private _cosineSimilarity(v1: number[], v2: number[]): number {
		let dotProduct = 0
		let mag1 = 0
		let mag2 = 0
		for (let i = 0; i < v1.length; i++) {
			dotProduct += v1[i] * v2[i]
			mag1 += v1[i] * v1[i]
			mag2 += v2[i] * v2[i]
		}
		return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2))
	}
	
	async deleteFileIndices(uri: URI): Promise<void> {
		return new Promise((resolve, reject) => {
			this._db.run('DELETE FROM chunks WHERE uri = ?', uri.toString(), (err: any) => {
				if (err) reject(err)
				else resolve()
			})
		})
	}
	
	async clearAllIndices(): Promise<void> {
		return new Promise((resolve, reject) => {
			this._db.run('DELETE FROM chunks', (err: any) => {
				if (err) reject(err)
				else resolve()
			})
		})
	}
	
	async getStats(): Promise<IIndexStats> {
		return new Promise((resolve, reject) => {
			this._db.get('SELECT count(*) as total FROM chunks', (err: any, row: any) => {
				if (err) reject(err)
				else {
					resolve({
						totalFiles: 0, 
						totalChunks: row.total,
						indexedAt: Date.now(),
						dbSizeBytes: fs.statSync(this._dbPath).size
					})
				}
			})
		})
	}
}
