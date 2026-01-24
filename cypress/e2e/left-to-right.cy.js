describe('Left to Right Merge', () => {
  context('Insert left to right at top', () => {
    beforeEach(() => {
      cy.visit('/ltr-top.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('shows 1 diff', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1)
      })
    })

    it('it shows 0 diffs after merging', () => {
      cy.get('.acediff__newCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().right.getValue()).to.equal(
          'something new\nmid\nend',
        )
      })
    })
  })

  context('Insert left to right at middle', () => {
    beforeEach(() => {
      cy.visit('/ltr-middle.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('shows 1 diff', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1)
      })
    })

    it('it shows 0 diffs after merging', () => {
      cy.get('.acediff__newCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().right.getValue()).to.equal(
          'start\n\nsomething new\n\nend',
        )
      })
    })
  })

  context('Insert left to right at bottom', () => {
    beforeEach(() => {
      cy.visit('/ltr-bottom.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('shows 1 diff', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1)
      })
    })

    it('it shows 0 diffs after merging', () => {
      cy.get('.acediff__newCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().right.getValue()).to.equal(
          'start\nend\nsomething new',
        )
      })
    })
  })
})
