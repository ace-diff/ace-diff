// The gutter (connectors and copy arrows) is positioned using the editor
// line height. Ace measures it asynchronously, so it can be 0 when AceDiff
// initializes. The gutter must be redrawn once Ace reports the real value,
// otherwise every arrow is stacked at the top and connectors are flat.
describe('Line height measurement', () => {
  beforeEach(() => {
    cy.visit('/hidden-init.html')
    cy.window().its('aceDiffer').should('exist')
    // Let AceDiff finish initializing while the container is hidden
    cy.wait(100)
    cy.window().then((win) => {
      expect(win.aceDiffer.getNumDiffs()).to.equal(2)
      win.document.getElementById('wrapper').classList.remove('hidden')
    })
  })

  it('picks up the line height once the editor is shown', () => {
    cy.window().should((win) => {
      const rendererLineHeight =
        win.aceDiffer.editors.left.ace.renderer.lineHeight
      expect(rendererLineHeight).to.be.greaterThan(0)
      expect(win.aceDiffer.lineHeight).to.equal(rendererLineHeight)
    })
  })

  it('positions copy arrows at their diff lines', () => {
    cy.window().should((win) => {
      const lineHeight = win.aceDiffer.editors.left.ace.renderer.lineHeight
      expect(lineHeight).to.be.greaterThan(0)
      const tops = [
        ...win.document.querySelectorAll('.acediff__gutter [data-diff-index]'),
      ].map((el) => parseFloat(el.style.top))
      // Diffs start on line index 2 (changed line) and 7 (added lines)
      expect(tops).to.include(2 * lineHeight)
      expect(tops).to.include(7 * lineHeight)
    })
  })

  it('draws connectors with the height of their diff', () => {
    cy.window().should((win) => {
      const heights = [
        ...win.document.querySelectorAll('.acediff__gutter path'),
      ].map((path) => path.getBBox().height)
      expect(heights).to.have.length(2)
      heights.forEach((h) => expect(h).to.be.greaterThan(1))
    })
  })
})
