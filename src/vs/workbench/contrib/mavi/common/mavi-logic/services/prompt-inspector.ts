/**
 * Code Mavi - Prompt Inspector and Layer System
 *
 * Provides transparency into agent prompts by showing the complete prompt
 * that gets sent to LLMs, including all rule layers and context injections.
 */

import { URI } from "../../../../base/common/uri.js";
import { IFileService } from "../../../../platform/files/common/files.js";
import { ILogService } from "../../../../platform/log/common/log.js";
import { Event, Emitter } from "../../../../base/common/event.js";
import { Disposable } from "../../../../base/common/lifecycle.js";
import { createDecorator } from "../../../../platform/instantiation/common/instantiation.js";
import { IRuleParserService, ParsedRules } from "./rule-parser.js";

export interface PromptLayer {
	id: string;
	name: string;
	description: string;
	content: string;
	priority: number;
	enabled: boolean;
	source: PromptLayerSource;
	metadata: {
		createdAt: number;
		updatedAt: number;
		version: string;
		tags: string[];
		language?: string;
		framework?: string;
	};
}

export interface PromptLayerSource {
	type: 'system' | 'global-rules' | 'project-rules' | 'session-rules' | 'context' | 'user';
	uri?: URI;
	author?: string;
}

export interface PromptContext {
	agentType: 'orchestrator' | 'executor' | 'verifier';
	taskId: string;
	projectRoot?: URI;
	openFiles: URI[];
	recentChanges: Array<{
		file: URI;
		change: string;
		timestamp: number;
	}>;
	userPreferences: Record<string, any>;
	sessionState: Record<string, any>;
	customVariables?: Record<string, string>;
}

export interface PromptInspection {
	id: string;
	timestamp: number;
	agentType: string;
	taskId: string;
	layers: PromptLayer[];
	finalPrompt: string;
	context: PromptContext;
	metadata: {
		tokenCount?: number;
		durationMs: number;
		model: string;
		temperature: number;
		maxTokens: number;
		success: boolean;
		error?: string;
	};
}

export interface PromptLayerConfig {
	maxPromptSize: number;
	maxLayers: number;
	enableDiffView: boolean;
	autoCapture: boolean;
	retentionDays: number;
	compressHistory: boolean;
}

export const DEFAULT_PROMPT_LAYER_CONFIG: PromptLayerConfig = {
	maxPromptSize: 100000, // 100KB
	maxLayers: 20,
	enableDiffView: true,
	autoCapture: true,
	retentionDays: 30,
	compressHistory: true
};

export interface IPromptInspectorService {
	readonly _serviceBrand: undefined;

	readonly onPromptCaptured: Event<PromptInspection>;
	readonly onLayerAdded: Event<{ layer: PromptLayer; position: number }>;
	readonly onLayerRemoved: Event<{ layerId: string }>;

	capturePrompt(
		agentType: string,
		taskId: string,
		context: PromptContext,
		model: string,
		temperature: number,
		maxTokens: number
	): Promise<PromptInspection>;

	buildPromptLayers(
		agentType: string,
		rules: ParsedRules,
		context: PromptContext
	): Promise<PromptLayer[]>;

	mergeLayers(layers: PromptLayer[]): Promise<string>;

	addCustomLayer(
		name: string,
		content: string,
		priority: number,
		source: PromptLayerSource
	): Promise<string>;

	removeLayer(layerId: string): Promise<void>;

	enableLayer(layerId: string): Promise<void>;
	disableLayer(layerId: string): Promise<void>;

	getInspection(inspectionId: string): Promise<PromptInspection | null>;
	getInspections(filters?: InspectionFilters): Promise<PromptInspection[]>;

	compareInspections(
		inspectionId1: string,
		inspectionId2: string
	): Promise<PromptComparison>;

	exportInspection(
		inspectionId: string,
		format: 'json' | 'markdown' | 'html'
	): Promise<string>;

	clearHistory(olderThanDays?: number): Promise<void>;

	getLayerTemplates(agentType: string): Promise<PromptLayer[]>;

	injectVariables(
		prompt: string,
		variables: Record<string, string>
	): Promise<string>;

	calculateTokenEstimate(prompt: string): Promise<number>;
}

export interface InspectionFilters {
	agentType?: string;
	taskId?: string;
	fromDate?: number;
	toDate?: number;
	successOnly?: boolean;
	minLayers?: number;
	maxLayers?: number;
	containsText?: string;
}

export interface PromptComparison {
	inspection1: PromptInspection;
	inspection2: PromptInspection;
	differences: Array<{
		type: 'layer-added' | 'layer-removed' | 'layer-changed' | 'context-changed';
		description: string;
		details?: any;
	}>;
	similarityScore: number;
}

export const IPromptInspectorService = createDecorator<IPromptInspectorService>('promptInspectorService');

export class PromptInspectorService extends Disposable implements IPromptInspectorService {
	readonly _serviceBrand: undefined;

	private readonly _onPromptCaptured = new Emitter<PromptInspection>();
	readonly onPromptCaptured = this._onPromptCaptured.event;

	private readonly _onLayerAdded = new Emitter<{ layer: PromptLayer; position: number }>();
	readonly onLayerAdded = this._onLayerAdded.event;

	private readonly _onLayerRemoved = new Emitter<{ layerId: string }>();
	readonly onLayerRemoved = this._onLayerRemoved.event;

	private config: PromptLayerConfig = DEFAULT_PROMPT_LAYER_CONFIG;
	private inspections: Map<string, PromptInspection> = new Map();
	private customLayers: Map<string, PromptLayer> = new Map();
	private readonly HISTORY_FILE = 'prompt-history.json';

	constructor(
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService,
		@IRuleParserService private readonly ruleParserService: IRuleParserService
	) {
		super();
		this.logService.info('[PromptInspector] Service initialized');
		this.loadHistory().catch(error => {
			this.logService.error('[PromptInspector] Failed to load history:', error);
		});
	}

	async capturePrompt(
		agentType: string,
		taskId: string,
		context: PromptContext,
		model: string,
		temperature: number,
		maxTokens: number
	): Promise<PromptInspection> {
		const startTime = Date.now();

		try {
			this.logService.info(`[PromptInspector] Capturing prompt for ${agentType} agent, task: ${taskId}`);

			// Load rules for this context
			const rules = await this.loadRulesForContext(context);

			// Build prompt layers
			const layers = await this.buildPromptLayers(agentType, rules, context);

			// Merge layers into final prompt
			const finalPrompt = await this.mergeLayers(layers);

			// Calculate token estimate
			const tokenCount = await this.calculateTokenEstimate(finalPrompt);

			// Create inspection record
			const inspectionId = `insp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const inspection: PromptInspection = {
				id: inspectionId,
				timestamp: Date.now(),
				agentType,
				taskId,
				layers,
				finalPrompt,
				context,
				metadata: {
					tokenCount,
					durationMs: Date.now() - startTime,
					model,
					temperature,
					maxTokens,
					success: true
				}
			};

			// Store inspection
			this.inspections.set(inspectionId, inspection);

			// Save to history
			await this.saveToHistory(inspection);

			// Fire event
			this._onPromptCaptured.fire(inspection);

			this.logService.info(`[PromptInspector] Prompt captured: ${inspectionId}, ${layers.length} layers, ${tokenCount} tokens`);

			return inspection;

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logService.error(`[PromptInspector] Failed to capture prompt:`, error);

			// Create failed inspection record
			const inspectionId = `insp_failed_${Date.now()}`;
			const inspection: PromptInspection = {
				id: inspectionId,
				timestamp: Date.now(),
				agentType,
				taskId,
				layers: [],
				finalPrompt: '',
				context,
				metadata: {
					durationMs: Date.now() - startTime,
					model,
					temperature,
					maxTokens,
					success: false,
					error: errorMessage
				}
			};

			this.inspections.set(inspectionId, inspection);
			return inspection;
		}
	}

	async buildPromptLayers(
		agentType: string,
		rules: ParsedRules,
		context: PromptContext
	): Promise<PromptLayer[]> {
		const layers: PromptLayer[] = [];

		// Layer 1: System base prompt
		layers.push(await this.createSystemLayer(agentType));

		// Layer 2: Global rules
		if (rules.global.length > 0) {
			layers.push(await this.createRulesLayer('global-rules', rules.global, context));
		}

		// Layer 3: Project rules
		if (rules.project.length > 0) {
			layers.push(await this.createRulesLayer('project-rules', rules.project, context));
		}

		// Layer 4: Session rules
		if (rules.session.length > 0) {
			layers.push(await this.createRulesLayer('session-rules', rules.session, context));
		}

		// Layer 5: Context layer
		layers.push(await this.createContextLayer(context));

		// Layer 6: Custom layers
		for (const layer of this.customLayers.values()) {
			if (layer.enabled) {
				layers.push(layer);
			}
		}

		// Sort layers by priority (descending)
		layers.sort((a, b) => b.priority - a.priority);

		return layers;
	}

	async mergeLayers(layers: PromptLayer[]): Promise<string> {
		let prompt = '# Code Mavi Agent Prompt\n\n';
		prompt += '*This prompt is automatically assembled from multiple layers*\n\n';

		// Add layer information
		prompt += '## Layer Composition\n\n';
		for (const layer of layers) {
			prompt += `### ${layer.name} (Priority: ${layer.priority})\n`;
			prompt += `*Source: ${layer.source.type}*\n\n`;
			prompt += layer.content + '\n\n';
		}

		// Add footer
		prompt += '---\n';
		prompt += '*Prompt assembled by Code Mavi Prompt Inspector*\n';
		prompt += `*Total layers: ${layers.length}*\n`;

		return prompt;
	}

	async addCustomLayer(
		name: string,
		content: string,
		priority: number,
		source: PromptLayerSource
	): Promise<string> {
		const layerId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const layer: PromptLayer = {
			id: layerId,
			name,
			description: `Custom layer: ${name}`,
			content,
			priority,
			enabled: true,
			source,
			metadata: {
				createdAt: Date.now(),
				updatedAt: Date.now(),
				version: '1.0.0',
				tags: ['custom']
			}
		};

		this.customLayers.set(layerId, layer);

		// Fire event
		this._onLayerAdded.fire({ layer, position: this.customLayers.size - 1 });

		this.logService.info(`[PromptInspector] Added custom layer: ${layerId}`);

		return layerId;
	}

	async removeLayer(layerId: string): Promise<void> {
		if (this.customLayers.has(layerId)) {
			this.customLayers.delete(layerId);
			this._onLayerRemoved.fire({ layerId });
			this.logService.info(`[PromptInspector] Removed custom layer: ${layerId}`);
		}
	}

	async enableLayer(layerId: string): Promise<void> {
		const layer = this.customLayers.get(layerId);
		if (layer && !layer.enabled) {
			layer.enabled = true;
			layer.metadata.updatedAt = Date.now();
			this.logService.info(`[PromptInspector] Enabled layer: ${layerId}`);
		}
	}

	async disableLayer(layerId: string): Promise<void> {
		const layer = this.customLayers.get(layerId);
		if (layer && layer.enabled) {
			layer.enabled = false;
			layer.metadata.updatedAt = Date.now();
			this.logService.info(`[PromptInspector] Disabled layer: ${layerId}`);
		}
	}

	async getInspection(inspectionId: string): Promise<PromptInspection | null> {
		return this.inspections.get(inspectionId) || null;
	}

	async getInspections(filters?: InspectionFilters): Promise<PromptInspection[]> {
		let inspections = Array.from(this.inspections.values());

		if (filters?.agentType) {
			inspections = inspections.filter(i => i.agentType === filters.agentType);
		}

		if (filters?.taskId) {
			inspections = inspections.filter(i => i.taskId === filters.taskId);
		}

		if (filters?.fromDate) {
			inspections = inspections.filter(i => i.timestamp >= filters.fromDate!);
		}

		if (filters?.toDate) {
			inspections = inspections.filter(i => i.timestamp <= filters.toDate!);
		}

		if (filters?.successOnly) {
			inspections = inspections.filter(i => i.metadata.success);
		}

		if (filters?.minLayers) {
			inspections = inspections.filter(i => i.layers.length >= filters.minLayers!);
		}

		if (filters?.maxLayers) {
			inspections = inspections.filter(i => i.layers.length <= filters.maxLayers!);
		}

		if (filters?.containsText) {
			const searchText = filters.containsText.toLowerCase();
			inspections = inspections.filter(i =>
				i.finalPrompt.toLowerCase().includes(searchText) ||
				i.layers.some(l => l.content.toLowerCase().includes(searchText))
			);
		}

		// Sort by timestamp (newest first)
		inspections.sort((a, b) => b.timestamp - a.timestamp);

		return inspections;
	}

	async compareInspections(
		inspectionId1: string,
		inspectionId2: string
	): Promise<PromptComparison> {
		const inspection1 = this.inspections.get(inspectionId1);
		const inspection2 = this.inspections.get(inspectionId2);

		if (!inspection1 || !inspection2) {
			throw new Error('One or both inspections not found');
		}

		const differences: PromptComparison['differences'] = [];

		// Compare layers
		const layers1 = inspection1.layers;
		const layers2 = inspection2.layers;

		// Find added/removed layers
		const layerIds1 = new Set(layers1.map(l => l.id));
		const layerIds2 = new Set(layers2.map(l => l.id));

		for (const layer of layers2) {
			if (!layerIds1.has(layer.id)) {
				differences.push({
					type: 'layer-added',
					description: `Layer added: ${layer.name}`,
					details: { layer }
				});
			}
		}

		for (const layer of layers1) {
			if (!layerIds2.has(layer.id)) {
				differences.push({
					type: 'layer-removed',
					description: `Layer removed: ${layer.name}`,
					details: { layer }
				});
			}
		}

		// Compare context
		if (JSON.stringify(inspection1.context) !== JSON.stringify(inspection2.context)) {
			differences.push({
				type: 'context-changed',
				description: 'Context changed',
				details: {
					context1: inspection1.context,
					context2: inspection2.context
				}
			});
		}

		// Calculate similarity score (simple implementation)
		const similarityScore = this.calculateSimilarity(
			inspection1.finalPrompt,
			inspection2.finalPrompt
		);

		return {
			inspection1,
			inspection2,
			differences,
			similarityScore
		};
	}

	async exportInspection(
		inspectionId: string,
		format: 'json' | 'markdown' | 'html'
	): Promise<string> {
		const inspection = this.inspections.get(inspectionId);
		if (!inspection) {
			throw new Error(`Inspection not found: ${inspectionId}`);
		}

		switch (format) {
			case 'json':
				return JSON.stringify(inspection, null, 2);

			case 'markdown':
				return this.exportToMarkdown(inspection);

			case 'html':
				return this.exportToHtml(inspection);

			default:
				throw new Error(`Unsupported export format: ${format}`);
		}
	}

	async clearHistory(olderThanDays?: number): Promise<void> {
		const cutoff = olderThanDays
			? Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
			: 0;

		const toDelete: string[] = [];

		for (const [id, inspection] of this.inspections) {
			if (inspection.timestamp < cutoff) {
				toDelete.push(id);
			}
		}

		for (const id of toDelete) {
			this.inspections.delete(id);
		}

		this.logService.info(`[PromptInspector] Cleared ${toDelete.length} inspections from history`);

	// Save updated history
	await this.saveHistory();
}

async getLayerTemplates(agentType: string): Promise<PromptLayer[]> {
	const templates: PromptLayer[] = [];

	// Base templates for each agent type
	const baseTemplates: Record<string, Partial<PromptLayer>> = {
		'orchestrator': {
			name: 'Orchestrator Base Prompt',
			description: 'Base system prompt for Orchestrator agent',
			content: `# Code Mavi Orchestrator Agent

You are the Orchestrator agent for Code Mavi. Your role is to:
1. Analyze user requests and understand requirements
2. Create detailed execution plans
3. Delegate tasks to specialized agents
4. Monitor progress and handle errors
5. Ensure quality and completeness

## Core Responsibilities
- Strategic planning and coordination
- Task decomposition and dependency analysis
- Resource allocation and optimization
- Quality assurance and validation`,
			priority: 100,
			source: { type: 'system', author: 'Code Mavi' }
		},
		'executor': {
			name: 'Executor Base Prompt',
			description: 'Base system prompt for Executor agent',
			content: `# Code Mavi Executor Agent

You are the Executor agent for Code Mavi. Your role is to:
1. Implement specific code changes based on instructions
2. Generate semantic diffs for changes
3. Follow coding standards and best practices
4. Validate your own work before submission

## Core Responsibilities
- Precise code modification
- Semantic diff generation
- Code quality assurance
- Self-validation and testing`,
			priority: 100,
			source: { type: 'system', author: 'Code Mavi' }
		},
		'verifier': {
			name: 'Verifier Base Prompt',
			description: 'Base system prompt for Verifier agent',
			content: `# Code Mavi Verifier Agent

You are the Verifier agent for Code Mavi. Your role is to:
1. Validate code changes made by Executor
2. Run comprehensive tests and checks
3. Identify and report issues
4. Ensure production readiness

## Core Responsibilities
- Syntax and type checking
- Lint and style validation
- Test execution and validation
- Security and performance analysis`,
			priority: 100,
			source: { type: 'system', author: 'Code Mavi' }
		}
	};

	const template = baseTemplates[agentType];
	if (template) {
		const layer: PromptLayer = {
			id: `template_${agentType}_${Date.now()}`,
			name: template.name!,
			description: template.description!,
			content: template.content!,
			priority: template.priority!,
			enabled: true,
			source: template.source!,
			metadata: {
				createdAt: Date.now(),
				updatedAt: Date.now(),
				version: '1.0.0',
				tags: ['template', 'system', agentType]
			}
		};
		templates.push(layer);
	}

	// Add common templates
	templates.push({
		id: `template_context_${Date.now()}`,
		name: 'Context Injection Template',
		description: 'Template for injecting dynamic context',
		content: `## Current Context

**Project:** {{PROJECT_NAME}}
**Language:** {{PROJECT_LANGUAGE}}
**Framework:** {{PROJECT_FRAMEWORK}}
**Task:** {{TASK_DESCRIPTION}}

**Open Files:**
{{OPEN_FILES}}

**Recent Changes:**
{{RECENT_CHANGES}}`,
		priority: 80,
		enabled: true,
		source: { type: 'context', author: 'Code Mavi' },
		metadata: {
			createdAt: Date.now(),
			updatedAt: Date.now(),
			version: '1.0.0',
			tags: ['template', 'context', 'dynamic']
		}
	});

	return templates;
}

async injectVariables(
	prompt: string,
	variables: Record<string, string>
): Promise<string> {
	let result = prompt;

	for (const [key, value] of Object.entries(variables)) {
		const placeholder = `{{${key}}}`;
		result = result.replace(new RegExp(placeholder, 'g'), value);
	}

	return result;
}

async calculateTokenEstimate(prompt: string): Promise<number> {
	// Simple token estimation: ~4 characters per token for English text
	// This is a rough estimate; actual tokenization depends on the model
	const charCount = prompt.length;
	const tokenEstimate = Math.ceil(charCount / 4);

	// Adjust for code (tends to have more tokens per character)
	const codeRatio = this.estimateCodeRatio(prompt);
	const adjustedEstimate = Math.ceil(tokenEstimate * (1 + codeRatio * 0.3));

	return adjustedEstimate;
}

// Private helper methods
private async loadRulesForContext(context: PromptContext): Promise<ParsedRules> {
	try {
		// Load global rules
		const globalRules = await this.ruleParserService.loadGlobalRules();

		// Load project rules if project root is available
		let projectRules: ParsedRules;
		if (context.projectRoot) {
			projectRules = await this.ruleParserService.loadProjectRules(context.projectRoot);
		} else {
			projectRules = {
				global: [],
				project: [],
				session: [],
				merged: '',
				validation: { valid: true, errors: [], warnings: [] }
			};
		}

		// Merge rules
		return await this.ruleParserService.mergeRules(
			globalRules.global,
			projectRules.project,
			[] // Session rules would come from context
		);

	} catch (error) {
		this.logService.error('[PromptInspector] Failed to load rules:', error);
		return {
			global: [],
			project: [],
			session: [],
			merged: '',
			validation: { valid: false, errors: ['Failed to load rules'], warnings: [] }
		};
	}
}

private async createSystemLayer(agentType: string): Promise<PromptLayer> {
	const templates = await this.getLayerTemplates(agentType);
	const systemTemplate = templates.find(t => t.name.includes('Base Prompt'));

	if (systemTemplate) {
		return systemTemplate;
	}

	// Fallback system layer
	return {
		id: `system_${agentType}_${Date.now()}`,
		name: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} System Prompt`,
		description: `Base system prompt for ${agentType} agent`,
		content: `# Code Mavi ${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent

You are a specialized AI agent working within the Code Mavi system.`,
		priority: 100,
		enabled: true,
		source: { type: 'system', author: 'Code Mavi' },
		metadata: {
			createdAt: Date.now(),
			updatedAt: Date.now(),
			version: '1.0.0',
			tags: ['system', 'base', agentType]
		}
	};
}

private async createRulesLayer(
	layerType: 'global-rules' | 'project-rules' | 'session-rules',
	rules: any[],
	context: PromptContext
): Promise<PromptLayer> {
	const layerName = layerType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

	// Generate rules content
	let content = `# ${layerName}\n\n`;

	if (rules.length === 0) {
		content += 'No rules defined.\n';
	} else {
		for (const rule of rules) {
			content += `## ${rule.title}\n\n`;
			if (rule.description) {
				content += `**Description:** ${rule.description}\n\n`;
			}
			content += rule.content + '\n\n';
		}
	}

	return {
		id: `${layerType}_${Date.now()}`,
		name: layerName,
		description: `${layerName} for this session`,
		content,
		priority: layerType === 'global-rules' ? 90 :
				 layerType === 'project-rules' ? 80 : 70,
		enabled: true,
		source: { type: layerType as any },
		metadata: {
			createdAt: Date.now(),
			updatedAt: Date.now(),
			version: '1.0.0',
			tags: ['rules', layerType]
		}
	};
}

private async createContextLayer(context: PromptContext): Promise<PromptLayer> {
	let content = '# Current Context\n\n';

	// Add agent type and task
	content += `**Agent:** ${context.agentType}\n`;
	content += `**Task ID:** ${context.taskId}\n\n`;

	// Add project information
	if (context.projectRoot) {
		content += `**Project:** ${context.projectRoot.fsPath}\n`;
	}

	// Add user preferences
	if (context.userPreferences && Object.keys(context.userPreferences).length > 0) {
		content += '\n## User Preferences\n\n';
		for (const [key, value] of Object.entries(context.userPreferences)) {
			content += `- **${key}:** ${value}\n`;
		}
	}

	// Add open files
	if (context.openFiles.length > 0) {
		content += '\n## Open Files\n\n';
		for (const file of context.openFiles.slice(0, 10)) { // Limit to 10 files
			content += `- ${file.fsPath}\n`;
		}
		if (context.openFiles.length > 10) {
			content += `- ... and ${context.openFiles.length - 10} more files\n`;
		}
	}

	// Add recent changes
	if (context.recentChanges.length > 0) {
		content += '\n## Recent Changes\n\n';
		for (const change of context.recentChanges.slice(0, 5)) { // Limit to 5 changes
			const timeAgo = Math.floor((Date.now() - change.timestamp) / 1000 / 60);
			content += `- ${change.file.fsPath}: ${change.change} (${timeAgo} minutes ago)\n`;
		}
	}

	// Add session state
	if (context.sessionState && Object.keys(context.sessionState).length > 0) {
		content += '\n## Session State\n\n';
		for (const [key, value] of Object.entries(context.sessionState)) {
			content += `- **${key}:** ${JSON.stringify(value)}\n`;
		}
	}

	// Add custom variables
	if (context.customVariables && Object.keys(context.customVariables).length > 0) {
		content += '\n## Custom Variables\n\n';
		for (const [key, value] of Object.entries(context.customVariables)) {
			content += `- **${key}:** ${value}\n`;
		}
	}

	return {
		id: `context_${Date.now()}`,
		name: 'Context Layer',
		description: 'Dynamic context information for this prompt',
		content,
		priority: 60,
		enabled: true,
		source: { type: 'context' },
		metadata: {
			createdAt: Date.now(),
			updatedAt: Date.now(),
			version: '1.0.0',
			tags: ['context', 'dynamic']
		}
	};
}

private calculateSimilarity(text1: string, text2: string): number {
	// Simple similarity calculation using Jaccard index on word sets
	const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
	const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));

	if (words1.size === 0 && words2.size === 0) return 1.0;
	if (words1.size === 0 || words2.size === 0) return 0.0;

	const intersection = new Set([...words1].filter(x => words2.has(x)));
	const union = new Set([...words1, ...words2]);

	return intersection.size / union.size;
}

private estimateCodeRatio(text: string): number {
	// Estimate what percentage of the text is code vs natural language
	const lines = text.split('\n');
	let codeLines = 0;
	let totalLines = lines.length;

	if (totalLines === 0) return 0.0;

	for (const line of lines) {
		const trimmed = line.trim();
		// Heuristics for code lines
		if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
			// Comments
			codeLines++;
		} else if (trimmed.includes('{') || trimmed.includes('}') || trimmed.includes(';')) {
			// Code-like syntax
			codeLines++;
		} else if (trimmed.match(/^\s*(function|class|const|let|var|import|export|if|for|while)\s/)) {
			// Code keywords
			codeLines++;
		} else if (trimmed.match(/[=<>!+\-*/%&|^~]/) && trimmed.length > 10) {
			// Operations in longer lines
			codeLines++;
		}
	}

	return codeLines / totalLines;
}

private async loadHistory(): Promise<void> {
	try {
		const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
		const historyPath = `${homeDir}/.codemavi/${this.HISTORY_FILE}`;
		const uri = URI.file(historyPath);

		if (await this.fileExists(uri)) {
			const content = await this.readFile(uri);
			const data = JSON.parse(content);

			if (data.inspections && Array.isArray(data.inspections)) {
				for (const inspection of data.inspections) {
					// Convert string dates back to numbers if needed
					if (typeof inspection.timestamp === 'string') {
						inspection.timestamp = new Date(inspection.timestamp).getTime();
					}
					this.inspections.set(inspection.id, inspection);
				}
				this.logService.info(`[PromptInspector] Loaded ${data.inspections.length} inspections from history`);
			}
		}
	} catch (error) {
		this.logService.error('[PromptInspector] Failed to load history:', error);
	}
}

private async saveToHistory(inspection: PromptInspection): Promise<void> {
	if (!this.config.autoCapture) {
		return;
	}

	try {
		// Apply retention policy
		const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
		const toDelete: string[] = [];

		for (const [id, oldInspection] of this.inspections) {
			if (oldInspection.timestamp < cutoff) {
				toDelete.push(id);
			}
		}

		for (const id of toDelete) {
			this.inspections.delete(id);
		}

		if (toDelete.length > 0) {
			this.logService.info(`[PromptInspector] Removed ${toDelete.length} old inspections`);
		}

		// Save updated history
		await this.saveHistory();

	} catch (error) {
		this.logService.error('[PromptInspector] Failed to save to history:', error);
	}
}

private async saveHistory(): Promise<void> {
	try {
		const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
		const codemaviDir = `${homeDir}/.codemavi`;
		const historyPath = `${codemaviDir}/${this.HISTORY_FILE}`;

		// Ensure directory exists
		const dirUri = URI.file(codemaviDir);
		await this.ensureDirectoryExists(dirUri);

		// Prepare data
		const inspections = Array.from(this.inspections.values());
		const data = {
			version: '1.0.0',
			savedAt: Date.now(),
			inspectionCount: inspections.length,
			inspections: inspections.map(inspection => ({
				...inspection,
				// Ensure timestamps are numbers
				timestamp: typeof inspection.timestamp === 'string'
					? new Date(inspection.timestamp).getTime()
					: inspection.timestamp
			}))
		};

		// Compress if enabled
		let content: string;
		if (this.config.compressHistory) {
			content = JSON.stringify(data);
		} else {
			content = JSON.stringify(data, null, 2);
		}

		// Write file
		const uri = URI.file(historyPath);
		await this.writeFile(uri, content);

		this.logService.debug(`[PromptInspector] Saved ${inspections.length} inspections to history`);

	} catch (error) {
		this.logService.error('[PromptInspector] Failed to save history:', error);
	}
}

private exportToMarkdown(inspection: PromptInspection): string {
	let markdown = `# Prompt Inspection: ${inspection.id}\n\n`;

	markdown += `## Metadata\n`;
	markdown += `- **Timestamp:** ${new Date(inspection.timestamp).toISOString()}\n`;
	markdown += `- **Agent Type:** ${inspection.agentType}\n`;
	markdown += `- **Task ID:** ${inspection.taskId}\n`;
	markdown += `- **Model:** ${inspection.metadata.model}\n`;
	markdown += `- **Temperature:** ${inspection.metadata.temperature}\n`;
	markdown += `- **Max Tokens:** ${inspection.metadata.maxTokens}\n`;
	markdown += `- **Token Estimate:** ${inspection.metadata.tokenCount || 'N/A'}\n`;
	markdown += `- **Duration:** ${inspection.metadata.durationMs}ms\n`;
	markdown += `- **Success:** ${inspection.metadata.success ? '✅ Yes' : '❌ No'}\n`;
	if (inspection.metadata.error) {
		markdown += `- **Error:** ${inspection.metadata.error}\n`;
	}
	markdown += `- **Total Layers:** ${inspection.layers.length}\n\n`;

	markdown += `## Layers\n\n`;
	for (let i = 0; i < inspection.layers.length; i++) {
		const layer = inspection.layers[i];
		markdown += `### ${i + 1}. ${layer.name} (Priority: ${layer.priority})\n\n`;
		markdown += `**Source:** ${layer.source.type}\n`;
		markdown += `**Enabled:** ${layer.enabled ? 'Yes' : 'No'}\n`;
		if (layer.description) {
			markdown += `**Description:** ${layer.description}\n`;
		}
		markdown += `\n${layer.content}\n\n`;
	}

	markdown += `## Final Prompt\n\n`;
	markdown += '```\n';
	markdown += inspection.finalPrompt;
	markdown += '\n```\n\n';

	markdown += `## Context\n\n`;
	markdown += '```json\n';
	markdown += JSON.stringify(inspection.context, null, 2);
	markdown += '\n```\n';

	return markdown;
}

private exportToHtml(inspection: PromptInspection): string {
	let html = `<!DOCTYPE html>
<html>
<head>
    <title>Prompt Inspection: ${inspection.id}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .layer { border: 1px solid #ddd; border-radius: 5px; margin-bottom: 15px; padding: 15px; }
        .layer-header { background: #e9e9e9; padding: 10px; border-radius: 3px; margin-bottom: 10px; }
        .prompt { background: #f8f8f8; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>Prompt Inspection: ${inspection.id}</h1>

    <div class="metadata">
        <h2>Metadata</h2>
        <p><strong>Timestamp:</strong> ${new Date(inspection.timestamp).toISOString()}</p>
        <p><strong>Agent Type:</strong> ${inspection.agentType}</p>
        <p><strong>Task ID:</strong> ${inspection.taskId}</p>
        <p><strong>Model:</strong> ${inspection.metadata.model}</p>
        <p><strong>Temperature:</strong> ${inspection.metadata.temperature}</p>
        <p><strong>Max Tokens:</strong> ${inspection.metadata.maxTokens}</p>
        <p><strong>Token Estimate:</strong> ${inspection.metadata.tokenCount || 'N/A'}</p>
        <p><strong>Duration:</strong> ${inspection.metadata.durationMs}ms</p>
        <p><strong>Success:</strong> <span class="${inspection.metadata.success ? 'success' : 'error'}">${inspection.metadata.success ? '✅ Yes' : '❌ No'}</span></p>`;

	if (inspection.metadata.error) {
		html += `<p><strong>Error:</strong> <span class="error">${inspection.metadata.error}</span></p>`;
	}

	html += `</div>

    <h2>Layers (${inspection.layers.length})</h2>`;

	for (let i = 0; i < inspection.layers.length; i++) {
		const layer = inspection.layers[i];
		html += `
    <div class="layer">
        <div class="layer-header">
            <h3>${i + 1}. ${layer.name} (Priority: ${layer.priority})</h3>
            <p><strong>Source:</strong> ${layer.source.type} | <strong>Enabled:</strong> ${layer.enabled ? 'Yes' : 'No'}</p>
        </div>
        ${layer.description ? `<p><em>${layer.description}</em></p>` : ''}
        <div class="prompt">${layer.content.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</div>
    </div>`;
	}

	html += `
    <h2>Final Prompt</h2>
    <div class="prompt">${inspection.finalPrompt.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</div>

    <h2>Context</h2>
    <div class="prompt">${JSON.stringify(inspection.context, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</div>
</body>
</html>`;

	return html;
}

private async readFile(uri: URI): Promise<string> {
	try {
		const content = await this.fileService.readFile(uri);
		return content.value.toString();
	} catch (error) {
		this.logService.error(\`[PromptInspector] Failed to read file \${uri.fsPath}:\`, error);
		throw new Error(\`Failed to read file: \${uri.fsPath}\`);
	}
}

private async writeFile(uri: URI, content: string): Promise<void> {
	try {
		await this.fileService.writeFile(uri, content);
	} catch (error) {
		this.logService.error(\`[PromptInspector] Failed to write file \${uri.fsPath}:\`, error);
		throw new Error(\`Failed to write file: \${uri.fsPath}\`);
	}
}

private async fileExists(uri: URI): Promise<boolean> {
	try {
		await this.fileService.stat(uri);
		return true;
	} catch (error) {
		return false;
	}
}

private async ensureDirectoryExists(uri: URI): Promise<void> {
	try {
		await this.fileService.createFolder(uri);
	} catch (error) {
		// Directory might already exist, ignore error
		this.logService.debug(\`[PromptInspector] Directory creation skipped: \${uri.fsPath}\`);
	}
}
