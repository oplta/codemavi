/**
 * Code Mavi - Agent State Manager
 * 
 * Agent'ın düşünce zincirini (Chain of Thought), mevcut görev durumunu
 * ve zihin geçmişini (memory) yöneten servis.
 */

export interface IAgentStep {
	id: string
	timestamp: number
	thought: string // Agent'ın o anki düşüncesi
	action: string  // Gerçekleştirdiği eylem (tool call vb.)
	observation: string // Eylemin sonucu
}

export interface IAgentState {
	taskId: string
	status: 'analyzing' | 'planning' | 'executing' | 'verifying' | 'completed' | 'failed'
	steps: IAgentStep[]
	context: Record<string, any>
}

export class AgentStateManager {
	private _states: Map<string, IAgentState> = new Map()

	/**
	 * Yeni bir görev için durum başlatır.
	 */
	initState(taskId: string): IAgentState {
		const state: IAgentState = {
			taskId,
			status: 'analyzing',
			steps: [],
			context: {}
		}
		this._states.set(taskId, state)
		return state
	}

	/**
	 * Düşünce zincirine yeni bir halka ekler.
	 */
	addStep(taskId: string, thought: string, action: string): void {
		const state = this._states.get(taskId)
		if (!state) return

		state.steps.push({
			id: Math.random().toString(36).substr(2, 9),
			timestamp: Date.now(),
			thought,
			action,
			observation: ''
		})
	}

	/**
	 * Son yapılan eylemin sonucunu (observation) kaydeder.
	 */
	updateLastStep(taskId: string, observation: string): void {
		const state = this._states.get(taskId)
		if (!state || state.steps.length === 0) return

		state.steps[state.steps.length - 1].observation = observation
	}

	/**
	 * Görev durumunu günceller.
	 */
	setStatus(taskId: string, status: IAgentState['status']): void {
		const state = this._states.get(taskId)
		if (state) state.status = status
	}

	/**
	 * Tüm düşünce zincirini özet olarak döner.
	 */
	getSummary(taskId: string): string {
		const state = this._states.get(taskId)
		if (!state) return "Görev bulunamadı."

		return state.steps.map(s => `Düşünce: ${s.thought}\nEylem: ${s.action}\nGözlem: ${s.observation}`).join('\n\n')
	}
}
