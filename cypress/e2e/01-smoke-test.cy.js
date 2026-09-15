/* global cy, describe, expect, it */

describe('Smoke tests', () => {
	it('should visit the home page', () => {
		cy.visit('/')
		cy.get('body').should('exist', { timeout: 10000 })
	})

	it('should login', () => {
		cy.visit('/')
		cy.licenseAgreeAndClickAccept()
		cy.setupInputPasswordAndClickLogin()
		cy.closeTourOverlay()
		cy.launchTestWorldFromSetup()
		cy.loginAsGM()
		cy.get('body').should('exist', { timeout: 10000 })
	})
})
