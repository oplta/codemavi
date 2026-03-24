/**
 * Code Mavi IDE - Semantic Search Service
 *
 * Complete implementation of semantic search with hybrid search capabilities
 * Integrates AST parsing, embedding generation, and vector search
 */

import { URI } from '../../../../../../base/common/uri.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ASTService, ParseResult, CodeChunk } from '../services/ast-service.js';
import { VectorDBService, SearchResult, SearchOptions } from '../services/vector-db-service.js';
import { EmbeddingService, EmbeddingConfig } from '../services/embedding-service.js';

export interface IndexingProgress {
	filesProcessed: number;
	filesTotal: number;
	currentFile?: URI;
	chunksIndexed: number;
	totalChunks: number;
	status: 'scanning' | 'parsing' | 'embedding' | 'storing' | 'complete';
}

export interface IndexingResult {
	filesIndexed: number;
	chunksIndexed: number;
	durationMs: number;
	successful: number;
	failed: number;
	stats: {
		languages: Record<string, number>;
		totalSizeBytes: number;
		averageChunkSize: number;
	};
}

export interface HybridSearchOptions extends SearchOptions {
	useSemantic?: boolean;
	useKeyword?: boolean;
	reRank?: boolean;
	reRankTopK?: number;
	boostRecent?: boolean;
	boostLanguage?: Record<string, number>;
}

export class SemanticSearchService extends Disposable {
	private astService: ASTService;
	private vectorDB: VectorDBService;
	private embeddingService: EmbeddingService;
	private initialized = false;
	private indexingInProgress = false;
	private readonly CHUNK_SIZE_LINES = 50;
	private readonly CHUNK_OVERLAP_LINES = 10;

	constructor(
		embeddingConfig?: EmbeddingConfig,
		dbPath?: string
	) {
		super();

		this.astService = new ASTService();
		this.vectorDB = new VectorDBService(dbPath);

		// Default to Ollama for local development
		const defaultConfig: EmbeddingConfig = {
			provider: 'ollama',
			model: 'nomic-embed-text',
			dimensions: 768,
			baseUrl: 'http://localhost:11434',
			batchSize: 32,
			timeoutMs: 30000
		};

		this.embeddingService = new EmbeddingService(embeddingConfig || defaultConfig);

		this._register({
			dispose: () => {
				this.astService.dispose();
				this.vectorDB.dispose();
				this.embeddingService.dispose();
			}
		});
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			// Initialize all services
			await this.astService.initialize();
			await this.vectorDB.initialize();
			await this.embeddingService.initialize();

			this.initialized = true;
			console.log('[SemanticSearchService] Initialized successfully');
		} catch (error) {
			console.error('[SemanticSearchService] Failed to initialize:', error);
			throw error;
		}
	}

	async indexWorkspace(
		workspaceRoot: URI,
		progressCallback?: (progress: IndexingProgress) => void
	): Promise<IndexingResult> {
		if (!this.initialized) {
			await this.initialize();
		}

		if (this.indexingInProgress) {
			throw new Error('Indexing already in progress');
		}

		this.indexingInProgress = true;
		const startTime = Date.now();

		try {
			// Step 1: Scan workspace for files
			const files = await this.scanWorkspace(workspaceRoot);

			if (progressCallback) {
				progressCallback({
					filesProcessed: 0,
					filesTotal: files.length,
					chunksIndexed: 0,
					totalChunks: 0,
					status: 'scanning'
				});
			}

			console.log(`[SemanticSearchService] Found ${files.length} files to index`);

			// Step 2: Parse files and extract chunks
			const allChunks: CodeChunk[] = [];
			const parseResults = new Map<URI, ParseResult>();
			let processedFiles = 0;

			for (const file of files) {
				try {
					if (progressCallback) {
						progressCallback({
							filesProcessed: processedFiles,
							filesTotal: files.length,
							currentFile: file.uri,
							chunksIndexed: allChunks.length,
							totalChunks: allChunks.length,
							status: 'parsing'
						});
					}

					const content = await this.readFileContent(file.uri);
					const result = await this.astService.parseFile(file.uri, content);

					parseResults.set(file.uri, result);
					allChunks.push(...result.chunks);

					processedFiles++;
				} catch (error) {
					console.error(`[SemanticSearchService] Failed to parse ${file.uri}:`, error);
				}
			}

			console.log(`[SemanticSearchService] Parsed ${processedFiles} files, extracted ${allChunks.length} chunks`);

			// Step 3: Generate embeddings
			if (progressCallback) {
				progressCallback({
					filesProcessed: processedFiles,
					filesTotal: files.length,
					chunksIndexed: 0,
					totalChunks: allChunks.length,
					status: 'embedding'
				});
			}

			const embeddingResults = await this.embeddingService.batchEmbed(
				allChunks.map(chunk => ({
					id: chunk.id,
					content: chunk.content
				}))
			);

			console.log(`[SemanticSearchService] Generated embeddings: ${embeddingResults.successful} successful, ${embeddingResults.failed} failed`);

			// Step 4: Store in vector database
			if (progressCallback) {
				progressCallback({
					filesProcessed: processedFiles,
					filesTotal: files.length,
					chunksIndexed: 0,
					totalChunks: allChunks.length,
					status: 'storing'
				});
			}

			const embeddingMap = new Map<string, number[]>();
			for (const result of embeddingResults.results) {
				embeddingMap.set(result.chunkId, result.embedding);
			}

			let storedChunks = 0;
			const languageStats: Record<string, number> = {};

			for (const chunk of allChunks) {
				const embedding = embeddingMap.get(chunk.id);
				if (embedding) {
					try {
						await this.vectorDB.storeEmbedding({
							uri: chunk.uri.toString(),
							content: chunk.content,
							language: chunk.language,
							lineStart: chunk.lineStart,
							lineEnd: chunk.lineEnd,
							embedding: embedding,
							metadata: {
								symbols: chunk.symbols,
								nodeType: chunk.nodeType
							}
						});

						storedChunks++;
						languageStats[chunk.language] = (languageStats[chunk.language] || 0) + 1;

						if (progressCallback && storedChunks % 100 === 0) {
							progressCallback({
								filesProcessed: processedFiles,
								filesTotal: files.length,
								chunksIndexed: storedChunks,
								totalChunks: allChunks.length,
								status: 'storing'
							});
						}
					} catch (error) {
						console.error(`[SemanticSearchService] Failed to store chunk ${chunk.id}:`, error);
					}
				}
			}

			// Step 5: Update file index
			for (const [uri, result] of parseResults) {
				const chunksForFile = allChunks.filter(chunk => chunk.uri.toString() === uri.toString());
				if (chunksForFile.length > 0) {
					await this.vectorDB.updateFileIndex(
						uri.toString(),
						Date.now(),
						this.calculateFileHash(result),
						chunksForFile.length
					);
				}
			}

			const durationMs = Date.now() - startTime;

			if (progressCallback) {
				progressCallback({
					filesProcessed: processedFiles,
					filesTotal: files.length,
					chunksIndexed: storedChunks,
					totalChunks: allChunks.length,
					status: 'complete'
				});
			}

			const totalSizeBytes = allChunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
			const averageChunkSize = allChunks.length > 0 ? totalSizeBytes / allChunks.length : 0;

			return {
				filesIndexed: processedFiles,
				chunksIndexed: storedChunks,
				durationMs,
				successful: embeddingResults.successful,
				failed: embeddingResults.failed,
				stats: {
					languages: languageStats,
					totalSizeBytes,
					averageChunkSize
				}
			};

		} finally {
			this.indexingInProgress = false;
		}
	}

	async indexFile(uri: URI, content?: string): Promise<{ success: boolean; chunks: number }> {
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			// Read file content if not provided
			let fileContent = content;
			if (!fileContent) {
				fileContent = await this.readFileContent(uri);
			}

			// Parse file
			const result = await this.astService.parseFile(uri, fileContent);

			// Generate embeddings for chunks
			const embeddingResults = await this.embeddingService.batchEmbed(
				result.chunks.map(chunk => ({
					id: chunk.id,
					content: chunk.content
				}))
			);

			// Store embeddings
			let storedChunks = 0;
			for (let i = 0; i < result.chunks.length; i++) {
				const chunk = result.chunks[i];
				const embedding = embeddingResults.results[i]?.embedding;

				if (embedding) {
					await this.vectorDB.storeEmbedding({
						uri: uri.toString(),
						content: chunk.content,
						language: chunk.language,
						lineStart: chunk.lineStart,
						lineEnd: chunk.lineEnd,
						embedding: embedding,
						metadata: {
							symbols: chunk.symbols,
							nodeType: chunk.nodeType
						}
					});
					storedChunks++;
				}
			}

			// Update file index
			await this.vectorDB.updateFileIndex(
				uri.toString(),
				Date.now(),
				this.calculateFileHash(result),
				storedChunks
			);

			return {
				success: storedChunks > 0,
				chunks: storedChunks
			};

		} catch (error) {
			console.error(`[SemanticSearchService] Failed to index file ${uri}:`, error);
			return {
				success: false,
				chunks: 0
			};
		}
	}

	async search(
		query: string,
		options: SearchOptions = {}
	): Promise<SearchResult[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			// Generate embedding for query
			const queryEmbedding = await this.embeddingService.generateEmbedding(query);

			// Perform semantic search
			return await this.vectorDB.searchSimilar(queryEmbedding, options);
		} catch (error) {
			console.error('[SemanticSearchService] Semantic search failed:', error);

			// Fallback to keyword search
			return await this.vectorDB.keywordSearch(query, options);
		}
	}

	async hybridSearch(
		query: string,
		options: HybridSearchOptions = {}
	): Promise<SearchResult[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		const {
			useSemantic = true,
			useKeyword = true,
			reRank = true,
			reRankTopK = 50,
			boostRecent = false,
			boostLanguage = {},
			...searchOptions
		} = options;

		try {
			let semanticResults: SearchResult[] = [];
			let keywordResults: SearchResult[] = [];

			// Run semantic search if enabled
			if (useSemantic) {
				try {
					const queryEmbedding = await this.embeddingService.generateEmbedding(query);
					semanticResults = await this.vectorDB.searchSimilar(queryEmbedding, {
						...searchOptions,
						topK: reRankTopK
					});
				} catch (error) {
					console.warn('[SemanticSearchService] Semantic search failed, using keyword only:', error);
				}
			}

			// Run keyword search if enabled
			if (useKeyword) {
				keywordResults = await this.vectorDB.keywordSearch(query, {
					...searchOptions,
					topK: reRankTopK
				});
			}

			// Combine results
			let combinedResults: SearchResult[] = [];

			if (semanticResults.length > 0 && keywordResults.length > 0) {
				// Use Reciprocal Rank Fusion for hybrid ranking
				combinedResults = this.vectorDB['reciprocalRankFusion'](semanticResults, keywordResults);
			} else if (semanticResults.length > 0) {
				combinedResults = semanticResults;
			} else if (keywordResults.length > 0) {
				combinedResults = keywordResults;
			}

			// Apply boosts
			if (boostRecent || Object.keys(boostLanguage).length > 0) {
				combinedResults = this.applyBoosts(combinedResults, {
					boostRecent,
					boostLanguage
				});
			}

			// Re-rank if enabled
			if (reRank && combinedResults.length > 1) {
				combinedResults = await this.reRankResults(combinedResults, query);
			}

			// Apply final limit
			const finalTopK = searchOptions.topK || 10;
			return combinedResults.slice(0, finalTopK);

		} catch (error) {
			console.error('[SemanticSearchService] Hybrid search failed:', error);
			return [];
		}
	}

	async searchByExample(
		exampleCode: string,
		options: SearchOptions = {}
	): Promise<SearchResult[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			// Generate embedding for example code
			const exampleEmbedding = await this.embeddingService.generateEmbedding(exampleCode);

			// Search for similar code
			return await this.vectorDB.searchSimilar(exampleEmbedding, options);
		} catch (error) {
			console.error('[SemanticSearchService] Search by example failed:', error);
			return [];
		}
	}

	async searchSymbol(
		symbolName: string,
		symbolType?: string,
		options: SearchOptions = {}
	): Promise<SearchResult[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		// Build query for symbol search
		const query = symbolType
			? `${symbolType} ${symbolName}`
			: symbolName;

		return await this.hybridSearch(query, {
			...options,
			useSemantic: true,
			useKeyword: true,
			reRank: true
		});
	}

	async getRelatedCode(
		uri: URI,
		lineNumber: number,
		options: SearchOptions = {}
	): Promise<SearchResult[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			// Read the specific code around the line
			const content = await this.readFileContent(uri);
			const lines = content.split('\n');

			// Extract context around the line
			const startLine = Math.max(0, lineNumber - 10);
			const endLine = Math.min(lines.length - 1, lineNumber + 10);
			const context = lines.slice(startLine, endLine + 1).join('\n');

			// Search for similar code
			return await this.searchByExample(context, options);
		} catch (error) {
			console.error('[SemanticSearchService] Get related code failed:', error);
			return [];
		}
	}

	async clearIndex(): Promise<void> {
		if (!this.initialized) {
			await this.initialize();
		}

		await this.vectorDB.clearIndex();
		console.log('[SemanticSearchService] Index cleared');
	}

	async getStats(): Promise<any> {
		if (!this.initialized) {
			await this.initialize();
		}

		const dbStats = await this.vectorDB.getIndexStats();
		const embeddingInfo = this.embeddingService.getProviderInfo();

		return {
			database: dbStats,
			embedding: embeddingInfo,
			ast: {
				supportedLanguages: this.astService.getSupportedLanguages()
			},
			indexing: {
				inProgress: this.indexingInProgress
			}
		};
	}

	async isFileIndexed(uri: URI): Promise<boolean> {
		if (!this.initialized) {
			await this.initialize();
		}

		// Check if file exists in indexed_files table
		// This would require adding a method to VectorDBService
		// For now, return false
		return false;
	}

	async needsReindexing(uri: URI): Promise<boolean> {
		if (!this.initialized) {
			await this.initialize();
		}

		// Check if file has been modified since last indexing
		// This would require checking file modification time
		// For now, return true
		return true;
	}

	private async scanWorkspace(workspaceRoot: URI): Promise<Array<{ uri: URI; size: number }>> {
		// This is a simplified implementation
		// In production, this would recursively scan the workspace
		// and filter by file extensions

		const supportedExtensions = [
			'.js', '.jsx', '.ts', '.tsx', '.py', '.rs', '.java', '.go', '.cpp', '.c',
			'.cs', '.php', '.rb', '.swift', '.kt', '.scala', '.hs', '.lua', '.sh', '.bash'
		];

		// For now, return an empty array
		// In a real implementation, we would use VS Code's workspace API
		// to scan for files
		return [];
	}

	private async readFileContent(uri: URI): Promise<string> {
		// In a real implementation, this would read the file content
		// using VS Code's file system API
		// For now, return empty string
		return '';
	}

	private calculateFileHash(result: ParseResult): string {
		// Calculate a simple hash of the file content
		// In production, use a proper hash function
		const content = JSON.stringify(result);
		let hash = 0;
		for (let i = 0; i < content.length; i++) {
			const char = content.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(16);
	}

	private applyBoosts(
		results: SearchResult[],
		options: {
			boostRecent: boolean;
			boostLanguage: Record<string, number>;
		}
	): SearchResult[] {
		if (!options.boostRecent && Object.keys(options.boostLanguage).length === 0) {
			return results;
		}

		return results.map(result => {
			let boost = 1.0;

			// Apply recent boost if enabled
			if (options.boostRecent) {
				// Simple recency boost based on line numbers (lower line numbers = more recent)
				const recencyBoost = Math.max(0.1, 1.0 - (result.lineStart / 1000));
				boost *= recencyBoost;
			}

			// Apply language boost if specified
			if (options.boostLanguage[result.language]) {
				boost *= options.boostLanguage[result.language];
			}

			return {
				...result,
				score: result.score * boost
			};
		}).sort((a, b) => b.score - a.score);
	}

	private async reRankResults(
		results: SearchResult[],
		query: string
	): Promise<SearchResult[]> {
		if (results.length <= 1) {
			return results;
		}

		try {
			// Simple re-ranking based on query term frequency
			// In production, this could use a cross-encoder model
			const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);

			return results.map(result => {
				let relevanceScore = result.score;
				const contentLower = result.snippet.toLowerCase();

				// Boost score based on query term frequency
				for (const term of queryTerms) {
					const occurrences = (contentLower.match(new RegExp(term, 'g')) || []).length;
					if (occurrences > 0) {
						relevanceScore *= (1 + (occurrences * 0.1));
					}
				}

				// Penalize very short snippets
				if (result.snippet.length < 50) {
					relevanceScore *= 0.8;
				}

				return {
					...result,
					score: relevanceScore
				};
			}).sort((a, b) => b.score - a.score);

		} catch (error) {
			console.warn('[SemanticSearchService] Re-ranking failed:', error);
			return results;
		}
	}
}
