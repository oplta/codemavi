/**
 * Mavi - Base Agent Class
 *
 * Foundation for all agents in the triple-agent system
 * Provides common functionality and interfaces for Orchestrator, Executor, and Verifier agents
 */

import { URI } from '../../../../../../base/common/uri.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { SemanticSearchService } from '../tools/semantic-search-service.js';

export interface AgentContext {
	relevantFiles: URI[];
	searchResults: Array<{
		uri: URI;
		score: number;
		snippet: string;
		lineStart: number;
		lineEnd: number;
	}>;
	projectRules: RuleSet;
	userPreferences: UserPreferences;
	sessionState: SessionState;
}

export interface AgentTask {
	id: string;
	description: string;
	context: AgentContext;
	dependencies?: string[];
	retryCount: number;
	maxRetries: number;
	createdAt: number;
	updatedAt: number;
	metadata?: Record<string, any>;
}

export interface AgentResult {
	success: boolean;
	taskId: string;
	output: any;
	error?: string;
	warnings?: string[];
	durationMs: number;
	tokensUsed?: {
		prompt: number;
		completion: number;
		total: number;
	};
	metadata?: Record<string, any>;
}

export interface RuleSet {
	global: string[];
	project: string[];
	session: string[];
}

export interface UserPreferences {
	language: string;
	codeStyle: string;
	testingFramework: string;
	securityLevel: 'low' | 'medium' | 'high';
	performancePriority: 'low' | 'medium' | 'high';
	accessibilityRequired: boolean;
}

export interface SessionState {
	currentFile?: URI;
	openFiles: URI[];
	recentChanges: Array<{
		file: URI;
		change: string;
		timestamp: number;
	}>;
	checkpoints: Array<{
		id: string;
		name: string;
		timestamp: number;
		description: string;
	}>;
}

export interface ToolDefinition {
	name: string;
	description: string;
	parameters: Record<string, {
		type: string;
		description: string;
		required: boolean;
	}>;
	returns: {
		type: string;
		description: string;
	};
}

export interface ToolExecution {
	tool: string;
	parameters: Record<string, any>;
	result?: any;
	error?: string;
	durationMs: number;
}

export abstract class BaseAgent extends Disposable {
	protected readonly role: string;
	protected readonly capabilities: string[];
	protected readonly model: string;
	protected readonly temperature: number;
	protected readonly maxTokens: number;

	protected semanticSearch?: SemanticSearchService;
	protected tools: Map<string, ToolDefinition> = new Map();
	protected executionHistory: ToolExecution[] = [];

	protected constructor(
		role: string,
		capabilities: string[],
		model: string = 'gpt-4',
		temperature: number = 0.1,
		maxTokens: number = 4000
	) {
		super();

		this.role = role;
		this.capabilities = capabilities;
		this.model = model;
		this.temperature = temperature;
		this.maxTokens = maxTokens;

		this._register({
			dispose: () => {
				this.tools.clear();
				this.executionHistory = [];
			}
		});
	}

	abstract execute(task: AgentTask): Promise<AgentResult>;

	async initialize(semanticSearch?: SemanticSearchService): Promise<void> {
		if (semanticSearch) {
			this.semanticSearch = semanticSearch;
		}
		this.registerDefaultTools();
		console.log(`[${this.constructor.name}] Initialized as ${this.role}`);
	}

	protected registerDefaultTools(): void {
		// Base tools available to all agents
		this.registerTool({
			name: 'read_file',
			description: 'Read the contents of a file',
			parameters: {
				path: {
					type: 'string',
					description: 'Path to the file',
					required: true
				},
				lines: {
					type: 'string',
					description: 'Optional line range (e.g., "1-50")',
					required: false
				}
			},
			returns: {
				type: 'string',
				description: 'File contents'
			}
		});

		this.registerTool({
			name: 'search_codebase',
			description: 'Search the codebase using semantic search',
			parameters: {
				query: {
					type: 'string',
					description: 'Search query',
					required: true
				},
				topK: {
					type: 'number',
					description: 'Number of results to return',
					required: false
				},
				language: {
					type: 'string',
					description: 'Filter by programming language',
					required: false
				}
			},
			returns: {
				type: 'array',
				description: 'Search results with snippets and scores'
			}
		});

		this.registerTool({
			name: 'log_message',
			description: 'Log a message for debugging or user information',
			parameters: {
				level: {
					type: 'string',
					description: 'Log level (info, warning, error, debug)',
					required: true
				},
				message: {
					type: 'string',
					description: 'Message to log',
					required: true
				},
				data: {
					type: 'object',
					description: 'Additional data to include',
					required: false
				}
			},
			returns: {
				type: 'boolean',
				description: 'Whether the message was logged successfully'
			}
		});
	}

	protected registerTool(tool: ToolDefinition): void {
		this.tools.set(tool.name, tool);
	}

	protected async executeTool(
		toolName: string,
		parameters: Record<string, any>
	): Promise<any> {
		const startTime = Date.now();
		const tool = this.tools.get(toolName);

		if (!tool) {
			throw new Error(`Tool not found: ${toolName}`);
		}

		// Validate parameters
		this.validateToolParameters(tool, parameters);

		try {
			const result = await this.callToolImplementation(toolName, parameters);
			const durationMs = Date.now() - startTime;

			this.executionHistory.push({
				tool: toolName,
				parameters,
				result,
				durationMs
			});

			return result;
		} catch (error) {
			const durationMs = Date.now() - startTime;

			this.executionHistory.push({
				tool: toolName,
				parameters,
				error: error instanceof Error ? error.message : String(error),
				durationMs
			});

			throw error;
		}
	}

	protected async callToolImplementation(
		toolName: string,
		parameters: Record<string, any>
	): Promise<any> {
		switch (toolName) {
			case 'read_file':
				return await this.readFile(parameters.path, parameters.lines);
			case 'search_codebase':
				return await this.searchCodebase(
					parameters.query,
					parameters.topK,
					parameters.language
				);
			case 'log_message':
				return this.logMessage(
					parameters.level,
					parameters.message,
					parameters.data
				);
			default:
				throw new Error(`Tool implementation not found: ${toolName}`);
		}
	}

	protected validateToolParameters(
		tool: ToolDefinition,
		parameters: Record<string, any>
	): void {
		for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
			if (paramDef.required && !(paramName in parameters)) {
				throw new Error(`Missing required parameter: ${paramName}`);
			}

			if (paramName in parameters) {
				const value = parameters[paramName];
				const type = paramDef.type;

				// Basic type checking
				switch (type) {
					case 'string':
						if (typeof value !== 'string') {
							throw new Error(`Parameter ${paramName} must be a string`);
						}
						break;
					case 'number':
						if (typeof value !== 'number') {
							throw new Error(`Parameter ${paramName} must be a number`);
						}
						break;
					case 'boolean':
						if (typeof value !== 'boolean') {
							throw new Error(`Parameter ${paramName} must be a boolean`);
						}
						break;
					case 'array':
						if (!Array.isArray(value)) {
							throw new Error(`Parameter ${paramName} must be an array`);
						}
						break;
					case 'object':
						if (typeof value !== 'object' || value === null || Array.isArray(value)) {
							throw new Error(`Parameter ${paramName} must be an object`);
						}
						break;
				}
			}
		}
	}

	protected async readFile(path: string, lines?: string): Promise<string> {
		// This would be implemented using VS Code's file system API
		// For now, return a placeholder
		console.log(`[${this.constructor.name}] Reading file: ${path}${lines ? ` lines ${lines}` : ''}`);
		return 'File content placeholder';
	}

	protected async searchCodebase(
		query: string,
		topK?: number,
		language?: string
	): Promise<any[]> {
		if (!this.semanticSearch) {
			throw new Error('Semantic search service not available');
		}

		try {
			const results = await this.semanticSearch.hybridSearch(query, {
				topK: topK || 10,
				languageFilter: language ? [language] : undefined,
				useSemantic: true,
				useKeyword: true,
				reRank: true
			});

			return results.map(result => ({
				uri: result.uri.toString(),
				score: result.score,
				snippet: result.snippet,
				lineStart: result.lineStart,
				lineEnd: result.lineEnd,
				language: result.language
			}));
		} catch (error) {
			console.error(`[${this.constructor.name}] Search failed:`, error);
			return [];
		}
	}

	protected logMessage(
		level: string,
		message: string,
		data?: any
	): boolean {
		const timestamp = new Date().toISOString();
		const logEntry = {
			timestamp,
			agent: this.role,
			level,
			message,
			data
		};

		switch (level) {
			case 'error':
				console.error(`[${this.role}]`, message, data);
				break;
			case 'warning':
				console.warn(`[${this.role}]`, message, data);
				break;
			case 'debug':
				console.debug(`[${this.role}]`, message, data);
				break;
			default:
				console.log(`[${this.role}]`, message, data);
		}

		return true;
	}

	protected generateTaskId(prefix: string = 'task'): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `${prefix}-${timestamp}-${random}`;
	}

	protected validateTask(task: AgentTask): void {
		if (!task.id) {
			throw new Error('Task must have an ID');
		}

		if (!task.description) {
			throw new Error('Task must have a description');
		}

		if (task.retryCount < 0) {
			throw new Error('Retry count cannot be negative');
		}

		if (task.maxRetries < 1) {
			throw new Error('Max retries must be at least 1');
		}

		if (task.retryCount >= task.maxRetries) {
			throw new Error('Task has exceeded maximum retries');
		}
	}

	protected createSuccessResult(
		task: AgentTask,
		output: any,
		durationMs: number,
		tokensUsed?: { prompt: number; completion: number; total: number }
	): AgentResult {
		return {
			success: true,
			taskId: task.id,
			output,
			durationMs,
			tokensUsed,
			metadata: {
				agent: this.role,
				retryCount: task.retryCount,
				toolsUsed: this.executionHistory.length
			}
		};
	}

	protected createErrorResult(
		task: AgentTask,
		error: string,
		durationMs: number,
		warnings?: string[]
	): AgentResult {
		return {
			success: false,
			taskId: task.id,
			output: null,
			error,
			warnings,
			durationMs,
			metadata: {
				agent: this.role,
				retryCount: task.retryCount,
				toolsUsed: this.executionHistory.length,
				lastTools: this.executionHistory.slice(-3)
			}
		};
	}

	protected extractContextFromTask(task: AgentTask): {
		files: URI[];
		rules: string[];
		preferences: UserPreferences;
	} {
		return {
			files: task.context.relevantFiles || [],
			rules: [
				...(task.context.projectRules?.global || []),
				...(task.context.projectRules?.project || []),
				...(task.context.projectRules?.session || [])
			],
			preferences: task.context.userPreferences || {
				language: 'typescript',
				codeStyle: 'standard',
				testingFramework: 'jest',
				securityLevel: 'medium',
				performancePriority: 'medium',
				accessibilityRequired: false
			}
		};
	}

	protected formatPrompt(
		systemPrompt: string,
		task: AgentTask,
		additionalContext?: string
	): string {
		const context = this.extractContextFromTask(task);

		let prompt = `# System Prompt for ${this.role}\n\n`;
		prompt += `${systemPrompt}\n\n`;

		prompt += `## Current Task\n`;
		prompt += `ID: ${task.id}\n`;
		prompt += `Description: ${task.description}\n`;
		prompt += `Retry Count: ${task.retryCount}/${task.maxRetries}\n\n`;

		if (context.files.length > 0) {
			prompt += `## Relevant Files\n`;
			context.files.forEach((file, index) => {
				prompt += `${index + 1}. ${file.toString()}\n`;
			});
			prompt += '\n';
		}

		if (context.rules.length > 0) {
			prompt += `## Project Rules\n`;
			context.rules.forEach((rule, index) => {
				prompt += `${index + 1}. ${rule}\n`;
			});
			prompt += '\n';
		}

		prompt += `## User Preferences\n`;
		prompt += `- Language: ${context.preferences.language}\n`;
		prompt += `- Code Style: ${context.preferences.codeStyle}\n`;
		prompt += `- Testing Framework: ${context.preferences.testingFramework}\n`;
		prompt += `- Security Level: ${context.preferences.securityLevel}\n`;
		prompt += `- Performance Priority: ${context.preferences.performancePriority}\n`;
		prompt += `- Accessibility Required: ${context.preferences.accessibilityRequired}\n\n`;

		if (additionalContext) {
			prompt += `## Additional Context\n`;
			prompt += `${additionalContext}\n\n`;
		}

		prompt += `## Available Tools\n`;
		this.tools.forEach((tool, name) => {
			prompt += `- ${name}: ${tool.description}\n`;
		});
		prompt += '\n';

		prompt += `## Task Instructions\n`;
		prompt += `Please complete the task: "${task.description}"\n`;
		prompt += `Use the available tools as needed. Provide clear reasoning for your actions.\n`;

		return prompt;
	}

	getRole(): string {
		return this.role;
	}

	getCapabilities(): string[] {
		return [...this.capabilities];
	}

	getTools(): ToolDefinition[] {
		return Array.from(this.tools.values());
	}

	getExecutionHistory(): ToolExecution[] {
		return [...this.executionHistory];
	}

	clearExecutionHistory(): void {
		this.executionHistory = [];
	}
}
