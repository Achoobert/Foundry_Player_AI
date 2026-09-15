/* ==========================================================================
   Party Chat
   Transforms a shared, multi-character transcript into a per-character
   view for the LLM: the target character's own lines become assistant
   turns, everyone else's (GM + other party members) become user turns
   labeled by speaker.
   ========================================================================== */

import type { LLMMessage } from './openrouter-service'

export const PARTY_CHAT_MODE_INSTRUCTIONS = `

## Party Chat Mode
You are one member of a shared party conversation. Messages prefixed "[Speaker Name]: " are the GM or other party members speaking — those are NOT you; never speak for them or continue their lines. Only respond as yourself, in character, reacting to what's been said so far. Respond ONLY with your in-character reply as plain text (markdown for emphasis is fine). Do NOT output tool calls, function-call syntax, or JSON — you do not have tool access in this conversation. Keep it concise, like a real chat message.`

/**
 * Build the message array for one character's turn from the shared party
 * transcript: their own prior replies stay as assistant turns; everyone
 * else's lines become user turns prefixed with the speaker's name.
 */
export function buildPartyContextMessages(transcript: LLMMessage[], perspectiveActorId: string): LLMMessage[] {
	const result: LLMMessage[] = []

	for (const msg of transcript) {
		if (msg.role !== 'user' && msg.role !== 'assistant') continue
		if (typeof msg.content !== 'string' || !msg.content) continue

		if (msg.role === 'assistant' && msg.speakerActorId === perspectiveActorId) {
			result.push({ role: 'assistant', content: msg.content })
			continue
		}

		const speakerLabel = msg.speakerActorId ? msg.name || 'Someone' : 'GM'
		result.push({ role: 'user', content: `[${speakerLabel}]: ${msg.content}` })
	}

	return result
}
