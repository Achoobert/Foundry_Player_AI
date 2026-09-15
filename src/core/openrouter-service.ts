/* ==========================================================================
   OpenRouter API Service
   Handles all communication with the OpenRouter API:
   - Chat completions (with streaming)
   - Embeddings generation
   - Model listing
   ========================================================================== */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

// ---- Types ----

export interface LLMMessage {
	role: 'system' | 'user' | 'assistant' | 'tool'
	content: string | null
	name?: string
	tool_calls?: ToolCall[]
	tool_call_id?: string
	/** Party chat only: the actor id that spoke this turn (unset = the GM/user). Never sent to the API. */
	speakerActorId?: string
}

export interface ToolCall {
	id: string
	type: 'function'
	function: {
		name: string
		arguments: string // JSON string
	}
}

export interface ToolDefinition {
	type: 'function'
	function: {
		name: string
		description: string
		parameters: Record<string, any>
	}
}

export interface ChatCompletionRequest {
	model: string
	messages: LLMMessage[]
	tools?: ToolDefinition[]
	tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } }
	stream?: boolean
	temperature?: number
	max_tokens?: number
	stop?: string | string[]
	top_p?: number
	frequency_penalty?: number
	presence_penalty?: number
}

export interface ChatCompletionResponse {
	id: string
	choices: Array<{
		finish_reason: string | null
		native_finish_reason: string | null
		message: {
			role: string
			content: string | null
			tool_calls?: ToolCall[]
		}
		error?: { code: number; message: string }
	}>
	model: string
	usage?: {
		prompt_tokens: number
		completion_tokens: number
		total_tokens: number
		cost?: number
	}
}

export interface StreamingChunk {
	id: string
	choices: Array<{
		finish_reason: string | null
		delta: {
			role?: string
			content?: string | null
			tool_calls?: Partial<ToolCall>[]
		}
		error?: { code: number; message: string }
	}>
	model?: string
	usage?: {
		prompt_tokens: number
		completion_tokens: number
		total_tokens: number
		cost?: number
	}
}

export interface EmbeddingRequest {
	model: string
	input: string | string[]
}

export interface EmbeddingResponse {
	data: Array<{
		object: string
		index: number
		embedding: number[]
	}>
	model: string
	usage: {
		prompt_tokens: number
		total_tokens: number
	}
}

export interface ModelInfo {
	id: string
	name: string
	description?: string
	context_length?: number
	pricing?: {
		prompt: string
		completion: string
	}
	top_provider?: {
		max_completion_tokens?: number
	}
	architecture?: {
		modality: string
		tokenizer: string
	}
}

export interface ModelsResponse {
	data: ModelInfo[]
}

// ---- Streaming Callback ----
export type StreamCallback = (chunk: {
	content?: string
	toolCalls?: Partial<ToolCall>[]
	done: boolean
	usage?: ChatCompletionResponse['usage']
	error?: string
}) => void

// ---- Service Class ----

export class OpenRouterService {
	private apiKey: string = ''
	private defaultModel: string = ''
	private embeddingModel: string = ''
	private imageModel: string = ''
	private ttsModel: string = ''

	configure(options: {
		apiKey: string
		defaultModel?: string
		embeddingModel?: string
		imageModel?: string
		ttsModel?: string
	}): void {
		this.apiKey = options.apiKey
		if (options.defaultModel) this.defaultModel = options.defaultModel
		if (options.embeddingModel) this.embeddingModel = options.embeddingModel
		if (options.imageModel) this.imageModel = options.imageModel
		if (options.ttsModel) this.ttsModel = options.ttsModel
	}

	get isConfigured(): boolean {
		return !!this.apiKey
	}

	private get headers(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.apiKey}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': 'https://foundryvtt.com',
			'X-Title': 'FoundryAI',
		}
	}

	// ---- Chat Completions ----

	async chatCompletion(request: ChatCompletionRequest, signal?: AbortSignal): Promise<ChatCompletionResponse> {
		if (!this.apiKey) throw new Error('OpenRouter API key not configured')

		const body: ChatCompletionRequest = {
			...request,
			model: request.model || this.defaultModel,
			stream: false,
		}

		console.log(
			`FoundryAI | API chatCompletion — model: ${body.model}, messages: ${body.messages.length}, tools: ${body.tools?.length || 0}`,
		)

		const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
			method: 'POST',
			headers: this.headers,
			body: JSON.stringify(body),
			signal,
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: response.statusText }))
			console.error(`FoundryAI | API error (${response.status}):`, error)
			throw new Error(
				`OpenRouter API error (${response.status}): ${error.message || error.error?.message || 'Unknown error'}`,
			)
		}

		const result = await response.json()
		console.log('FoundryAI | API chatCompletion response:', {
			model: result.model,
			finishReason: result.choices?.[0]?.finish_reason,
			hasContent: !!result.choices?.[0]?.message?.content,
			toolCalls: result.choices?.[0]?.message?.tool_calls?.map((tc: any) => tc.function?.name) || [],
			usage: result.usage,
		})
		return result
	}

	async chatCompletionStream(
		request: ChatCompletionRequest,
		onChunk: StreamCallback,
		signal?: AbortSignal,
	): Promise<void> {
		if (!this.apiKey) throw new Error('OpenRouter API key not configured')

		const body: ChatCompletionRequest = {
			...request,
			model: request.model || this.defaultModel,
			stream: true,
		}

		console.log(
			`FoundryAI | API stream — model: ${body.model}, messages: ${body.messages.length}, tools: ${body.tools?.length || 0}`,
		)

		const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
			method: 'POST',
			headers: this.headers,
			body: JSON.stringify(body),
			signal,
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: response.statusText }))
			console.error(`FoundryAI | Stream API error (${response.status}):`, error)
			throw new Error(
				`OpenRouter API error (${response.status}): ${error.message || error.error?.message || 'Unknown error'}`,
			)
		}

		if (!response.body) {
			throw new Error('No response body for streaming request')
		}

		const reader = response.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split('\n')
				buffer = lines.pop() || ''

				for (const line of lines) {
					const trimmed = line.trim()
					if (!trimmed || trimmed.startsWith(':')) continue // skip empty lines and comments
					if (!trimmed.startsWith('data: ')) continue

					const data = trimmed.slice(6)
					if (data === '[DONE]') {
						onChunk({ done: true })
						return
					}

					try {
						const chunk: StreamingChunk = JSON.parse(data)
						const choice = chunk.choices?.[0]

						if (choice?.error) {
							console.error('FoundryAI | Stream chunk error:', choice.error)
							onChunk({ done: true, error: choice.error.message })
							return
						}

						// Log tool call deltas for debugging
						if (choice?.delta?.tool_calls?.length) {
							console.debug('FoundryAI | Stream tool_call delta:', JSON.stringify(choice.delta.tool_calls))
						}

						onChunk({
							content: choice?.delta?.content || undefined,
							toolCalls: choice?.delta?.tool_calls || undefined,
							done: choice?.finish_reason != null,
							usage: chunk.usage || undefined,
						})
					} catch {
						console.warn('FoundryAI | Skipping malformed SSE chunk:', data.slice(0, 200))
					}
				}
			}
		} finally {
			reader.releaseLock()
		}

		// If we exited without [DONE], signal completion
		console.debug('FoundryAI | Stream ended (no [DONE] received)')
		onChunk({ done: true })
	}

	// ---- Embeddings ----

	async generateEmbeddings(input: string | string[], model?: string): Promise<EmbeddingResponse> {
		if (!this.apiKey) throw new Error('OpenRouter API key not configured')

		const body: EmbeddingRequest = {
			model: model || this.embeddingModel,
			input,
		}

		const response = await fetch(`${OPENROUTER_BASE}/embeddings`, {
			method: 'POST',
			headers: this.headers,
			body: JSON.stringify(body),
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: response.statusText }))
			throw new Error(
				`OpenRouter Embeddings error (${response.status}): ${error.message || error.error?.message || 'Unknown error'}`,
			)
		}

		return response.json()
	}

	// ---- Models ----

	async listModels(): Promise<ModelInfo[]> {
		const response = await fetch(`${OPENROUTER_BASE}/models`, {
			headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch models: ${response.statusText}`)
		}

		const data: ModelsResponse = await response.json()
		return data.data
	}

	async listChatModels(): Promise<ModelInfo[]> {
		const models = await this.listModels()
		return models.filter(
			(m) => m.architecture?.modality?.includes('text') || !m.architecture?.modality, // include models without modality info
		)
	}

	async listEmbeddingModels(): Promise<ModelInfo[]> {
		// OpenRouter doesn't have a separate embedding models endpoint via the
		// generic /models route, so we filter or use known embedding model IDs
		const models = await this.listModels()
		return models.filter((m) => m.id.includes('embed') || m.architecture?.modality === 'embedding')
	}

	async listImageModels(): Promise<ModelInfo[]> {
		const models = await this.listModels()
		return models.filter(
			(m) =>
				m.architecture?.modality?.includes('image') ||
				m.id.includes('dall-e') ||
				m.id.includes('stable-diffusion') ||
				m.id.includes('flux') ||
				m.id.includes('midjourney') ||
				m.id.includes('image'),
		)
	}

	async listTTSModels(): Promise<ModelInfo[]> {
		const models = await this.listModels()
		return models.filter((m) => {
			// modality is formatted as "<input modalities>->output modalities>" — only the
			// output side tells us whether the model can actually produce audio.
			const outputModality = m.architecture?.modality?.split('->')[1] ?? ''
			return m.id.includes('tts') || m.id.includes('audio') || outputModality.includes('audio')
		})
	}

	// ---- Image Generation ----

	async generateImage(prompt: string, model?: string, size?: string): Promise<{ url?: string; b64_json?: string }> {
		if (!this.apiKey) throw new Error('OpenRouter API key not configured')

		const body = {
			model: model || this.imageModel || 'openai/dall-e-3',
			prompt,
			n: 1,
			size: size || '1024x1024',
		}

		console.log(`FoundryAI | API generateImage — model: ${body.model}, prompt: "${prompt.slice(0, 100)}..."`)

		const response = await fetch(`${OPENROUTER_BASE}/images/generations`, {
			method: 'POST',
			headers: this.headers,
			body: JSON.stringify(body),
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: response.statusText }))
			console.error(`FoundryAI | Image gen error (${response.status}):`, error)
			throw new Error(
				`Image generation error (${response.status}): ${error.message || error.error?.message || 'Unknown error'}`,
			)
		}

		const result = await response.json()
		const imageData = result.data?.[0]

		if (!imageData) {
			throw new Error('No image data in response')
		}

		console.log(`FoundryAI | Image generated successfully`)
		return {
			url: imageData.url,
			b64_json: imageData.b64_json,
		}
	}

	// ---- Text-to-Speech ----

	async generateSpeech(input: string, voice?: string, model?: string): Promise<ArrayBuffer> {
		if (!this.apiKey) throw new Error('OpenRouter API key not configured')

		const selectedVoice = voice || 'nova'
		const selectedModel = model || this.ttsModel || 'openai/gpt-4o-mini-audio-preview'

		console.log(
			`FoundryAI | API generateSpeech — model: ${selectedModel}, voice: ${selectedVoice}, input length: ${input.length}`,
		)

		// OpenRouter uses the chat/completions endpoint with modalities for audio output
		const body = {
			model: selectedModel,
			messages: [
				{
					role: 'user',
					content: `Read the following text aloud naturally:\n\n${input}`,
				},
			],
			modalities: ['text', 'audio'],
			audio: {
				voice: selectedVoice,
				format: 'wav',
			},
			stream: true,
		}

		const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
			method: 'POST',
			headers: this.headers,
			body: JSON.stringify(body),
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: response.statusText }))
			console.error(`FoundryAI | TTS error (${response.status}):`, error)
			throw new Error(`TTS error (${response.status}): ${error.message || error.error?.message || 'Unknown error'}`)
		}

		if (!response.body) {
			throw new Error('No response body for TTS streaming request')
		}

		// Collect base64 audio chunks from the SSE stream
		const reader = response.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''
		const audioChunks: string[] = []

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split('\n')
				buffer = lines.pop() || ''

				for (const line of lines) {
					const trimmed = line.trim()
					if (!trimmed || trimmed.startsWith(':')) continue
					if (!trimmed.startsWith('data: ')) continue

					const data = trimmed.slice(6)
					if (data === '[DONE]') break

					try {
						const chunk = JSON.parse(data)
						const delta = chunk.choices?.[0]?.delta
						if (delta?.audio?.data) {
							audioChunks.push(delta.audio.data)
						}
					} catch {
						// skip malformed chunks
					}
				}
			}
		} finally {
			reader.releaseLock()
		}

		if (audioChunks.length === 0) {
			throw new Error('No audio data received from TTS model')
		}

		// Decode base64 chunks into a single ArrayBuffer
		const fullBase64 = audioChunks.join('')
		const binaryString = atob(fullBase64)
		const bytes = new Uint8Array(binaryString.length)
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i)
		}

		console.log(`FoundryAI | TTS audio generated: ${bytes.byteLength} bytes from ${audioChunks.length} chunks`)
		return bytes.buffer
	}

	// ---- Connection Test ----

	async testConnection(): Promise<{ success: boolean; message: string; model?: string }> {
		try {
			if (!this.apiKey) {
				return { success: false, message: 'No API key configured' }
			}

			const response = await this.chatCompletion({
				model: this.defaultModel,
				messages: [{ role: 'user', content: 'Say "connected" in one word.' }],
				max_tokens: 10,
				temperature: 0,
			})

			const content = response.choices?.[0]?.message?.content
			return {
				success: true,
				message: `Connected! Response: "${content}"`,
				model: response.model,
			}
		} catch (error: any) {
			return {
				success: false,
				message: error.message || 'Unknown error',
			}
		}
	}
}

// Singleton
export const openRouterService = new OpenRouterService()
