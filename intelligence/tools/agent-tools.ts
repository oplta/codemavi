/**
 * Mavi - Agent Tool Tanımları
 * 
 * Mavi'un toolsServiceTypes.ts dosyasına eklenecek yeni tool'lar
 * Agent-first mimari için gerekli tool'lar
 */

import { URI } from '../../../../base/common/uri.js'

// ============================================
// YENİ AGENT TOOL'LARI
// ============================================

// Checkpoint sistemi
export type CheckpointToolParams = {
	'create_checkpoint': { name: string; description?: string }
	'restore_checkpoint': { checkpointId: string }
	'list_checkpoints': {}
}

export type CheckpointToolResult = {
	'create_checkpoint': { checkpointId: string; timestamp: number }
	'restore_checkpoint': { success: boolean }
	'list_checkpoints': { checkpoints: Array<{ id: string; name: string; timestamp: number }> }
}

// Semantic search (vec0 extension ile SQLite)
export type SemanticSearchParams = {
	'semantic_search': { 
		query: string
		topK: number
		filePattern?: string
	}
	'index_file': { uri: URI }
	'index_workspace': {}
}

export type SemanticSearchResult = {
	'semantic_search': { 
		results: Array<{
			uri: URI
			score: number
			snippet: string
			lineStart: number
			lineEnd: number
		}>
	}
	'index_file': { success: boolean; chunks: number }
	'index_workspace': { filesIndexed: number; totalChunks: number }
}

// Agent delegation
export type AgentDelegationParams = {
	'delegate_to_executor': {
		task: string
		context: string
		files: URI[]
	}
	'delegate_to_verifier': {
		changes: string // semantic diff
		files: URI[]
	}
}

export type AgentDelegationResult = {
	'delegate_to_executor': {
		success: boolean
		semanticDiff: string
		summary: string
	}
	'delegate_to_verifier': {
		status: 'success' | 'error'
		errors?: Array<{
			file: URI
			line: number
			message: string
		}>
		summary: string
	}
}

// User interaction
export type UserInteractionParams = {
	'ask_user': {
		question: string
		type: 'confirm' | 'text' | 'select'
		options?: string[] // for select type
	}
}

export type UserInteractionResult = {
	'ask_user': {
		response: string | boolean
	}
}

// Terminal operasyonları
export type TerminalToolParams = {
	'run_command': { command: string; cwd?: string; wait_for_output: boolean }
	'open_persistent_terminal': { id: string; shell?: string }
	'send_to_terminal': { id: string; input: string }
	'kill_terminal': { id: string }
}

export type TerminalToolResult = {
	'run_command': { output: string; exit_code: number }
	'open_persistent_terminal': { success: boolean }
	'send_to_terminal': { success: boolean }
	'kill_terminal': { success: boolean }
}

// Dosya sistemi gelişmiş operasyonlar
export type FileSystemAdvancedParams = {
	'list_dir_recursive': { path: string; max_depth?: number }
	'move_file': { source: string; destination: string }
	'copy_file': { source: string; destination: string }
	'find_files_by_content': { pattern: string; file_extension?: string }
}

// Genişletilmiş builtin tool'lar
export type CodeMaviToolName = 
	| 'create_checkpoint'
	| 'restore_checkpoint'
	| 'list_checkpoints'
	| 'semantic_search'
	| 'index_file'
	| 'index_workspace'
	| 'delegate_to_executor'
	| 'delegate_to_verifier'
	| 'ask_user'
	| keyof TerminalToolParams
	| keyof FileSystemAdvancedParams

// Tüm tool params birleşimi
export type CodeMaviToolParams =
	& CheckpointToolParams
	& SemanticSearchParams
	& AgentDelegationParams
	& UserInteractionParams
	& TerminalToolParams
	& FileSystemAdvancedParams