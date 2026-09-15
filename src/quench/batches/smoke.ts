/* ==========================================================================
   Quench Batch: Smoke
   Confirms the module is active and its public surface is wired up.
   ========================================================================== */

const MODULE_ID = 'foundry-ai'

export default function registerSmokeBatch(quench: Quench): void {
	quench.registerBatch(
		'foundry-ai.smoke',
		(context) => {
			const { describe, it, assert } = context

			describe('FoundryAI module', function () {
				it('is active in this world', function () {
					const mod = game.modules.get(MODULE_ID)
					assert.isOk(mod, 'foundry-ai module missing')
					assert.isTrue(mod!.active, 'foundry-ai is not enabled')
				})

				it('registers its settings', function () {
					assert.doesNotThrow(() => game.settings.get(MODULE_ID, 'chatModel'))
				})

				it('exposes game.foundryAI to GM clients', function () {
					if (!game.user?.isGM) return this.skip()
					assert.isObject(game.foundryAI)
					assert.isFunction(game.foundryAI?.chat)
					assert.isFunction(game.foundryAI?.openChat)
					assert.isFunction(game.foundryAI?.reindex)
					assert.isFunction(game.foundryAI?.generateSessionRecap)
				})
			})
		},
		{ displayName: 'FoundryAI: Smoke' },
	)
}
