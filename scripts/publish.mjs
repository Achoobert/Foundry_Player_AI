/**
 * Publish script — extends "release" with Foundry VTT Package Release API.
 *
 * Usage:
 *   bun run publish 0.2.0
 *   bun run publish 0.2.0 --dry-run
 *
 * What it does:
 *   1. Runs the full release flow (bump, build, commit, tag, push)
 *   2. Publishes the release to the Foundry VTT Package Release API
 *
 * Requires:
 *   FOUNDRY_RELEASE_TOKEN in .env (gitignored)
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const rootDir = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const version = args.find((a) => !a.startsWith('--'))

if (!version) {
	console.error('Usage: bun run publish <version> [--dry-run]')
	console.error('  e.g. bun run publish 0.2.0')
	console.error('  e.g. bun run publish 0.2.0 --dry-run')
	process.exit(1)
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
	console.error(`Invalid version "${version}". Use semver format: X.Y.Z`)
	process.exit(1)
}

// ── Load .env ───────────────────────────────────────────────────────────────
function loadEnv() {
	const envPath = path.resolve(rootDir, '.env')
	if (!fs.existsSync(envPath)) {
		console.error('Missing .env file. Create one with FOUNDRY_RELEASE_TOKEN=fvttp_...')
		process.exit(1)
	}
	const content = fs.readFileSync(envPath, 'utf-8')
	for (const line of content.split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue
		const idx = trimmed.indexOf('=')
		if (idx === -1) continue
		const key = trimmed.slice(0, idx).trim()
		const val = trimmed.slice(idx + 1).trim()
		process.env[key] = val
	}
}

loadEnv()

const token = process.env.FOUNDRY_RELEASE_TOKEN
if (!token) {
	console.error('FOUNDRY_RELEASE_TOKEN not found in .env')
	process.exit(1)
}

// ── Step 1: Run the full release flow ───────────────────────────────────────
console.log(`\n🚀 Running release ${version}...\n`)
execSync(`node ${path.resolve(rootDir, 'scripts/release.mjs')} ${version}`, {
	cwd: rootDir,
	stdio: 'inherit',
})

// ── Step 2: Publish to Foundry VTT Package Release API ─────────────────────
console.log('\n📡 Publishing to Foundry VTT Package Release API...')

// Re-read module.json to get the latest values after release bumped them
const moduleJson = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'module.json'), 'utf-8'))

const body = {
	id: moduleJson.id,
	release: {
		version: version,
		manifest: `https://github.com/Achoobert/Foundry_Player_AI/releases/download/${version}/module.json`,
		notes: `https://github.com/Achoobert/Foundry_Player_AI/releases/tag/${version}`,
		compatibility: moduleJson.compatibility,
	},
}

if (dryRun) {
	body['dry-run'] = true
	console.log('  (dry-run mode — no changes will be saved on Foundry)')
}

console.log('\nRequest body:')
console.log(JSON.stringify(body, null, 2))

try {
	const response = await fetch('https://foundryvtt.com/_api/packages/release_version/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: token,
		},
		body: JSON.stringify(body),
	})

	const data = await response.json()

	if (response.ok && data.status === 'success') {
		console.log(`\n✅ Foundry VTT publish successful!`)
		if (data.message) console.log(`   ${data.message}`)
		console.log(`   Package page: ${data.page}`)
	} else {
		console.error(`\n❌ Foundry VTT publish failed (HTTP ${response.status}):`)
		console.error(JSON.stringify(data, null, 2))
		process.exit(1)
	}
} catch (err) {
	console.error('\n❌ Failed to reach Foundry VTT API:')
	console.error(err.message)
	process.exit(1)
}
