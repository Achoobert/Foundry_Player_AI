/* ==========================================================================
   TTS Service
   Manages text-to-speech playback via OpenRouter TTS API.
   Provides play/stop with button state management.
   ========================================================================== */

import { openRouterService } from './openrouter-service'
import { getSetting } from '../settings'

let currentAudio: HTMLAudioElement | null = null
let currentButton: HTMLElement | null = null

/**
 * Play TTS for the given text using OpenRouter's TTS API.
 * Stops any existing playback first.
 * Updates the button's icon to show stop → speaker states.
 */
export async function playTTS(text: string, button: HTMLElement): Promise<void> {
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
		const voice = getSetting('ttsVoice') || 'nova'
		const model = getSetting('ttsModel') || 'openai/gpt-4o-mini-audio-preview'

		const audioBuffer = await openRouterService.generateSpeech(text, voice, model)

		// Convert ArrayBuffer to a playable audio element
		const blob = new Blob([audioBuffer], { type: 'audio/wav' })
		const url = URL.createObjectURL(blob)

		const audio = new Audio(url)
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
