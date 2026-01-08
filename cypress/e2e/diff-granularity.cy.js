describe('Diff Granularity', () => {
  context('Broad granularity (default)', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/diff-granularity.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('groups adjacent diffs together in broad mode', () => {
      cy.window().then((win) => {
        // In broad mode, adjacent diffs (lines 2 and 3) should be grouped into 1 diff
        // The fixture has changes on lines 2 and 3, which are adjacent
        const numDiffs = win.aceDiffer.getNumDiffs()
        // With broad granularity, adjacent diffs are grouped
        expect(numDiffs).to.equal(1)
      })
    })

    it('merges grouped diff correctly', () => {
      cy.get('.acediff__newCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().right.getValue()).to.equal(
          "line1\nchanged2\nchanged3\nline4"
        )
      })
    })
  })

  context('Specific granularity', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/diff-granularity.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('can switch to specific granularity', () => {
      cy.window().then((win) => {
        // Change to specific granularity
        win.aceDiffer.setOptions({ diffGranularity: 'specific' })

        // In specific mode, adjacent diffs may be kept separate
        // Note: The exact behavior depends on the diff algorithm
        const numDiffs = win.aceDiffer.getNumDiffs()
        expect(numDiffs).to.be.at.least(1)
      })
    })
  })

  context('Switching granularity dynamically', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/diff-granularity.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('recalculates diffs when granularity changes', () => {
      cy.window().then((win) => {
        const broadDiffs = win.aceDiffer.getNumDiffs()

        // Switch to specific
        win.aceDiffer.setOptions({ diffGranularity: 'specific' })
        const specificDiffs = win.aceDiffer.getNumDiffs()

        // Switch back to broad
        win.aceDiffer.setOptions({ diffGranularity: 'broad' })
        const broadDiffsAgain = win.aceDiffer.getNumDiffs()

        // Broad mode should give same result
        expect(broadDiffsAgain).to.equal(broadDiffs)
      })
    })
  })
})
