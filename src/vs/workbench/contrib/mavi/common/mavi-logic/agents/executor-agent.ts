/**
 * Mavi - Executor Agent
 *
 * The implementation specialist of the triple-agent system
 * Receives specific tasks from Orchestrator, reads files, makes changes,
 * and produces semantic diffs for the Apply Model
 */

import { URI } from "../../../../../../base/common/uri.js";
import {
	BaseAgent,
	AgentTask,
	AgentResult,
	AgentContext,
	ToolDefinition,
	ToolExecution,
} from "./base-agent.js";
import { SemanticSearchService } from "../tools/semantic-search-service.js";
import { Event, Emitter } from "../../../../../../base/common/event.js";
import { createHash } from "crypto";

export interface SemanticDiff {
	file: URI;
	type: "search_replace" | "rewrite" | "new_file" | "delete_file";
	search?: string; // For search_replace type
	replace?: string; // For search_replace type
	content?: string; // For rewrite and new_file types
	description: string;
	metadata?: {
		lineStart?: number;
		lineEnd?: number;
		language?: string;
		checksum?: string;
	};
}

export interface CodeChange {
	file: URI;
	originalContent: string;
	newContent: string;
	diff: SemanticDiff;
	validationResult?: ValidationResult;
}

export interface ValidationResult {
	success: boolean;
	errors: string[];
	warnings: string[];
	suggestions: string[];
}

export interface ExecutionContext {
	taskId: string;
	targetFiles: URI[];
	constraints: string[];
	dependencies: string[];
	successCriteria: string[];
}

export class ExecutorAgent extends BaseAgent {
	private readonly _onDiffGenerated = new Emitter<{
		taskId: string;
		diff: SemanticDiff;
	}>();
	readonly onDiffGenerated = this._onDiffGenerated.event;

	private readonly _onFileRead = new Emitter<{
		file: URI;
		content: string;
		lines: number;
	}>();
	readonly onFileRead = this._onFileRead.event;

	private readonly _onChangeApplied = new Emitter<{
		taskId: string;
		file: URI;
		change: CodeChange;
	}>();
	readonly onChangeApplied = this._onChangeApplied.event;

	private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB
	private readonly MAX_DIFF_SIZE = 1000; // lines
	private readonly MAX_SEARCH_CONTEXT = 50; // lines for search block

	constructor(
		model: string = "gpt-3.5-turbo",
		temperature: number = 0.1,
		maxTokens: number = 4000,
	) {
		super(
			"executor",
			["read", "analyze", "modify", "diff", "validate"],
			model,
			temperature,
			maxTokens,
		);
	}

	async initialize(semanticSearch?: SemanticSearchService): Promise<void> {
		await super.initialize(semanticSearch);
		this.registerExecutorTools();
		console.log(`[ExecutorAgent] Initialized with ${this.tools.size} tools`);
	}

	async execute(task: AgentTask): Promise<AgentResult> {
		const startTime = Date.now();

		try {
			this.validateTask(task);
			console.log(
				`[ExecutorAgent] Executing task ${task.id}: ${task.description}`,
			);

			// Parse execution context from task metadata
			const context = this.parseExecutionContext(task);

			// Step 1: Read and analyze target files
			const fileContents = await this.readTargetFiles(context.targetFiles);

			// Step 2: Analyze current code structure
			const analysis = await this.analyzeCodeStructure(fileContents, context);

			// Step 3: Generate semantic diffs
			const diffs = await this.generateSemanticDiffs(
				task,
				context,
				fileContents,
				analysis,
			);

			// Step 4: Validate diffs
			const validationResults = await this.validateDiffs(diffs, fileContents);

			// Step 5: Apply changes (in memory for validation)
			const changes = await this.applyChanges(diffs, fileContents);

			// Step 6: Create final result
			const durationMs = Date.now() - startTime;

			const result: AgentResult = {
				success: true,
				taskId: task.id,
				output: {
					diffs,
					changes,
					validationResults,
					summary: this.createSummary(diffs, changes),
				},
				durationMs,
				tokensUsed: {
					prompt: 0, // TODO: Track actual token usage
					completion: 0,
					total: 0,
				},
				metadata: {
					filesProcessed: context.targetFiles.length,
					diffsGenerated: diffs.length,
					changesApplied: changes.length,
				},
			};

			console.log(`[ExecutorAgent] Task ${task.id} completed successfully`);
			return result;
		} catch (error) {
			const durationMs = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			console.error(`[ExecutorAgent] Task ${task.id} failed:`, errorMessage);

			return {
				success: false,
				taskId: task.id,
				output: null,
				error: errorMessage,
				durationMs,
				metadata: {
					retryCount: task.retryCount,
				},
			};
		}
	}

	protected registerExecutorTools(): void {
		// Executor-specific tools
		this.registerTool({
			name: "generate_diff",
			description: "Generate a semantic diff for a code change",
			parameters: {
				file: {
					type: "string",
					description: "File path",
					required: true,
				},
				type: {
					type: "string",
					description:
						"Diff type (search_replace, rewrite, new_file, delete_file)",
					required: true,
				},
				search: {
					type: "string",
					description: "Search block for search_replace type",
					required: false,
				},
				replace: {
					type: "string",
					description: "Replace block for search_replace type",
					required: false,
				},
				content: {
					type: "string",
					description: "Content for rewrite and new_file types",
					required: false,
				},
				description: {
					type: "string",
					description: "Description of the change",
					required: true,
				},
			},
			returns: {
				type: "object",
				description: "Generated semantic diff",
			},
		});

		this.registerTool({
			name: "validate_diff",
			description: "Validate a semantic diff against the original file",
			parameters: {
				file: {
					type: "string",
					description: "File path",
					required: true,
				},
				originalContent: {
					type: "string",
					description: "Original file content",
					required: true,
				},
				diff: {
					type: "object",
					description: "Semantic diff to validate",
					required: true,
				},
			},
			returns: {
				type: "object",
				description: "Validation result",
			},
		});

		this.registerTool({
			name: "apply_diff",
			description: "Apply a semantic diff to create new content",
			parameters: {
				file: {
					type: "string",
					description: "File path",
					required: true,
				},
				originalContent: {
					type: "string",
					description: "Original file content",
					required: true,
				},
				diff: {
					type: "object",
					description: "Semantic diff to apply",
					required: true,
				},
			},
			returns: {
				type: "object",
				description: "Result with new content and validation",
			},
		});

		this.registerTool({
			name: "analyze_code_pattern",
			description: "Analyze code patterns in a file",
			parameters: {
				content: {
					type: "string",
					description: "File content",
					required: true,
				},
				language: {
					type: "string",
					description: "Programming language",
					required: true,
				},
			},
			returns: {
				type: "object",
				description: "Analysis of code patterns and structure",
			},
		});

		this.registerTool({
			name: "find_exact_match",
			description: "Find exact match for search block in file content",
			parameters: {
				content: {
					type: "string",
					description: "File content",
					required: true,
				},
				search: {
					type: "string",
					description: "Search block to find",
					required: true,
				},
			},
			returns: {
				type: "object",
				description: "Match result with position and context",
			},
		});
	}

	private parseExecutionContext(task: AgentTask): ExecutionContext {
		const metadata = task.metadata || {};

		return {
			taskId: task.id,
			targetFiles: metadata.targetFiles || [],
			constraints: metadata.constraints || [],
			dependencies: metadata.dependencies || [],
			successCriteria: metadata.successCriteria || [
				"Code compiles",
				"Tests pass",
			],
		};
	}

	private async readTargetFiles(files: URI[]): Promise<Map<URI, string>> {
		const contents = new Map<URI, string>();

		for (const file of files) {
			try {
				// TODO: Implement actual file reading
				// For now, use placeholder
				const content = `// Placeholder content for ${file.fsPath}\n// File needs to be read from disk`;

				contents.set(file, content);
				this._onFileRead.fire({
					file,
					content,
					lines: content.split("\n").length,
				});

				console.log(`[ExecutorAgent] Read file: ${file.fsPath}`);
			} catch (error) {
				console.error(
					`[ExecutorAgent] Failed to read file ${file.fsPath}:`,
					error,
				);
				throw new Error(`Failed to read file: ${file.fsPath}`);
			}
		}

		return contents;
	}

	private async analyzeCodeStructure(
		fileContents: Map<URI, string>,
		context: ExecutionContext,
	): Promise<any> {
		const analysis = {
			files: [] as Array<{
				uri: URI;
				language: string;
				lines: number;
				imports: string[];
				exports: string[];
				functions: Array<{ name: string; line: number }>;
				classes: Array<{ name: string; line: number }>;
				interfaces: Array<{ name: string; line: number }>;
			}>,
			dependencies: new Map<string, string[]>(),
			patterns: [] as string[],
		};

		for (const [uri, content] of fileContents) {
			const language = this.detectLanguage(uri);
			const lines = content.split("\n");

			// Simple analysis (can be enhanced with tree-sitter)
			const imports = this.extractImports(content, language);
			const exports = this.extractExports(content, language);
			const functions = this.extractFunctions(content, language);
			const classes = this.extractClasses(content, language);
			const interfaces = this.extractInterfaces(content, language);

			analysis.files.push({
				uri,
				language,
				lines: lines.length,
				imports,
				exports,
				functions,
				classes,
				interfaces,
			});
		}

		return analysis;
	}

	private async generateSemanticDiffs(
		task: AgentTask,
		context: ExecutionContext,
		fileContents: Map<URI, string>,
		analysis: any,
	): Promise<SemanticDiff[]> {
		const diffs: SemanticDiff[] = [];

		// TODO: Implement actual diff generation logic based on task description
		// For now, create placeholder diffs

		for (const [uri, content] of fileContents) {
			const language = this.detectLanguage(uri);

			// Create a simple search/replace diff as example
			const diff: SemanticDiff = {
				file: uri,
				type: "search_replace",
				search: content.substring(0, Math.min(100, content.length)),
				replace:
					content.substring(0, Math.min(100, content.length)) +
					"\n// Modified by Executor Agent",
				description: `Apply changes for task: ${task.description}`,
				metadata: {
					language,
					checksum: this.calculateChecksum(content),
				},
			};

			diffs.push(diff);
			this._onDiffGenerated.fire({ taskId: task.id, diff });
		}

		return diffs;
	}

	private async validateDiffs(
		diffs: SemanticDiff[],
		fileContents: Map<URI, string>,
	): Promise<ValidationResult[]> {
		const results: ValidationResult[] = [];

		for (const diff of diffs) {
			const originalContent = fileContents.get(diff.file);
			if (!originalContent) {
				results.push({
					success: false,
					errors: [`File not found in contents: ${diff.file.fsPath}`],
					warnings: [],
					suggestions: [],
				});
				continue;
			}

			const validation = this.validateSingleDiff(diff, originalContent);
			results.push(validation);
		}

		return results;
	}

	private validateSingleDiff(
		diff: SemanticDiff,
		originalContent: string,
	): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];
		const suggestions: string[] = [];

		// Validate based on diff type
		switch (diff.type) {
			case "search_replace":
				if (!diff.search || !diff.replace) {
					errors.push(
						"Search/Replace diff requires both search and replace blocks",
					);
				} else {
					// Check if search block exists in original content
					if (!originalContent.includes(diff.search)) {
						errors.push("Search block not found in original content");

						// Try to find similar content
						const similar = this.findSimilarContent(
							originalContent,
							diff.search,
						);
						if (similar) {
							suggestions.push(`Did you mean: ${similar.substring(0, 100)}...`);
						}
					}

					// Check search block size
					if (diff.search.length > this.MAX_SEARCH_CONTEXT * 100) {
						warnings.push(
							"Search block is very large, consider breaking into smaller changes",
						);
					}
				}
				break;

			case "rewrite":
				if (!diff.content) {
					errors.push("Rewrite diff requires content block");
				}
				break;

			case "new_file":
				if (!diff.content) {
					errors.push("New file diff requires content block");
				}
				break;

			case "delete_file":
				// No specific validation for delete
				break;

			default:
				errors.push(`Unknown diff type: ${diff.type}`);
		}

		// Check diff size
		const diffSize = this.calculateDiffSize(diff);
		if (diffSize > this.MAX_DIFF_SIZE) {
			warnings.push(
				`Diff is large (${diffSize} lines), consider breaking into smaller changes`,
			);
		}

		return {
			success: errors.length === 0,
			errors,
			warnings,
			suggestions,
		};
	}

	private async applyChanges(
		diffs: SemanticDiff[],
		fileContents: Map<URI, string>,
	): Promise<CodeChange[]> {
		const changes: CodeChange[] = [];

		for (const diff of diffs) {
			const originalContent = fileContents.get(diff.file);
			if (!originalContent) {
				console.warn(
					`[ExecutorAgent] Cannot apply diff to missing file: ${diff.file.fsPath}`,
				);
				continue;
			}

			const newContent = this.applySingleDiff(diff, originalContent);
			const validation = this.validateSingleDiff(diff, originalContent);

			const change: CodeChange = {
				file: diff.file,
				originalContent,
				newContent,
				diff,
				validationResult: validation,
			};

			changes.push(change);
			this._onChangeApplied.fire({
				taskId: "current_task", // TODO: Get actual task ID
				file: diff.file,
				change,
			});
		}

		return changes;
	}

	private applySingleDiff(diff: SemanticDiff, originalContent: string): string {
		switch (diff.type) {
			case "search_replace":
				if (!diff.search || !diff.replace) {
					return originalContent;
				}
				return originalContent.replace(diff.search, diff.replace);

			case "rewrite":
				return diff.content || originalContent;

			case "new_file":
				return diff.content || "";

			case "delete_file":
				return "";

			default:
				return originalContent;
		}
	}

	private createSummary(diffs: SemanticDiff[], changes: CodeChange[]): string {
		const fileCount = new Set(diffs.map((d) => d.file.fsPath)).size;
		const changeCount = changes.filter(
			(c) => c.validationResult?.success,
		).length;
		const errorCount = changes.filter(
			(c) => !c.validationResult?.success,
		).length;

		return `Summary:
- Files processed: ${fileCount}
- Changes applied: ${changeCount}
- Errors: ${errorCount}
- Diff types: ${Array.from(new Set(diffs.map((d) => d.type))).join(", ")}`;
	}

	// Helper methods
	private detectLanguage(uri: URI): string {
		const ext = uri.fsPath.split(".").pop()?.toLowerCase() || "";

		const languageMap: Record<string, string> = {
			ts: "typescript",
			tsx: "typescript",
			js: "javascript",
			jsx: "javascript",
			rs: "rust",
			py: "python",
			java: "java",
			go: "go",
			cpp: "cpp",
			c: "c",
			cs: "csharp",
			php: "php",
			rb: "ruby",
			swift: "swift",
			kt: "kotlin",
			scala: "scala",
		};

		return languageMap[ext] || "unknown";
	}

	private extractImports(content: string, language: string): string[] {
		const imports: string[] = [];
		const lines = content.split("\n");

		for (const line of lines) {
			const trimmed = line.trim();

			if (language === "typescript" || language === "javascript") {
				if (trimmed.startsWith("import ") || trimmed.startsWith("import{")) {
					imports.push(trimmed);
				}
			} else if (language === "python") {
				if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
					imports.push(trimmed);
				}
			} else if (language === "rust") {
				if (trimmed.startsWith("use ") || trimmed.startsWith("mod ")) {
					imports.push(trimmed);
				}
			}
			// Add more language-specific import detection as needed
		}

		return imports;
	}

	private extractExports(content: string, language: string): string[] {
		const exports: string[] = [];
		const lines = content.split("\n");

		for (const line of lines) {
			const trimmed = line.trim();

			if (language === "typescript" || language === "javascript") {
				if (trimmed.includes("export ") && !trimmed.includes("//")) {
					exports.push(trimmed);
				}
			} else if (language === "rust") {
				if (trimmed.startsWith("pub ") && !trimmed.includes("//")) {
					exports.push(trimmed);
				}
			}
			// Add more language-specific export detection as needed
		}

		return exports;
	}

	private extractFunctions(
		content: string,
		language: string,
	): Array<{ name: string; line: number }> {
		const functions: Array<{ name: string; line: number }> = [];
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (language === "typescript" || language === "javascript") {
				// Match function declarations
				const funcMatch = line.match(
					/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
				);
				if (funcMatch) {
					functions.push({ name: funcMatch[1], line: i + 1 });
				}

				// Match arrow functions assigned to variables
				const arrowMatch = line.match(
					/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/,
				);
				if (arrowMatch) {
					functions.push({ name: arrowMatch[1], line: i + 1 });
				}
			} else if (language === "rust") {
				const rustMatch = line.match(/^fn\s+(\w+)/);
				if (rustMatch) {
					functions.push({ name: rustMatch[1], line: i + 1 });
				}
			} else if (language === "python") {
				const pythonMatch = line.match(/^def\s+(\w+)/);
				if (pythonMatch) {
					functions.push({ name: pythonMatch[1], line: i + 1 });
				}
			}
		}

		return functions;
	}

	private extractClasses(
		content: string,
		language: string,
	): Array<{ name: string; line: number }> {
		const classes: Array<{ name: string; line: number }> = [];
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (language === "typescript" || language === "javascript") {
				const classMatch = line.match(/^(?:export\s+)?class\s+(\w+)/);
				if (classMatch) {
					classes.push({ name: classMatch[1], line: i + 1 });
				}
			} else if (language === "python") {
				const pythonMatch = line.match(/^class\s+(\w+)/);
				if (pythonMatch) {
					classes.push({ name: pythonMatch[1], line: i + 1 });
				}
			} else if (language === "rust") {
				const rustMatch = line.match(/^(?:pub\s+)?struct\s+(\w+)/);
				if (rustMatch) {
					classes.push({ name: rustMatch[1], line: i + 1 });
				}
			}
		}

		return classes;
	}

	private extractInterfaces(
		content: string,
		language: string,
	): Array<{ name: string; line: number }> {
		const interfaces: Array<{ name: string; line: number }> = [];
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (language === "typescript") {
				const interfaceMatch = line.match(/^(?:export\s+)?interface\s+(\w+)/);
				if (interfaceMatch) {
					interfaces.push({ name: interfaceMatch[1], line: i + 1 });
				}

				const typeMatch = line.match(/^(?:export\s+)?type\s+(\w+)/);
				if (typeMatch) {
					interfaces.push({ name: typeMatch[1], line: i + 1 });
				}
			}
		}

		return interfaces;
	}

	private findSimilarContent(content: string, search: string): string | null {
		// Simple similarity search - find lines that contain some of the same words
		const searchWords = search
			.toLowerCase()
			.split(/\W+/)
			.filter((w) => w.length > 3);
		const lines = content.split("\n");

		let bestMatch: string | null = null;
		let bestScore = 0;

		for (const line of lines) {
			const lineLower = line.toLowerCase();
			let score = 0;

			for (const word of searchWords) {
				if (lineLower.includes(word)) {
					score++;
				}
			}

			if (score > bestScore && score > 0) {
				bestScore = score;
				bestMatch = line;
			}
		}

		return bestMatch;
	}

	private calculateDiffSize(diff: SemanticDiff): number {
		switch (diff.type) {
			case "search_replace":
				if (!diff.search || !diff.replace) return 0;
				const searchLines = diff.search.split("\n").length;
				const replaceLines = diff.replace.split("\n").length;
				return Math.max(searchLines, replaceLines);

			case "rewrite":
			case "new_file":
				if (!diff.content) return 0;
				return diff.content.split("\n").length;

			case "delete_file":
				return 1; // Single operation

			default:
				return 0;
		}
	}

	private calculateChecksum(content: string): string {
		return createHash("md5").update(content).digest("hex");
	}

	private validateTask(task: AgentTask): void {
		if (!task.id) {
			throw new Error("Task must have an ID");
		}

		if (!task.description || task.description.trim().length === 0) {
			throw new Error("Task must have a description");
		}

		if (task.retryCount < 0) {
			throw new Error("Retry count cannot be negative");
		}

		if (task.maxRetries < 0) {
			throw new Error("Max retries cannot be negative");
		}

		if (task.retryCount > task.maxRetries) {
			throw new Error(
				`Retry count (${task.retryCount}) exceeds max retries (${task.maxRetries})`,
			);
		}
	}

	// Public API methods
	public async generateDiffForFile(
		file: URI,
		originalContent: string,
		changes: { search: string; replace: string; description: string },
	): Promise<SemanticDiff> {
		const diff: SemanticDiff = {
			file,
			type: "search_replace",
			search: changes.search,
			replace: changes.replace,
			description: changes.description,
			metadata: {
				language: this.detectLanguage(file),
				checksum: this.calculateChecksum(originalContent),
			},
		};

		const validation = this.validateSingleDiff(diff, originalContent);
		if (!validation.success) {
			throw new Error(`Invalid diff: ${validation.errors.join(", ")}`);
		}

		this._onDiffGenerated.fire({ taskId: "manual", diff });
		return diff;
	}

	public async validateFileDiff(
		file: URI,
		originalContent: string,
		diff: SemanticDiff,
	): Promise<ValidationResult> {
		return this.validateSingleDiff(diff, originalContent);
	}

	public async applyDiffToContent(
		originalContent: string,
		diff: SemanticDiff,
	): Promise<{ newContent: string; validation: ValidationResult }> {
		const validation = this.validateSingleDiff(diff, originalContent);
		const newContent = this.applySingleDiff(diff, originalContent);

		return {
			newContent,
			validation,
		};
	}

	public getSupportedLanguages(): string[] {
		return [
			"typescript",
			"javascript",
			"python",
			"rust",
			"java",
			"go",
			"cpp",
			"c",
			"csharp",
			"php",
			"ruby",
			"swift",
			"kotlin",
			"scala",
		];
	}

	// Tool execution methods
	protected async executeTool(
		toolName: string,
		parameters: Record<string, any>,
	): Promise<any> {
		const tool = this.tools.get(toolName);
		if (!tool) {
			throw new Error(`Tool not found: ${toolName}`);
		}

		this.validateToolParameters(tool, parameters);

		const startTime = Date.now();

		try {
			let result: any;

			switch (toolName) {
				case "generate_diff":
					result = await this.generateDiffForFile(
						URI.parse(parameters.file),
						parameters.originalContent || "",
						{
							search: parameters.search,
							replace: parameters.replace,
							description: parameters.description,
						},
					);
					break;

				case "validate_diff":
					result = await this.validateFileDiff(
						URI.parse(parameters.file),
						parameters.originalContent,
						parameters.diff,
					);
					break;

				case "apply_diff":
					result = await this.applyDiffToContent(
						parameters.originalContent,
						parameters.diff,
					);
					break;

				case "analyze_code_pattern":
					result = {
						language: parameters.language,
						imports: this.extractImports(
							parameters.content,
							parameters.language,
						),
						exports: this.extractExports(
							parameters.content,
							parameters.language,
						),
						functions: this.extractFunctions(
							parameters.content,
							parameters.language,
						),
						classes: this.extractClasses(
							parameters.content,
							parameters.language,
						),
						interfaces: this.extractInterfaces(
							parameters.content,
							parameters.language,
						),
						lines: parameters.content.split("\n").length,
					};
					break;

				case "find_exact_match":
					const content = parameters.content;
					const search = parameters.search;
					const index = content.indexOf(search);

					result = {
						found: index !== -1,
						position: index,
						context:
							index !== -1
								? this.getContext(content, index, search.length)
								: null,
						suggestions:
							index === -1 ? this.findSimilarContent(content, search) : null,
					};
					break;

				case "read_file":
					// TODO: Implement actual file reading
					result = { content: "File content placeholder", lines: 10 };
					break;

				case "search_codebase":
					if (!this.semanticSearch) {
						throw new Error("Semantic search not available");
					}
					result = await this.semanticSearch.search(parameters.query, {
						topK: parameters.topK || 10,
					});
					break;

				case "log_message":
					console.log(`[ExecutorAgent] ${parameters.message}`);
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
				durationMs: Date.now() - startTime,
			};

			this.executionHistory.push(execution);

			return result;
		} catch (error) {
			const execution: ToolExecution = {
				tool: toolName,
				parameters,
				result: undefined,
				error: error instanceof Error ? error.message : String(error),
				durationMs: Date.now() - startTime,
			};

			this.executionHistory.push(execution);
			throw error;
		}
	}

	private getContext(content: string, index: number, length: number): string {
		const start = Math.max(0, index - 50);
		const end = Math.min(content.length, index + length + 50);
		return content.substring(start, end);
	}

	private validateToolParameters(
		tool: ToolDefinition,
		parameters: Record<string, any>,
	): void {
		for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
			if (paramDef.required && !(paramName in parameters)) {
				throw new Error(`Missing required parameter: ${paramName}`);
			}

			if (paramName in parameters) {
				const value = parameters[paramName];
				const expectedType = paramDef.type;

				// Basic type checking
				if (expectedType === "string" && typeof value !== "string") {
					throw new Error(`Parameter ${paramName} must be a string`);
				} else if (expectedType === "number" && typeof value !== "number") {
					throw new Error(`Parameter ${paramName} must be a number`);
				} else if (expectedType === "boolean" && typeof value !== "boolean") {
					throw new Error(`Parameter ${paramName} must be a boolean`);
				} else if (expectedType === "array" && !Array.isArray(value)) {
					throw new Error(`Parameter ${paramName} must be an array`);
				} else if (
					expectedType === "object" &&
					(typeof value !== "object" || value === null || Array.isArray(value))
				) {
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
