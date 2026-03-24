/**
 * Code Mavi IDE - Rule Parser and Manager
 *
 * Handles parsing, validation, and management of rule files for agent system prompts
 * Supports hierarchical rule inheritance: global → project → session
 */

import { URI } from "../../../../../../base/common/uri.js";
import { IFileService } from "../../../../../../platform/files/common/files.js";
import { ILogService } from "../../../../../../platform/log/common/log.js";
import { Event, Emitter } from "../../../../../../base/common/event.js";
import { Disposable } from "../../../../../../base/common/lifecycle.js";
import { createDecorator } from "../../../../../../platform/instantiation/common/instantiation.js";

export interface Rule {
	id: string;
	scope: "global" | "project" | "session";
	category: string;
	title: string;
	description: string;
	content: string;
	priority: number;
	enabled: boolean;
	metadata: {
		author?: string;
		createdAt: number;
		updatedAt: number;
		version: string;
		tags: string[];
		language?: string;
		framework?: string;
	};
}

export interface RuleSet {
	id: string;
	name: string;
	description: string;
	rules: Rule[];
	metadata: {
		version: string;
		createdAt: number;
		updatedAt: number;
		compatibleWith: string[];
	};
}

export interface ParsedRules {
	global: Rule[];
	project: Rule[];
	session: Rule[];
	merged: string; // Combined rules as markdown
	validation: {
		valid: boolean;
		errors: string[];
		warnings: string[];
	};
}

export interface RuleValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

export interface ValidationError {
	ruleId: string;
	message: string;
	severity: "error" | "warning";
	location?: {
		line: number;
		column: number;
	};
}

export interface ValidationWarning {
	ruleId: string;
	message: string;
	suggestion?: string;
}

export interface RuleParserConfig {
	maxRuleSize: number;
	maxRulesPerSet: number;
	allowedCategories: string[];
	requiredSections: string[];
	strictValidation: boolean;
}

export const DEFAULT_RULE_PARSER_CONFIG: RuleParserConfig = {
	maxRuleSize: 10000, // 10KB per rule
	maxRulesPerSet: 100,
	allowedCategories: [
		"architecture",
		"code-style",
		"security",
		"performance",
		"testing",
		"documentation",
		"deployment",
		"maintenance",
		"best-practices",
		"constraints",
	],
	requiredSections: ["title", "description", "content"],
	strictValidation: true,
};

export interface IRuleParserService {
	readonly _serviceBrand: undefined;

	readonly onRulesLoaded: Event<{ source: URI; ruleCount: number }>;
	readonly onRulesChanged: Event<{ source: URI; changes: string[] }>;
	readonly onValidationError: Event<ValidationError>;

	loadRules(uri: URI): Promise<ParsedRules>;
	loadGlobalRules(): Promise<ParsedRules>;
	loadProjectRules(projectRoot: URI): Promise<ParsedRules>;

	parseRuleFile(
		content: string,
		scope: "global" | "project" | "session",
	): Promise<Rule[]>;
	parseRuleContent(
		content: string,
		scope: "global" | "project" | "session",
	): Promise<Rule>;

	mergeRules(
		globalRules: Rule[],
		projectRules: Rule[],
		sessionRules: Rule[],
	): Promise<ParsedRules>;

	validateRule(rule: Rule): Promise<RuleValidationResult>;
	validateRuleSet(rules: Rule[]): Promise<RuleValidationResult>;

	generatePrompt(
		rules: ParsedRules,
		context?: Record<string, any>,
	): Promise<string>;

	saveRules(uri: URI, rules: Rule[]): Promise<void>;
	exportRules(
		rules: Rule[],
		format: "markdown" | "json" | "yaml",
	): Promise<string>;

	getRuleTemplate(category: string, language?: string): Promise<Rule>;
	createRuleSet(
		name: string,
		description: string,
		rules: Rule[],
	): Promise<RuleSet>;

	findRules(query: string, filters?: RuleFilters): Promise<Rule[]>;
	applyRuleOverrides(baseRules: Rule[], overrides: Rule[]): Promise<Rule[]>;
}

export interface RuleFilters {
	category?: string;
	scope?: "global" | "project" | "session";
	enabled?: boolean;
	tags?: string[];
	language?: string;
	framework?: string;
	minPriority?: number;
	maxPriority?: number;
}

export const IRuleParserService =
	createDecorator<IRuleParserService>("ruleParserService");

export class RuleParserService
	extends Disposable
	implements IRuleParserService
{
	readonly _serviceBrand: undefined;

	private readonly _onRulesLoaded = new Emitter<{
		source: URI;
		ruleCount: number;
	}>();
	readonly onRulesLoaded = this._onRulesLoaded.event;

	private readonly _onRulesChanged = new Emitter<{
		source: URI;
		changes: string[];
	}>();
	readonly onRulesChanged = this._onRulesChanged.event;

	private readonly _onValidationError = new Emitter<ValidationError>();
	readonly onValidationError = this._onValidationError.event;

	private config: RuleParserConfig = DEFAULT_RULE_PARSER_CONFIG;
	private ruleCache: Map<string, { rules: Rule[]; timestamp: number }> =
		new Map();
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	constructor(
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.logService.info("[RuleParser] Service initialized");
	}

	async loadRules(uri: URI): Promise<ParsedRules> {
		try {
			this.logService.info(`[RuleParser] Loading rules from: ${uri.fsPath}`);

			// Check cache first
			const cacheKey = uri.toString();
			const cached = this.ruleCache.get(cacheKey);
			if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
				this.logService.debug("[RuleParser] Using cached rules");
				return this.createParsedRules(cached.rules, "project");
			}

			// Read file
			const content = await this.readFile(uri);

			// Parse rules
			const rules = await this.parseRuleFile(content, "project");

			// Cache results
			this.ruleCache.set(cacheKey, {
				rules,
				timestamp: Date.now(),
			});

			// Fire event
			this._onRulesLoaded.fire({ source: uri, ruleCount: rules.length });

			return this.createParsedRules(rules, "project");
		} catch (error) {
			this.logService.error(
				`[RuleParser] Failed to load rules from ${uri.fsPath}:`,
				error,
			);
			throw error;
		}
	}

	async loadGlobalRules(): Promise<ParsedRules> {
		try {
			// Default global rules path: ~/.mavi/global-rules.md
			const homeDir = process.env.HOME || process.env.USERPROFILE || ".";
			const globalRulesPath = `${homeDir}/.mavi/global-rules.md`;
			const uri = URI.file(globalRulesPath);

			// Check if file exists
			const exists = await this.fileExists(uri);
			if (!exists) {
				this.logService.info(
					"[RuleParser] Global rules file not found, using defaults",
				);
				return this.createParsedRules([], "global");
			}

			return this.loadRules(uri);
		} catch (error) {
			this.logService.error("[RuleParser] Failed to load global rules:", error);
			return this.createParsedRules([], "global");
		}
	}

	async loadProjectRules(projectRoot: URI): Promise<ParsedRules> {
		try {
			const rulesPath = URI.joinPath(projectRoot, ".mavi", "rules.md");

			// Check if file exists
			const exists = await this.fileExists(rulesPath);
			if (!exists) {
				this.logService.info("[RuleParser] Project rules file not found");
				return this.createParsedRules([], "project");
			}

			return this.loadRules(rulesPath);
		} catch (error) {
			this.logService.error(
				"[RuleParser] Failed to load project rules:",
				error,
			);
			return this.createParsedRules([], "project");
		}
	}

	async parseRuleFile(
		content: string,
		scope: "global" | "project" | "session",
	): Promise<Rule[]> {
		const rules: Rule[] = [];
		const lines = content.split("\n");

		let currentRule: Partial<Rule> = {};
		let inRule = false;
		let currentSection = "";
		let ruleStartLine = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// Rule start: ## [Category] Title
			if (line.startsWith("## ") && line.includes("]")) {
				// Save previous rule if exists
				if (inRule && currentRule.content) {
					const rule = await this.finalizeRule(
						currentRule,
						scope,
						ruleStartLine,
					);
					if (rule) {
						rules.push(rule);
					}
				}

				// Start new rule
				const match = line.match(/^## \[([^\]]+)\] (.+)$/);
				if (match) {
					currentRule = {
						category: match[1].toLowerCase(),
						title: match[2],
						scope,
						priority: 50, // Default priority
						enabled: true,
					};
					inRule = true;
					ruleStartLine = i;
					currentSection = "title";
				}
			}

			// Rule description: Starts with "**Description:**"
			else if (inRule && line.startsWith("**Description:**")) {
				currentRule.description = line.replace("**Description:**", "").trim();
				currentSection = "description";
			}

			// Priority: **Priority:** X (1-100)
			else if (inRule && line.startsWith("**Priority:**")) {
				const priorityMatch = line.match(/\*\*Priority:\*\*\s*(\d+)/);
				if (priorityMatch) {
					currentRule.priority = parseInt(priorityMatch[1], 10);
				}
			}

			// Enabled: **Enabled:** true/false
			else if (inRule && line.startsWith("**Enabled:**")) {
				const enabledMatch = line.match(/\*\*Enabled:\*\*\s*(true|false)/i);
				if (enabledMatch) {
					currentRule.enabled = enabledMatch[1].toLowerCase() === "true";
				}
			}

			// Tags: **Tags:** tag1, tag2, tag3
			else if (inRule && line.startsWith("**Tags:**")) {
				const tags = line
					.replace("**Tags:**", "")
					.split(",")
					.map((t) => t.trim())
					.filter((t) => t);
				if (!currentRule.metadata) {
					currentRule.metadata = {
						createdAt: Date.now(),
						updatedAt: Date.now(),
						version: "1.0.0",
						tags: [],
					};
				}
				currentRule.metadata.tags = tags;
			}

			// Language/Framework: **Language:**, **Framework:**
			else if (
				inRule &&
				(line.startsWith("**Language:**") || line.startsWith("**Framework:**"))
			) {
				if (!currentRule.metadata) {
					currentRule.metadata = {
						createdAt: Date.now(),
						updatedAt: Date.now(),
						version: "1.0.0",
						tags: [],
					};
				}

				if (line.startsWith("**Language:**")) {
					currentRule.metadata.language = line
						.replace("**Language:**", "")
						.trim();
				} else {
					currentRule.metadata.framework = line
						.replace("**Framework:**", "")
						.trim();
				}
			}

			// Rule content (after empty line following description)
			else if (inRule && currentSection === "description" && line === "") {
				currentSection = "content";
				currentRule.content = "";
			}

			// Collect content lines
			else if (inRule && currentSection === "content" && line !== "") {
				if (!currentRule.content) {
					currentRule.content = line;
				} else {
					currentRule.content += "\n" + line;
				}
			}

			// End of rule (empty line or new rule)
			else if (
				inRule &&
				(line === "" || line.startsWith("#")) &&
				currentSection === "content"
			) {
				if (currentRule.content) {
					const rule = await this.finalizeRule(
						currentRule,
						scope,
						ruleStartLine,
					);
					if (rule) {
						rules.push(rule);
					}
				}
				inRule = false;
				currentRule = {};
			}
		}

		// Don't forget the last rule
		if (inRule && currentRule.content) {
			const rule = await this.finalizeRule(currentRule, scope, ruleStartLine);
			if (rule) {
				rules.push(rule);
			}
		}

		// Validate the rule set
		const validation = await this.validateRuleSet(rules);
		if (!validation.valid && this.config.strictValidation) {
			const errorMessages = validation.errors
				.map((e) => `${e.ruleId}: ${e.message}`)
				.join(", ");
			throw new Error(`Rule validation failed: ${errorMessages}`);
		}

		return rules;
	}

	async parseRuleContent(
		content: string,
		scope: "global" | "project" | "session",
	): Promise<Rule> {
		// Create a temporary rule file with this content
		const tempContent = `## [custom] Custom Rule\n\n**Description:** Custom rule\n\n${content}`;
		const rules = await this.parseRuleFile(tempContent, scope);

		if (rules.length === 0) {
			throw new Error("Failed to parse rule content");
		}

		// Customize the rule
		const rule = rules[0];
		rule.id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		rule.title = "Custom Rule";
		rule.description = "Rule parsed from custom content";

		return rule;
	}

	async mergeRules(
		globalRules: Rule[],
		projectRules: Rule[],
		sessionRules: Rule[],
	): Promise<ParsedRules> {
		this.logService.info("[RuleParser] Merging rules from all scopes");

		// Filter enabled rules
		const enabledGlobal = globalRules.filter((r) => r.enabled);
		const enabledProject = projectRules.filter((r) => r.enabled);
		const enabledSession = sessionRules.filter((r) => r.enabled);

		// Apply overrides: session → project → global
		let mergedRules = [...enabledGlobal];

		// Project rules override global rules with same category/title
		for (const projectRule of enabledProject) {
			const existingIndex = mergedRules.findIndex(
				(r) =>
					r.category === projectRule.category && r.title === projectRule.title,
			);

			if (existingIndex !== -1) {
				mergedRules[existingIndex] = projectRule;
			} else {
				mergedRules.push(projectRule);
			}
		}

		// Session rules override everything
		for (const sessionRule of enabledSession) {
			const existingIndex = mergedRules.findIndex(
				(r) =>
					r.category === sessionRule.category && r.title === sessionRule.title,
			);

			if (existingIndex !== -1) {
				mergedRules[existingIndex] = sessionRule;
			} else {
				mergedRules.push(sessionRule);
			}
		}

		// Sort by priority (descending) and category
		mergedRules.sort((a, b) => {
			if (a.priority !== b.priority) {
				return b.priority - a.priority; // Higher priority first
			}
			return a.category.localeCompare(b.category);
		});

		// Generate merged markdown
		const mergedMarkdown = this.generateMergedMarkdown(mergedRules);

		// Validate merged rules
		const validation = await this.validateRuleSet(mergedRules);

		return {
			global: enabledGlobal,
			project: enabledProject,
			session: enabledSession,
			merged: mergedMarkdown,
			validation: {
				valid: validation.valid,
				errors: validation.errors.map((e) => `${e.ruleId}: ${e.message}`),
				warnings: validation.warnings.map((w) => `${w.ruleId}: ${w.message}`),
			},
		};
	}

	async validateRule(rule: Rule): Promise<RuleValidationResult> {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// Check required fields
		if (!rule.id) {
			errors.push({
				ruleId: "unknown",
				message: "Rule must have an ID",
				severity: "error",
			});
		}

		if (!rule.title || rule.title.trim().length === 0) {
			errors.push({
				ruleId: rule.id || "unknown",
				message: "Rule must have a title",
				severity: "error",
			});
		}

		if (!rule.description || rule.description.trim().length === 0) {
			warnings.push({
				ruleId: rule.id || "unknown",
				message: "Rule should have a description",
				suggestion: "Add a description to explain the rule",
			});
		}

		if (!rule.content || rule.content.trim().length === 0) {
			errors.push({
				ruleId: rule.id || "unknown",
				message: "Rule must have content",
				severity: "error",
			});
		}

		// Check category
		if (!this.config.allowedCategories.includes(rule.category)) {
			warnings.push({
				ruleId: rule.id || "unknown",
				message: `Category '${rule.category}' is not in allowed categories`,
				suggestion: `Use one of: ${this.config.allowedCategories.join(", ")}`,
			});
		}

		// Check priority range
		if (rule.priority < 1 || rule.priority > 100) {
			warnings.push({
				ruleId: rule.id || "unknown",
				message: `Priority ${rule.priority} is outside recommended range (1-100)`,
				suggestion: "Use priority between 1 and 100",
			});
		}

		// Check content size
		if (rule.content.length > this.config.maxRuleSize) {
			errors.push({
				ruleId: rule.id || "unknown",
				message: `Rule content exceeds maximum size (${this.config.maxRuleSize} characters)`,
				severity: "error",
			});
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	async validateRuleSet(rules: Rule[]): Promise<RuleValidationResult> {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// Check total number of rules
		if (rules.length > this.config.maxRulesPerSet) {
			warnings.push({
				ruleId: "ruleset",
				message: `Rule set has ${rules.length} rules, exceeding recommended maximum of ${this.config.maxRulesPerSet}`,
				suggestion: "Consider splitting rules into multiple files",
			});
		}

		// Validate each rule
		for (const rule of rules) {
			const result = await this.validateRule(rule);
			errors.push(...result.errors);
			warnings.push(...result.warnings);
		}

		// Check for duplicate rule IDs
		const ruleIds = rules.map((r) => r.id);
		const duplicateIds = ruleIds.filter(
			(id, index) => ruleIds.indexOf(id) !== index,
		);
		if (duplicateIds.length > 0) {
			errors.push({
				ruleId: "ruleset",
				message: `Duplicate rule IDs found: ${Array.from(new Set(duplicateIds)).join(", ")}`,
				severity: "error",
			});
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	async generatePrompt(
		rules: ParsedRules,
		context?: Record<string, any>,
	): Promise<string> {
		let prompt = "# Code Mavi IDE Agent Rules\n\n";

		// Add context information
		if (context) {
			prompt += "## Context\n\n";
			for (const [key, value] of Object.entries(context)) {
				prompt += `- **${key}:** ${value}\n`;
			}
			prompt += "\n";
		}

		// Add rule scope information
		prompt += "## Rule Scope\n\n";
		prompt += `- Global rules: ${rules.global.length}\n`;
		prompt += `- Project rules: ${rules.project.length}\n`;
		prompt += `- Session rules: ${rules.session.length}\n`;
		prompt += `- Total active rules: ${rules.global.length + rules.project.length + rules.session.length}\n\n`;

		// Add validation status
		if (!rules.validation.valid) {
			prompt += "## ⚠️ Validation Warnings\n\n";
			prompt += rules.validation.errors.map((e) => `- ❌ ${e}`).join("\n");
			prompt += "\n\n";
			if (rules.validation.warnings.length > 0) {
				prompt += rules.validation.warnings.map((w) => `- ⚠️ ${w}`).join("\n");
				prompt += "\n\n";
			}
		}

		// Add merged rules content
		prompt += "## Rules\n\n";
		prompt += rules.merged;

		// Add footer
		prompt += "\n---\n";
		prompt +=
			"*These rules are automatically merged from global, project, and session sources.*\n";
		prompt += "*Higher priority rules override lower priority ones.*\n";

		return prompt;
	}

	async saveRules(uri: URI, rules: Rule[]): Promise<void> {
		try {
			this.logService.info(`[RuleParser] Saving rules to: ${uri.fsPath}`);

			// Validate rules before saving
			const validation = await this.validateRuleSet(rules);
			if (!validation.valid && this.config.strictValidation) {
				const errorMessages = validation.errors
					.map((e) => e.message)
					.join(", ");
				throw new Error(`Cannot save invalid rules: ${errorMessages}`);
			}

			// Generate markdown content
			const content = this.generateRuleFileContent(rules);

			// Ensure directory exists
			const dirUri = URI.joinPath(uri, "..");
			await this.ensureDirectoryExists(dirUri);

			// Write file
			await this.writeFile(uri, content);

			// Clear cache
			this.ruleCache.delete(uri.toString());

			// Fire change event
			this._onRulesChanged.fire({
				source: uri,
				changes: rules.map((r) => r.id),
			});

			this.logService.info(
				`[RuleParser] Saved ${rules.length} rules to ${uri.fsPath}`,
			);
		} catch (error) {
			this.logService.error(
				`[RuleParser] Failed to save rules to ${uri.fsPath}:`,
				error,
			);
			throw error;
		}
	}

	async exportRules(
		rules: Rule[],
		format: "markdown" | "json" | "yaml",
	): Promise<string> {
		switch (format) {
			case "markdown":
				return this.generateRuleFileContent(rules);

			case "json":
				return JSON.stringify(
					{
						version: "1.0.0",
						rules: rules.map((rule) => ({
							...rule,
							metadata: {
								...rule.metadata,
								exportedAt: Date.now(),
							},
						})),
						exportedAt: Date.now(),
					},
					null,
					2,
				);

			case "yaml":
				const yamlContent = `# Code Mavi IDE Rules Export
version: '1.0.0'
exportedAt: ${Date.now()}
rules:
${rules
	.map(
		(rule) => `  - id: ${rule.id}
    title: ${rule.title}
    category: ${rule.category}
    scope: ${rule.scope}
    priority: ${rule.priority}
    enabled: ${rule.enabled}
    description: ${rule.description}
    content: |
      ${rule.content.replace(/\n/g, "\n      ")}
    metadata:
      createdAt: ${rule.metadata.createdAt}
      updatedAt: ${rule.metadata.updatedAt}
      version: ${rule.metadata.version}
      tags: [${rule.metadata.tags.map((t) => `'${t}'`).join(", ")}]
      ${rule.metadata.language ? `language: ${rule.metadata.language}` : ""}
      ${rule.metadata.framework ? `framework: ${rule.metadata.framework}` : ""}
`,
	)
	.join("\n")}`;
				return yamlContent;

			default:
				throw new Error(`Unsupported export format: ${format}`);
		}
	}

	async getRuleTemplate(category: string, language?: string): Promise<Rule> {
		const templates: Record<string, Partial<Rule>> = {
			"code-style": {
				title: "Code Style Guidelines",
				description: "Rules for code formatting and style consistency",
				content: `# Code Style Rules

## Indentation
- Use 2 spaces for indentation (not tabs)
- Maximum line length: 80 characters

## Naming Conventions
- Variables: camelCase
- Functions: camelCase
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE

## Comments
- Use JSDoc-style comments for public APIs
- Keep comments up-to-date with code changes
- Avoid obvious comments

## Best Practices
- Prefer const over let
- Avoid global variables
- Use strict equality (===)`,
				priority: 70,
				metadata: {
					tags: ["style", "formatting", "conventions"],
				},
			},
			security: {
				title: "Security Guidelines",
				description: "Security best practices and vulnerability prevention",
				content: `# Security Rules

## Input Validation
- Always validate user input
- Sanitize data before processing
- Use parameterized queries for databases

## Authentication & Authorization
- Implement proper authentication
- Use secure password hashing (bcrypt, Argon2)
- Implement role-based access control

## Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper session management

## Common Vulnerabilities
- Prevent SQL injection
- Prevent XSS attacks
- Prevent CSRF attacks`,
				priority: 90,
				metadata: {
					tags: ["security", "authentication", "encryption"],
				},
			},
			testing: {
				title: "Testing Guidelines",
				description: "Rules for writing and maintaining tests",
				content: `# Testing Rules

## Test Structure
- Follow AAA pattern (Arrange, Act, Assert)
- One assertion per test (when possible)
- Use descriptive test names

## Coverage
- Aim for >80% code coverage
- Test edge cases and error conditions
- Include integration tests

## Best Practices
- Tests should be independent
- Use mocking for external dependencies
- Keep tests fast and reliable`,
				priority: 60,
				metadata: {
					tags: ["testing", "quality", "coverage"],
				},
			},
		};

		const template = templates[category] || {
			title: `Custom ${category} Rule`,
			description: `Rules for ${category}`,
			content: `# ${category.charAt(0).toUpperCase() + category.slice(1)} Rules\n\nAdd your rules here.`,
			priority: 50,
			metadata: {
				tags: [category],
			},
		};

		const ruleId = `template_${category}_${Date.now()}`;

		return {
			id: ruleId,
			scope: "project",
			category,
			title: template.title!,
			description: template.description!,
			content: template.content!,
			priority: template.priority!,
			enabled: true,
			metadata: {
				author: "Code Mavi IDE",
				createdAt: Date.now(),
				updatedAt: Date.now(),
				version: "1.0.0",
				tags: template.metadata?.tags || [category],
				language,
				framework: template.metadata?.framework,
			},
		};
	}

	async createRuleSet(
		name: string,
		description: string,
		rules: Rule[],
	): Promise<RuleSet> {
		const ruleSetId = `ruleset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		return {
			id: ruleSetId,
			name,
			description,
			rules,
			metadata: {
				version: "1.0.0",
				createdAt: Date.now(),
				updatedAt: Date.now(),
				compatibleWith: ["code-mavi-1.0+"],
			},
		};
	}

	async findRules(query: string, filters?: RuleFilters): Promise<Rule[]> {
		// Get all cached rules
		const allRules: Rule[] = [];
		for (const cached of this.ruleCache.values()) {
			allRules.push(...cached.rules);
		}

		// Apply filters
		let filtered = allRules;

		if (filters?.category) {
			filtered = filtered.filter((r) => r.category === filters.category);
		}

		if (filters?.scope) {
			filtered = filtered.filter((r) => r.scope === filters.scope);
		}

		if (filters?.enabled !== undefined) {
			filtered = filtered.filter((r) => r.enabled === filters.enabled);
		}

		if (filters?.tags && filters.tags.length > 0) {
			filtered = filtered.filter((r) =>
				filters.tags!.every((tag) => r.metadata.tags.includes(tag)),
			);
		}

		if (filters?.language) {
			filtered = filtered.filter(
				(r) => r.metadata.language === filters.language,
			);
		}

		if (filters?.framework) {
			filtered = filtered.filter(
				(r) => r.metadata.framework === filters.framework,
			);
		}

		if (filters?.minPriority !== undefined) {
			filtered = filtered.filter((r) => r.priority >= filters.minPriority!);
		}

		if (filters?.maxPriority !== undefined) {
			filtered = filtered.filter((r) => r.priority <= filters.maxPriority!);
		}

		// Apply search query
		if (query) {
			const lowerQuery = query.toLowerCase();
			filtered = filtered.filter(
				(r) =>
					r.title.toLowerCase().includes(lowerQuery) ||
					r.description.toLowerCase().includes(lowerQuery) ||
					r.content.toLowerCase().includes(lowerQuery) ||
					r.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
			);
		}

		// Sort by priority and title
		filtered.sort((a, b) => {
			if (a.priority !== b.priority) {
				return b.priority - a.priority;
			}
			return a.title.localeCompare(b.title);
		});

		return filtered;
	}

	async applyRuleOverrides(
		baseRules: Rule[],
		overrides: Rule[],
	): Promise<Rule[]> {
		const result = [...baseRules];

		for (const override of overrides) {
			const existingIndex = result.findIndex(
				(r) => r.category === override.category && r.title === override.title,
			);

			if (existingIndex !== -1) {
				// Merge metadata
				const mergedRule = {
					...result[existingIndex],
					...override,
					metadata: {
						...result[existingIndex].metadata,
						...override.metadata,
						updatedAt: Date.now(),
					},
				};
				result[existingIndex] = mergedRule;
			} else {
				result.push(override);
			}
		}

		return result;
	}

	// Private helper methods
	private async finalizeRule(
		rule: Partial<Rule>,
		scope: "global" | "project" | "session",
		startLine: number,
	): Promise<Rule | null> {
		if (!rule.category || !rule.title || !rule.content) {
			return null;
		}

		const ruleId = `${scope}_${rule.category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		return {
			id: ruleId,
			scope,
			category: rule.category,
			title: rule.title,
			description: rule.description || "",
			content: rule.content,
			priority: rule.priority || 50,
			enabled: rule.enabled !== false,
			metadata: {
				author: rule.metadata?.author,
				createdAt: rule.metadata?.createdAt || Date.now(),
				updatedAt: Date.now(),
				version: rule.metadata?.version || "1.0.0",
				tags: rule.metadata?.tags || [],
				language: rule.metadata?.language,
				framework: rule.metadata?.framework,
			},
		};
	}

	private generateMergedMarkdown(rules: Rule[]): string {
		let markdown = "";

		// Group rules by category
		const rulesByCategory = new Map<string, Rule[]>();
		for (const rule of rules) {
			if (!rulesByCategory.has(rule.category)) {
				rulesByCategory.set(rule.category, []);
			}
			rulesByCategory.get(rule.category)!.push(rule);
		}

		// Generate markdown for each category
		for (const [category, categoryRules] of rulesByCategory) {
			markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

			for (const rule of categoryRules) {
				markdown += `### ${rule.title}\n\n`;
				if (rule.description) {
					markdown += `**Description:** ${rule.description}\n\n`;
				}
				markdown += `**Priority:** ${rule.priority}\n`;
				markdown += `**Enabled:** ${rule.enabled}\n`;
				if (rule.metadata.tags.length > 0) {
					markdown += `**Tags:** ${rule.metadata.tags.join(", ")}\n`;
				}
				if (rule.metadata.language) {
					markdown += `**Language:** ${rule.metadata.language}\n`;
				}
				if (rule.metadata.framework) {
					markdown += `**Framework:** ${rule.metadata.framework}\n`;
				}
				markdown += "\n";
				markdown += rule.content + "\n\n";
			}
		}

		return markdown;
	}

	private generateRuleFileContent(rules: Rule[]): string {
		let content = "# Code Mavi IDE Rules\n\n";
		content += `*Generated: ${new Date().toISOString()}*\n`;
		content += `*Total rules: ${rules.length}*\n\n`;

		// Group rules by category
		const rulesByCategory = new Map<string, Rule[]>();
		for (const rule of rules) {
			if (!rulesByCategory.has(rule.category)) {
				rulesByCategory.set(rule.category, []);
			}
			rulesByCategory.get(rule.category)!.push(rule);
		}

		// Write rules by category
		for (const [category, categoryRules] of rulesByCategory) {
			content += `## [${category}] ${category.charAt(0).toUpperCase() + category.slice(1)} Rules\n\n`;

			for (const rule of categoryRules) {
				content += `### ${rule.title}\n\n`;
				if (rule.description) {
					content += `**Description:** ${rule.description}\n\n`;
				}
				content += `**Priority:** ${rule.priority}\n`;
				content += `**Enabled:** ${rule.enabled}\n`;
				if (rule.metadata.tags.length > 0) {
					content += `**Tags:** ${rule.metadata.tags.join(", ")}\n`;
				}
				if (rule.metadata.language) {
					content += `**Language:** ${rule.metadata.language}\n`;
				}
				if (rule.metadata.framework) {
					content += `**Framework:** ${rule.metadata.framework}\n`;
				}
				content += "\n";
				content += rule.content + "\n\n";
			}
		}

		return content;
	}

	private async readFile(uri: URI): Promise<string> {
		try {
			const content = await this.fileService.readFile(uri);
			return content.value.toString();
		} catch (error) {
			this.logService.error(
				`[RuleParser] Failed to read file ${uri.fsPath}:`,
				error,
			);
			throw new Error(`Failed to read file: ${uri.fsPath}`);
		}
	}

	private async writeFile(uri: URI, content: string): Promise<void> {
		try {
			await this.fileService.writeFile(uri, content);
		} catch (error) {
			this.logService.error(
				`[RuleParser] Failed to write file ${uri.fsPath}:`,
				error,
			);
			throw new Error(`Failed to write file: ${uri.fsPath}`);
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
			this.logService.debug(
				`[RuleParser] Directory creation skipped: ${uri.fsPath}`,
			);
		}
	}

	private createParsedRules(
		rules: Rule[],
		scope: "global" | "project" | "session",
	): ParsedRules {
		const scopedRules = {
			global: scope === "global" ? rules : [],
			project: scope === "project" ? rules : [],
			session: scope === "session" ? rules : [],
		};

		const mergedMarkdown = this.generateMergedMarkdown(rules);
		const validation = { valid: true, errors: [], warnings: [] };

		return {
			...scopedRules,
			merged: mergedMarkdown,
			validation,
		};
	}
}
