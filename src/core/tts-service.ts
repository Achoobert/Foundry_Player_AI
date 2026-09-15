/* ==========================================================================
   TTS Service
   Manages text-to-speech playback via OpenRouter TTS API.
   Provides play/stop with button state management, plus a button-less
   "auto speak" path used by the auto-speak-responses setting.
   ========================================================================== */

import { openRouterService } from './openrouter-service'
import { getSetting } from '../settings'

let currentAudio: HTMLAudioElement | null = null
let currentButton: HTMLElement | null = null

async function synthesize(text: string, voice: string, model: string): Promise<{ audio: HTMLAudioElement; url: string }> {
	const { buffer, mimeType } = await openRouterService.generateSpeech(text, voice, model)
	const blob = new Blob([buffer], { type: mimeType })
	const url = URL.createObjectURL(blob)
	return { audio: new Audio(url), url }
}

/**
 * Play TTS for the given text using OpenRouter's TTS API.
 * Stops any existing playback first.
 * Updates the button's icon to show stop → speaker states.
 */
export async function playTTS(text: string, button: HTMLElement, voice?: string): Promise<void> {
	// If clicking the same button that's playing, toggle off
	if (currentButton === button && currentAudio && !currentAudio.paused) {
		stopTTS()
		return
	}

	// Stop any existing playback
	stopTTS()

	currentButton = button
	button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'

	try {
		const selectedVoice = voice || getSetting('ttsVoice') || 'nova'
		const model = getSetting('ttsModel') || 'openai/gpt-4o-mini-audio-preview'

		const { audio, url } = await synthesize(text, selectedVoice, model)
		currentAudio = audio

		button.innerHTML = '<i class="fas fa-stop"></i>'

		const cleanup = () => {
			button.innerHTML = '<i class="fas fa-volume-up"></i>'
			URL.revokeObjectURL(url)
			if (currentAudio === audio) {
				currentAudio = null
				currentButton = null
			}
		}

		audio.onended = cleanup
		audio.onerror = cleanup

		await audio.play()
		console.log('FoundryAI | TTS playing via OpenRouter API')
	} catch (err: any) {
		console.error('FoundryAI | TTS playback failed:', err)
		button.innerHTML = '<i class="fas fa-volume-up"></i>'
		currentAudio = null
		currentButton = null
		throw err
	}
}

/**
 * Speak text with no button/UI to manage — used by the "auto speak responses"
 * setting. Resolves once playback has finished (or failed), so callers that
 * need to keep multiple speakers from talking over each other can await it.
 */
export async function autoSpeakText(text: string, voice?: string): Promise<void> {
	stopTTS()

	try {
		const selectedVoice = voice || getSetting('ttsVoice') || 'nova'
		const model = getSetting('ttsModel') || 'openai/gpt-4o-mini-audio-preview'

		const { audio, url } = await synthesize(text, selectedVoice, model)
		currentAudio = audio

		await new Promise<void>((resolve) => {
			const cleanup = () => {
				URL.revokeObjectURL(url)
				if (currentAudio === audio) currentAudio = null
				resolve()
			}
			audio.onended = cleanup
			audio.onerror = cleanup
			audio.play().catch(cleanup)
		})
	} catch (err: any) {
		console.error('FoundryAI | Auto-speak failed:', err)
	}
}

/**
 * Strip common markdown syntax so it isn't read aloud literally
 * (e.g. "asterisk asterisk hello asterisk asterisk").
 */
export function stripMarkdownForSpeech(text: string): string {
	return text
		.replace(/```[\s\S]*?```/g, '')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/@UUID\[[^\]]+\]\{([^}]+)\}/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s?/gm, '')
		.replace(/^[-*+]\s+/gm, '')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/_([^_]+)_/g, '$1')
		.trim()
}

/**
 * Stop any currently playing TTS audio and reset button state.
 */
export function stopTTS(): void {
	if (currentAudio) {
		currentAudio.pause()
		currentAudio.currentTime = 0
		currentAudio = null
	}
	if (currentButton) {
		currentButton.innerHTML = '<i class="fas fa-volume-up"></i>'
		currentButton = null
	}
}
