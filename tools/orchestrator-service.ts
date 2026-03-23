/**
 * Code Mavi - Orchestrator Service
 * 
 * Ana agent servisi - tüm agent akışını yönetir
 * Void'un chatThreadService.ts dosyasına entegre edilecek
 */

import { URI } from '../../../../base/common/uri.js'
import { CancellationToken } from '../../../../base/common/cancellation.js'

// ============================================
// ORCHESTRATOR TİPLERİ
// ============================================

export interface Task {
	id: string
	description: string
	status: 'pending' | 'in_progress' | 'completed' | 'failed'
	dependsOn?: string[] // Diğer task ID'leri
	executorResult?: string
	verifierResult?: VerifierResult
	retryCount: number
}

export interface VerifierResult {
	status: 'success' | 'error'
	errors?: LintError[]
	summary: string
}

export interface LintError {
	file: URI
	line: number
	column: number
	type: 'lint' | 'type' | 'syntax'
	message: string
	suggestion?: string
}

export interface ExecutionPlan {
	tasks: Task[]
	context: {
		relevantFiles: URI[]
		searchResults: SearchResult[]
	}
}

export interface SearchResult {
	uri: URI
	score: number
	snippet: string
	lineStart: number
	lineEnd: number
}

// ============================================
// ORCHESTRATOR ARAYÜZÜ
// ============================================

export interface IOrchestratorService {
	readonly _serviceBrand: undefined

	/**
	 * Kullanıcı isteğini analiz et ve plan oluştur
	 */
	analyzeAndPlan(
		request: string,
		token: CancellationToken
	): Promise<ExecutionPlan>

	/**
	 * Planı çalıştır
	 */
	executePlan(
		plan: ExecutionPlan,
		token: CancellationToken
	): Promise<void>

	/**
	 * Executor'a görev delegate et
	 */
	delegateToExecutor(
		task: Task,
		token: CancellationToken
	): Promise<string> // semantic diff

	/**
	 * Verifier'a doğrulama yaptır
	 */
	delegateToVerifier(
		task: Task,
		semanticDiff: string,
		token: CancellationToken
	): Promise<VerifierResult>

	/**
	 * Hata durumunda retry
	 */
	retryTask(
		task: Task,
		error: VerifierResult,
		token: CancellationToken
	): Promise<boolean> // success?

	/**
	 * Checkpoint oluştur
	 */
	createCheckpoint(name: string): Promise<string>

	/**
	 * Tüm task'ların durumunu getir
	 */
	getTaskStatus(): Task[]
}

// ============================================
// SABİTLER
// ============================================

export const MAX_RETRIES = 3
export const MAX_PARALLEL_TASKS = 4

// ============================================
// HATA TİPLERİ
// ============================================

export class OrchestratorError extends Error {
	constructor(
		message: string,
		public readonly taskId?: string,
		public readonly phase: 'analysis' | 'execution' | 'verification' = 'execution'
	) {
		super(message)
		this.name = 'OrchestratorError'
	}
}

export class MaxRetriesExceededError extends OrchestratorError {
	constructor(taskId: string) {
		super(`Task ${taskId} maksimum deneme sayısını aştı`, taskId, 'verification')
		this.name = 'MaxRetriesExceededError'
	}
}