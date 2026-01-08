describe('Blank Line Merging', () => {
  context('Blank line at start', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/blank-line-start.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('shows 1 diff for leading blank line', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1)
      })
    })

    it('merges blank line from left to right correctly', () => {
      cy.get('.acediff__newCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().right.getValue()).to.equal(
          "\nfunction setup() {\n  init()\n}"
        )
      })
    })
  })

  context('Blank line in middle', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/blank-line-middle.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('shows 1 diff for middle blank line', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1)
      })
    })

    it('merges blank line from left to right correctly', () => {
      cy.get('.acediff__newCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().right.getValue()).to.equal(
          "function setup() {\n\n  init()\n}"
        )
      })
    })
  })

  context('New line before closing brace', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/blank-line-end.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('shows 1 diff for new line before closing brace', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1)
      })
    })

    it('merges new line before closing brace correctly', () => {
      cy.get('.acediff__newCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().right.getValue()).to.equal(
          "function setup() {\n  init()\n  cleanup()\n}"
        )
      })
    })
  })

  context('Multiple consecutive blank lines', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/multiple-blank-lines.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('shows 1 diff for multiple blank lines', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1)
      })
    })

    it('merges multiple blank lines from left to right correctly', () => {
      cy.get('.acediff__newCodeConnector').click()

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        expect(win.aceDiffer.getEditors().right.getValue()).to.equal(
          "function setup() {\n\n\n  init()\n}"
        )
      })
    })
  })
})
