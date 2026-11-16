// GitHub issue #144: adding or removing only a trailing newline was not
// reported as a diff
const visit = (left, right) => {
  const qs = new URLSearchParams({
    left: JSON.stringify(left),
    right: JSON.stringify(right),
  })
  cy.visit(`/trailing-newline.html?${qs}`)
  cy.get('.acediff__wrap').should('have.length', 1)
  cy.wait(100)
}

describe('Trailing newline diffs', () => {
  const cases = [
    {
      name: 'trailing newline only on left',
      left: 'a\nb\n',
      right: 'a\nb',
      leftLines: [2, 3],
      rightLines: [2, 2],
      copy: 'ltr',
    },
    {
      name: 'trailing newline only on right',
      left: 'a\nb',
      right: 'a\nb\n',
      leftLines: [2, 2],
      rightLines: [2, 3],
      copy: 'rtl',
    },
    {
      name: 'extra trailing newline on left (already worked)',
      left: 'a\nb\n\n',
      right: 'a\nb\n',
      copy: 'ltr',
    },
    {
      name: 'extra blank line in middle on left (already worked)',
      left: 'a\n\nb',
      right: 'a\nb',
      copy: 'ltr',
    },
    {
      name: 'line split by a newline',
      left: 'a\nb',
      right: 'ab',
      copy: 'ltr',
    },
  ]

  cases.forEach(({ name, left, right, leftLines, rightLines, copy }) => {
    context(name, () => {
      beforeEach(() => visit(left, right))

      it('shows 1 diff', () => {
        cy.window().then((win) => {
          expect(win.aceDiffer.getNumDiffs()).to.equal(1)
          if (leftLines) {
            const d = win.aceDiffer.diffs[0]
            expect([d.leftStartLine, d.leftEndLine]).to.deep.equal(leftLines)
            expect([d.rightStartLine, d.rightEndLine]).to.deep.equal(rightLines)
          }
        })
      })

      it(`merges ${copy === 'ltr' ? 'left to right' : 'right to left'}`, () => {
        const arrow =
          copy === 'ltr'
            ? '.acediff__newCodeConnector'
            : '.acediff__deletedCodeConnector'
        const expected = copy === 'ltr' ? left : right
        cy.get(arrow).should('have.length', 1).click()
        cy.window().then((win) => {
          const { left: l, right: r } = win.aceDiffer.getEditors()
          expect(l.getValue()).to.equal(expected)
          expect(r.getValue()).to.equal(expected)
          expect(win.aceDiffer.getNumDiffs()).to.equal(0)
        })
      })
    })
  })
})
