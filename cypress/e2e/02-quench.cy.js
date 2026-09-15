/* global cy, describe, expect, it, Cypress */
import 'cypress-if'

describe('Quench tests', () => {
	beforeEach(() => {
		cy.visit('/')
		cy.licenseAgreeAndClickAccept()
		cy.setupInputPasswordAndClickLogin()
		cy.closeTourOverlay()
		cy.launchTestWorldFromSetup()
		cy.loginAsGM()

		cy.window({ timeout: 120000 }).should((win) => {
			expect(win.game?.ready, 'game.ready before Quench').to.eq(true)
		})
		cy.get('.quench-button, [data-tooltip="QUENCH.Title"]', { timeout: 120000 }).should('exist')
	})

	it('run quench tests', () => {
		cy.get('.quench-button, [data-tooltip="QUENCH.Title"]').click()
		cy.get("[data-select='all']").should('exist').click({ force: true })
		cy.get('#quench-run').should('be.visible').click()

		cy.get('.stats', { timeout: 60000 }).should('be.visible')
		cy.get('.stats').then((stats) => {
			cy.log('Test report: ', stats.text())
		})

		cy.wait(1000)
		cy.get('.error').if().then((summary) => {
			cy.log('errors: ', summary.text())
		})

		cy.get('.stats').then(($stats) => {
			const summary = $stats.text()

			// Fail if nothing ran — a false-green "0 tests, 0 failed" is worse than no run at all.
			expect(summary, `Quench ran zero tests: ${summary}`).to.match(/Ran [1-9]\d* tests?/)

			if (!summary.includes('failed')) return

			const errors = Cypress.$('.error-message')
				.map((_, el) => Cypress.$(el).text().trim())
				.get()
			const diffs = Cypress.$('.diff')
				.map((_, el) => Cypress.$(el).text().trim())
				.get()

			expect(
				summary,
				`Quench failures:\n${JSON.stringify({ summary, errors, diffs }, null, 2)}`,
			).to.not.include('failed')
		})
	})
})
