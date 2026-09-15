/* ==========================================================================
   Quench Batch: Settings
   Verifies settings register with the expected shape. Checks types/ranges
   rather than exact values so this doesn't break in a world where a GM has
   already customized settings.
   ========================================================================== */

import { getSetting } from '@/settings'

export default function registerSettingsBatch(quench: Quench): void {
	quench.registerBatch(
		'foundry-ai.settings',
		(context) => {
			const { describe, it, assert } = context

			describe('Settings', function () {
				it('registers apiKey and model settings as strings', function () {
					assert.isString(getSetting('apiKey'))
					assert.isString(getSetting('chatModel'))
					assert.isString(getSetting('embeddingModel'))
					assert.isString(getSetting('imageModel'))
					assert.isString(getSetting('ttsModel'))
				})

				it('keeps temperature within its documented 0-2 range', function () {
					const temperature = getSetting('temperature')
					assert.isNumber(temperature)
					assert.isAtLeast(temperature, 0)
					assert.isAtMost(temperature, 2)
				})

				it('registers folder settings as arrays', function () {
					assert.isArray(getSetting('journalFolders'))
					assert.isArray(getSetting('actorFolders'))
					assert.isArray(getSetting('sceneFolders'))
					assert.isArray(getSetting('macroFolders'))
				})

				it('registers tool category toggles as booleans', function () {
					assert.isBoolean(getSetting('enableTools'))
					assert.isBoolean(getSetting('enableSceneTools'))
					assert.isBoolean(getSetting('enableDiceTools'))
					assert.isBoolean(getSetting('enableCombatTools'))
				})
			})
		},
		{ displayName: 'FoundryAI: Settings' },
	)
}
