/* ==========================================================================
   Rules Glossary
   A plain-language reference explaining what a game system's stat
   abbreviations and numeric thresholds mean — e.g. that Call of Cthulhu's
   "APP" is Appearance and a score below 15 means visibly disfigured, or
   that a Credit Rating of 75 means wealthy. Generated once (via the LLM)
   per world if it doesn't already exist, stored as an editable journal
   entry, and read back into every prompt so the AI — including when it
   creates new characters — interprets numbers the way this system intends.
   ========================================================================== */

import { collectionReader } from './collection-reader'
import { ensureFoundryAIFolders, getRootFolderId } from './folder-manager'
import { openRouterService } from './openrouter-service'

const MODULE_ID = 'foundry-ai'
const JOURNAL_NAME = 'Rules Glossary'

class RulesGlossary {
	private generating: Promise<string | null> | null = null

	/**
	 * Read the glossary text if it already exists, without generating.
	 * Synchronous — safe to call from prompt builders on every request.
	 */
	getText(): string | null {
		const journal = this.findJournal()
		if (!journal) return null
		return collectionReader.getJournalContent(journal.id)
	}

	/**
	 * Generate the glossary via the LLM if one doesn't exist yet for this
	 * world. Safe to call repeatedly (e.g. on every module load) — only
	 * generates once; afterwards the GM's edits are left untouched.
	 */
	async ensure(model: string): Promise<string | null> {
		const existing = this.findJournal()
		if (existing) return this.getText()

		if (this.generating) return this.generating
		this.generating = this.generate(model).finally(() => {
			this.generating = null
		})
		return this.generating
	}

	private findJournal(): JournalEntry | null {
		const rootId = getRootFolderId()
		return (
			game.journal?.find(
				(j) => j.getFlag(MODULE_ID, 'type') === 'rules-glossary' && (!rootId || j.folder?.id === rootId),
			) || null
		)
	}

	private async generate(model: string): Promise<string | null> {
		try {
			const systemTitle = game.system?.title || game.system?.id || 'Unknown System'
			const sampleActor = this.getSampleActorSummary()

			console.log(`FoundryAI | Generating Rules Glossary for system: ${systemTitle}`)

			const response = await openRouterService.chatCompletion({
				model,
				messages: [
					{ role: 'system', content: GLOSSARY_GENERATION_PROMPT },
					{
						role: 'user',
						content: `Game system: ${systemTitle}${
							sampleActor
								? `\n\nHere is a sample character sheet from this world, to ground your abbreviations in what's actually on the sheet:\n${sampleActor}`
								: ''
						}`,
					},
				],
				temperature: 0.3,
				max_tokens: 2000,
			})

			const content = response.choices?.[0]?.message?.content?.trim()
			if (!content) return null

			await this.save(content, systemTitle)
			return content
		} catch (err) {
			console.error('FoundryAI | Failed to generate Rules Glossary:', err)
			return null
		}
	}

	private getSampleActorSummary(): string | null {
		try {
			const actor = game.actors?.find((a: any) => a.type === 'character')
			if (!actor) return null
			return collectionReader.getActorContent(actor.id)?.slice(0, 2000) || null
		} catch {
			return null
		}
	}

	private async save(markdown: string, systemTitle: string): Promise<void> {
		let rootId = getRootFolderId()
		if (!rootId) {
			await ensureFoundryAIFolders()
			rootId = getRootFolderId()
		}

		await JournalEntry.create({
			name: JOURNAL_NAME,
			folder: rootId ?? undefined,
			pages: [{ name: systemTitle, type: 'text', text: { content: markdownToHtml(markdown), format: 1 } }],
			flags: { [MODULE_ID]: { type: 'rules-glossary', systemId: game.system?.id } },
		})

		console.log('FoundryAI | Rules Glossary saved — edit the journal entry any time, the AI reads your edits directly.')
	}
}

const GLOSSARY_GENERATION_PROMPT = `You are a TTRPG rules reference writer helping an AI game-companion understand a tabletop RPG's character sheet at a glance.

Given a game system name (and optionally a sample character sheet), write a compact reference covering:

1. **Stat/skill abbreviations** — map every common abbreviation on the character sheet to its full name (e.g. "STR -> Strength", "APP -> Appearance", "EDU -> Education").
2. **What the numbers mean** — explain, in plain language, what different ranges/thresholds of each stat or skill imply about the character, so the AI can describe and roleplay them believably. Be specific with numbers wherever the system has real conventions, e.g.:
   - "Call of Cthulhu Appearance below 15 means the character is startlingly disfigured; above 80 means strikingly attractive."
   - "A skill value of 50+ means competent/trained, 75+ means expert, 90+ means world-class."
   - "Credit Rating of 75+ means wealthy; below 10 means poor or destitute."
   Use the actual conventions of the named system — don't invent specific numbers if you aren't confident, but do describe the general pattern the system uses for interpreting skill/stat ranges.
3. **Derived/resource stats** — briefly explain any HP/Sanity/Stress/Luck/Hope-style resource and what running low means for roleplay.

Keep it a scannable markdown reference with headers and bullet points — this is a lookup table for an AI to consult, not prose. Aim for 300-600 words.`

function markdownToHtml(markdown: string): string {
	const html = markdown
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/^### (.+)$/gm, '<h3>$1</h3>')
		.replace(/^## (.+)$/gm, '<h2>$1</h2>')
		.replace(/^# (.+)$/gm, '<h1>$1</h1>')
		.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
		.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.*?)\*/g, '<em>$1</em>')
		.replace(/^- (.+)$/gm, '<li>$1</li>')
		.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
		.replace(/^---$/gm, '<hr>')
		.replace(/\n\n/g, '</p><p>')
		.replace(/\n/g, '<br>')
	return `<p>${html}</p>`
}

export const rulesGlossary = new RulesGlossary()
