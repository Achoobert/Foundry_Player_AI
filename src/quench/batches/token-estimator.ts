/* ==========================================================================
   Quench Batch: Token Estimator
   Pure-logic checks for the char/4 heuristic and model context lookups.
   ========================================================================== */

import {
	estimateStringTokens,
	estimateMessageTokens,
	estimateTokens,
	getModelContextLimit,
} from '@core/token-estimator'
import type { LLMMessage } from '@core/openrouter-service'

export default function registerTokenEstimatorBatch(quench: Quench): void {
	quench.registerBatch(
		'foundry-ai.token-estimator',
		(context) => {
			const { describe, it, assert } = context

			describe('Token Estimator', function () {
				it('estimates 0 tokens for empty strings', function () {
					assert.equal(estimateStringTokens(''), 0)
				})

				it('estimates roughly chars/4 tokens for a string', function () {
					assert.equal(estimateStringTokens('a'.repeat(40)), 10)
				})

				it('adds per-message overhead on top of content tokens', function () {
					const message: LLMMessage = { role: 'user', content: 'hello world' }
					const withoutOverhead = estimateStringTokens('hello world')
					assert.isAbove(estimateMessageTokens(message), withoutOverhead)
				})

				it('counts tool call name/arguments toward message tokens', function () {
					const base: LLMMessage = { role: 'assistant', content: '' }
					const withTools: LLMMessage = {
						role: 'assistant',
						content: '',
						tool_calls: [
							{
								id: '1',
								type: 'function',
								function: { name: 'roll_dice', arguments: '{"expression":"2d6+4"}' },
							},
						],
					}
					assert.isAbove(estimateMessageTokens(withTools), estimateMessageTokens(base))
				})

				it('sums system prompt, RAG context, and message tokens', function () {
					const messages: LLMMessage[] = [{ role: 'user', content: 'hi' }]
					const total = estimateTokens(messages, 'system prompt', 'rag context')
					const messagesOnly = estimateTokens(messages)
					assert.isAbove(total, messagesOnly)
				})

				it('resolves known model context limits by prefix', function () {
					assert.equal(getModelContextLimit('anthropic/claude-sonnet-4'), 200_000)
					assert.equal(getModelContextLimit('openai/gpt-4o-mini'), 128_000)
				})

				it('returns null for unknown models', function () {
					assert.isNull(getModelContextLimit('totally/unknown-model'))
				})
			})
		},
		{ displayName: 'FoundryAI: Token Estimator' },
	)
}
