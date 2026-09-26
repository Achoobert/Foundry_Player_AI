/**
 * Packages the built module into a zip file ready for GitHub Releases.
 *
 * Usage:
 *   bun run package          # builds + zips dist/ → foundry-ai.zip
 *
 * The script:
 *   1. Runs `vite build`
 *   2. Updates the `download` URL in dist/module.json to match the current version
 *   3. Zips dist/ contents into foundry-ai.zip (flat — no parent folder)
 *
 * Upload both `foundry-ai.zip` AND `dist/module.json` to your GitHub Release.
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const GITHUB_REPO = 'Achoobert/Foundry_Player_AI'
const MODULE_ID = 'foundry-ai'
const rootDir = path.resolve(import.meta.dirname, '..')
const distDir = path.resolve(rootDir, 'dist')
const zipPath = path.resolve(rootDir, `${MODULE_ID}.zip`)

// 1. Build
console.log('Building...')
execSync('bun run build', { cwd: rootDir, stdio: 'inherit' })

// 2. Read version from module.json and patch the download URL in dist copy
const moduleJsonPath = path.resolve(distDir, 'module.json')
const moduleJson = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf-8'))
const version = moduleJson.version

moduleJson.manifest = `https://github.com/${GITHUB_REPO}/releases/latest/download/module.json`
moduleJson.download = `https://github.com/${GITHUB_REPO}/releases/latest/download/${MODULE_ID}.zip`

fs.writeFileSync(moduleJsonPath, JSON.stringify(moduleJson, null, '\t') + '\n')
console.log(`✔ Patched dist/module.json — version ${version}`)

// 3. Create zip using PowerShell (cross-platform would use archiver, but PS works on Windows)
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)

if (process.platform === 'win32') {
	// Use PowerShell Compress-Archive — need to zip the *contents* of dist, not the folder itself
	// Foundry expects files at the root of the zip, not inside a dist/ subfolder
	execSync(
		`powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`,
		{ stdio: 'inherit' },
	)
} else {
	execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' })
}

const zipSize = (fs.statSync(zipPath).size / 1024).toFixed(1)
console.log(`✔ Created ${MODULE_ID}.zip (${zipSize} KB)`)
console.log('')
console.log('Next steps:')
console.log(`  1. git tag ${version} && git push --tags`)
console.log(`  2. Create a GitHub Release for ${version}`)
console.log(`  3. Upload these two files to the release:`)
console.log(`     • ${MODULE_ID}.zip`)
console.log(`     • dist/module.json`)
console.log('')
console.log('Manifest URL for Foundry:')
console.log(`  https://github.com/${GITHUB_REPO}/releases/latest/download/module.json`)
