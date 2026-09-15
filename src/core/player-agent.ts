/* ==========================================================================
   Player Agent
   Listens to the Foundry chat log for "@name" mentions of player characters
   and automatically posts an in-character AI reply as that character.
   Runs only on the GM client (single-session MVP — see project plan).
   ========================================================================== */

import { getSetting } from '../settings'
import { openRouterService, type LLMMessage } from './openrouter-service'
import { chatSessionManager } from './chat-session-manager'
import { buildActorRoleplayPrompt, getPlayerCharacterActors } from './system-prompt'

const MODULE_ID = 'foundry-ai'
const FLAG_AI_REPLY = 'aiPlayerReply'
const MAX_SEEN_MESSAGE_IDS = 500

const LIVE_CHAT_MODE_INSTRUCTIONS = `

## Live Chat Mode
You are replying live in the Foundry chat log as this character. Respond ONLY with your in-character spoken/narrated reply as plain text (markdown for emphasis is fine). Do NOT output tool calls, function-call syntax, or JSON — you do not have tool access in this conversation. Keep it concise, like a real chat message.`

// In-memory only — reset on a GM client reload (documented MVP limitation).
const agentSessions = new Map<string, string>() // actorId -> chat session (journal) id
const agentQueues = new Map<string, Promise<void>>() // actorId -> serialized reply chain
const seenMessageIds = new Set<string>() // defensive re-entrancy guard

/** Register the chat-message listener that drives AI player auto-replies. */
export function initPlayerAgents(): void {
	Hooks.on('createChatMessage', (message: ChatMessage) => {
		handleCreateChatMessage(message).catch((err) => {
			console.error('FoundryAI | Player-agent handler failed:', err)
		})
	})
	console.log('FoundryAI | Player-agent hook registered.')
}

async function handleCreateChatMessage(message: ChatMessage): Promise<void> {
	if (!getSetting('enablePlayerAgents')) return
	if (!game.user?.isGM) return
	if (!getSetting('apiKey')) return
	if (message.getFlag(MODULE_ID, FLAG_AI_REPLY)) return // never re-trigger on our own replies

	if (seenMessageIds.has(message.id)) return
	seenMessageIds.add(message.id)
	if (seenMessageIds.size > MAX_SEEN_MESSAGE_IDS) seenMessageIds.clear()

	const plainText = stripHtml(message.content || '')
	if (!plainText) return

	const speakerName = (message.speaker as any)?.alias || message.user?.name || 'Someone'
	const matches = resolveMatchingActors(plainText)
	if (matches.length === 0) return

	// Sequential across all matched actors so replies keep dialogue order
	// when the DM addresses multiple AI players in one message.
	for (const actor of matches) {
		await enqueueForActor(actor.id, () => replyAsActor(actor, plainText, speakerName))
	}
}

/**
 * Serialize processing per actor so overlapping mentions of the same
 * character can't race the read-modify-write in chatSessionManager for the
 * same session. Different actors process concurrently.
 */
function enqueueForActor(actorId: string, task: () => Promise<void>): Promise<void> {
	const prior = agentQueues.get(actorId) ?? Promise.resolve()
	const next = prior.then(task).catch((err) => {
		console.error(`FoundryAI | AI player reply failed for actor ${actorId}:`, err)
	})
	agentQueues.set(actorId, next)
	return next
}

function resolveMatchingActors(plainText: string): Actor[] {
	const seenTriggers = new Set<string>()
	const matches: Actor[] = []

	for (const actor of getPlayerCharacterActors()) {
		const trigger = deriveTrigger(actor.name)
		if (!trigger || seenTriggers.has(trigger)) continue
		seenTriggers.add(trigger)

		const mentionPattern = new RegExp(`@${trigger}\\b`, 'i')
		if (mentionPattern.test(plainText)) matches.push(actor)
	}

	return matches
}

function deriveTrigger(actorName: string): string {
	const firstWord = (actorName || '').trim().split(/\s+/)[0] || ''
	return firstWord.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim()
}

async function replyAsActor(actor: Actor, plainText: string, speakerName: string): Promise<void> {
	let sessionId = agentSessions.get(actor.id)
	if (!sessionId) {
		const session = await chatSessionManager.createSession(`${actor.name} — AI Player`, actor.id, actor.name)
		sessionId = session.id
		agentSessions.set(actor.id, sessionId)
	}

	const priorMessages = chatSessionManager.getMessages(sessionId)
	const userTurn: LLMMessage = { role: 'user', content: `${speakerName}: ${plainText}` }

	const systemPrompt = buildActorRoleplayPrompt({ actorId: actor.id, actorName: actor.name }) + LIVE_CHAT_MODE_INSTRUCTIONS

	const apiMessages: LLMMessage[] = [{ role: 'system', content: systemPrompt }, ...priorMessages, userTurn]

	const model = getSetting('chatModel')
	const response = await openRouterService.chatCompletion({
		model,
		messages: apiMessages,
		temperature: getSetting('temperature'),
		max_tokens: getSetting('maxTokens'),
	})

	const replyText = response.choices?.[0]?.message?.content?.trim()
	if (!replyText) return

	const assistantTurn: LLMMessage = { role: 'assistant', content: replyText }
	await chatSessionManager.saveMessages(sessionId, [userTurn, assistantTurn], model)

	const speaker = ChatMessage.getSpeaker({ actor })

	await ChatMessage.create({
		content: replyText,
		speaker,
		flags: { [MODULE_ID]: { [FLAG_AI_REPLY]: true, actorId: actor.id } },
	})
}
