import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import fs from 'fs'
import moduleManifest from './module.json' with { type: 'json' }

/**
 * `npm run watch` builds straight into the Foundry userdata modules folder
 * (see ../../guide.md) instead of dist/, so Foundry picks up changes on
 * refresh with no separate symlink/link step.
 */
async function resolveOutDir(): Promise<string> {
	if (process.env.npm_lifecycle_event !== 'watch') return 'dist'

	const configPath = path.resolve(__dirname, 'fvtt.config.js')
	if (!fs.existsSync(configPath)) {
		console.error(
			'\nfvtt.config.js not found — copy fvtt.config.example.js → fvtt.config.js and set userDataPath.\n',
		)
		process.exit(1)
	}

	const { default: config } = await import(configPath)
	return path.resolve(config.userDataPath, 'Data', 'modules', moduleManifest.id)
}

/** Copies module.json and languages/ into outDir after build */
function foundryModulePlugin(outDir: string): Plugin {
	return {
		name: 'foundry-module-copy',
		closeBundle() {
			// Copy module.json
			fs.copyFileSync(path.resolve(__dirname, 'module.json'), path.resolve(outDir, 'module.json'))

			// Copy languages/
			const langSrc = path.resolve(__dirname, 'languages')
			const langDst = path.resolve(outDir, 'languages')
			if (!fs.existsSync(langDst)) fs.mkdirSync(langDst, { recursive: true })
			for (const file of fs.readdirSync(langSrc)) {
				fs.copyFileSync(path.resolve(langSrc, file), path.resolve(langDst, file))
			}

			console.log(`✔ Copied module.json and languages/ into ${outDir}`)
		},
	}
}

export default defineConfig(async () => {
	const outDir = await resolveOutDir()

	return {
		plugins: [
			svelte({
				compilerOptions: {
					// Svelte 5 runes mode
					runes: true,
				},
			}),
			foundryModulePlugin(outDir),
		],
		build: {
			outDir,
			emptyOutDir: true,
			sourcemap: true,
			lib: {
				entry: path.resolve(__dirname, 'src/module.ts'),
				formats: ['es'],
				fileName: () => 'module.js',
			},
			rollupOptions: {
				// Don't bundle Foundry globals
				external: [],
				output: {
					// Ensure CSS gets output as styles.css
					assetFileNames: (assetInfo) => {
						if (assetInfo.name?.endsWith('.css')) return 'styles.css'
						return assetInfo.name || 'assets/[name].[ext]'
					},
				},
			},
		},
		resolve: {
			alias: {
				'@core': path.resolve(__dirname, 'src/core'),
				'@ui': path.resolve(__dirname, 'src/ui'),
				'@': path.resolve(__dirname, 'src'),
			},
		},
		css: {
			preprocessorOptions: {
				scss: {
					// SCSS options
				},
			},
		},
	}
})
