/* ==========================================================================
   Quench Batch: Tool System
   Structural checks on the tool catalog, plus feature-toggle behavior.
   Toggled settings are restored in `finally` so this doesn't leave the
   world's configuration mutated.
   ========================================================================== */

import { getEnabledTools, TOOL_DEFINITIONS } from '@core/tool-system'
import { getSetting, setSetting } from '@/settings'

export default function registerToolSystemBatch(quench: Quench): void {
	quench.registerBatch(
		'foundry-ai.tool-system',
		(context) => {
			const { describe, it, assert } = context

			describe('Tool System', function () {
				it('defines a unique, well-formed tool for every entry', function () {
					const names = new Set<string>()
					for (const tool of TOOL_DEFINITIONS) {
						assert.equal(tool.type, 'function')
						assert.isString(tool.function.name)
						assert.isString(tool.function.description)
						assert.isObject(tool.function.parameters)
						assert.isFalse(names.has(tool.function.name), `duplicate tool name: ${tool.function.name}`)
						names.add(tool.function.name)
					}
				})

				it('returns no tools when enableTools is disabled', async function () {
					const original = getSetting('enableTools')
					try {
						await setSetting('enableTools', false)
						assert.lengthOf(getEnabledTools(), 0)
					} finally {
						await setSetting('enableTools', original)
					}
				})

				it('includes core tools regardless of category toggles', async function () {
					const originalScene = getSetting('enableSceneTools')
					try {
						await setSetting('enableSceneTools', false)
						const names = getEnabledTools().map((tool) => tool.function.name)
						assert.include(names, 'search_journals')
						assert.notInclude(names, 'list_scenes')
					} finally {
						await setSetting('enableSceneTools', originalScene)
					}
				})
			})
		},
		{ displayName: 'FoundryAI: Tool System' },
	)
}
