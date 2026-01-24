describe('Ace-diff API', () => {
  beforeEach(() => {
    cy.visit('/newlines.html')
    cy.get('.acediff__wrap').should('have.length', 1)
    cy.wait(100)
  })

  context('Diffs with different EOL characters', () => {
    it('shows no diffs', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
      })
    })
  })
})
