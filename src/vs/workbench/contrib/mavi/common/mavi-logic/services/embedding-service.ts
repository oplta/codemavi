/**
 * Code Mavi IDE - Embedding Service
 *
 * Multiple embedding model support with fallback mechanisms
 * Supports local (Ollama) and cloud (OpenAI) embedding models
 */

import { Disposable } from '../../../../../../base/common/lifecycle.js';

export interface EmbeddingConfig {
  provider: 'ollama' | 'openai' | 'local';
  model: string;
  dimensions: number;
  apiKey?: string;
  baseUrl?: string;
  batchSize?: number;
  timeoutMs?: number;
}

export interface EmbeddingResult {
  chunkId: string;
  embedding: number[];
  model: string;
  tokensUsed?: number;
  durationMs: number;
}

export interface BatchEmbeddingResult {
  results: EmbeddingResult[];
  totalTokens?: number;
  totalDurationMs: number;
  successful: number;
  failed: number;
}

export class EmbeddingService extends Disposable {
  private config: EmbeddingConfig;
  private initialized = false;

  constructor(config: EmbeddingConfig) {
    super();

    this.config = {
      provider: config.provider || 'ollama',
      model: config.model || this.getDefaultModel(config.provider),
      dimensions: config.dimensions || this.getDefaultDimensions(config.provider),
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || this.getDefaultBaseUrl(config.provider),
      batchSize: config.batchSize || 32,
      timeoutMs: config.timeoutMs || 30000
    };

    this._register({
      dispose: () => {
        // Cleanup resources if needed
      }
    });
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'ollama':
        return 'nomic-embed-text';
      case 'openai':
        return 'text-embedding-3-small';
      case 'local':
        return 'local-model';
      default:
        return 'nomic-embed-text';
    }
  }

  private getDefaultDimensions(provider: string): number {
    switch (provider) {
      case 'ollama':
        return 768; // nomic-embed-text dimensions
      case 'openai':
        return 1536; // text-embedding-3-small dimensions
      case 'local':
        return 384; // Common local model dimensions
      default:
        return 768;
    }
  }

  private getDefaultBaseUrl(provider: string): string {
    switch (provider) {
      case 'ollama':
        return 'http://localhost:11434';
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'local':
        return 'http://localhost:8080';
      default:
        return 'http://localhost:11434';
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test connection to embedding service
      await this.testConnection();

      this.initialized = true;
      console.log(`[EmbeddingService] Initialized with provider: ${this.config.provider}, model: ${this.config.model}`);
    } catch (error) {
      console.error('[EmbeddingService] Failed to initialize:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    const testText = 'Test connection';

    try {
      await this.generateEmbedding(testText);
      return true;
    } catch (error) {
      console.error('[EmbeddingService] Connection test failed:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      let embedding: number[];

      switch (this.config.provider) {
        case 'ollama':
          embedding = await this.callOllama(text);
          break;
        case 'openai':
          embedding = await this.callOpenAI(text);
          break;
        case 'local':
          embedding = await this.callLocal(text);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }

      const durationMs = Date.now() - startTime;
      console.log(`[EmbeddingService] Generated embedding in ${durationMs}ms, dimensions: ${embedding.length}`);

      return embedding;
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embedding:', error);
      throw error;
    }
  }

  private async callOllama(text: string): Promise<number[]> {
    const url = `${this.config.baseUrl}/api/embeddings`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: text
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs!)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Invalid response from Ollama API');
    }

    return data.embedding;
  }

  private async callOpenAI(text: string): Promise<number[]> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const url = `${this.config.baseUrl}/embeddings`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
        encoding_format: 'float'
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs!)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid response from OpenAI API');
    }

    return data.data[0].embedding;
  }

  private async callLocal(text: string): Promise<number[]> {
    // Local embedding model implementation
    // This could be a local TensorFlow.js model, ONNX runtime, etc.
    // For now, we'll use a simple placeholder

    console.warn('[EmbeddingService] Local embedding model not implemented, using placeholder');

    // Placeholder: return random embedding (in production, this would be a real model)
    const embedding = new Array(this.config.dimensions).fill(0).map(() =>
      Math.random() * 2 - 1 // Random values between -1 and 1
    );

    // Normalize the vector
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  async batchEmbed(
    chunks: Array<{ id: string; content: string }>
  ): Promise<BatchEmbeddingResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const results: EmbeddingResult[] = [];
    let successful = 0;
    let failed = 0;
    let totalTokens = 0;

    // Process in batches - use default values if config is undefined
    const batchSize = this.config.batchSize ?? 32;
    const provider = this.config.provider ?? 'ollama';
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      try {
        // For providers that support batch processing
        if (provider === 'openai') {
          const batchResults = await this.batchEmbedOpenAI(batch);
          results.push(...batchResults.results);
          successful += batchResults.successful;
          failed += batchResults.failed;
          totalTokens += batchResults.totalTokens || 0;
        } else {
          // Process sequentially for other providers
          for (const chunk of batch) {
            try {
              const embeddingStart = Date.now();
              const embedding = await this.generateEmbedding(chunk.content);
              const durationMs = Date.now() - embeddingStart;

              results.push({
                chunkId: chunk.id,
                embedding,
                model: this.config.model,
                durationMs
              });
              successful++;
            } catch (error) {
              console.error(`[EmbeddingService] Failed to embed chunk ${chunk.id}:`, error);
              failed++;
            }
          }
        }
      } catch (error) {
        console.error(`[EmbeddingService] Batch embedding failed:`, error);
        failed += batch.length;
      }
    }

    const totalDurationMs = Date.now() - startTime;

    return {
      results,
      totalTokens,
      totalDurationMs,
      successful,
      failed
    };
  }

  private async batchEmbedOpenAI(
    chunks: Array<{ id: string; content: string }>
  ): Promise<BatchEmbeddingResult> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required for batch embedding');
    }

    const url = `${this.config.baseUrl}/embeddings`;
    const inputs = chunks.map(chunk => chunk.content);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        input: inputs,
        encoding_format: 'float'
      }),
      signal: AbortSignal.timeout((this.config.timeoutMs || 30000) * 2) // Longer timeout for batch
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI batch API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid batch response from OpenAI API');
    }

    const results: EmbeddingResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingData = data.data?.[i];

      const embedding = embeddingData?.embedding;
      if (embedding && Array.isArray(embedding)) {
        const usage = data.usage;
        const totalTokens = (usage?.total_tokens ?? 0) as number;
        results.push({
          chunkId: chunk.id,
          embedding: embedding,
          model: this.config.model,
          tokensUsed: totalTokens > 0 ? Math.floor(totalTokens / chunks.length) : undefined,
          durationMs: Date.now() - startTime
        });
      }
    }

    return {
      results,
      totalTokens: data.usage?.total_tokens,
      totalDurationMs: Date.now() - startTime,
      successful: results.length,
      failed: chunks.length - results.length
    };
  }

  async estimateTokens(text: string): Promise<number> {
    // Rough token estimation (4 chars ≈ 1 token for English)
    return Math.ceil(text.length / 4);
  }

  async estimateBatchTokens(chunks: Array<{ content: string }>): Promise<number> {
    let totalTokens = 0;

    for (const chunk of chunks) {
      totalTokens += await this.estimateTokens(chunk.content);
    }

    return totalTokens;
  }

  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<EmbeddingConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };

    // Re-initialize if provider or model changed
    if (newConfig.provider || newConfig.model || newConfig.baseUrl) {
      this.initialized = false;
    }
  }

  getProviderInfo(): {
    provider: string;
    model: string;
    dimensions: number;
    supportsBatch: boolean;
  } {
    return {
      provider: this.config.provider,
      model: this.config.model,
      dimensions: this.config.dimensions,
      supportsBatch: this.config.provider === 'openai'
    };
  }

  async validateEmbedding(embedding: number[]): Promise<boolean> {
    // Check if embedding is valid
    if (!Array.isArray(embedding)) return false;
    if (embedding.length !== this.config.dimensions) return false;
    if (embedding.some(val => !Number.isFinite(val))) return false;

    // Check if vector is normalized (approximately)
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return Math.abs(norm - 1) < 0.1; // Allow small deviation
  }

  async normalizeEmbedding(embedding: number[]): Promise<number[]> {
    // Normalize vector to unit length
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

    if (norm === 0) {
      // Return zero vector if norm is zero
      return new Array(embedding.length).fill(0);
    }

    return embedding.map(val => val / norm);
  }
}
