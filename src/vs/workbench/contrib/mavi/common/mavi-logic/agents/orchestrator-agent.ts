/**
 * Code Mavi - Orchestrator Agent
 *
 * The strategic planner and coordinator of the triple-agent system
 * Analyzes user requests, creates execution plans, and delegates to specialized agents
 */

import { URI } from "../../../../base/common/uri.js";
import {
	BaseAgent,
	AgentTask,
	AgentResult,
	AgentContext,
	ToolDefinition,
	ToolExecution,
} from "./base-agent.js";
import { SemanticSearchService } from "../tools/semantic-search-service.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { Event, Emitter } from "../../../../base/common/event.js";
import { CancellationToken } from "../../../../base/common/cancellation.js";

export interface ExecutionPlan {
	id: string;
	tasks: TaskDefinition[];
	dependencies: Map<string, string[]>;
	estimatedDuration: number;
	complexity: "low" | "medium" | "high";
	riskLevel: "low" | "medium" | "high";
	checkpoints: CheckpointDefinition[];
}

export interface TaskDefinition {
	id: string;
	type:
		| "analysis"
		| "implementation"
		| "refactoring"
		| "testing"
		| "documentation";
	description: string;
	agent: "executor" | "verifier" | "specialized";
	priority: number;
	estimatedEffort: number; // in minutes
	dependencies: string[];
	contextRequirements: {
		files: string[];
		rules: string[];
		tools: string[];
	};
	successCriteria: string[];
}

export interface CheckpointDefinition {
	id: string;
	name: string;
	description: string;
	trigger: "before" | "after" | "error";
	taskId?: string;
	automatic: boolean;
	rollbackOnFailure: boolean;
}

export interface PlanAnalysis {
	request: string;
	complexity: "low" | "medium" | "high";
	estimatedFiles: number;
	estimatedTime: number; // in minutes
	risks: RiskAssessment[];
	dependencies: string[];
	recommendedApproach: string;
}

export interface RiskAssessment {
	type:
		| "breaking_change"
		| "performance"
		| "security"
		| "complexity"
		| "dependency";
	description: string;
	severity: "low" | "medium" | "high";
	mitigation: string;
}

export class OrchestratorAgent extends BaseAgent {
	private planCache: Map<string, ExecutionPlan> = new Map();
	private taskQueue: AgentTask[] = [];
	private activeTasks: Map<string, AgentTask> = new Map();
	private completedTasks: Map<string, AgentResult> = new Map();

	private readonly _onTaskStarted = new Emitter<{
		taskId: string;
		description: string;
	}>();
	readonly onTaskStarted = this._onTaskStarted.event;

	private readonly _onTaskCompleted = new Emitter<{
		taskId: string;
		result: AgentResult;
	}>();
	readonly onTaskCompleted = this._onTaskCompleted.event;

	private readonly _onTaskFailed = new Emitter<{
		taskId: string;
		error: string;
		retryCount: number;
	}>();
	readonly onTaskFailed = this._onTaskFailed.event;

	private readonly _onCheckpointCreated = new Emitter<{
		checkpointId: string;
		name: string;
		description: string;
	}>();
	readonly onCheckpointCreated = this._onCheckpointCreated.event;

	private readonly MAX_PARALLEL_TASKS = 4;
	private readonly MAX_PLAN_DEPTH = 10;
	private readonly MAX_RETRIES = 3;
	private readonly CHECKPOINT_DIR = ".codemavi/checkpoints";

	constructor(
		model: string = "gpt-4",
		temperature: number = 0.1,
		maxTokens: number = 8000,
	) {
		super(
			"orchestrator",
			["analyze", "plan", "delegate", "monitor", "coordinate", "optimize"],
			model,
			temperature,
			maxTokens,
		);

		// Ensure checkpoint directory exists
		if (!existsSync(this.CHECKPOINT_DIR)) {
			writeFileSync(this.CHECKPOINT_DIR, "", { flag: "wx" });
		}
	}

	async initialize(semanticSearch?: SemanticSearchService): Promise<void> {
		await super.initialize(semanticSearch);
		this.registerOrchestratorTools();
		console.log(`[OrchestratorAgent] Initialized with ${this.tools.size} tools`);
	}

	async execute(task: AgentTask): Promise<AgentResult> {
		const startTime = Date.now();

		try {
			this.validateTask(task);
			this._onTaskStarted.fire({
				taskId: task.id,
				description: task.description
			});

			// Step 1: Analyze request and create plan
			const planAnalysis = await this.analyzeRequest(task);

			// Step 2: Create execution plan
			const executionPlan = await this.createExecutionPlan(task, planAnalysis);
			this.planCache.set(task.id, executionPlan);

			// Step 3: Create initial checkpoint
			const checkpointId = await this.createCheckpoint(
				`before_${task.id}`,
				`Initial checkpoint before executing: ${task.description}`
			);

			// Step 4: Execute plan
			const result = await this.executePlan(executionPlan, task.context);

			// Step 5: Create final checkpoint
			await this.createCheckpoint(
				`after_${task.id}`,
				`Final checkpoint after executing: ${task.description}`
			);

			const durationMs = Date.now() - startTime;

			const agentResult: AgentResult = {
				success: true,
				taskId: task.id,
				output: result,
				durationMs,
				tokensUsed: {
					prompt: 0, // TODO: Track actual token usage
					completion: 0,
					total: 0
				},
				metadata: {
					planId: executionPlan.id,
					checkpointId,
					tasksExecuted: executionPlan.tasks.length
				}
			};

			this._onTaskCompleted.fire({
				taskId: task.id,
				result: agentResult
			});

			return agentResult;

		} catch (error) {
			const durationMs = Date.now() - startTime;

			this._onTaskFailed.fire({
				taskId: task.id,
				error: error instanceof Error ? error.message : String(error),
				retryCount: task.retryCount
			});

			return {
				success: false,
				taskId: task.id,
				output: null,
				error: error instanceof Error ? error.message : String(error),
				durationMs,
				metadata: {
					retryCount: task.retryCount
				}
			};
		}
	}

	protected registerOrchestratorTools(): void {
		// Orchestrator-specific tools
		this.registerTool({
			name: 'create_checkpoint',
			description: 'Create a checkpoint for rollback purposes',
			parameters: {
				name: {
					type: 'string',
					description: 'Checkpoint name',
					required: true
				},
				description: {
					type: 'string',
					description: 'Checkpoint description',
					required: true
				}
			},
			returns: {
				type: 'string',
				description: 'Checkpoint ID'
			}
		});

		this.registerTool({
			name: 'delegate_to_executor',
			description: 'Delegate a task to the executor agent',
			parameters: {
				taskId: {
					type: 'string',
					description: 'Task ID',
					required: true
				},
				description: {
					type: 'string',
					description: 'Task description',
					required: true
				},
				files: {
					type: 'array',
					description: 'Files to work on',
					required: true
				},
				constraints: {
					type: 'array',
					description: 'Task constraints',
					required: false
				}
			},
			returns: {
				type: 'object',
				description: 'Executor result with semantic diff'
			}
		});

		this.registerTool({
			name: 'delegate_to_verifier',
			description: 'Delegate verification to the verifier agent',
			parameters: {
				taskId: {
					type: 'string',
					description: 'Task ID',
					required: true
				},
				files: {
					type: 'array',
					description: 'Files to verify',
					required: true
				},
				checks: {
					type: 'array',
					description: 'Types of checks to perform',
					required: true
				}
			},
			returns: {
				type: 'object',
				description: 'Verification result'
			}
		});

		this.registerTool({
			name: 'analyze_complexity',
			description: 'Analyze the complexity of a request',
			parameters: {
				request: {
					type: 'string',
					description: 'User request',
					required: true
				},
				context: {
					type: 'object',
					description: 'Additional context',
					required: false
				}
			},
			returns: {
				type: 'object',
				description: 'Complexity analysis result'
			}
		});

		this.registerTool({
			name: 'create_task_dependencies',
			description: 'Create task dependency graph',
			parameters: {
				tasks: {
					type: 'array',
					description: 'List of tasks',
					required: true
				}
			},
			returns: {
				type: 'object',
				description: 'Dependency graph'
			}
		});
	}

	private async analyzeRequest(task: AgentTask): Promise<PlanAnalysis> {
		console.log(`[OrchestratorAgent] Analyzing request: ${task.description}`);

		// Use semantic search to gather context
		const searchResults = await this.searchCodebase(task.description, 10);

		// Analyze complexity
		const complexity = await this.estimateComplexity(task, searchResults);

		// Identify risks
		const risks = await this.identifyRisks(task, searchResults);

		// Estimate effort
		const estimatedTime = await this.estimateEffort(task, searchResults);

		return {
			request: task.description,
			complexity,
			estimatedFiles: searchResults.length,
			estimatedTime,
			risks,
			dependencies: await this.identifyDependencies(task, searchResults),
			recommendedApproach: await this.determineApproach(task, searchResults)
		};
	}

	private async createExecutionPlan(
		task: AgentTask,
		analysis: PlanAnalysis
	): Promise<ExecutionPlan> {
		const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Create tasks based on analysis
		const tasks = await this.createTasksFromAnalysis(task, analysis);

		// Create dependencies
		const dependencies = await this.createTaskDependencies(tasks);

		// Create checkpoints
		const checkpoints = await this.createCheckpoints(tasks, analysis);

		return {
			id: planId,
			tasks,
			dependencies,
			estimatedDuration: analysis.estimatedTime,
			complexity: analysis.complexity,
			riskLevel: this.calculateOverallRisk(analysis.risks),
			checkpoints
		};
	}

	private async executePlan(
		plan: ExecutionPlan,
		context: AgentContext
	): Promise<any> {
		console.log(`[OrchestratorAgent] Executing plan ${plan.id} with ${plan.tasks.length} tasks`);

		const results: any[] = [];
		const taskQueue = [...plan.tasks];
		const completedTasks = new Set<string>();

		// Execute tasks respecting dependencies
		while (taskQueue.length > 0) {
			const executableTasks = taskQueue.filter(task =>
				task.dependencies.every(dep => completedTasks.has(dep))
			);

			if (executableTasks.length === 0) {
				throw new Error(`Circular dependency detected in plan ${plan.id}`);
			}

			// Execute tasks in parallel (up to MAX_PARALLEL_TASKS)
			const tasksToExecute = executableTasks.slice(0, this.MAX_PARALLEL_TASKS);
			const executionPromises = tasksToExecute.map(task =>
				this.executeTask(task, context, plan)
			);

			const taskResults = await Promise.all(executionPromises);
			results.push(...taskResults);

			// Mark tasks as completed and remove from queue
			tasksToExecute.forEach(task => {
				completedTasks.add(task.id);
				const index = taskQueue.findIndex(t => t.id === task.id);
				if (index !== -1) {
					taskQueue.splice(index, 1);
				}
			});
		}

		return results;
	}

	private async executeTask(
		task: TaskDefinition,
		context: AgentContext,
		plan: ExecutionPlan
	): Promise<any> {
		console.log(`[OrchestratorAgent] Executing task ${task.id}: ${task.description}`);

		// Create checkpoint before task if configured
		const checkpoint = plan.checkpoints.find(cp =>
			cp.taskId === task.id && cp.trigger === 'before'
		);

		if (checkpoint?.automatic) {
			await this.createCheckpoint(
				`before_${task.id}`,
				`Checkpoint before executing task: ${task.description}`
			);
		}

		try {
			let result: any;

			switch (task.agent) {
				case 'executor':
					result = await this.delegateToExecutor(task, context);
					break;
				case 'verifier':
					result = await this.delegateToVerifier(task, context);
					break;
				default:
					throw new Error(`Unknown agent type: ${task.agent}`);
			}

			// Create checkpoint after task if configured
			const afterCheckpoint = plan.checkpoints.find(cp =>
				cp.taskId === task.id && cp.trigger === 'after'
			);

			if (afterCheckpoint?.automatic) {
				await this.createCheckpoint(
					`after_${task.id}`,
					`Checkpoint after executing task: ${task.description}`
				);
			}

			return result;

		} catch (error) {
			// Create error checkpoint if configured
			const errorCheckpoint = plan.checkpoints.find(cp =>
				cp.taskId === task.id && cp.trigger === 'error'
			);

			if (errorCheckpoint?.automatic) {
				await this.createCheckpoint(
					`error_${task.id}`,
					`Error checkpoint for task: ${task.description} - ${error}`
				);
			}

			throw error;
		}
	}

	private async createCheckpoint(name: string, description: string): Promise<string> {
		const checkpointId = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// TODO: Implement actual checkpoint creation (git stash, file snapshot, etc.)
		console.log(`[OrchestratorAgent] Creating checkpoint ${checkpointId}: ${name}`);

		this._onCheckpointCreated.fire({
			checkpointId,
			name,
			description
		});

		return checkpointId;
	}

	private async delegateToExecutor(task: TaskDefinition, context: AgentContext): Promise<any> {
		// TODO: Implement actual executor delegation
		console.log(`[OrchestratorAgent] Delegating to executor: ${task.description}`);
		return { status: 'delegated', taskId: task.id };
	}

	private async delegateToVerifier(task: TaskDefinition, context: AgentContext): Promise<any> {
		// TODO: Implement actual verifier delegation
		console.log(`[OrchestratorAgent] Delegating to verifier: ${task.description}`);
		return { status: 'delegated', taskId: task.id };
	}

	private async searchCodebase(query: string, topK: number): Promise<any[]> {
		if (!this.semanticSearch) {
			console.warn('[OrchestratorAgent] Semantic search not available, returning empty results');
			return [];
		}

		try {
			return await this.semanticSearch.search(query, { topK });
		} catch (error) {
			console.error('[OrchestratorAgent] Semantic search failed:', error);
			return [];
		}
	}

	// Helper methods for plan creation
	private async estimateComplexity(task: AgentTask, searchResults: any[]): Promise<'low' | 'medium' | 'high'> {
		// Simple heuristic based on search results and task description
		const description = task.description.toLowerCase();

		if (searchResults.length === 0) {
			return 'low';
		}

		const complexKeywords = ['refactor', 'migrate', 'rewrite', 'restructure', 'architecture'];
		const hasComplexKeyword = complexKeywords.some(keyword => description.includes(keyword));

		if (hasComplexKeyword || searchResults.length > 10) {
			return 'high';
		} else if (searchResults.length > 5) {
			return 'medium';
		} else {
			return 'low';
		}
	}

	private async identifyRisks(task: AgentTask, searchResults: any[]): Promise<RiskAssessment[]> {
		const risks: RiskAssessment[] = [];
		const description = task.description.toLowerCase();

		// Check for breaking changes
		if (description.includes('api') || description.includes('interface')) {
			risks.push({
				type: 'breaking_change',
				description: 'May break existing API contracts',
				severity: 'medium',
				mitigation: 'Add versioning or backward compatibility'
			});
		}

		// Check for performance implications
		if (description.includes('loop') || description.includes('algorithm') || description.includes('performance')) {
			risks.push({
				type: 'performance',
				description: 'May impact performance',
				severity: 'medium',
				mitigation: 'Profile before and after changes'
			});
		}

		return risks;
	}

	private async estimateEffort(task: AgentTask, searchResults: any[]): Promise<number> {
		// Simple estimation: 5 minutes per file + 10 minutes base
		return 10 + (searchResults.length * 5);
	}

	private async identifyDependencies(task: AgentTask, searchResults: any[]): Promise<string[]> {
		// TODO: Implement actual dependency analysis
		return [];
	}

	private async determineApproach(task: AgentTask, searchResults: any[]): Promise<string> {
		const complexity = await this.estimateComplexity(task, searchResults);

		switch (complexity) {
			case 'low':
				return 'Direct implementation with single executor task';
			case 'medium':
				return 'Phased implementation with verification between phases';
			case 'high':
				return 'Incremental implementation with frequent checkpoints and user validation';
			default:
				return 'Standard implementation approach';
		}
	}

	private async createTasksFromAnalysis(
		task: AgentTask,
		analysis: PlanAnalysis
	): Promise<TaskDefinition[]> {
		const tasks: TaskDefinition[] = [];
		const baseId = `task_${Date.now()}`;

		// Always start with analysis task
		tasks.push({
			id: `${baseId}_analysis`,
			type: 'analysis',
			description: `Analyze requirements for: ${task.description}`,
			agent: 'executor',
			priority: 1,
			estimatedEffort: 5,
			dependencies: [],
			contextRequirements: {
				files: [],
				rules: ['analysis'],
				tools: ['read_file', 'search_codebase']
			},
			successCriteria: ['Requirements documented', 'Approach validated']
		});

		// Add implementation task
		tasks.push({
			id: `${baseId}_implementation`,
			type: 'implementation',
			description: `Implement: ${task.description}`,
			agent: 'executor',
			priority: 2,
			estimatedEffort: analysis.estimatedTime - 10, // Subtract analysis time
			dependencies: [`${baseId}_analysis`],
			contextRequirements: {
				files: analysis.dependencies,
				rules: ['implementation'],
				tools: ['read_file', 'write_file']
			},
			successCriteria: ['Code implemented', 'Tests passing']
		});

		// Add verification task
		tasks.push({
			id: `${baseId}_verification`,
			type: 'testing',
			description: `Verify implementation of: ${task.description}`,
			agent: 'verifier',
			priority: 3,
			estimatedEffort: 10,
			dependencies: [`${baseId}_implementation`],
			contextRequirements: {
				files: analysis.dependencies,
				rules: ['verification'],
				tools: ['lint', 'test']
			},
			successCriteria: ['All tests pass', 'No lint errors', 'Type checking passes']
		});

		return tasks;
	}

	private async createTaskDependencies(tasks: TaskDefinition[]): Promise<Map<string, string[]>> {
		const dependencies = new Map<string, string[]>();

		tasks.forEach(task => {
			dependencies.set(task.id, task.dependencies);
		});

		return dependencies;
	}

	private async createCheckpoints(
		tasks: TaskDefinition[],
		analysis: PlanAnalysis
	): Promise<CheckpointDefinition[]> {
		const checkpoints: CheckpointDefinition[] = [];

		// Add checkpoint before major implementation tasks
		const implementationTasks = tasks.filter(t => t.type === 'implementation');

		implementationTasks.forEach(task => {
			checkpoints.push({
				id: `checkpoint_before_${task.id}`,
				name: `Before ${task.id}`,
				description: `Checkpoint before implementing: ${task.description}`,
				trigger: 'before',
				taskId: task.id,
				automatic: true,
				rollbackOnFailure: true
			});

			checkpoints.push({
				id: `checkpoint_after_${task.id}`,
				name: `After ${task.id}`,
				description: `Checkpoint after implementing: ${task.description}`,
				trigger: 'after',
				taskId: task.id,
				automatic: analysis.complexity === 'high',
				rollbackOnFailure: false
			});

			checkpoints.push({
				id: `checkpoint_error_${task.id}`,
				name: `Error ${task.id}`,
				description: `Error checkpoint for: ${task.description}`,
				trigger: 'error',
				taskId: task.id,
				automatic: true,
				rollbackOnFailure: true
			});
		});

		return checkpoints;
	}

	private calculateOverallRisk(risks: RiskAssessment[]): 'low' | 'medium' | 'high' {
		if (risks.length === 0) {
			return 'low';
		}

		const riskScores = {
			'low': 1,
			'medium': 2,
			'high': 3
		};

		const maxSeverity = risks.reduce((max, risk) => {
			const score = riskScores[risk.severity];
			return score > max ? score : max;
		}, 0);

		if (maxSeverity >= 3) {
			return 'high';
		} else if (maxSeverity >= 2) {
			return 'medium';
		} else {
			return 'low';
		}
	}

	private validateTask(task: AgentTask): void {
		if (!task.id) {
			throw new Error('Task must have an ID');
		}

		if (!task.description || task.description.trim().length === 0) {
			throw new Error('Task must have a description');
		}

		if (task.retryCount < 0) {
			throw new Error('Retry count cannot be negative');
		}

		if (task.maxRetries < 0) {
			throw new Error('Max retries cannot be negative');
		}

		if (task.retryCount > task.maxRetries) {
			throw new Error(`Retry count (${task.retryCount}) exceeds max retries (${task.maxRetries})`);
		}
	}

	// Public API methods
	public async analyzeUserRequest(request: string): Promise<PlanAnalysis> {
		const task: AgentTask = {
			id: `analysis_${Date.now()}`,
			description: request,
			context: {
				relevantFiles: [],
				searchResults: [],
				projectRules: { global: [], project: [], session: [] },
				userPreferences: {
					language: 'typescript',
					codeStyle: 'standard',
					testingFramework: 'jest',
					securityLevel: 'medium',
					performancePriority: 'medium',
					accessibilityRequired: false
				},
				sessionState: {
					openFiles: [],
					recentChanges: [],
					checkpoints: []
				}
			},
			retryCount: 0,
			maxRetries: 3,
			createdAt: Date.now(),
			updatedAt: Date.now()
		};

		return this.analyzeRequest(task);
	}

	public async createPlanForRequest(request: string): Promise<ExecutionPlan> {
		const analysis = await this.analyzeUserRequest(request);

		const task: AgentTask = {
			id: `plan_${Date.now()}`,
			description: request,
			context: {
				relevantFiles: [],
				searchResults: [],
				projectRules: { global: [], project: [], session: [] },
				userPreferences: {
					language: 'typescript',
					codeStyle: 'standard',
					testingFramework: 'jest',
					securityLevel: 'medium',
					performancePriority: 'medium',
					accessibilityRequired: false
				},
				sessionState: {
					openFiles: [],
					recentChanges: [],
					checkpoints: []
				}
			},
			retryCount: 0,
			maxRetries: 3,
			createdAt: Date.now(),
			updatedAt: Date.now()
		};

		return this.createExecutionPlan(task, analysis);
	}

	public getPlan(planId: string): ExecutionPlan | undefined {
		return this.planCache.get(planId);
	}

	public getAllPlans(): ExecutionPlan[] {
		return Array.from(this.planCache.values());
	}

	public clearPlanCache(): void {
		this.planCache.clear();
	}

	public getTaskStatus(taskId: string): { status: string; result?: AgentResult } {
		if (this.completedTasks.has(taskId)) {
			return {
				status: 'completed',
				result: this.completedTasks.get(taskId)
			};
		} else if (this.activeTasks.has(taskId)) {
			return {
				status: 'in_progress'
			};
		} else if (this.taskQueue.some(t => t.id === taskId)) {
			return {
				status: 'queued'
			};
		} else {
			return {
				status: 'not_found'
			};
		}
	}

	public async queueTask(task: AgentTask): Promise<string> {
		this.validateTask(task);
		this.taskQueue.push(task);

		// Start processing if not already running
		if (this.activeTasks.size < this.MAX_PARALLEL_TASKS) {
			this.processQueue();
		}

		return task.id;
	}

	private async processQueue(): Promise<void> {
		while (this.taskQueue.length > 0 && this.activeTasks.size < this.MAX_PARALLEL_TASKS) {
			const task = this.taskQueue.shift();
			if (!task) break;

			this.activeTasks.set(task.id, task);

			// Execute task in background
			this.execute(task).then(result => {
				this.activeTasks.delete(task.id);
				this.completedTasks.set(task.id, result);

				// Continue processing queue
				this.processQueue();
			}).catch(error => {
				this.activeTasks.delete(task.id);
				console.error(`[OrchestratorAgent] Task ${task.id} failed:`, error);

				// Continue processing queue
				this.processQueue();
			});
		}
	}

	public getQueueStats(): {
		queued: number;
		active: number;
		completed: number;
	} {
		return {
			queued: this.taskQueue.length,
			active: this.activeTasks.size,
			completed: this.completedTasks.size
		};
	}

	public async retryTask(taskId: string): Promise<boolean> {
		const task = this.activeTasks.get(taskId) ||
			this.taskQueue.find(t => t.id === taskId) ||
			Array.from(this.completedTasks.values()).find(r => r.taskId === taskId)?.metadata?.originalTask;

		if (!task) {
			return false;
		}

		// Increment retry count
		task.retryCount++;

		if (task.retryCount > task.maxRetries) {
			console.warn(`[OrchestratorAgent] Task ${taskId} has exceeded max retries`);
			return false;
		}

		// Update timestamps
		task.updatedAt = Date.now();

		// Re-queue the task
		await this.queueTask(task);

		return true;
	}

	// Tool execution methods
	protected async executeTool(toolName: string, parameters: Record<string, any>): Promise<any> {
		const tool = this.tools.get(toolName);
		if (!tool) {
			throw new Error(`Tool not found: ${toolName}`);
		}

		this.validateToolParameters(tool, parameters);

		const startTime = Date.now();

		try {
			let result: any;

			switch (toolName) {
				case 'create_checkpoint':
					result = await this.createCheckpoint(parameters.name, parameters.description);
					break;
				case 'delegate_to_executor':
					result = await this.delegateToExecutor(parameters as any, {} as AgentContext);
					break;
				case 'delegate_to_verifier':
					result = await this.delegateToVerifier(parameters as any, {} as AgentContext);
					break;
				case 'analyze_complexity':
					result = await this.estimateComplexity(parameters as any, []);
					break;
				case 'search_codebase':
					result = await this.searchCodebase(parameters.query, parameters.topK || 10);
					break;
				case 'read_file':
					// TODO: Implement file reading
					result = { content: 'File content placeholder' };
					break;
				case 'log_message':
					console.log(`[OrchestratorAgent] ${parameters.message}`);
					result = { logged: true };
					break;
				default:
					throw new Error(`Tool not implemented: ${toolName}`);
			}

			const execution: ToolExecution = {
				tool: toolName,
				parameters,
				result,
				error: undefined,
				durationMs: Date.now() - startTime
			};

			this.executionHistory.push(execution);

			return result;

		} catch (error) {
			const execution: ToolExecution = {
				tool: toolName,
				parameters,
				result: undefined,
				error: error instanceof Error ? error.message : String(error),
				durationMs: Date.now() - startTime
			};

			this.executionHistory.push(execution);
			throw error;
		}
	}

	private validateToolParameters(tool: ToolDefinition, parameters: Record<string, any>): void {
		for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
			if (paramDef.required && !(paramName in parameters)) {
				throw new Error(`Missing required parameter: ${paramName}`);
			}

			if (paramName in parameters) {
				const value = parameters[paramName];
				const expectedType = paramDef.type;

				// Basic type checking
				if (expectedType === 'string' && typeof value !== 'string') {
					throw new Error(`Parameter ${paramName} must be a string`);
				} else if (expectedType === 'number' && typeof value !== 'number') {
					throw new Error(`Parameter ${paramName} must be a number`);
				} else if (expectedType === 'boolean' && typeof value !== 'boolean') {
					throw new Error(`Parameter ${paramName} must be a boolean`);
				} else if (expectedType === 'array' && !Array.isArray(value)) {
					throw new Error(`Parameter ${paramName} must be an array`);
				} else if (expectedType === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
					throw new Error(`Parameter ${paramName} must be an object`);
				}
			}
		}
	}

	public getExecutionHistory(): ToolExecution[] {
		return [...this.executionHistory];
	}

	public clearExecutionHistory(): void {
		this.executionHistory = [];
	}
}
			parameters: {
				request: {
					type: "string",
					description: "User request to analyze",
					required: true,
				},
				context: {
					type: "object",
					description: "Additional context for analysis",
					required: false,
				},
			},
			returns: {
				type: "object",
				description:
					"Analysis result with complexity assessment and recommendations",
			},
		});

		this.registerTool({
			name: "create_execution_plan",
			description: "Create a detailed execution plan for a task",
			parameters: {
				analysis: {
					type: "object",
					description: "Analysis result from analyze_request",
					required: true,
				},
				constraints: {
					type: "object",
					description: "Constraints for the plan (time, resources, etc.)",
					required: false,
				},
			},
			returns: {
				type: "object",
				description: "Detailed execution plan with tasks and dependencies",
			},
		});

		this.registerTool({
			name: "delegate_task",
			description: "Delegate a task to an appropriate agent",
			parameters: {
				task: {
					type: "object",
					description: "Task definition to delegate",
					required: true,
				},
				agent: {
					type: "string",
					description: "Agent type (executor, verifier, specialized)",
					required: true,
				},
			},
			returns: {
				type: "object",
				description: "Delegation result with task ID and agent assignment",
			},
		});

		this.registerTool({
			name: "monitor_progress",
			description: "Monitor progress of executing tasks",
			parameters: {
				taskIds: {
					type: "array",
					description: "Task IDs to monitor",
					required: true,
				},
			},
			returns: {
				type: "object",
				description: "Progress report with status and metrics",
			},
		});

		this.registerTool({
			name: "create_checkpoint",
			description: "Create a checkpoint for rollback safety",
			parameters: {
				name: {
					type: "string",
					description: "Checkpoint name",
					required: true,
				},
				description: {
					type: "string",
					description: "Checkpoint description",
					required: true,
				},
				taskId: {
					type: "string",
					description: "Associated task ID",
					required: false,
				},
			},
			returns: {
				type: "object",
				description: "Checkpoint creation result with ID",
			},
		});

		this.registerTool({
			name: "evaluate_risk",
			description: "Evaluate risks for a task or plan",
			parameters: {
				context: {
					type: "object",
					description: "Context for risk evaluation",
					required: true,
				},
				task: {
					type: "object",
					description: "Task to evaluate",
					required: false,
				},
			},
			returns: {
				type: "object",
				description: "Risk assessment with severity and mitigation",
			},
		});

		this.registerTool({
			name: "optimize_plan",
			description: "Optimize an execution plan for efficiency",
			parameters: {
				plan: {
					type: "object",
					description: "Plan to optimize",
					required: true,
				},
				constraints: {
					type: "object",
					description: "Optimization constraints",
					required: false,
				},
			},
			returns: {
				type: "object",
				description: "Optimized plan",
			},
		});
	}

	async execute(task: AgentTask): Promise<AgentResult> {
		const startTime = Date.now();
		this.validateTask(task);

		try {
			// Step 1: Analyze the request
			const analysis = await this.analyzeRequest(task);

			// Step 2: Create execution plan
			const plan = await this.createExecutionPlan(task, analysis);

			// Step 3: Validate plan with user if needed
			const shouldProceed = await this.validatePlanWithUser(task, plan);

			if (!shouldProceed) {
				return this.createSuccessResult(
					task,
					{ status: "cancelled", reason: "user_cancelled" },
					Date.now() - startTime,
				);
			}

			// Step 4: Create initial checkpoint
			await this.createInitialCheckpoint(task, plan);

			// Step 5: Execute plan
			const executionResult = await this.executePlan(task, plan);

			// Step 6: Generate final report
			const report = await this.generateExecutionReport(
				task,
				plan,
				executionResult,
			);

			return this.createSuccessResult(
				task,
				{
					status: "completed",
					planId: plan.id,
					report,
					executionResult,
				},
				Date.now() - startTime,
			);
		} catch (error) {
			return this.createErrorResult(
				task,
				error instanceof Error ? error.message : String(error),
				Date.now() - startTime,
				["Orchestrator execution failed"],
			);
		}
	}

	private async analyzeRequest(task: AgentTask): Promise<PlanAnalysis> {
		const startTime = Date.now();

		try {
			// Use semantic search to gather context
			const searchResults = await this.searchCodebase(task.description, 20);

			// Extract relevant files from search results
			const relevantFiles = this.extractRelevantFiles(searchResults);

			// Read project rules if available
			const projectRules = await this.readProjectRules(task.context);

			// Analyze complexity
			const complexity = this.assessComplexity(
				task.description,
				relevantFiles.length,
			);

			// Estimate effort
			const estimatedTime = this.estimateEffort(
				complexity,
				relevantFiles.length,
			);

			// Identify risks
			const risks = await this.identifyRisks(task.description, relevantFiles);

			// Identify dependencies
			const dependencies = await this.identifyDependencies(relevantFiles);

			const analysis: PlanAnalysis = {
				request: task.description,
				complexity,
				estimatedFiles: relevantFiles.length,
				estimatedTime,
				risks,
				dependencies,
				recommendedApproach: this.determineApproach(complexity, risks),
			};

			await this.executeTool("log_message", {
				level: "info",
				message: `Request analysis completed`,
				data: {
					complexity,
					estimatedFiles: relevantFiles.length,
					estimatedTime,
					risks: risks.length,
					durationMs: Date.now() - startTime,
				},
			});

			return analysis;
		} catch (error) {
			await this.executeTool("log_message", {
				level: "error",
				message: "Request analysis failed",
				data: { error: error instanceof Error ? error.message : String(error) },
			});
			throw error;
		}
	}

	private async createExecutionPlan(
		task: AgentTask,
		analysis: PlanAnalysis,
	): Promise<ExecutionPlan> {
		const startTime = Date.now();
		const planId = this.generateTaskId("plan");

		try {
			// Break down the request into subtasks
			const subtasks = await this.breakdownIntoTasks(task, analysis);

			// Determine task dependencies
			const dependencies = this.analyzeDependencies(subtasks);

			// Create checkpoints
			const checkpoints = this.createCheckpoints(subtasks, analysis.risks);

			// Optimize task order
			const optimizedTasks = this.optimizeTaskOrder(subtasks, dependencies);

			// Calculate estimated duration
			const estimatedDuration = this.calculateEstimatedDuration(optimizedTasks);

			// Assess overall risk level
			const riskLevel = this.assessOverallRiskLevel(analysis.risks);

			const plan: ExecutionPlan = {
				id: planId,
				tasks: optimizedTasks,
				dependencies,
				estimatedDuration,
				complexity: analysis.complexity,
				riskLevel,
				checkpoints,
			};

			// Cache the plan
			this.planCache.set(planId, plan);

			await this.executeTool("log_message", {
				level: "info",
				message: `Execution plan created`,
				data: {
					planId,
					tasks: optimizedTasks.length,
					estimatedDuration,
					complexity: analysis.complexity,
					riskLevel,
					durationMs: Date.now() - startTime,
				},
			});

			return plan;
		} catch (error) {
			await this.executeTool("log_message", {
				level: "error",
				message: "Plan creation failed",
				data: { error: error instanceof Error ? error.message : String(error) },
			});
			throw error;
		}
	}

	private async breakdownIntoTasks(
		task: AgentTask,
		analysis: PlanAnalysis,
	): Promise<TaskDefinition[]> {
		const tasks: TaskDefinition[] = [];
		let taskCounter = 1;

		// Always start with analysis task
		tasks.push({
			id: `${task.id}-analysis`,
			type: "analysis",
			description: `Analyze requirements and context for: ${task.description}`,
			agent: "executor",
			priority: 1,
			estimatedEffort: 5,
			dependencies: [],
			contextRequirements: {
				files: [],
				rules: ["analysis", "requirements"],
				tools: ["read_file", "search_codebase"],
			},
			successCriteria: [
				"Requirements clearly understood",
				"Context gathered from relevant files",
				"Edge cases identified",
			],
		});

		// Based on complexity, create implementation tasks
		if (analysis.complexity === "low") {
			// Single implementation task for low complexity
			tasks.push({
				id: `${task.id}-implementation`,
				type: "implementation",
				description: task.description,
				agent: "executor",
				priority: 2,
				estimatedEffort: 15,
				dependencies: [`${task.id}-analysis`],
				contextRequirements: {
					files: Array.from(new Set(analysis.dependencies)),
					rules: ["implementation", "coding_standards"],
					tools: ["read_file", "write_file", "search_codebase"],
				},
				successCriteria: [
					"Code changes implemented",
					"Follows project coding standards",
					"No syntax errors",
				],
			});
		} else {
			// Multiple implementation tasks for medium/high complexity
			const implementationParts = this.splitIntoParts(
				task.description,
				analysis.estimatedFiles,
			);

			implementationParts.forEach((part, index) => {
				tasks.push({
					id: `${task.id}-implementation-${index + 1}`,
					type: "implementation",
					description: part,
					agent: "executor",
					priority: 2 + index,
					estimatedEffort: 10,
					dependencies:
						index === 0
							? [`${task.id}-analysis`]
							: [`${task.id}-implementation-${index}`],
					contextRequirements: {
						files: analysis.dependencies.slice(index * 3, (index + 1) * 3),
						rules: ["implementation", "coding_standards"],
						tools: ["read_file", "write_file", "search_codebase"],
					},
					successCriteria: [
						`Part ${index + 1} implemented`,
						"Follows project coding standards",
						"No syntax errors",
					],
				});
			});
		}

		// Add testing tasks if needed
		if (
			analysis.complexity !== "low" ||
			analysis.risks.some((r) => r.severity === "high")
		) {
			tasks.push({
				id: `${task.id}-testing`,
				type: "testing",
				description: `Test changes for: ${task.description}`,
				agent: "verifier",
				priority: tasks.length + 1,
				estimatedEffort: 10,
				dependencies: tasks
					.filter((t) => t.type === "implementation")
					.map((t) => t.id),
				contextRequirements: {
					files: analysis.dependencies,
					rules: ["testing", "quality"],
					tools: ["run_tests", "lint_code"],
				},
				successCriteria: [
					"All tests pass",
					"No lint errors",
					"Code coverage maintained",
				],
			});
		}

		// Add documentation task for medium/high complexity
		if (analysis.complexity !== "low") {
			tasks.push({
				id: `${task.id}-documentation`,
				type: "documentation",
				description: `Document changes for: ${task.description}`,
				agent: "executor",
				priority: tasks.length + 1,
				estimatedEffort: 5,
				dependencies: tasks
					.filter((t) => t.type === "implementation")
					.map((t) => t.id),
				contextRequirements: {
					files: [],
					rules: ["documentation"],
					tools: ["read_file", "write_file"],
				},
				successCriteria: [
					"Changes documented",
					"README updated if needed",
					"Comments added to complex code",
				],
			});
		}

		return tasks;
	}

	private async executePlan(
		task: AgentTask,
		plan: ExecutionPlan,
	): Promise<Map<string, AgentResult>> {
		const results = new Map<string, AgentResult>();
		const taskQueue = [...plan.tasks];
		const completedTasks = new Set<string>();
		const failedTasks = new Set<string>();

		// Create task executor map
		const taskExecutors = new Map<string, Promise<AgentResult>>();

		while (taskQueue.length > 0 || taskExecutors.size > 0) {
			// Find tasks whose dependencies are satisfied
			const readyTasks = taskQueue.filter((t) =>
				t.dependencies.every((dep) => completedTasks.has(dep)),
			);

			// Start executing ready tasks (up to MAX_PARALLEL_TASKS)
			for (const readyTask of readyTasks) {
				if (taskExecutors.size >= this.MAX_PARALLEL_TASKS) {
					break;
				}

				// Remove from queue
				const taskIndex = taskQueue.findIndex((t) => t.id === readyTask.id);
				taskQueue.splice(taskIndex, 1);

				// Create checkpoint before task if needed
				const checkpoint = plan.checkpoints.find(
					(cp) => cp.trigger === "before" && cp.taskId === readyTask.id,
				);
				if (checkpoint?.automatic) {
					await this.executeTool("create_checkpoint", {
						name: checkpoint.name,
						description: checkpoint.description,
						taskId: readyTask.id,
					});
				}

				// Execute task
				const taskPromise = this.executeSubTask(readyTask, task.context);
				taskExecutors.set(readyTask.id, taskPromise);

				// Monitor task completion
				taskPromise
					.then((result) => {
						results.set(readyTask.id, result);

						if (result.success) {
							completedTasks.add(readyTask.id);
							// Create checkpoint after successful task if needed
							const successCheckpoint = plan.checkpoints.find(
								(cp) => cp.trigger === "after" && cp.taskId === readyTask.id,
							);
							if (successCheckpoint?.automatic) {
								this.executeTool("create_checkpoint", {
									name: successCheckpoint.name,
									description: successCheckpoint.description,
									taskId: readyTask.id,
								}).catch(console.error);
							}
						} else {
							failedTasks.add(readyTask.id);
							// Handle task failure
							this.handleTaskFailure(readyTask, result, plan);

							// Rollback if checkpoint exists
							const rollbackCheckpoint = plan.checkpoints.find(
								(cp) => cp.rollbackOnFailure && cp.taskId === readyTask.id,
							);
							if (rollbackCheckpoint) {
								this.executeTool("log_message", {
									level: "warning",
									message: `Rolling back due to task failure: ${readyTask.id}`,
									data: { error: result.error },
								}).catch(console.error);
							}
						}
					})
					.catch((error) => {
						// Handle unexpected errors
						failedTasks.add(readyTask.id);
						this.executeTool("log_message", {
							level: "error",
							message: `Task execution failed unexpectedly: ${readyTask.id}`,
							data: {
								error: error instanceof Error ? error.message : String(error),
							},
						}).catch(console.error);
					})
					.finally(() => {
						taskExecutors.delete(readyTask.id);
					});
			}

			// Wait for some tasks to complete if we're at max parallelism
			if (
				taskExecutors.size >= this.MAX_PARALLEL_TASKS &&
				taskExecutors.size > 0
			) {
				await Promise.race(taskExecutors.values());
			}

			// If no tasks are ready and none are executing, we have a deadlock
			if (
				readyTasks.length === 0 &&
				taskExecutors.size === 0 &&
				taskQueue.length > 0
			) {
				const unresolvedDeps = taskQueue
					.map((t) => ({
						task: t.id,
						dependencies: t.dependencies.filter(
							(dep) => !completedTasks.has(dep),
						),
					}))
					.filter((t) => t.dependencies.length > 0);

				throw new Error(
					`Execution deadlock detected. Unresolved dependencies: ${JSON.stringify(unresolvedDeps)}`,
				);
			}
		}

		// Wait for any remaining tasks
		if (taskExecutors.size > 0) {
			await Promise.all(taskExecutors.values());
		}

		return results;
	}

	private async executeSubTask(
		task: TaskDefinition,
		context: AgentContext,
	): Promise<AgentResult> {
		const startTime = Date.now();

		try {
			await this.executeTool("log_message", {
				level: "info",
				message: `Starting task: ${task.description}`,
				data: { taskId: task.id, type: task.type, agent: task.agent },
			});

			// In a real implementation, this would delegate to the appropriate agent
			// For now, simulate execution
			await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work

			const result: AgentResult = {
				success: true,
				taskId: task.id,
				output: { message: `Task ${task.id} completed successfully` },
				durationMs: Date.now() - startTime,
				metadata: {
					agent: task.agent,
					type: task.type,
					estimatedEffort: task.estimatedEffort,
					actualEffort: (Date.now() - startTime) / 60000, // minutes
				},
			};

			await this.executeTool("log_message", {
				level: "info",
				message: `Task completed: ${task.description}`,
				data: { taskId: task.id, durationMs: result.durationMs },
			});

			return result;
		} catch (error) {
			const durationMs = Date.now() - startTime;

			await this.executeTool("log_message", {
				level: "error",
				message: `Task failed: ${task.description}`,
				data: {
					taskId: task.id,
					error: error instanceof Error ? error.message : String(error),
					durationMs,
				},
			});

			return {
				success: false,
				taskId: task.id,
				output: null,
				error: error instanceof Error ? error.message : String(error),
				durationMs,
				metadata: {
					agent: task.agent,
					type: task.type,
					errorType: "execution_error",
				},
			};
		}
	}

	private handleTaskFailure(
		task: TaskDefinition,
		result: AgentResult,
		plan: ExecutionPlan,
	): void {
		// Log failure
		this.executeTool("log_message", {
			level: "warning",
			message: `Task failed: ${task.description}`,
			data: {
				taskId: task.id,
				error: result.error,
				retryCount: result.metadata?.retryCount || 0,
			},
		}).catch(console.error);

		// Check if retry is possible
		const maxRetries = 3;
		const currentRetry = result.metadata?.retryCount || 0;

		if (currentRetry < maxRetries) {
			this.executeTool("log_message", {
				level: "info",
				message: `Scheduling retry ${currentRetry + 1}/${maxRetries} for task: ${task.id}`,
				data: { taskId: task.id },
			}).catch(console.error);
		} else {
			this.executeTool("log_message", {
				level: "error",
				message: `Task ${task.id} exceeded maximum retries`,
				data: { taskId: task.id, maxRetries },
			}).catch(console.error);
		}
	}

	private async validatePlanWithUser(
		task: AgentTask,
		plan: ExecutionPlan,
	): Promise<boolean> {
		// For high complexity or high risk plans, always ask for user confirmation
		if (plan.complexity === "high" || plan.riskLevel === "high") {
			await this.executeTool("log_message", {
				level: "info",
				message: "Plan requires user confirmation due to high complexity/risk",
				data: {
					complexity: plan.complexity,
					riskLevel: plan.riskLevel,
					tasks: plan.tasks.length,
					estimatedDuration: plan.estimatedDuration,
				},
			});

			// In a real implementation, this would show a UI dialog
			// For now, assume user approves
			return true;
		}

		// For medium complexity, log details but auto-proceed
		if (plan.complexity === "medium") {
			await this.executeTool("log_message", {
				level: "info",
				message: "Medium complexity plan - proceeding automatically",
				data: {
					tasks: plan.tasks.length,
					estimatedDuration: plan.estimatedDuration,
				},
			});
		}

		return true;
	}

	private async createInitialCheckpoint(
		task: AgentTask,
		plan: ExecutionPlan,
	): Promise<void> {
		await this.executeTool("create_checkpoint", {
			name: `Before: ${task.description.substring(0, 50)}...`,
			description: `Initial checkpoint before executing plan: ${plan.id}`,
			taskId: task.id,
		});
	}

	private async generateExecutionReport(
		task: AgentTask,
		plan: ExecutionPlan,
		executionResults: Map<string, AgentResult>,
	): Promise<any> {
		const successfulTasks = Array.from(executionResults.values()).filter(
			(r) => r.success,
		);
		const failedTasks = Array.from(executionResults.values()).filter(
			(r) => !r.success,
		);

		const totalDuration = Array.from(executionResults.values()).reduce(
			(sum, r) => sum + r.durationMs,
			0,
		);

		const totalTokens = Array.from(executionResults.values()).reduce(
			(sum, r) => sum + (r.tokensUsed?.total || 0),
			0,
		);

		return {
			summary: {
				planId: plan.id,
				originalRequest: task.description,
				totalTasks: executionResults.size,
				successfulTasks: successfulTasks.length,
				failedTasks: failedTasks.length,
				successRate: (successfulTasks.length / executionResults.size) * 100,
				totalDurationMs: totalDuration,
				totalTokens: totalTokens,
				complexity: plan.complexity,
				riskLevel: plan.riskLevel,
			},
			taskDetails: Array.from(executionResults.entries()).map(
				([taskId, result]) => ({
					taskId,
					success: result.success,
					durationMs: result.durationMs,
					tokensUsed: result.tokensUsed,
					error: result.error,
					warnings: result.warnings,
				}),
			),
			recommendations: this.generateRecommendations(executionResults, plan),
			nextSteps: this.generateNextSteps(task, executionResults),
		};
	}

	private extractRelevantFiles(searchResults: any[]): URI[] {
		const uniqueUris = new Set<string>();
		const files: URI[] = [];

		for (const result of searchResults) {
			if (result.uri && !uniqueUris.has(result.uri)) {
				uniqueUris.add(result.uri);
				files.push(URI.parse(result.uri));
			}
		}

		return files;
	}

	private async readProjectRules(context: AgentContext): Promise<string[]> {
		// In a real implementation, this would read .codemavi/rules.md
		// For now, return default rules
		return [
			"Follow TypeScript best practices",
			"Write tests for new functionality",
			"Maintain code readability",
			"Add comments for complex logic",
		];
	}

	private assessComplexity(
		request: string,
		fileCount: number,
	): "low" | "medium" | "high" {
		const requestLength = request.length;
		const wordCount = request.split(/\s+/).length;

		if (fileCount <= 2 && wordCount <= 20 && requestLength <= 200) {
			return "low";
		} else if (fileCount <= 5 && wordCount <= 50 && requestLength <= 500) {
			return "medium";
		} else {
			return "high";
		}
	}

	private estimateEffort(
		complexity: "low" | "medium" | "high",
		fileCount: number,
	): number {
		const baseEffort = {
			low: 10,
			medium: 30,
			high: 60,
		}[complexity];

		return baseEffort + fileCount * 5;
	}

	private async identifyRisks(
		request: string,
		files: URI[],
	): Promise<RiskAssessment[]> {
		const risks: RiskAssessment[] = [];

		// Check for breaking change keywords
		const breakingKeywords = [
			"refactor",
			"rewrite",
			"migrate",
			"upgrade",
			"replace",
		];
		if (
			breakingKeywords.some((keyword) =>
				request.toLowerCase().includes(keyword),
			)
		) {
			risks.push({
				type: "breaking_change",
				description: "Request may involve breaking changes",
				severity: "medium",
				mitigation: "Create comprehensive tests and document changes",
			});
		}

		// Check for performance keywords
		const performanceKeywords = [
			"optimize",
			"performance",
			"speed",
			"efficiency",
			"bottleneck",
		];
		if (
			performanceKeywords.some((keyword) =>
				request.toLowerCase().includes(keyword),
			)
		) {
			risks.push({
				type: "performance",
				description: "Performance-related changes require careful testing",
				severity: "medium",
				mitigation: "Benchmark before and after changes",
			});
		}

		// Check for security keywords
		const securityKeywords = [
			"security",
			"auth",
			"authentication",
			"authorization",
			"encrypt",
		];
		if (
			securityKeywords.some((keyword) =>
				request.toLowerCase().includes(keyword),
			)
		) {
			risks.push({
				type: "security",
				description: "Security-related changes require expert review",
				severity: "high",
				mitigation: "Consult security guidelines and conduct security review",
			});
		}

		// Complexity risk based on file count
		if (files.length > 10) {
			risks.push({
				type: "complexity",
				description: `Large number of files affected (${files.length})`,
				severity: files.length > 20 ? "high" : "medium",
				mitigation: "Break down into smaller, manageable tasks",
			});
		}

		return risks;
	}

	private async identifyDependencies(files: URI[]): Promise<string[]> {
		// In a real implementation, this would analyze import/export statements
		// For now, return file paths
		return files.map((file) => file.toString());
	}

	private determineApproach(
		complexity: "low" | "medium" | "high",
		risks: RiskAssessment[],
	): string {
		if (complexity === "low" && risks.length === 0) {
			return "Direct implementation with basic testing";
		} else if (
			complexity === "medium" ||
			risks.some((r) => r.severity === "medium")
		) {
			return "Phased implementation with incremental testing";
		} else {
			return "Comprehensive planning with multiple checkpoints and extensive testing";
		}
	}

	private analyzeDependencies(tasks: TaskDefinition[]): Map<string, string[]> {
		const dependencies = new Map<string, string[]>();

		for (const task of tasks) {
			dependencies.set(task.id, task.dependencies);
		}

		return dependencies;
	}

	private createCheckpoints(
		tasks: TaskDefinition[],
		risks: RiskAssessment[],
	): CheckpointDefinition[] {
		const checkpoints: CheckpointDefinition[] = [];

		// Always create initial checkpoint
		checkpoints.push({
			id: "checkpoint-initial",
			name: "Initial State",
			description: "Before any changes",
			trigger: "before",
			automatic: true,
			rollbackOnFailure: true,
		});

		// Create checkpoints before high-risk tasks
		const highRiskTasks = tasks.filter(
			(task) =>
				task.type === "implementation" &&
				risks.some((r) => r.severity === "high"),
		);

		for (const task of highRiskTasks) {
			checkpoints.push({
				id: `checkpoint-before-${task.id}`,
				name: `Before ${task.type}`,
				description: `Checkpoint before ${task.description}`,
				trigger: "before",
				taskId: task.id,
				automatic: true,
				rollbackOnFailure: true,
			});
		}

		// Create checkpoint after all implementation tasks
		const implementationTasks = tasks.filter(
			(t) => t.type === "implementation",
		);
		if (implementationTasks.length > 0) {
			checkpoints.push({
				id: "checkpoint-after-implementation",
				name: "After Implementation",
				description: "All implementation tasks completed",
				trigger: "after",
				automatic: true,
				rollbackOnFailure: false,
			});
		}

		return checkpoints;
	}

	private optimizeTaskOrder(
		tasks: TaskDefinition[],
		dependencies: Map<string, string[]>,
	): TaskDefinition[] {
		// Simple topological sort
		const sorted: TaskDefinition[] = [];
		const visited = new Set<string>();
		const temp = new Set<string>();

		const visit = (taskId: string) => {
			if (temp.has(taskId)) {
				throw new Error(
					`Circular dependency detected involving task: ${taskId}`,
				);
			}

			if (!visited.has(taskId)) {
				temp.add(taskId);

				const taskDeps = dependencies.get(taskId) || [];
				for (const depId of taskDeps) {
					visit(depId);
				}

				temp.delete(taskId);
				visited.add(taskId);

				const task = tasks.find((t) => t.id === taskId);
				if (task) {
					sorted.push(task);
				}
			}
		};

		for (const task of tasks) {
			if (!visited.has(task.id)) {
				visit(task.id);
			}
		}

		return sorted;
	}

	private calculateEstimatedDuration(tasks: TaskDefinition[]): number {
		return tasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
	}

	private assessOverallRiskLevel(
		risks: RiskAssessment[],
	): "low" | "medium" | "high" {
		if (risks.some((r) => r.severity === "high")) {
			return "high";
		} else if (risks.some((r) => r.severity === "medium")) {
			return "medium";
		} else {
			return "low";
		}
	}

	private splitIntoParts(description: string, fileCount: number): string[] {
		const sentences = description
			.split(/[.!?]+/)
			.filter((s) => s.trim().length > 0);

		if (sentences.length <= 1 || fileCount <= 3) {
			return [description];
		}

		// Split into logical parts
		const parts: string[] = [];
		let currentPart = "";

		for (const sentence of sentences) {
			const trimmed = sentence.trim();
			if (currentPart.length + trimmed.length > 200) {
				parts.push(currentPart);
				currentPart = trimmed;
			} else {
				currentPart += (currentPart ? ". " : "") + trimmed;
			}
		}

		if (currentPart) {
			parts.push(currentPart);
		}

		return parts;
	}

	private generateRecommendations(
		executionResults: Map<string, AgentResult>,
		plan: ExecutionPlan,
	): string[] {
		const recommendations: string[] = [];
		const failedTasks = Array.from(executionResults.values()).filter(
			(r) => !r.success,
		);

		if (failedTasks.length > 0) {
			recommendations.push(
				"Review failed tasks and consider manual intervention",
			);
			recommendations.push(
				"Check for dependency issues or conflicting changes",
			);
		}

		if (plan.complexity === "high") {
			recommendations.push(
				"Consider breaking down future similar tasks into smaller units",
			);
		}

		if (plan.riskLevel === "high") {
			recommendations.push(
				"Conduct thorough testing before deploying to production",
			);
		}

		const totalDuration = Array.from(executionResults.values()).reduce(
			(sum, r) => sum + r.durationMs,
			0,
		);
		const estimatedDuration = plan.estimatedDuration * 60000; // Convert minutes to ms

		if (totalDuration > estimatedDuration * 1.5) {
			recommendations.push(
				"Tasks took longer than estimated - review estimation process",
			);
		}

		return recommendations;
	}

	private generateNextSteps(
		task: AgentTask,
		executionResults: Map<string, AgentResult>,
	): string[] {
		const nextSteps: string[] = [];
		const failedTasks = Array.from(executionResults.values()).filter(
			(r) => !r.success,
		);

		if (failedTasks.length === 0) {
			nextSteps.push("All tasks completed successfully");
			nextSteps.push("Consider running integration tests");
			nextSteps.push("Update documentation if needed");
		} else {
			nextSteps.push("Address failed tasks manually");
			nextSteps.push("Review error logs for root causes");
			nextSteps.push("Consider alternative approaches for failed tasks");
		}

		// Check if testing was performed
		const testingTasks = Array.from(executionResults.keys()).filter((id) =>
			id.includes("testing"),
		);
		if (testingTasks.length === 0) {
			nextSteps.push("Run comprehensive tests before deployment");
		}

		return nextSteps;
	}

	getPlanCache(): Map<string, ExecutionPlan> {
		return new Map(this.planCache);
	}

	clearPlanCache(): void {
		this.planCache.clear();
	}

	getPlan(planId: string): ExecutionPlan | undefined {
		return this.planCache.get(planId);
	}

	updatePlan(planId: string, updates: Partial<ExecutionPlan>): boolean {
		const plan = this.planCache.get(planId);
		if (!plan) return false;

		this.planCache.set(planId, {
			...plan,
			...updates,
			tasks: updates.tasks || plan.tasks,
			dependencies: updates.dependencies || plan.dependencies,
			checkpoints: updates.checkpoints || plan.checkpoints,
		});

		return true;
	}

	deletePlan(planId: string): boolean {
		return this.planCache.delete(planId);
	}

	async validatePlan(plan: ExecutionPlan): Promise<{
		valid: boolean;
		errors: string[];
		warnings: string[];
	}> {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Check for empty plan
		if (plan.tasks.length === 0) {
			errors.push("Plan has no tasks");
		}

		// Check for task ID uniqueness
		const taskIds = new Set<string>();
		for (const task of plan.tasks) {
			if (taskIds.has(task.id)) {
				errors.push(`Duplicate task ID: ${task.id}`);
			}
			taskIds.add(task.id);
		}

		// Check for circular dependencies
		try {
			this.optimizeTaskOrder(plan.tasks, plan.dependencies);
		} catch (error) {
			errors.push(
				`Circular dependency detected: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		// Check for invalid dependencies
		for (const [taskId, deps] of plan.dependencies) {
			for (const depId of deps) {
				if (!taskIds.has(depId)) {
					errors.push(`Task ${taskId} depends on non-existent task: ${depId}`);
				}
			}
		}

		// Check checkpoint references
		for (const checkpoint of plan.checkpoints) {
			if (checkpoint.taskId && !taskIds.has(checkpoint.taskId)) {
				warnings.push(
					`Checkpoint ${checkpoint.id} references non-existent task: ${checkpoint.taskId}`,
				);
			}
		}

		// Validate task definitions
		for (const task of plan.tasks) {
			if (!task.description || task.description.trim().length === 0) {
				errors.push(`Task ${task.id} has empty description`);
			}

			if (task.estimatedEffort <= 0) {
				warnings.push(`Task ${task.id} has zero or negative estimated effort`);
			}

			if (task.priority < 1) {
				warnings.push(`Task ${task.id} has priority less than 1`);
			}
		}

		// Check estimated duration vs sum of task efforts
		const totalEstimatedEffort = plan.tasks.reduce(
			(sum, task) => sum + task.estimatedEffort,
			0,
		);
		if (
			Math.abs(plan.estimatedDuration - totalEstimatedEffort) >
			totalEstimatedEffort * 0.2
		) {
			warnings.push(
				`Plan estimated duration (${plan.estimatedDuration}min) differs significantly from sum of task efforts (${totalEstimatedEffort}min)`,
			);
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	async estimateResources(plan: ExecutionPlan): Promise<{
		tokens: number;
		apiCalls: number;
		storage: number;
		duration: number;
	}> {
		// Simple estimation based on plan complexity
		const baseTokens = {
			low: 1000,
			medium: 5000,
			high: 15000,
		}[plan.complexity];

		const baseApiCalls = {
			low: 5,
			medium: 15,
			high: 30,
		}[plan.complexity];

		const baseStorage = {
			low: 1024, // 1KB
			medium: 10240, // 10KB
			high: 102400, // 100KB
		}[plan.complexity];

		// Adjust based on number of tasks
		const taskMultiplier = 1 + plan.tasks.length / 10;

		return {
			tokens: Math.round(baseTokens * taskMultiplier),
			apiCalls: Math.round(baseApiCalls * taskMultiplier),
			storage: Math.round(baseStorage * taskMultiplier),
			duration: plan.estimatedDuration,
		};
	}

	async getExecutionMetrics(planId: string): Promise<{
		tasks: number;
		completed: number;
		failed: number;
		successRate: number;
		averageDuration: number;
		totalTokens: number;
	}> {
		const plan = this.planCache.get(planId);
		if (!plan) {
			throw new Error(`Plan not found: ${planId}`);
		}

		// In a real implementation, this would query actual execution data
		// For now, return placeholder metrics
		return {
			tasks: plan.tasks.length,
			completed: Math.floor(plan.tasks.length * 0.8), // 80% completion rate
			failed: Math.floor(plan.tasks.length * 0.1), // 10% failure rate
			successRate: 0.9, // 90% success rate
			averageDuration: plan.estimatedDuration / plan.tasks.length,
			totalTokens: 5000, // placeholder
		};
	}
}
