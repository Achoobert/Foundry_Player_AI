import { defineConfig } from 'cypress'
import developmentOptions from './fvtt.config.js'
import { applyChromeLaunchArgs } from './cypress/chrome-launch-args.js'

const baseURL = developmentOptions.baseURL || 'http://localhost:30000'
const testWorldName = developmentOptions.testWorldName || 'foundry-ai-test'
const adminPassword =
	process.env.FOUNDRY_ADMIN_KEY || process.env.FOUNDRY_PASSWORD || developmentOptions.adminPassword || ''

const isCiRun = process.env.CI === 'true' || process.env.CYPRESS_CI === '1'

export default defineConfig({
	e2e: {
		baseUrl: baseURL,
		...(isCiRun
			? {
					video: false,
					screenshotOnRunFailure: true,
					defaultCommandTimeout: 120000,
					requestTimeout: 15000,
					responseTimeout: 15000,
					pageLoadTimeout: 60000,
					retries: { runMode: 2, openMode: 0 },
				}
			: {}),
		setupNodeEvents(on, config) {
			on('before:browser:launch', (browser, launchOptions) => {
				if (browser.name === 'chrome' || browser.name === 'chromium') {
					applyChromeLaunchArgs(launchOptions)
				}
				return launchOptions
			})
			return config
		},
	},
	env: {
		ADMIN_PASSWORD: adminPassword,
		FOUNDRY_WORLD: testWorldName,
	},
	viewportWidth: 1366,
	viewportHeight: 768,
})
