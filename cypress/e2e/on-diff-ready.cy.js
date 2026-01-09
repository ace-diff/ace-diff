describe('onDiffReady callback', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8081/on-diff-ready.html')
    cy.get('.acediff__wrap').should('have.length', 1)
    cy.wait(100)
  })

  it('calls onDiffReady after initial diff computation', () => {
    cy.window().then((win) => {
      expect(win.diffReadyCalls.length).to.be.greaterThan(0)
    })
  })

  it('receives diffs array in the callback', () => {
    cy.window().then((win) => {
      const lastCall = win.diffReadyCalls[win.diffReadyCalls.length - 1]
      expect(lastCall).to.be.an('array')
      expect(lastCall.length).to.be.greaterThan(0)
    })
  })

  it('diffs contain line information', () => {
    cy.window().then((win) => {
      const lastCall = win.diffReadyCalls[win.diffReadyCalls.length - 1]
      const diff = lastCall[0]
      expect(diff).to.have.property('leftStartLine')
      expect(diff).to.have.property('leftEndLine')
      expect(diff).to.have.property('rightStartLine')
      expect(diff).to.have.property('rightEndLine')
    })
  })

  it('calls onDiffReady when content changes', () => {
    cy.window().then((win) => {
      const initialCallCount = win.diffReadyCalls.length

      // Change content to trigger a new diff
      win.aceDiffer.getEditors().left.setValue('completely new content')

      cy.wait(100).then(() => {
        expect(win.diffReadyCalls.length).to.be.greaterThan(initialCallCount)
      })
    })
  })

  it('can be set via setOptions', () => {
    cy.visit('http://localhost:8081/cypress-index.html')
    cy.get('.acediff__wrap').should('have.length', 1)
    cy.wait(100)

    cy.window().then((win) => {
      let callbackInvoked = false
      let receivedDiffs = null

      win.aceDiffer.setOptions({
        onDiffReady: (diffs) => {
          callbackInvoked = true
          receivedDiffs = diffs
        },
      })

      // Trigger a diff by changing content
      win.aceDiffer.getEditors().left.setValue('new content here')

      cy.wait(100).then(() => {
        expect(callbackInvoked).to.equal(true)
        expect(receivedDiffs).to.be.an('array')
      })
    })
  })
})
