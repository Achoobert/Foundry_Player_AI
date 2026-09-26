/* ==========================================================================
   Jev Tree
   A GM-editable decision tree, written as plain indented text, that the
   "jev" model walks every party-chat turn to pick a branch (e.g. does a
   character Fight/Flight/Freeze) whose answers get folded into that
   character's system prompt. Stored as an editable journal entry, seeded
   with a placeholder example on first creation.
   ========================================================================== */

import { collectionReader } from './collection-reader'
import { ensureFoundryAIFolders, getRootFolderId } from './folder-manager'

const MODULE_ID = 'foundry-ai'
const JOURNAL_NAME = 'Jev Tree'

export interface JevTreeNode {
	question: string
	info?: string
	children: JevTreeNode[]
}

const DEFAULT_JEV_TREE_TEXT = `What type of action will character take?
  info: (note goal is to be entertaining and move action forward)
  Fight
  Flight
  Freeze`

/**
 * Parse the GM-authored indented outline into a tree. The first non-blank
 * line is the root question. Deeper-indented lines are children of the
 * nearest shallower-indent ancestor. Lines matching "info: ..." attach as
 * metadata on the current parent instead of becoming a child node.
 */
export function parseJevTree(text: string): JevTreeNode | null {
	const lines = text.replace(/^#\s.*\n?/, '').split('\n')

	let root: JevTreeNode | null = null
	const stack: Array<{ indent: number; node: JevTreeNode }> = []

	for (const rawLine of lines) {
		if (!rawLine.trim()) continue

		const indent = rawLine.match(/^[ \t]*/)?.[0].length ?? 0
		const infoMatch = rawLine.match(/^\s*info:\s*(.*)$/)

		if (infoMatch) {
			const parent = stack[stack.length - 1]?.node ?? root
			if (parent) parent.info = infoMatch[1].trim()
			continue
		}

		const question = rawLine.trim()

		if (!root) {
			root = { question, children: [] }
			stack.push({ indent, node: root })
			continue
		}

		while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
			stack.pop()
		}

		const node: JevTreeNode = { question, children: [] }
		const parent = stack[stack.length - 1]?.node ?? root
		parent.children.push(node)
		stack.push({ indent, node })
	}

	return root
}

/** Serialize a parsed tree back to a normalized indented outline for prompts. */
export function renderJevTreeForPrompt(root: JevTreeNode): string {
	const lines: string[] = []

	function walk(node: JevTreeNode, depth: number) {
		const indent = '  '.repeat(depth)
		lines.push(`${indent}${node.question}`)
		if (node.info) lines.push(`${indent}  info: ${node.info}`)
		for (const child of node.children) walk(child, depth + 1)
	}

	walk(root, 0)
	return lines.join('\n')
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

class JevTree {
	/** Read the tree's raw journal text, if it already exists. */
	getText(): string | null {
		const journal = this.findJournal()
		if (!journal) return null
		return collectionReader.getJournalContent(journal.id)
	}

	/** Read and parse the tree, if it already exists. */
	getTree(): JevTreeNode | null {
		const text = this.getText()
		if (!text) return null
		return parseJevTree(text)
	}

	/**
	 * Create the journal entry seeded with a placeholder example if one
	 * doesn't exist yet for this world. Safe to call repeatedly — a no-op
	 * once created, so the GM's edits are left untouched afterward.
	 */
	async ensure(): Promise<void> {
		if (this.findJournal()) return
		await this.save(DEFAULT_JEV_TREE_TEXT)
	}

	private findJournal(): JournalEntry | null {
		const rootId = getRootFolderId()
		return (
			game.journal?.find(
				(j) => j.getFlag(MODULE_ID, 'type') === 'jev-tree' && (!rootId || j.folder?.id === rootId),
			) || null
		)
	}

	private async save(text: string): Promise<void> {
		let rootId = getRootFolderId()
		if (!rootId) {
			await ensureFoundryAIFolders()
			rootId = getRootFolderId()
		}

		await JournalEntry.create({
			name: JOURNAL_NAME,
			folder: rootId ?? undefined,
			pages: [{ name: 'Decision Tree', type: 'text', text: { content: `<pre>${escapeHtml(text)}</pre>`, format: 1 } }],
			flags: { [MODULE_ID]: { type: 'jev-tree' } },
		})

		console.log('FoundryAI | Jev Tree journal created — edit it any time, jev reads your edits directly.')
	}
}

export const jevTree = new JevTree()
