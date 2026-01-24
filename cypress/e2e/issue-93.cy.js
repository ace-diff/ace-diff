describe('Issue #93 - Strange Merging Behavior with Insert into Newline', () => {
  // This test reproduces the exact scenario from GitHub issue #93
  // https://github.com/ace-diff/ace-diff/issues/93

  beforeEach(() => {
    cy.visit('/issue-93-scenario.html')
    cy.get('.acediff__wrap').should('have.length', 1)
    cy.wait(100)
  })

  it('shows correct number of diffs for the issue scenario', () => {
    cy.window().then((win) => {
      // The left has additional content: flipSpeed variable, background(255), background(0)
      expect(win.aceDiffer.getNumDiffs()).to.be.greaterThan(0)
    })
  })

  it('merges first diff from left to right without bracket corruption', () => {
    // Click the first available new code connector (left to right)
    // Use force:true as multiple connectors may overlap at the same position
    cy.get('.acediff__newCodeConnector').first().click({ force: true })

    cy.window().then((win) => {
      const rightContent = win.aceDiffer.getEditors().right.getValue()

      // Verify the result is valid JavaScript (no bracket corruption)
      expect(rightContent).to.include('function setup()')
      expect(rightContent).to.include('function draw()')

      // Count opening and closing braces - they should match
      const openBraces = (rightContent.match(/\{/g) || []).length
      const closeBraces = (rightContent.match(/\}/g) || []).length
      expect(openBraces).to.equal(closeBraces)
    })
  })

  it('preserves syntactic correctness after sequential merges', () => {
    // This tests the exact bug from issue #93: executing two merge operations sequentially

    // First merge - use force:true as connectors may overlap
    cy.get('.acediff__newCodeConnector').first().click({ force: true })
    cy.wait(100)

    // Check if more diffs available, merge again
    cy.get('body').then(($body) => {
      if ($body.find('.acediff__newCodeConnector').length > 0) {
        cy.get('.acediff__newCodeConnector').first().click({ force: true })
        cy.wait(100)
      }
    })

    // Verify content integrity after sequential merges
    cy.window().then((win) => {
      const rightContent = win.aceDiffer.getEditors().right.getValue()

      // The closing brace should not be separated from its function
      // This was the bug in issue #93
      const lines = rightContent.split('\n')
      let braceDepth = 0
      let isValid = true

      lines.forEach((line) => {
        braceDepth += (line.match(/\{/g) || []).length
        braceDepth -= (line.match(/\}/g) || []).length
        if (braceDepth < 0) isValid = false
      })

      expect(braceDepth).to.equal(0)
      expect(isValid).to.be.true
    })
  })

  it('can merge sequentially until no diffs remain', () => {
    // Keep merging until no diffs remain
    const mergeOnce = () => {
      cy.get('body').then(($body) => {
        if ($body.find('.acediff__newCodeConnector').length > 0) {
          cy.get('.acediff__newCodeConnector').first().click({ force: true })
          cy.wait(150)
          mergeOnce() // Recurse
        }
      })
    }

    mergeOnce()

    // After all merges, verify bracket integrity
    cy.window().then((win) => {
      const rightContent = win.aceDiffer.getEditors().right.getValue()

      const openBraces = (rightContent.match(/\{/g) || []).length
      const closeBraces = (rightContent.match(/\}/g) || []).length
      expect(openBraces).to.equal(closeBraces)

      // Should have both functions
      expect(rightContent).to.include('function setup()')
      expect(rightContent).to.include('function draw()')
    })
  })
})
