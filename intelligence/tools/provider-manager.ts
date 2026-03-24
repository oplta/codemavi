/**
 * Mavi - Provider Manager
 * 
 * Farklı LLM sağlayıcılarını (OpenAI, Anthropic, DeepSeek, Zhipu, vb.)
 * standart bir arayüz üzerinden yönetir.
 */

export type ProviderName = 'openai' | 'anthropic' | 'ollama' | 'deepseek' | 'zhipu' | 'together' | 'groq'

export interface IProviderConfig {
	name: ProviderName
	apiKey?: string
	baseUrl?: string
	defaultModel: string
	capabilities: {
		tools: boolean
		vision: boolean
		reasoning: boolean
		maxTokens: number
	}
}

export interface ILLMRequest {
	messages: Array<{ role: string, content: string }>
	model?: string
	stream?: boolean
	tools?: any[]
	temperature?: number
}

export interface ILLMResponse {
	content: string
	toolCalls?: any[]
	usage: {
		promptTokens: number
		completionTokens: number
	}
}

export class ProviderManager {
	private _configs: Map<ProviderName, IProviderConfig> = new Map()

	constructor() {
		this._initDefaultConfigs()
	}

	private _initDefaultConfigs() {
		// DeepSeek Örneği
		this._configs.set('deepseek', {
			name: 'deepseek',
			baseUrl: 'https://api.deepseek.com',
			defaultModel: 'deepseek-chat',
			capabilities: { tools: true, vision: false, reasoning: true, maxTokens: 8192 }
		})

		// Zhipu AI (GLM) Örneği
		this._configs.set('zhipu', {
			name: 'zhipu',
			baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
			defaultModel: 'glm-4',
			capabilities: { tools: true, vision: true, reasoning: false, maxTokens: 128000 }
		})
		
		// Together AI Örneği
		this._configs.set('together', {
			name: 'together',
			baseUrl: 'https://api.together.xyz/v1',
			defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
			capabilities: { tools: true, vision: false, reasoning: false, maxTokens: 32768 }
		})
	}

	async callProvider(provider: ProviderName, request: ILLMRequest): Promise<ILLMResponse> {
		const config = this._configs.get(provider)
		if (!config) throw new Error(`Provider ${provider} not configured.`)

		console.log(`[ProviderManager] Calling ${provider} with model ${request.model || config.defaultModel}`)
		
		const endpoint = provider === 'zhipu' ? `${config.baseUrl}/chat/completions` : `${config.baseUrl}/chat/completions`
		
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${config.apiKey || ''}`
				},
				body: JSON.stringify({
					model: request.model || config.defaultModel,
					messages: request.messages,
					stream: request.stream || false,
					tools: request.tools,
					temperature: request.temperature ?? 0.7
				})
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(`[${provider}] API Error: ${JSON.stringify(errorData)}`)
			}

			const data = await response.json()
			
			return {
				content: data.choices[0]?.message?.content || '',
				toolCalls: data.choices[0]?.message?.tool_calls,
				usage: {
					promptTokens: data.usage?.prompt_tokens || 0,
					completionTokens: data.usage?.completion_tokens || 0
				}
			}
		} catch (error) {
			console.error(`[ProviderManager] Error calling ${provider}:`, error)
			throw error
		}
	}

	getAvailableProviders(): ProviderName[] {
		return Array.from(this._configs.keys())
	}
}
