/**
 * Code Mavi IDE - Vector Database Service
 *
 * SQLite + vec0 extension for vector similarity search
 * Stores code embeddings and enables semantic search
 */

import { URI } from '../../../../../../base/common/uri.js';
import Database from 'better-sqlite3';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

export interface EmbeddingRecord {
  id: string;
  uri: string;
  content: string;
  language: string;
  lineStart: number;
  lineEnd: number;
  embedding: number[];
  metadata?: Record<string, any>;
  createdAt: number;
}

export interface SearchResult {
  uri: URI;
  score: number;
  snippet: string;
  lineStart: number;
  lineEnd: number;
  language: string;
  metadata?: Record<string, any>;
}

export interface IndexStats {
  totalChunks: number;
  totalFiles: number;
  totalEmbeddings: number;
  dbSizeBytes: number;
  indexedAt: number;
  languages: Record<string, number>;
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  languageFilter?: string[];
  filePattern?: string;
  includeMetadata?: boolean;
}

export class VectorDBService extends Disposable {
  private db: Database.Database | null = null;
  private dbPath: string;
  private initialized = false;

  constructor(dbPath?: string) {
    super();

    // Determine database path
    if (dbPath) {
      this.dbPath = dbPath;
    } else {
      // Default to user data directory
      const userDataDir = this.getUserDataDir();
      mkdirSync(userDataDir, { recursive: true });
      this.dbPath = join(userDataDir, 'mavi-vectors.db');
    }

    this._register({
      dispose: () => {
        this.close();
      }
    });
  }

  private getUserDataDir(): string {
    // Platform-specific user data directory
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';

    switch (process.platform) {
      case 'darwin':
        return join(homeDir, 'Library', 'Application Support', 'Code Mavi IDE');
      case 'win32':
        return join(process.env.APPDATA || homeDir, 'Code Mavi IDE');
      default:
        return join(homeDir, '.config', 'code-mavi');
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Open or create database
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('foreign_keys = ON');

      // Create tables
      await this.createTables();

      // Load vec0 extension if available
      await this.loadVec0Extension();

      this.initialized = true;
      console.log(`[VectorDBService] Initialized database at ${this.dbPath}`);
    } catch (error) {
      console.error('[VectorDBService] Failed to initialize:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create chunks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_chunks (
        id TEXT PRIMARY KEY,
        uri TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        embedding_json TEXT NOT NULL,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create files table for tracking indexed files
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS indexed_files (
        uri TEXT PRIMARY KEY,
        last_modified INTEGER NOT NULL,
        hash TEXT NOT NULL,
        indexed_at INTEGER NOT NULL,
        chunk_count INTEGER NOT NULL
      );
    `);

    // Create indexes for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chunks_uri ON code_chunks(uri);
      CREATE INDEX IF NOT EXISTS idx_chunks_language ON code_chunks(language);
      CREATE INDEX IF NOT EXISTS idx_chunks_created ON code_chunks(created_at);
      CREATE INDEX IF NOT EXISTS idx_files_indexed ON indexed_files(indexed_at);
    `);
  }

  private async loadVec0Extension(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Try to load vec0 extension
      // Note: vec0 is a SQLite extension for vector similarity search
      // In production, we would need to compile and load the extension
      // For now, we'll implement a fallback using pure SQLite

      console.log('[VectorDBService] vec0 extension not available, using fallback');
    } catch (error) {
      console.warn('[VectorDBService] Failed to load vec0 extension:', error);
      // Continue with fallback implementation
    }
  }

  async storeEmbedding(record: Omit<EmbeddingRecord, 'id' | 'createdAt'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = this.generateChunkId(record.uri, record.lineStart, record.lineEnd);
    const now = Date.now();

    // Convert embedding array to JSON string
    const embeddingJson = JSON.stringify(record.embedding);
    const metadataJson = record.metadata ? JSON.stringify(record.metadata) : null;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO code_chunks
      (id, uri, content, language, line_start, line_end, embedding_json, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      record.uri,
      record.content,
      record.language,
      record.lineStart,
      record.lineEnd,
      embeddingJson,
      metadataJson,
      now,
      now
    );

    return id;
  }

  async storeEmbeddings(records: Omit<EmbeddingRecord, 'id' | 'createdAt'>[]): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const ids: string[] = [];
    const now = Date.now();

    const transaction = this.db.transaction((records: any[]) => {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO code_chunks
        (id, uri, content, language, line_start, line_end, embedding_json, metadata_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const record of records) {
        const id = this.generateChunkId(record.uri, record.lineStart, record.lineEnd);
        const embeddingJson = JSON.stringify(record.embedding);
        const metadataJson = record.metadata ? JSON.stringify(record.metadata) : null;

        stmt.run(
          id,
          record.uri,
          record.content,
          record.language,
          record.lineStart,
          record.lineEnd,
          embeddingJson,
          metadataJson,
          now,
          now
        );

        ids.push(id);
      }
    });

    transaction(records);
    return ids;
  }

  async searchSimilar(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const {
      topK = 10,
      minScore = 0.7,
      languageFilter,
      filePattern,
      includeMetadata = false
    } = options;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (languageFilter && languageFilter.length > 0) {
      const placeholders = languageFilter.map(() => '?').join(', ');
      whereConditions.push(`language IN (${placeholders})`);
      params.push(...languageFilter);
    }

    if (filePattern) {
      whereConditions.push('uri LIKE ?');
      params.push(`%${filePattern}%`);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get all chunks (with fallback since vec0 is not available)
    const query = `
      SELECT
        uri,
        content,
        language,
        line_start,
        line_end,
        embedding_json,
        metadata_json
      FROM code_chunks
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 1000  -- Limit for performance
    `;

    const rows = this.db.prepare(query).all(...params) as any[];

    // Calculate cosine similarity (fallback implementation)
    const results = rows.map(row => {
      const embedding = JSON.parse(row.embedding_json) as number[];
      const score = this.cosineSimilarity(queryEmbedding, embedding);

      return {
        uri: URI.parse(row.uri),
        score,
        snippet: row.content.substring(0, 200), // First 200 chars
        lineStart: row.line_start,
        lineEnd: row.line_end,
        language: row.language,
        metadata: includeMetadata && row.metadata_json
          ? JSON.parse(row.metadata_json)
          : undefined
      };
    });

    // Filter by minimum score and sort
    return results
      .filter(result => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async hybridSearch(
    query: string,
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const {
      topK = 10,
      minScore = 0.5,
      languageFilter,
      filePattern
    } = options;

    // Get semantic search results
    const semanticResults = await this.searchSimilar(queryEmbedding, {
      topK: 50, // Get more results for re-ranking
      minScore: 0.3, // Lower threshold for semantic search
      languageFilter,
      filePattern
    });

    // Get keyword search results
    const keywordResults = await this.keywordSearch(query, {
      topK: 50,
      languageFilter,
      filePattern
    });

    // Combine using Reciprocal Rank Fusion (RRF)
    const combinedResults = this.reciprocalRankFusion(semanticResults, keywordResults);

    // Apply final filtering and limit
    return combinedResults
      .filter(result => result.score >= minScore)
      .slice(0, topK);
  }

  async keywordSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const {
      topK = 10,
      languageFilter,
      filePattern
    } = options;

    // Build WHERE clause
    const whereConditions: string[] = ['content LIKE ?'];
    const params: any[] = [`%${query}%`];

    if (languageFilter && languageFilter.length > 0) {
      const placeholders = languageFilter.map(() => '?').join(', ');
      whereConditions.push(`language IN (${placeholders})`);
      params.push(...languageFilter);
    }

    if (filePattern) {
      whereConditions.push('uri LIKE ?');
      params.push(`%${filePattern}%`);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const sql = `
      SELECT
        uri,
        content,
        language,
        line_start,
        line_end,
        metadata_json
      FROM code_chunks
      ${whereClause}
      ORDER BY
        CASE
          WHEN content LIKE ? THEN 1
          WHEN content LIKE ? THEN 2
          ELSE 3
        END,
        length(content) ASC
      LIMIT ?
    `;

    // Add additional parameters for ordering
    params.push(`%${query}%`, `${query}%`, topK);

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(row => ({
      uri: URI.parse(row.uri),
      score: this.calculateKeywordScore(query, row.content),
      snippet: this.extractSnippet(row.content, query),
      lineStart: row.line_start,
      lineEnd: row.line_end,
      language: row.language,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined
    }));
  }

  async deleteFileEmbeddings(uri: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM code_chunks WHERE uri = ?');
    const result = stmt.run(uri);

    // Also remove from indexed_files
    const deleteFileStmt = this.db.prepare('DELETE FROM indexed_files WHERE uri = ?');
    deleteFileStmt.run(uri);

    return result.changes;
  }

  async updateFileIndex(
    uri: string,
    lastModified: number,
    hash: string,
    chunkCount: number
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO indexed_files
      (uri, last_modified, hash, indexed_at, chunk_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(uri, lastModified, hash, now, chunkCount);
  }

  async getIndexStats(): Promise<IndexStats> {
    if (!this.db) throw new Error('Database not initialized');

    // Get total chunks
    const totalChunks = this.db
      .prepare('SELECT COUNT(*) as count FROM code_chunks')
      .get() as { count: number };

    // Get total files
    const totalFiles = this.db
      .prepare('SELECT COUNT(DISTINCT uri) as count FROM code_chunks')
      .get() as { count: number };

    // Get language distribution
    const languageDist = this.db
      .prepare('SELECT language, COUNT(*) as count FROM code_chunks GROUP BY language')
      .all() as Array<{ language: string; count: number }>;

    const languages: Record<string, number> = {};
    for (const row of languageDist) {
      languages[row.language] = row.count;
    }

    // Get database file size
    const dbSize = existsSync(this.dbPath)
      ? (await import('fs')).statSync(this.dbPath).size
      : 0;

    // Get last indexed time
    const lastIndexed = this.db
      .prepare('SELECT MAX(indexed_at) as last_indexed FROM indexed_files')
      .get() as { last_indexed: number | null };

    return {
      totalChunks: totalChunks.count,
      totalFiles: totalFiles.count,
      totalEmbeddings: totalChunks.count, // Same as chunks
      dbSizeBytes: dbSize,
      indexedAt: lastIndexed.last_indexed || 0,
      languages
    };
  }

  async clearIndex(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec('DELETE FROM code_chunks');
    this.db.exec('DELETE FROM indexed_files');
    this.db.exec('VACUUM');
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  private generateChunkId(uri: string, lineStart: number, lineEnd: number): string {
    // Create a unique ID for the chunk
    const normalizedUri = uri.replace(/[^a-zA-Z0-9]/g, '_');
    return `${normalizedUri}_${lineStart}_${lineEnd}_${Date.now()}`;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    // Calculate cosine similarity between two vectors
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private reciprocalRankFusion(
    listA: SearchResult[],
    listB: SearchResult[]
  ): SearchResult[] {
    const scores = new Map<string, { result: SearchResult; score: number }>();

    // RRF constant (typically 60)
    const k = 60;

    // Score list A
    listA.forEach((result, rank) => {
      const key = result.uri.toString();
      const current = scores.get(key);
      const rrfScore = 1 / (k + rank + 1);

      if (current) {
        current.score += rrfScore;
      } else {
        scores.set(key, { result, score: rrfScore });
      }
    });

    // Score list B
    listB.forEach((result, rank) => {
      const key = result.uri.toString();
      const current = scores.get(key);
      const rrfScore = 1 / (k + rank + 1);

      if (current) {
        current.score += rrfScore;
      } else {
        scores.set(key, { result, score: rrfScore });
      }
    });

    // Convert to array and sort by score
    return Array.from(scores.values())
      .map(({ result, score }) => ({
        ...result,
        score
      }))
      .sort((a, b) => b.score - a.score);
  }

  private calculateKeywordScore(query: string, content: string): number {
    // Simple keyword scoring algorithm
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const contentLower = content.toLowerCase();

    if (queryTerms.length === 0) return 0;

    let score = 0;
    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        // Count occurrences
        const occurrences = (contentLower.match(new RegExp(term, 'g')) || []).length;
        score += occurrences * 0.1;

        // Bonus for exact match at word boundaries
        if (contentLower.includes(` ${term} `) || contentLower.startsWith(`${term} `) || contentLower.endsWith(` ${term}`)) {
          score += 0.5;
        }
      }
    }

    // Normalize score to 0-1 range
    return Math.min(score / queryTerms.length, 1);
  }

  private extractSnippet(content: string, query: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
      return content;
    }

    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const contentLower = content.toLowerCase();

    // Try to find a snippet containing query terms
    for (const term of queryTerms) {
      const termIndex = contentLower.indexOf(term);
      if (termIndex !== -1) {
        // Calculate snippet start and end
        const snippetStart = Math.max(0, termIndex - Math.floor(maxLength / 2));
        const snippetEnd = Math.min(content.length, snippetStart + maxLength);

        let snippet = content.substring(snippetStart, snippetEnd);

        // Add ellipsis if needed
        if (snippetStart > 0) {
          snippet = '...' + snippet;
        }
        if (snippetEnd < content.length) {
          snippet = snippet + '...';
        }

        return snippet;
      }
    }

    // Fallback: return beginning of content
    return content.substring(0, maxLength) + '...';
  }
}
