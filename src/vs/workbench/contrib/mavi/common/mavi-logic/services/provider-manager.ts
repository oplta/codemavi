/**
 * Code Mavi IDE - Provider Manager Service
 *
 * Manages multiple LLM providers with failover, load balancing, and cost tracking
 * Supports Ollama, OpenAI, Anthropic, and other LLM providers
 */

import { URI } from "../../../../../../base/common/uri.js";
import { IFileService } from "../../../../../../platform/files/common/files.js";
import { ILogService } from "../../../../../../platform/log/common/log.js";
import { Event, Emitter } from "../../../../../../base/common/event.js";
import { Disposable } from "../../../../../../base/common/lifecycle.js";
import { createDecorator } from "../../../../../../platform/instantiation/common/instantiation.js";
import { CancellationToken } from "../../../../../../base/common/cancellation.js";

export interface ProviderConfig {
	id: string;
	name: string;
	type: 'ollama' | 'openai' | 'anthropic' | 'custom';
	enabled: boolean;
	priority: number;
	config: {
		apiKey?: string;
		apiUrl?: string;
		model: string;
		temperature?: number;
		maxTokens?: number;
		timeoutMs?: number;
		customHeaders?: Record<string, string>;
	};
	limits: {
		maxRequestsPerMinute?: number;
		maxTokensPerMinute?: number;
		costPerToken?: number;
		budget?: number;
	};
	metadata: {
		createdAt: number;
		updatedAt: number;
		version: string;
		tags: string[];
		capabilities: ProviderCapability[];
	};
}

export interface ProviderCapability {
	type: 'chat' | 'completion' | 'embedding' | 'vision' | 'function-calling';
	supported: boolean;
	maxContextLength?: number;
	maxOutputLength?: number;
	supportedModels?: string[];
}

export interface ProviderRequest {
	id: string;
	providerId: string;
	prompt: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	stream?: boolean;
	metadata?: Record<string, any>;
}

export interface ProviderResponse {
	id: string;
	requestId: string;
	providerId: string;
	content: string;
	model: string;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	metadata: {
		responseTimeMs: number;
		cost: number;
		success: boolean;
		error?: string;
		finishReason?: string;
	};
}

export interface ProviderStats {
	providerId: string;
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	totalTokens: number;
	totalCost: number;
	averageResponseTimeMs: number;
	rateLimitRemaining?: number;
	rateLimitReset?: number;
	lastUsed: number;
}

export interface ProviderSelectionStrategy {
	type: 'round-robin' | 'priority' | 'cost-optimized' | 'performance' | 'fallback';
	config?: any;
}

export interface IProviderManagerService {
	readonly _serviceBrand: undefined;

	readonly onProviderAdded: Event<ProviderConfig>;
	readonly onProviderRemoved: Event<string>;
	readonly onProviderUpdated: Event<{ id: string; changes: Partial<ProviderConfig> }>;
	readonly onRequestStarted: Event<ProviderRequest>;
	readonly onRequestCompleted: Event<ProviderResponse>;
	readonly onRequestFailed: Event<{ requestId: string; error: string; providerId: string }>;

	initialize(): Promise<void>;

	// Provider management
	addProvider(config: Omit<ProviderConfig, 'id' | 'metadata'>): Promise<string>;
	removeProvider(providerId: string): Promise<void>;
	updateProvider(providerId: string, updates: Partial<ProviderConfig>): Promise<void>;
	getProvider(providerId: string): Promise<ProviderConfig | null>;
	getProviders(filters?: ProviderFilters): Promise<ProviderConfig[]>;
	testProvider(providerId: string): Promise<boolean>;

	// Request execution
	sendRequest(
		request: Omit<ProviderRequest, 'id' | 'providerId'>,
		selectionStrategy?: ProviderSelectionStrategy,
		token?: CancellationToken
	): Promise<ProviderResponse>;

	sendRequestToProvider(
		providerId: string,
		request: Omit<ProviderRequest, 'id' | 'providerId'>,
		token?: CancellationToken
	): Promise<ProviderResponse>;

	// Batch operations
	sendBatchRequests(
		requests: Array<Omit<ProviderRequest, 'id' | 'providerId'>>,
		concurrency?: number,
		token?: CancellationToken
	): Promise<ProviderResponse[]>;

	// Stats and monitoring
	getStats(providerId?: string): Promise<ProviderStats | ProviderStats[]>;
	getCostAnalysis(startTime: number, endTime: number): Promise<CostAnalysis>;
	resetStats(providerId?: string): Promise<void>;

	// Provider selection
	setSelectionStrategy(strategy: ProviderSelectionStrategy): Promise<void>;
	getSelectionStrategy(): ProviderSelectionStrategy;

	// Failover and retry
	retryFailedRequest(requestId: string, newProviderId?: string): Promise<ProviderResponse>;

	// Configuration
	saveConfiguration(): Promise<void>;
	loadConfiguration(): Promise<void>;
}

export interface ProviderFilters {
	enabled?: boolean;
	type?: 'ollama' | 'openai' | 'anthropic' | 'custom';
	minPriority?: number;
	maxPriority?: number;
	capabilities?: ProviderCapability['type'][];
	tags?: string[];
}

export interface CostAnalysis {
	totalCost: number;
	costByProvider: Record<string, number>;
	costByModel: Record<string, number>;
	costByDay: Record<string, number>;
	tokenUsage: {
		total: number;
		prompt: number;
		completion: number;
	};
	requests: {
		total: number;
		successful: number;
		failed: number;
	};
}

export const IProviderManagerService = createDecorator<IProviderManagerService>('providerManagerService');

export class ProviderManagerService extends Disposable implements IProviderManagerService {
	readonly _serviceBrand: undefined;

	private readonly _onProviderAdded = new Emitter<ProviderConfig>();
	readonly onProviderAdded = this._onProviderAdded.event;

	private readonly _onProviderRemoved = new Emitter<string>();
	readonly onProviderRemoved = this._onProviderRemoved.event;

	private readonly _onProviderUpdated = new Emitter<{ id: string; changes: Partial<ProviderConfig> }>();
	readonly onProviderUpdated = this._onProviderUpdated.event;

	private readonly _onRequestStarted = new Emitter<ProviderRequest>();
	readonly onRequestStarted = this._onRequestStarted.event;

	private readonly _onRequestCompleted = new Emitter<ProviderResponse>();
	readonly onRequestCompleted = this._onRequestCompleted.event;

	private readonly _onRequestFailed = new Emitter<{ requestId: string; error: string; providerId: string }>();
	readonly onRequestFailed = this._onRequestFailed.event;

	private providers: Map<string, ProviderConfig> = new Map();
	private stats: Map<string, ProviderStats> = new Map();
	private requests: Map<string, ProviderRequest> = new Map();
	private responses: Map<string, ProviderResponse> = new Map();
	private selectionStrategy: ProviderSelectionStrategy = {
		type: 'priority',
		config: { maxRetries: 3 }
	};
	private readonly CONFIG_FILE = 'providers.json';
	private initialized = false;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService
	) {
		super();
		this.logService.info('[ProviderManager] Service initialized');
	}

	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			await this.loadConfiguration();
			this.initialized = true;
			this.logService.info('[ProviderManager] Service fully initialized');
		} catch (error) {
			this.logService.error('[ProviderManager] Failed to initialize:', error);
			throw error;
		}
	}

	async addProvider(config: Omit<ProviderConfig, 'id' | 'metadata'>): Promise<string> {
		const providerId = `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const fullConfig: ProviderConfig = {
			...config,
			id: providerId,
			metadata: {
				createdAt: Date.now(),
				updatedAt: Date.now(),
				version: '1.0.0',
				tags: config.metadata?.tags || [],
				capabilities: config.metadata?.capabilities || this.getDefaultCapabilities(config.type)
			}
		};

		this.providers.set(providerId, fullConfig);
		this.initializeStats(providerId);

		this._onProviderAdded.fire(fullConfig);
		this.logService.info(`[ProviderManager] Added provider: ${providerId} (${config.name})`);

		await this.saveConfiguration();
		return providerId;
	}

	async removeProvider(providerId: string): Promise<void> {
		if (this.providers.has(providerId)) {
			this.providers.delete(providerId);
			this.stats.delete(providerId);
			this._onProviderRemoved.fire(providerId);
			this.logService.info(`[ProviderManager] Removed provider: ${providerId}`);

			await this.saveConfiguration();
		}
	}

	async updateProvider(providerId: string, updates: Partial<ProviderConfig>): Promise<void> {
		const provider = this.providers.get(providerId);
		if (!provider) {
			throw new Error(`Provider not found: ${providerId}`);
		}

		const updatedProvider: ProviderConfig = {
			...provider,
			...updates,
			metadata: {
				...provider.metadata,
				...updates.metadata,
				updatedAt: Date.now()
			}
		};

		this.providers.set(providerId, updatedProvider);
		this._onProviderUpdated.fire({ id: providerId, changes: updates });
		this.logService.info(`[ProviderManager] Updated provider: ${providerId}`);

		await this.saveConfiguration();
	}

	async getProvider(providerId: string): Promise<ProviderConfig | null> {
		return this.providers.get(providerId) || null;
	}

	async getProviders(filters?: ProviderFilters): Promise<ProviderConfig[]> {
		let providers = Array.from(this.providers.values());

		if (filters?.enabled !== undefined) {
			providers = providers.filter(p => p.enabled === filters.enabled);
		}

		if (filters?.type) {
			providers = providers.filter(p => p.type === filters.type);
		}

		if (filters?.minPriority !== undefined) {
			providers = providers.filter(p => p.priority >= filters.minPriority!);
		}

		if (filters?.maxPriority !== undefined) {
			providers = providers.filter(p => p.priority <= filters.maxPriority!);
		}

		if (filters?.capabilities && filters.capabilities.length > 0) {
			providers = providers.filter(p =>
				filters.capabilities!.every(cap =>
					p.metadata.capabilities.some(c => c.type === cap && c.supported)
				)
			);
		}

		if (filters?.tags && filters.tags.length > 0) {
			providers = providers.filter(p =>
				filters.tags!.every(tag => p.metadata.tags.includes(tag))
			);
		}

		// Sort by priority (descending)
		providers.sort((a, b) => b.priority - a.priority);

		return providers;
	}

	async testProvider(providerId: string): Promise<boolean> {
		const provider = this.providers.get(providerId);
		if (!provider) {
			throw new Error(`Provider not found: ${providerId}`);
		}

		try {
			// Send a simple test request
			const testRequest: Omit<ProviderRequest, 'id' | 'providerId'> = {
				prompt: 'Hello, this is a test message. Please respond with "OK" if you can read this.',
				model: provider.config.model,
				temperature: 0.1,
				maxTokens: 10
			};

			const response = await this.sendRequestToProvider(providerId, testRequest);
			const success = response.metadata.success && response.content.includes('OK');

			this.logService.info(`[ProviderManager] Provider test ${success ? 'passed' : 'failed'}: ${providerId}`);
			return success;

		} catch (error) {
			this.logService.error(`[ProviderManager] Provider test failed for ${providerId}:`, error);
			return false;
		}
	}

	async sendRequest(
		request: Omit<ProviderRequest, 'id' | 'providerId'>,
		selectionStrategy?: ProviderSelectionStrategy,
		token?: CancellationToken
	): Promise<ProviderResponse> {
		const strategy = selectionStrategy || this.selectionStrategy;
		const providerId = await this.selectProvider(strategy);

		if (!providerId) {
			throw new Error('No available providers');
		}

		return this.sendRequestToProvider(providerId, request, token);
	}

	async sendRequestToProvider(
		providerId: string,
		request: Omit<ProviderRequest, 'id' | 'providerId'>,
		token?: CancellationToken
	): Promise<ProviderResponse> {
		const provider = this.providers.get(providerId);
		if (!provider) {
			throw new Error(`Provider not found: ${providerId}`);
		}

		if (!provider.enabled) {
			throw new Error(`Provider is disabled: ${providerId}`);
		}

		// Check rate limits
		if (!this.checkRateLimits(providerId)) {
			throw new Error(`Rate limit exceeded for provider: ${providerId}`);
		}

		const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const fullRequest: ProviderRequest = {
			...request,
			id: requestId,
			providerId
		};

		this.requests.set(requestId, fullRequest);
		this._onRequestStarted.fire(fullRequest);

		const startTime = Date.now();
		let response: ProviderResponse;

		try {
			// Execute the request based on provider type
			switch (provider.type) {
				case 'ollama':
					response = await this.sendOllamaRequest(provider, fullRequest, token);
					break;
				case 'openai':
					response = await this.sendOpenAIRequest(provider, fullRequest, token);
					break;
				case 'anthropic':
					response = await this.sendAnthropicRequest(provider, fullRequest, token);
					break;
				case 'custom':
					response = await this.sendCustomRequest(provider, fullRequest, token);
					break;
				default:
					throw new Error(`Unsupported provider type: ${provider.type}`);
			}

			// Update stats
			this.updateStats(providerId, response, Date.now() - startTime, true);

			// Store response
			this.responses.set(requestId, response);

			// Fire completion event
			this._onRequestCompleted.fire(response);

			this.logService.info(`[ProviderManager] Request completed: ${requestId}, tokens: ${response.usage.totalTokens}`);

			return response;

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorResponse: ProviderResponse = {
				id: `err_${Date.now()}`,
				requestId,
				providerId,
				content: '',
				model: provider.config.model,
				usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
				metadata: {
					responseTimeMs: Date.now() - startTime,
					cost: 0,
					success: false,
					error: errorMessage
				}
			};

			// Update stats
			this.updateStats(providerId, errorResponse, Date.now() - startTime, false);

			// Fire failure event
			this._onRequestFailed.fire({ requestId, error: errorMessage, providerId });

			this.logService.error(`[ProviderManager] Request failed: ${requestId}`, error);

			throw error;
		}
	}

	async sendBatchRequests(
		requests: Array<Omit<ProviderRequest, 'id' | 'providerId'>>,
		concurrency: number = 3,
		token?: CancellationToken
	): Promise<ProviderResponse[]> {
		const results: ProviderResponse[] = [];
		const queue = [...requests];
		const active: Promise<void>[] = [];

		// Process requests with limited concurrency
		while (queue.length > 0 || active.length > 0) {
			// Fill active queue up to concurrency limit
			while (active.length < concurrency && queue.length > 0) {
				const request = queue.shift()!;
				const promise = this.sendRequest(request, undefined, token)
					.then(response => {
						results.push(response);
					})
					.catch(error => {
						this.logService.error('[ProviderManager] Batch request failed:', error);
						// Create error response
						const errorResponse: ProviderResponse = {
							id: `batch_err_${Date.now()}`,
							requestId: 'batch',
							providerId: 'unknown',
							content: '',
							model: 'unknown',
							usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
							metadata: {
								responseTimeMs: 0,
								cost: 0,
								success: false,
								error: error instanceof Error ? error.message : String(error)
							}
						};
						results.push(errorResponse);
					})
					.finally(() => {
						// Remove from active queue
						const index = active.indexOf(promise);
						if (index !== -1) {
							active.splice(index, 1);
						}
					});

				active.push(promise);
			}

			// Wait for at least one promise to complete if queue is full
			if (active.length >= concurrency) {
				await Promise.race(active);
			}

			// Check cancellation token
			if (token?.isCancellationRequested) {
				break;
			}
		}

		// Wait for all remaining promises
		await Promise.all(active);

		return results;
	}

	async getStats(providerId?: string): Promise<ProviderStats | ProviderStats[]> {
		if (providerId) {
			const stats = this.stats.get(providerId);
			if (!stats) {
				throw new Error(`Stats not found for provider: ${providerId}`);
			}
			return stats;
		}

		return Array.from(this.stats.values());
	}

	async getCostAnalysis(startTime: number, endTime: number): Promise<CostAnalysis> {
		const allResponses = Array.from(this.responses.values());
		const filteredResponses = allResponses.filter(r =>
			r.metadata.responseTimeMs >= startTime && r.metadata.responseTimeMs <= endTime
		);

		const costByProvider: Record<string, number> = {};
		const costByModel: Record<string, number> = {};
		const costByDay: Record<string, number> = {};
		let totalCost = 0;
		let totalTokens = 0;
		let promptTokens = 0;
		let completionTokens = 0;
		let totalRequests = 0;
		let successfulRequests = 0;
		let failedRequests = 0;

		for (const response of filteredResponses) {
			const cost = response.metadata.cost || 0;
			totalCost += cost;

			// Cost by provider
			costByProvider[response.providerId] = (costByProvider[response.providerId] || 0) + cost;

			// Cost by model
			costByModel[response.model] = (costByModel[response.model] || 0) + cost;

			// Cost by day
			const day = new Date(response.metadata.responseTimeMs).toISOString().split('T')[0];
			costByDay[day] = (costByDay[day] || 0) + cost;

			// Token usage
			totalTokens += response.usage.totalTokens;
			promptTokens += response.usage.promptTokens;
			completionTokens += response.usage.completionTokens;

			// Request counts
			totalRequests++;
			if (response.metadata.success) {
				successfulRequests++;
			} else {
				failedRequests++;
			}
		}

		return {
			totalCost,
			costByProvider,
			costByModel,
			costByDay,
			tokenUsage: {
				total: totalTokens,
				prompt: promptTokens,
				completion: completionTokens
			},
			requests: {
				total: totalRequests,
				successful: successfulRequests,
				failed: failedRequests
			}
		};
	}

	async resetStats(providerId?: string): Promise<void> {
		if (providerId) {
			this.stats.delete(providerId);
			this.initializeStats(providerId);
			this.logService.info(`[ProviderManager] Reset stats for provider: ${providerId}`);
		} else {
			this.stats.clear();
			// Reinitialize stats for all providers
			for (const providerId of this.providers.keys()) {
				this.initializeStats(providerId);
			}
			this.logService.info('[ProviderManager] Reset all stats');
		}
	}

	async setSelectionStrategy(strategy: ProviderSelectionStrategy): Promise<void> {
		this.selectionStrategy = strategy;
		this.logService.info(`[ProviderManager] Set selection strategy: ${strategy.type}`);
	}

	getSelectionStrategy(): ProviderSelectionStrategy {
		return this.selectionStrategy;
	}

	async retryFailedRequest(requestId: string, newProviderId?: string): Promise<ProviderResponse> {
		const originalRequest = this.requests.get(requestId);
		if (!originalRequest) {
			throw new Error(`Request not found: ${requestId}`);
		}

		const originalResponse = this.responses.get(requestId);
		if (originalResponse?.metadata.success) {
			throw new Error(`Request was already successful: ${requestId}`);
		}

		const providerId = newProviderId || await this.selectProvider(this.selectionStrategy);
		if (!providerId) {
			throw new Error('No available providers for retry');
		}

		// Create new request without providerId
		const retryRequest: Omit<ProviderRequest, 'id' | 'providerId'> = {
			prompt: originalRequest.prompt,
			model: originalRequest.model,
			temperature: originalRequest.temperature,
			maxTokens: originalRequest.maxTokens,
			stream: originalRequest.stream,
			metadata: {
				...originalRequest.metadata,
				retryOf: requestId
			}
		};

		return this.sendRequestToProvider(providerId, retryRequest);
	}

	async saveConfiguration(): Promise<void> {
		try {
			const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
			const configDir = `${homeDir}/.mavi`;
			const configPath = `${configDir}/${this.CONFIG_FILE}`;

			// Ensure directory exists
			const dirUri = URI.file(configDir);
			await this.ensureDirectoryExists(dirUri);

			// Prepare configuration data
			const providers = Array.from(this.providers.values());
			const data = {
				version: '1.0.0',
				savedAt: Date.now(),
				providers: providers.map(p => ({
					...p,
					// Don't save API keys in plain text (in real implementation, use secure storage)
					config: {
						...p.config,
						apiKey: p.config.apiKey ? '[REDACTED]' : undefined
					}
				})),
				selectionStrategy: this.selectionStrategy
			};

			// Write to file
			const uri = URI.file(configPath);
			const content = JSON.stringify(data, null, 2);
			await this.writeFile(uri, content);

			this.logService.info(`[ProviderManager] Saved configuration with ${providers.length} providers`);

		} catch (error) {
			this.logService.error('[ProviderManager] Failed to save configuration:', error);
			throw error;
		}
	}

	async loadConfiguration(): Promise<void> {
		try {
			const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
			const configPath = `${homeDir}/.mavi/${this.CONFIG_FILE}`;
			const uri = URI.file(configPath);

			if (!await this.fileExists(uri)) {
				this.logService.info('[ProviderManager] No configuration file found, using defaults');
				await this.initializeDefaultProviders();
				return;
			}

			const content = await this.readFile(uri);
			const data = JSON.parse(content);

			if (data.providers && Array.isArray(data.providers)) {
				this.providers.clear();
				this.stats.clear();

				for (const providerData of data.providers) {
					this.providers.set(providerData.id, providerData);
					this.initializeStats(providerData.id);
				}

				if (data.selectionStrategy) {
					this.selectionStrategy = data.selectionStrategy;
				}

				this.logService.info(`[ProviderManager] Loaded ${data.providers.length} providers from configuration`);
			}

		} catch (error) {
			this.logService.error('[ProviderManager] Failed to load configuration:', error);
			await this.initializeDefaultProviders();
		}
	}

	// Private helper methods
	private async selectProvider(strategy: ProviderSelectionStrategy): Promise<string | null> {
		const enabledProviders = Array.from(this.providers.values())
			.filter(p => p.enabled);

		if (enabledProviders.length === 0) {
			return null;
		}

		switch (strategy.type) {
			case 'round-robin':
				return this.selectRoundRobin(enabledProviders);

			case 'priority':
				return this.selectByPriority(enabledProviders);

			case 'cost-optimized':
				return this.selectCostOptimized(enabledProviders);

			case 'performance':
				return this.selectByPerformance(enabledProviders);

			case 'fallback':
				return this.selectFallback(enabledProviders, strategy.config);

			default:
				return enabledProviders[0].id;
		}
	}

	private selectRoundRobin(providers: ProviderConfig[]): string {
		// Simple round-robin selection
		const sorted = providers.sort((a, b) => a.priority - b.priority);
		const stats = sorted.map(p => this.stats.get(p.id));
		const requestCounts = stats.map(s => s?.totalRequests || 0);
		const minRequests = Math.min(...requestCounts);
		const index = requestCounts.indexOf(minRequests);
		return sorted[index].id;
	}

	private selectByPriority(providers: ProviderConfig[]): string {
		// Select highest priority provider
		const sorted = providers.sort((a, b) => b.priority - a.priority);
		return sorted[0].id;
	}

	private selectCostOptimized(providers: ProviderConfig[]): string {
		// Select provider with lowest cost per token
		const withCost = providers.map(p => ({
			provider: p,
			costPerToken: p.limits.costPerToken || Infinity,
			stats: this.stats.get(p.id)
		}));

		const sorted = withCost.sort((a, b) => a.costPerToken - b.costPerToken);
		return sorted[0].provider.id;
	}

	private selectByPerformance(providers: ProviderConfig[]): string {
		// Select provider with best performance (lowest average response time)
		const withPerformance = providers.map(p => ({
			provider: p,
			stats: this.stats.get(p.id),
			avgResponseTime: this.stats.get(p.id)?.averageResponseTimeMs || Infinity
		}));

		const sorted = withPerformance.sort((a, b) => a.avgResponseTime - b.avgResponseTime);
		return sorted[0].provider.id;
	}

	private selectFallback(providers: ProviderConfig[], config?: any): string {
		// Try providers in order until one works
		const maxRetries = config?.maxRetries || 3;
		const sorted = providers.sort((a, b) => b.priority - a.priority);

		for (const provider of sorted) {
			const stats = this.stats.get(provider.id);
			const failureRate = stats ? stats.failedRequests / stats.totalRequests : 0;

			if (failureRate < 0.1) { // Less than 10% failure rate
				return provider.id;
			}
		}

		// If all have high failure rates, return the highest priority one
		return sorted[0].id;
	}

	private checkRateLimits(providerId: string): boolean {
		const provider = this.providers.get(providerId);
		const stats = this.stats.get(providerId);

		if (!provider || !stats) {
			return true;
		}

		const now = Date.now();
		const oneMinuteAgo = now - 60 * 1000;

		// Check requests per minute
		if (provider.limits.maxRequestsPerMinute) {
			// In a real implementation, we would track requests per minute
			// For now, use a simple check based on total requests
			if (stats.totalRequests > provider.limits.maxRequestsPerMinute * 10) {
				return false;
			}
		}

		// Check tokens per minute
		if (provider.limits.maxTokensPerMinute) {
			// Similar to above, would need proper tracking
			if (stats.totalTokens > provider.limits.maxTokensPerMinute * 10) {
				return false;
			}
		}

		// Check budget
		if (provider.limits.budget && stats.totalCost >= provider.limits.budget) {
			return false;
		}

		return true;
	}

	private updateStats(
		providerId: string,
		response: ProviderResponse,
		responseTimeMs: number,
		success: boolean
	): void {
		let stats = this.stats.get(providerId);
		if (!stats) {
			stats = this.initializeStats(providerId);
		}

		stats.totalRequests++;
		if (success) {
			stats.successfulRequests++;
		} else {
			stats.failedRequests++;
		}

		stats.totalTokens += response.usage.totalTokens;
		stats.totalCost += response.metadata.cost || 0;

		// Update average response time
		if (stats.averageResponseTimeMs === 0) {
			stats.averageResponseTimeMs = responseTimeMs;
		} else {
			stats.averageResponseTimeMs = (stats.averageResponseTimeMs * 0.9) + (responseTimeMs * 0.1);
		}

		stats.lastUsed = Date.now();
	}

	private initializeStats(providerId: string): ProviderStats {
		const stats: ProviderStats = {
			providerId,
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			totalTokens: 0,
			totalCost: 0,
			averageResponseTimeMs: 0,
			lastUsed: 0
		};

		this.stats.set(providerId, stats);
		return stats;
	}

	private getDefaultCapabilities(providerType: string): ProviderCapability[] {
		const baseCapabilities: ProviderCapability[] = [
			{ type: 'chat', supported: true },
			{ type: 'completion', supported: true },
			{ type: 'embedding', supported: false },
			{ type: 'vision', supported: false },
			{ type: 'function-calling', supported: false }
		];

		switch (providerType) {
			case 'openai':
				return baseCapabilities.map(cap => ({
					...cap,
					supported: cap.type !== 'vision' // OpenAI has vision in some models
				}));
			case 'anthropic':
				return baseCapabilities.map(cap => ({
					...cap,
					supported: cap.type === 'chat' || cap.type === 'completion'
				}));
			case 'ollama':
				return baseCapabilities.map(cap => ({
					...cap,
					supported: true // Ollama supports most capabilities
				}));
			default:
				return baseCapabilities;
		}
	}

	private async initializeDefaultProviders(): Promise<void> {
		// Add default Ollama provider
		await this.addProvider({
			name: 'Local Ollama',
			type: 'ollama',
			enabled: true,
			priority: 50,
			config: {
				apiUrl: 'http://localhost:11434',
				model: 'llama2',
				temperature: 0.1,
				maxTokens: 4000,
				timeoutMs: 30000
			},
			limits: {
				maxRequestsPerMinute: 60,
				maxTokensPerMinute: 10000,
				costPerToken: 0
			},
			metadata: {
				tags: ['local', 'default', 'free'],
				capabilities: this.getDefaultCapabilities('ollama')
			}
		});

		this.logService.info('[ProviderManager] Initialized default providers');
	}

	private async sendOllamaRequest(
		provider: ProviderConfig,
		request: ProviderRequest,
		token?: CancellationToken
	): Promise<ProviderResponse> {
		// Ollama API implementation
		const url = `${provider.config.apiUrl}/api/generate`;
		const payload = {
			model: request.model || provider.config.model,
			prompt: request.prompt,
			stream: request.stream || false,
			options: {
				temperature: request.temperature || provider.config.temperature || 0.1,
				num_predict: request.maxTokens || provider.config.maxTokens || 4000
			}
		};

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...provider.config.customHeaders
		};

		const controller = new AbortController();
		if (token) {
			token.onCancellationRequested(() => controller.abort());
		}

		const timeout = provider.config.timeoutMs || 30000;
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(payload),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			// Estimate token usage (Ollama doesn't provide token counts in response)
			const promptTokens = Math.ceil(request.prompt.length / 4);
			const completionTokens = Math.ceil(data.response.length / 4);

			return {
				id: `resp_${Date.now()}`,
				requestId: request.id,
				providerId: provider.id,
				content: data.response,
				model: data.model,
				usage: {
					promptTokens,
					completionTokens,
					totalTokens: promptTokens + completionTokens
				},
				metadata: {
					responseTimeMs: data.total_duration || 0,
					cost: 0, // Ollama is free
					success: true,
					finishReason: 'stop'
				}
			};

		} catch (error) {
			clearTimeout(timeoutId);
			throw error;
		}
	}

	private async sendOpenAIRequest(
		provider: ProviderConfig,
		request: ProviderRequest,
		token?: CancellationToken
	): Promise<ProviderResponse> {
		// OpenAI API implementation
		const url = provider.config.apiUrl || 'https://api.openai.com/v1/chat/completions';
		const apiKey = provider.config.apiKey;

		if (!apiKey) {
			throw new Error('OpenAI API key is required');
		}

		const payload = {
			model: request.model || provider.config.model,
			messages: [
				{
					role: 'user',
					content: request.prompt
				}
			],
			temperature: request.temperature || provider.config.temperature || 0.1,
			max_tokens: request.maxTokens || provider.config.maxTokens || 4000,
			stream: request.stream || false
		};
}
}
