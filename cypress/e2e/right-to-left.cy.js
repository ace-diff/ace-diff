describe('Right to Left Merge', () => {
  context('Insert right to left at top', () => {
    beforeEach(() => {
      cy.visit('/rtl-top.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('shows 1 diff', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1)
      })
    })

    it('it shows 0 diffs after merging', () => {
      cy.get('.acediff__deletedCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().left.getValue()).to.equal(
          'something new\nmid\nend',
        )
      })
    })
  })

  context('Insert right to left at middle', () => {
    beforeEach(() => {
      cy.visit('/rtl-middle.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('shows 1 diff', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1)
      })
    })

    it('it shows 0 diffs after merging', () => {
      cy.get('.acediff__deletedCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().left.getValue()).to.equal(
          'start\n\nsomething new\n\nend',
        )
      })
    })
  })

  context('Insert right to left at bottom', () => {
    beforeEach(() => {
      cy.visit('/rtl-bottom.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('shows 1 diff', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1)
      })
    })

    it('it shows 0 diffs after merging', () => {
      cy.get('.acediff__deletedCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().left.getValue()).to.equal(
          'start\nend\nsomething new',
        )
      })
    })
  })
})
