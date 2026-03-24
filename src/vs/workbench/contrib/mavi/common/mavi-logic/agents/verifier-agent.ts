/**
 * Mavi - Verifier Agent
 *
 * The quality assurance specialist of the triple-agent system
 * Validates changes made by Executor, runs tests, checks for errors,
 * and ensures code quality before changes are finalized
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
import { CancellationToken } from "../../../../../../base/common/cancellation.js";

export interface VerificationRequest {
	taskId: string;
	files: URI[];
	checks: VerificationCheck[];
	executorDiff?: any;
	originalContents?: Map<URI, string>;
	newContents?: Map<URI, string>;
}

export interface VerificationCheck {
	type:
		| "syntax"
		| "lint"
		| "type"
		| "test"
		| "import"
		| "security"
		| "performance";
	config?: any;
	severity: "error" | "warning" | "info";
	timeoutMs?: number;
}

export interface VerificationResult {
	status: "success" | "error" | "warning";
	requestId: string;
	taskId: string;
	summary: VerificationSummary;
	errors: VerificationError[];
	warnings: VerificationWarning[];
	checks: CheckResult[];
	durationMs: number;
	metadata?: Record<string, any>;
}

export interface VerificationSummary {
	totalErrors: number;
	totalWarnings: number;
	syntaxErrors: number;
	typeErrors: number;
	lintErrors: number;
	testFailures: number;
	importErrors: number;
	filesChecked: number;
}

export interface VerificationError {
	id: string;
	file: URI;
	line: number;
	column: number;
	type:
		| "syntax"
		| "type"
		| "lint"
		| "test"
		| "import"
		| "security"
		| "performance";
	severity: "error" | "warning" | "info";
	message: string;
	code?: string;
	rule?: string;
	context: string;
	suggestion: string;
	autofixable: boolean;
}

export interface VerificationWarning {
	id: string;
	file: URI;
	line: number;
	column: number;
	type: "lint" | "performance" | "security" | "style";
	message: string;
	rule?: string;
	context: string;
	suggestion: string;
}

export interface CheckResult {
	type: string;
	status: "passed" | "failed" | "skipped" | "timeout";
	durationMs: number;
	issues: number;
	details?: any;
}

export interface TestResult {
	total: number;
	passed: number;
	failed: number;
	skipped: number;
	durationMs: number;
	failures: TestFailure[];
}

export interface TestFailure {
	testName: string;
	file: URI;
	line: number;
	message: string;
	expected?: string;
	actual?: string;
	stackTrace?: string;
}

export interface LintResult {
	totalIssues: number;
	errors: number;
	warnings: number;
	issues: LintIssue[];
	fixable: number;
	fixed?: number;
}

export interface LintIssue {
	file: URI;
	line: number;
	column: number;
	severity: "error" | "warning";
	message: string;
	rule: string;
	fix?: {
		range: [number, number];
		text: string;
	};
}

export class VerifierAgent extends BaseAgent {
	private readonly _onVerificationStarted = new Emitter<{
		taskId: string;
		files: URI[];
		checks: VerificationCheck[];
	}>();
	readonly onVerificationStarted = this._onVerificationStarted.event;

	private readonly _onVerificationCompleted = new Emitter<{
		taskId: string;
		result: VerificationResult;
	}>();
	readonly onVerificationCompleted = this._onVerificationCompleted.event;

	private readonly _onCheckStarted = new Emitter<{
		taskId: string;
		checkType: string;
	}>();
	readonly onCheckStarted = this._onCheckStarted.event;

	private readonly _onCheckCompleted = new Emitter<{
		taskId: string;
		checkType: string;
		result: CheckResult;
	}>();
	readonly onCheckCompleted = this._onCheckCompleted.event;

	private readonly _onErrorFound = new Emitter<{
		taskId: string;
		error: VerificationError;
	}>();
	readonly onErrorFound = this._onErrorFound.event;

	private readonly _onWarningFound = new Emitter<{
		taskId: string;
		warning: VerificationWarning;
	}>();
	readonly onWarningFound = this._onWarningFound.event;

	private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
	private readonly DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
	private readonly MAX_PARALLEL_CHECKS = 3;

	constructor(
		model: string = "gpt-3.5-turbo",
		temperature: number = 0.1,
		maxTokens: number = 4000,
	) {
		super(
			"verifier",
			["validate", "test", "lint", "type_check", "analyze", "report"],
			model,
			temperature,
			maxTokens,
		);
	}

	async initialize(semanticSearch?: SemanticSearchService): Promise<void> {
		await super.initialize(semanticSearch);
		this.registerVerifierTools();
		console.log(`[VerifierAgent] Initialized with ${this.tools.size} tools`);
	}

	async execute(task: AgentTask): Promise<AgentResult> {
		const startTime = Date.now();

		try {
			this.validateTask(task);
			console.log(`[VerifierAgent] Executing verification task ${task.id}`);

			// Parse verification request from task
			const request = this.parseVerificationRequest(task);

			// Start verification
			this._onVerificationStarted.fire({
				taskId: task.id,
				files: request.files,
				checks: request.checks,
			});

			// Step 1: Read files if not provided
			const fileContents =
				request.originalContents || (await this.readFiles(request.files));

			// Step 2: Run verification checks
			const checkResults = await this.runVerificationChecks(
				request,
				fileContents,
			);

			// Step 3: Analyze results
			const verificationResult = await this.analyzeResults(
				checkResults,
				request,
				task,
			);

			// Step 4: Create final result
			const durationMs = Date.now() - startTime;

			const result: AgentResult = {
				success:
					verificationResult.status === "success" ||
					verificationResult.status === "warning",
				taskId: task.id,
				output: verificationResult,
				durationMs,
				tokensUsed: {
					prompt: 0, // TODO: Track actual token usage
					completion: 0,
					total: 0,
				},
				metadata: {
					filesChecked: request.files.length,
					checksPerformed: request.checks.length,
					totalErrors: verificationResult.summary.totalErrors,
					totalWarnings: verificationResult.summary.totalWarnings,
				},
			};

			// Fire completion event
			this._onVerificationCompleted.fire({
				taskId: task.id,
				result: verificationResult,
			});

			console.log(
				`[VerifierAgent] Verification task ${task.id} completed: ${verificationResult.status}`,
			);
			return result;
		} catch (error) {
			const durationMs = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			console.error(
				`[VerifierAgent] Verification task ${task.id} failed:`,
				errorMessage,
			);

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

	protected registerVerifierTools(): void {
		// Verifier-specific tools
		this.registerTool({
			name: "check_syntax",
			description: "Check syntax of code files",
			parameters: {
				files: {
					type: "array",
					description: "Files to check",
					required: true,
				},
				contents: {
					type: "object",
					description: "File contents map",
					required: true,
				},
				language: {
					type: "string",
					description: "Programming language",
					required: false,
				},
			},
			returns: {
				type: "object",
				description: "Syntax check results",
			},
		});

		this.registerTool({
			name: "run_lint",
			description: "Run linter on code files",
			parameters: {
				files: {
					type: "array",
					description: "Files to lint",
					required: true,
				},
				contents: {
					type: "object",
					description: "File contents map",
					required: true,
				},
				language: {
					type: "string",
					description: "Programming language",
					required: true,
				},
				rules: {
					type: "array",
					description: "Lint rules to apply",
					required: false,
				},
				autofix: {
					type: "boolean",
					description: "Attempt to auto-fix issues",
					required: false,
				},
			},
			returns: {
				type: "object",
				description: "Lint results",
			},
		});

		this.registerTool({
			name: "run_type_check",
			description: "Run type checker on code files",
			parameters: {
				files: {
					type: "array",
					description: "Files to type check",
					required: true,
				},
				contents: {
					type: "object",
					description: "File contents map",
					required: true,
				},
				language: {
					type: "string",
					description: "Programming language (TypeScript, etc.)",
					required: true,
				},
				strict: {
					type: "boolean",
					description: "Use strict type checking",
					required: false,
				},
			},
			returns: {
				type: "object",
				description: "Type check results",
			},
		});

		this.registerTool({
			name: "run_tests",
			description: "Run tests for modified files",
			parameters: {
				files: {
					type: "array",
					description: "Files that were modified",
					required: true,
				},
				testPattern: {
					type: "string",
					description: "Test file pattern",
					required: false,
				},
				framework: {
					type: "string",
					description: "Test framework",
					required: false,
				},
			},
			returns: {
				type: "object",
				description: "Test results",
			},
		});

		this.registerTool({
			name: "check_imports",
			description: "Check import statements and dependencies",
			parameters: {
				files: {
					type: "array",
					description: "Files to check",
					required: true,
				},
				contents: {
					type: "object",
					description: "File contents map",
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
				description: "Import check results",
			},
		});

		this.registerTool({
			name: "analyze_security",
			description: "Analyze code for security issues",
			parameters: {
				files: {
					type: "array",
					description: "Files to analyze",
					required: true,
				},
				contents: {
					type: "object",
					description: "File contents map",
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
				description: "Security analysis results",
			},
		});

		this.registerTool({
			name: "generate_report",
			description: "Generate verification report",
			parameters: {
				results: {
					type: "object",
					description: "All verification results",
					required: true,
				},
				format: {
					type: "string",
					description: "Report format (json, markdown, human)",
					required: false,
				},
			},
			returns: {
				type: "object",
				description: "Formatted report",
			},
		});
	}

	private parseVerificationRequest(task: AgentTask): VerificationRequest {
		const metadata = task.metadata || {};

		return {
			taskId: task.id,
			files: metadata.files || [],
			checks: metadata.checks || [
				{ type: "syntax", severity: "error" },
				{ type: "lint", severity: "warning" },
				{ type: "type", severity: "error" },
				{ type: "test", severity: "error" },
			],
			executorDiff: metadata.executorDiff,
			originalContents: metadata.originalContents,
			newContents: metadata.newContents,
		};
	}

	private async readFiles(files: URI[]): Promise<Map<URI, string>> {
		const contents = new Map<URI, string>();

		for (const file of files) {
			try {
				// TODO: Implement actual file reading
				// For now, use placeholder
				const content = `// Placeholder content for ${file.fsPath}\n// File needs to be read from disk`;

				contents.set(file, content);
				console.log(`[VerifierAgent] Read file: ${file.fsPath}`);
			} catch (error) {
				console.error(
					`[VerifierAgent] Failed to read file ${file.fsPath}:`,
					error,
				);
				throw new Error(`Failed to read file: ${file.fsPath}`);
			}
		}

		return contents;
	}

	private async runVerificationChecks(
		request: VerificationRequest,
		fileContents: Map<URI, string>,
	): Promise<Map<string, CheckResult>> {
		const results = new Map<string, CheckResult>();
		const checkPromises: Array<Promise<void>> = [];

		for (const check of request.checks) {
			if (checkPromises.length >= this.MAX_PARALLEL_CHECKS) {
				// Wait for some checks to complete before starting more
				await Promise.race(checkPromises);
			}

			const checkPromise = this.runSingleCheck(check, request, fileContents)
				.then((result) => {
					results.set(check.type, result);
					this._onCheckCompleted.fire({
						taskId: request.taskId,
						checkType: check.type,
						result,
					});
				})
				.catch((error) => {
					console.error(`[VerifierAgent] Check ${check.type} failed:`, error);
					results.set(check.type, {
						type: check.type,
						status: "failed",
						durationMs: 0,
						issues: 0,
						details: { error: error.message },
					});
				});

			checkPromises.push(checkPromise);
			this._onCheckStarted.fire({
				taskId: request.taskId,
				checkType: check.type,
			});
		}

		// Wait for all checks to complete
		await Promise.all(checkPromises);

		return results;
	}

	private async runSingleCheck(
		check: VerificationCheck,
		request: VerificationRequest,
		fileContents: Map<URI, string>,
	): Promise<CheckResult> {
		const startTime = Date.now();
		const timeout = check.timeoutMs || this.DEFAULT_TIMEOUT_MS;

		try {
			let result: CheckResult;

			switch (check.type) {
				case "syntax":
					result = await this.checkSyntax(request.files, fileContents);
					break;
				case "lint":
					result = await this.runLint(request.files, fileContents);
					break;
				case "type":
					result = await this.runTypeCheck(request.files, fileContents);
					break;
				case "test":
					result = await this.runTests(request.files);
					break;
				case "import":
					result = await this.checkImports(request.files, fileContents);
					break;
				case "security":
					result = await this.analyzeSecurity(request.files, fileContents);
					break;
				case "performance":
					result = await this.analyzePerformance(request.files, fileContents);
					break;
				default:
					throw new Error(`Unknown check type: ${check.type}`);
			}

			result.durationMs = Date.now() - startTime;
			return result;
		} catch (error) {
			const durationMs = Date.now() - startTime;
			return {
				type: check.type,
				status: "failed",
				durationMs,
				issues: 0,
				details: {
					error: error instanceof Error ? error.message : String(error),
				},
			};
		}
	}

	private async checkSyntax(
		files: URI[],
		contents: Map<URI, string>,
	): Promise<CheckResult> {
		const errors: VerificationError[] = [];

		for (const [uri, content] of contents) {
			const language = this.detectLanguage(uri);
			const syntaxErrors = this.validateSyntax(content, language, uri);

			syntaxErrors.forEach((error) => {
				errors.push(error);
				this._onErrorFound.fire({
					taskId: "syntax_check",
					error,
				});
			});
		}

		return {
			type: "syntax",
			status: errors.length === 0 ? "passed" : "failed",
			durationMs: 0,
			issues: errors.length,
			details: { errors },
		};
	}

	private async runLint(
		files: URI[],
		contents: Map<URI, string>,
	): Promise<CheckResult> {
		const issues: LintIssue[] = [];
		const errors: VerificationError[] = [];
		const warnings: VerificationWarning[] = [];

		for (const [uri, content] of contents) {
			const language = this.detectLanguage(uri);
			const lintIssues = this.analyzeLint(content, language, uri);

			lintIssues.forEach((issue) => {
				issues.push(issue);

				if (issue.severity === "error") {
					const error: VerificationError = {
						id: `lint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						file: uri,
						line: issue.line,
						column: issue.column,
						type: "lint",
						severity: "error",
						message: issue.message,
						rule: issue.rule,
						context: this.getContext(content, issue.line, issue.column),
						suggestion: issue.fix ? "Auto-fix available" : "Review lint rule",
						autofixable: !!issue.fix,
					};
					errors.push(error);
					this._onErrorFound.fire({
						taskId: "lint_check",
						error,
					});
				} else {
					const warning: VerificationWarning = {
						id: `lint_warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						file: uri,
						line: issue.line,
						column: issue.column,
						type: "lint",
						message: issue.message,
						rule: issue.rule,
						context: this.getContext(content, issue.line, issue.column),
						suggestion: issue.fix ? "Auto-fix available" : "Review lint rule",
					};
					warnings.push(warning);
					this._onWarningFound.fire({
						taskId: "lint_check",
						warning,
					});
				}
			});
		}

		return {
			type: "lint",
			status: errors.length === 0 ? "passed" : "failed",
			durationMs: 0,
			issues: issues.length,
			details: {
				issues,
				errors,
				warnings,
				fixable: issues.filter((i) => i.fix).length,
			},
		};
	}

	private async runTypeCheck(
		files: URI[],
		contents: Map<URI, string>,
	): Promise<CheckResult> {
		const errors: VerificationError[] = [];

		// TODO: Implement actual type checking
		// For now, perform basic type analysis
		for (const [uri, content] of contents) {
			const language = this.detectLanguage(uri);
			if (language === "typescript" || language === "javascript") {
				const typeErrors = this.analyzeTypes(content, language, uri);
				typeErrors.forEach((error) => {
					errors.push(error);
					this._onErrorFound.fire({
						taskId: "type_check",
						error,
					});
				});
			}
		}

		return {
			type: "type",
			status: errors.length === 0 ? "passed" : "failed",
			durationMs: 0,
			issues: errors.length,
			details: { errors },
		};
	}

	private async runTests(files: URI[]): Promise<CheckResult> {
		// TODO: Implement actual test execution
		// For now, return placeholder result
		return {
			type: "test",
			status: "passed",
			durationMs: 0,
			issues: 0,
			details: {
				total: 0,
				passed: 0,
				failed: 0,
				skipped: 0,
				failures: [],
			},
		};
	}

	private async checkImports(
		files: URI[],
		contents: Map<URI, string>,
	): Promise<CheckResult> {
		const errors: VerificationError[] = [];

		for (const [uri, content] of contents) {
			const language = this.detectLanguage(uri);
			const importErrors = this.analyzeImports(content, language, uri);

			importErrors.forEach((error) => {
				errors.push(error);
				this._onErrorFound.fire({
					taskId: "import_check",
					error,
				});
			});
		}

		return {
			type: "import",
			status: errors.length === 0 ? "passed" : "failed",
			durationMs: 0,
			issues: errors.length,
			details: { errors },
		};
	}

	private async analyzeSecurity(
		files: URI[],
		contents: Map<URI, string>,
	): Promise<CheckResult> {
		const warnings: VerificationWarning[] = [];

		for (const [uri, content] of contents) {
			const language = this.detectLanguage(uri);
			const securityIssues = this.analyzeSecurityIssues(content, language, uri);

			securityIssues.forEach((issue) => {
				warnings.push(issue);
				this._onWarningFound.fire({
					taskId: "security_check",
					warning: issue,
				});
			});
		}

		return {
			type: "security",
			status: "passed",
			durationMs: 0,
			issues: warnings.length,
			details: { warnings },
		};
	}

	private async analyzePerformance(
		files: URI[],
		contents: Map<URI, string>,
	): Promise<CheckResult> {
		const warnings: VerificationWarning[] = [];

		for (const [uri, content] of contents) {
			const language = this.detectLanguage(uri);
			const performanceIssues = this.analyzePerformanceIssues(
				content,
				language,
				uri,
			);

			performanceIssues.forEach((issue) => {
				warnings.push(issue);
				this._onWarningFound.fire({
					taskId: "performance_check",
					warning: issue,
				});
			});
		}

		return {
			type: "performance",
			status: "passed",
			durationMs: 0,
			issues: warnings.length,
			details: { warnings },
		};
	}

	private async analyzeResults(
		checkResults: Map<string, CheckResult>,
		request: VerificationRequest,
		task: AgentTask,
	): Promise<VerificationResult> {
		const errors: VerificationError[] = [];
		const warnings: VerificationWarning[] = [];
		const checks: CheckResult[] = [];

		// Collect all errors and warnings from check results
		for (const [checkType, result] of checkResults) {
			checks.push(result);

			if (result.details?.errors) {
				errors.push(...result.details.errors);
			}

			if (result.details?.warnings) {
				warnings.push(...result.details.warnings);
			}
		}

		// Calculate summary
		const summary: VerificationSummary = {
			totalErrors: errors.length,
			totalWarnings: warnings.length,
			syntaxErrors: errors.filter((e) => e.type === "syntax").length,
			typeErrors: errors.filter((e) => e.type === "type").length,
			lintErrors: errors.filter((e) => e.type === "lint").length,
			testFailures: errors.filter((e) => e.type === "test").length,
			importErrors: errors.filter((e) => e.type === "import").length,
			filesChecked: request.files.length,
		};

		// Determine overall status
		let status: "success" | "error" | "warning" = "success";
		if (errors.length > 0) {
			status = "error";
		} else if (warnings.length > 0) {
			status = "warning";
		}

		return {
			status,
			requestId: `verify_${Date.now()}`,
			taskId: task.id,
			summary,
			errors,
			warnings,
			checks,
			durationMs: 0, // Will be set by caller
			metadata: {
				files: request.files.map((f) => f.fsPath),
				checksPerformed: Array.from(checkResults.keys()),
			},
		};
	}

	// Analysis helper methods
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

	private validateSyntax(
		content: string,
		language: string,
		file: URI,
	): VerificationError[] {
		const errors: VerificationError[] = [];

		// Basic syntax validation
		const lines = content.split("\n");

		// Check for unbalanced brackets, parentheses, and braces
		let bracketStack: string[] = [];
		let inString = false;
		let stringChar = "";

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			for (let j = 0; j < line.length; j++) {
				const char = line[j];
				const prevChar = j > 0 ? line[j - 1] : "";

				// Handle string literals
				if (!inString && (char === '"' || char === "'" || char === "`")) {
					inString = true;
					stringChar = char;
				} else if (inString && char === stringChar && prevChar !== "\\") {
					inString = false;
					stringChar = "";
				}

				if (inString) continue;

				// Track brackets
				if (char === "(" || char === "[" || char === "{") {
					bracketStack.push(char);
				} else if (char === ")") {
					if (bracketStack.pop() !== "(") {
						errors.push(
							this.createSyntaxError(
								file,
								i + 1,
								j + 1,
								"Unmatched closing parenthesis",
							),
						);
					}
				} else if (char === "]") {
					if (bracketStack.pop() !== "[") {
						errors.push(
							this.createSyntaxError(
								file,
								i + 1,
								j + 1,
								"Unmatched closing bracket",
							),
						);
					}
				} else if (char === "}") {
					if (bracketStack.pop() !== "{") {
						errors.push(
							this.createSyntaxError(
								file,
								i + 1,
								j + 1,
								"Unmatched closing brace",
							),
						);
					}
				}
			}
		}

		// Check for unclosed brackets
		if (bracketStack.length > 0) {
			errors.push(
				this.createSyntaxError(
					file,
					lines.length,
					1,
					`Unclosed ${bracketStack.join(", ")}`,
				),
			);
		}

		// Check for unclosed strings
		if (inString) {
			errors.push(
				this.createSyntaxError(
					file,
					lines.length,
					1,
					"Unclosed string literal",
				),
			);
		}

		return errors;
	}

	private analyzeLint(
		content: string,
		language: string,
		file: URI,
	): LintIssue[] {
		const issues: LintIssue[] = [];
		const lines = content.split("\n");

		// Basic lint rules (can be expanded)
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Check for console.log in production code
			if (trimmed.includes("console.log") && !trimmed.includes("//")) {
				issues.push({
					file,
					line: i + 1,
					column: line.indexOf("console.log") + 1,
					severity: "warning",
					message: "Avoid console.log in production code",
					rule: "no-console",
					fix: {
						range: [
							line.indexOf("console.log"),
							line.indexOf("console.log") + 11,
						],
						text: "// console.log",
					},
				});
			}

			// Check for TODO comments
			if (trimmed.includes("TODO:") || trimmed.includes("FIXME:")) {
				issues.push({
					file,
					line: i + 1,
					column:
						line.indexOf("TODO:") > -1
							? line.indexOf("TODO:") + 1
							: line.indexOf("FIXME:") + 1,
					severity: "warning",
					message: "TODO/FIXME comment found",
					rule: "no-todo",
				});
			}

			// Check for var usage (ES6+)
			if (language === "javascript" || language === "typescript") {
				if (trimmed.startsWith("var ") && !trimmed.includes("//")) {
					issues.push({
						file,
						line: i + 1,
						column: line.indexOf("var") + 1,
						severity: "warning",
						message: "Use let or const instead of var",
						rule: "no-var",
						fix: {
							range: [line.indexOf("var"), line.indexOf("var") + 3],
							text: "let",
						},
					});
				}
			}
		}

		return issues;
	}

	private analyzeTypes(
		content: string,
		language: string,
		file: URI,
	): VerificationError[] {
		const errors: VerificationError[] = [];
		const lines = content.split("\n");

		// Basic type analysis for TypeScript
		if (language === "typescript") {
			// Look for explicit any types
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (line.includes(": any") && !line.includes("//")) {
					errors.push({
						id: `type_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						file,
						line: i + 1,
						column: line.indexOf(": any") + 1,
						type: "type",
						severity: "warning",
						message: "Avoid using 'any' type",
						code: "TS7006",
						context: line.trim(),
						suggestion: "Use specific type instead of 'any'",
						autofixable: false,
					});
				}
			}
		}

		return errors;
	}

	private analyzeImports(
		content: string,
		language: string,
		file: URI,
	): VerificationError[] {
		const errors: VerificationError[] = [];
		const lines = content.split("\n");

		// Check for relative imports that might be wrong
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (
				line.includes("import") ||
				line.includes("require") ||
				line.includes("from")
			) {
				// Check for suspicious import patterns
				if (
					line.includes("../..") &&
					line.includes("../..") !== line.lastIndexOf("../..")
				) {
					errors.push({
						id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						file,
						line: i + 1,
						column: line.indexOf("../..") + 1,
						type: "import",
						severity: "warning",
						message: "Deep relative import may indicate poor module structure",
						context: line.trim(),
						suggestion:
							"Consider restructuring modules or using absolute imports",
						autofixable: false,
					});
				}
			}
		}

		return errors;
	}

	private analyzeSecurityIssues(
		content: string,
		language: string,
		file: URI,
	): VerificationWarning[] {
		const warnings: VerificationWarning[] = [];
		const lines = content.split("\n");

		// Basic security checks
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lowerLine = line.toLowerCase();

			// Check for potential security issues
			if (lowerLine.includes("eval(") && !line.includes("//")) {
				warnings.push({
					id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					file,
					line: i + 1,
					column: line.indexOf("eval") + 1,
					type: "security",
					message: "eval() can be dangerous and should be avoided",
					context: line.trim(),
					suggestion:
						"Use safer alternatives like Function constructor or JSON.parse",
				});
			}

			if (lowerLine.includes("innerhtml") && !line.includes("//")) {
				warnings.push({
					id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					file,
					line: i + 1,
					column: line.indexOf("innerHTML") + 1,
					type: "security",
					message: "innerHTML can lead to XSS attacks",
					context: line.trim(),
					suggestion: "Use textContent or createElement instead",
				});
			}
		}

		return warnings;
	}

	private analyzePerformanceIssues(
		content: string,
		language: string,
		file: URI,
	): VerificationWarning[] {
		const warnings: VerificationWarning[] = [];
		const lines = content.split("\n");

		// Basic performance checks
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lowerLine = line.toLowerCase();

			// Check for potential performance issues
			if (lowerLine.includes("foreach") && language === "javascript") {
				warnings.push({
					id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					file,
					line: i + 1,
					column: line.indexOf("forEach") + 1,
					type: "performance",
					message: "forEach may be slower than for loop for large arrays",
					context: line.trim(),
					suggestion:
						"Consider using for loop for better performance with large datasets",
				});
			}

			if (lowerLine.includes("json.parse") && lowerLine.includes("innerhtml")) {
				warnings.push({
					id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					file,
					line: i + 1,
					column:
						Math.max(line.indexOf("JSON.parse"), line.indexOf("innerHTML")) + 1,
					type: "performance",
					message: "JSON.parse + innerHTML combination can be slow",
					context: line.trim(),
					suggestion: "Consider using DOM manipulation APIs directly",
				});
			}
		}

		return warnings;
	}

	private createSyntaxError(
		file: URI,
		line: number,
		column: number,
		message: string,
	): VerificationError {
		return {
			id: `syntax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			file,
			line,
			column,
			type: "syntax",
			severity: "error",
			message,
			context: `Line ${line}, column ${column}`,
			suggestion: "Fix syntax error",
			autofixable: false,
		};
	}

	private getContext(content: string, line: number, column: number): string {
		const lines = content.split("\n");
		if (line < 1 || line > lines.length) {
			return "Line not found";
		}

		const targetLine = lines[line - 1];
		const start = Math.max(0, column - 20);
		const end = Math.min(targetLine.length, column + 20);

		return targetLine.substring(start, end);
	}

	// Task validation
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
	public async verifyFiles(
		files: URI[],
		checks: VerificationCheck[],
		contents?: Map<URI, string>,
	): Promise<VerificationResult> {
		const request: VerificationRequest = {
			taskId: `verify_${Date.now()}`,
			files,
			checks,
			originalContents: contents,
		};

		const fileContents = contents || (await this.readFiles(files));
		const checkResults = await this.runVerificationChecks(
			request,
			fileContents,
		);

		// Create a dummy task for analysis
		const task: AgentTask = {
			id: request.taskId,
			description: "File verification",
			context: {
				relevantFiles: files,
				searchResults: [],
				projectRules: { global: [], project: [], session: [] },
				userPreferences: {
					language: "typescript",
					codeStyle: "standard",
					testingFramework: "jest",
					securityLevel: "medium",
					performancePriority: "medium",
					accessibilityRequired: false,
				},
				sessionState: {
					openFiles: [],
					recentChanges: [],
					checkpoints: [],
				},
			},
			retryCount: 0,
			maxRetries: 3,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		return this.analyzeResults(checkResults, request, task);
	}

	public async verifyChanges(
		originalContents: Map<URI, string>,
		newContents: Map<URI, string>,
		checks: VerificationCheck[],
	): Promise<VerificationResult> {
		const files = Array.from(originalContents.keys());
		const request: VerificationRequest = {
			taskId: `verify_changes_${Date.now()}`,
			files,
			checks,
			originalContents,
			newContents,
		};

		const checkResults = await this.runVerificationChecks(
			request,
			originalContents,
		);

		// Create a dummy task for analysis
		const task: AgentTask = {
			id: request.taskId,
			description: "Change verification",
			context: {
				relevantFiles: files,
				searchResults: [],
				projectRules: { global: [], project: [], session: [] },
				userPreferences: {
					language: "typescript",
					codeStyle: "standard",
					testingFramework: "jest",
					securityLevel: "medium",
					performancePriority: "medium",
					accessibilityRequired: false,
				},
				sessionState: {
					openFiles: [],
					recentChanges: [],
					checkpoints: [],
				},
			},
			retryCount: 0,
			maxRetries: 3,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		return this.analyzeResults(checkResults, request, task);
	}

	public getSupportedChecks(): VerificationCheck[] {
		return [
			{ type: "syntax", severity: "error" },
			{ type: "lint", severity: "warning" },
			{ type: "type", severity: "error" },
			{ type: "test", severity: "error" },
			{ type: "import", severity: "warning" },
			{ type: "security", severity: "warning" },
			{ type: "performance", severity: "info" },
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
				case "check_syntax":
					const syntaxFiles = parameters.files.map((f: string) => URI.parse(f));
					const syntaxContents = new Map<URI, string>();

					for (const [file, content] of Object.entries(
						parameters.contents || {},
					)) {
						syntaxContents.set(URI.parse(file), content as string);
					}

					result = await this.checkSyntax(syntaxFiles, syntaxContents);
					break;

				case "run_lint":
					const lintFiles = parameters.files.map((f: string) => URI.parse(f));
					const lintContents = new Map<URI, string>();

					for (const [file, content] of Object.entries(
						parameters.contents || {},
					)) {
						lintContents.set(URI.parse(file), content as string);
					}

					result = await this.runLint(lintFiles, lintContents);
					break;

				case "run_type_check":
					const typeFiles = parameters.files.map((f: string) => URI.parse(f));
					const typeContents = new Map<URI, string>();

					for (const [file, content] of Object.entries(
						parameters.contents || {},
					)) {
						typeContents.set(URI.parse(file), content as string);
					}

					result = await this.runTypeCheck(typeFiles, typeContents);
					break;

				case "run_tests":
					const testFiles = parameters.files.map((f: string) => URI.parse(f));
					result = await this.runTests(testFiles);
					break;

				case "check_imports":
					const importFiles = parameters.files.map((f: string) => URI.parse(f));
					const importContents = new Map<URI, string>();

					for (const [file, content] of Object.entries(
						parameters.contents || {},
					)) {
						importContents.set(URI.parse(file), content as string);
					}

					result = await this.checkImports(importFiles, importContents);
					break;

				case "analyze_security":
					const securityFiles = parameters.files.map((f: string) =>
						URI.parse(f),
					);
					const securityContents = new Map<URI, string>();

					for (const [file, content] of Object.entries(
						parameters.contents || {},
					)) {
						securityContents.set(URI.parse(file), content as string);
					}

					result = await this.analyzeSecurity(securityFiles, securityContents);
					break;

				case "generate_report":
					result = {
						format: parameters.format || "json",
						report: this.generateReport(parameters.results, parameters.format),
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
					console.log(`[VerifierAgent] ${parameters.message}`);
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

	private generateReport(results: any, format: string = "json"): any {
		if (format === "json") {
			return results;
		} else if (format === "markdown") {
			return this.generateMarkdownReport(results);
		} else if (format === "human") {
			return this.generateHumanReport(results);
		} else {
			return results;
		}
	}

	private generateMarkdownReport(results: any): string {
		let markdown = "# Verification Report\n\n";

		if (results.status === "success") {
			markdown += "## ✅ All checks passed\n\n";
		} else if (results.status === "warning") {
			markdown += "## ⚠️ Warnings found\n\n";
		} else {
			markdown += "## ❌ Errors found\n\n";
		}

		markdown += `### Summary\n`;
		markdown += `- Total errors: ${results.summary?.totalErrors || 0}\n`;
		markdown += `- Total warnings: ${results.summary?.totalWarnings || 0}\n`;
		markdown += `- Files checked: ${results.summary?.filesChecked || 0}\n\n`;

		if (results.errors && results.errors.length > 0) {
			markdown += `### Errors\n\n`;
			results.errors.forEach((error: any) => {
				markdown += `#### ${error.file.fsPath}:${error.line}:${error.column}\n`;
				markdown += `- **Type:** ${error.type}\n`;
				markdown += `- **Message:** ${error.message}\n`;
				markdown += `- **Context:** \`${error.context}\`\n`;
				markdown += `- **Suggestion:** ${error.suggestion}\n\n`;
			});
		}

		if (results.warnings && results.warnings.length > 0) {
			markdown += `### Warnings\n\n`;
			results.warnings.forEach((warning: any) => {
				markdown += `#### ${warning.file.fsPath}:${warning.line}:${warning.column}\n`;
				markdown += `- **Type:** ${warning.type}\n`;
				markdown += `- **Message:** ${warning.message}\n`;
				markdown += `- **Context:** \`${warning.context}\`\n`;
				markdown += `- **Suggestion:** ${warning.suggestion}\n\n`;
			});
		}

		return markdown;
	}

	private generateHumanReport(results: any): string {
		let report = "Verification Results:\n";
		report += "=".repeat(50) + "\n\n";

		if (results.status === "success") {
			report += "✅ All checks passed!\n\n";
		} else if (results.status === "warning") {
			report += "⚠️  Warnings found (no critical errors)\n\n";
		} else {
			report += "❌ Errors found\n\n";
		}

		report += `Summary:\n`;
		report += `  Files checked: ${results.summary?.filesChecked || 0}\n`;
		report += `  Total errors: ${results.summary?.totalErrors || 0}\n`;
		report += `  Total warnings: ${results.summary?.totalWarnings || 0}\n\n`;

		if (results.errors && results.errors.length > 0) {
			report += `Errors:\n`;
			report += "-".repeat(30) + "\n";
			results.errors.forEach((error: any, index: number) => {
				report += `${index + 1}. ${error.file.fsPath}:${error.line}:${error.column}\n`;
				report += `   ${error.message}\n`;
				report += `   Context: ${error.context}\n`;
				report += `   Suggestion: ${error.suggestion}\n\n`;
			});
		}

		if (results.warnings && results.warnings.length > 0) {
			report += `Warnings:\n`;
			report += "-".repeat(30) + "\n";
			results.warnings.forEach((warning: any, index: number) => {
				report += `${index + 1}. ${warning.file.fsPath}:${warning.line}:${warning.column}\n`;
				report += `   ${warning.message}\n`;
				report += `   Context: ${warning.context}\n`;
				report += `   Suggestion: ${warning.suggestion}\n\n`;
			});
		}

		return report;
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
