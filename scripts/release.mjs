/**
 * One-command release script.
 *
 * Usage:
 *   bun run release 0.2.0
 *
 * What it does:
 *   1. Validates the version string
 *   2. Bumps version in module.json and package.json
 *   3. Runs `bun run package` (build + zip)
 *   4. Commits all changes
 *   5. Tags the commit
 *   6. Pushes commit + tag → GitHub Actions creates the release
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const rootDir = path.resolve(import.meta.dirname, '..')
const version = process.argv[2]

if (!version) {
	console.error('Usage: bun run release <version>')
	console.error('  e.g. bun run release 0.2.0')
	process.exit(1)
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
	console.error(`Invalid version "${version}". Use semver format: X.Y.Z`)
	process.exit(1)
}

function run(cmd) {
	console.log(`\n> ${cmd}`)
	execSync(cmd, { cwd: rootDir, stdio: 'inherit' })
}

// Check for uncommitted changes (allow staged)
try {
	const status = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf-8' }).trim()
	// We'll commit everything, so dirty working tree is fine — but warn if there are untracked files
	if (status) {
		console.log('Note: uncommitted changes will be included in the release commit.')
	}
} catch {
	console.error('git not available or not a git repository.')
	process.exit(1)
}

// Check tag doesn't already exist
try {
	execSync(`git rev-parse ${version}`, { cwd: rootDir, stdio: 'pipe' })
	console.error(`Tag "${version}" already exists. Choose a different version.`)
	process.exit(1)
} catch {
	// Tag doesn't exist — good
}

// 1. Bump version in module.json
console.log(`\n📦 Bumping version to ${version}...`)
const moduleJsonPath = path.resolve(rootDir, 'module.json')
const moduleJson = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf-8'))
moduleJson.version = version
moduleJson.download = moduleJson.download.replace(/\/\d+\.\d+\.\d+\//, `/${version}/`)
fs.writeFileSync(moduleJsonPath, JSON.stringify(moduleJson, null, '\t') + '\n')

// 2. Bump version in package.json
const packageJsonPath = path.resolve(rootDir, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
packageJson.version = version
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n')

console.log(`✔ Updated module.json and package.json to ${version}`)

// 3. Build + package
console.log('\n🔨 Building and packaging...')
run('bun run package')

// 4. Commit
console.log('\n📝 Committing...')
run('git add -A')
run(`git commit -m "Release ${version}"`)

// 5. Tag
console.log('\n🏷️  Tagging...')
run(`git tag ${version}`)

// 6. Push
console.log('\n🚀 Pushing to GitHub...')
run('git push')
run('git push --tags')

console.log(`\n✅ Released ${version}!`)
console.log(`GitHub Actions will create the release at:`)
console.log(`  https://github.com/Achoobert/Foundry_Player_AI/releases/tag/${version}`)
