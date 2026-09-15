// ***********************************************************
// Loaded automatically before every spec file.
// ***********************************************************

import './commands.js'
import 'cypress-if'

Cypress.Commands.add('loginAsGM', () => {
	cy.log('Logging in as GM')

	cy.url().then((url) => {
		if (!url.includes('/join') && !url.includes('/game')) {
			cy.visit('/join')
		}
	})

	cy.get('select[name="userid"]', { timeout: 120000 }).should('exist')
	cy.get('select[name="userid"] option').then((options) => {
		const opts = options.toArray()
		expect(opts.length, 'join page users').to.be.greaterThan(0)
		const gm = opts.find((o) => /gamemaster|\[gm\]/i.test(o.text)) ?? opts[opts.length > 1 ? 1 : 0]
		cy.get('select[name="userid"]').select(gm.value, { force: true })
	})

	cy.get('button[name="join"]', { timeout: 10000 }).should('be.visible').click({ force: true })

	// cypress hates redirects I guess?
	cy.visit('/game')

	cy.get('#interface, #ui-top, #sidebar', { timeout: 1200 }).should('exist')
	cy.closeTourOverlay()
	cy.turnOffWarningsIfTheyExist()

	cy.window({ timeout: 120000 }).should((win) => {
		expect(win.game, 'Foundry client after Join — is the world running?').to.exist
		expect(win.game.ready, 'game.ready').to.eq(true)
	})
})
