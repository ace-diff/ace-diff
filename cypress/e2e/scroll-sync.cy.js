// Regression tests for https://github.com/ace-diff/ace-diff/issues/140
// Fast scrolling with lockScrolling enabled caused the scrolled editor to
// jump backwards because the synced editor echoed its stale position back.

// Simulate a fast mouse wheel scroll: many small scroll steps a few ms apart.
// Records the source editor's scrollTop after every step and keeps sampling
// for a while after the last step so any delayed "echo" is caught.
function fastScroll(win, source, { steps, delta, interval, settle }) {
  const session = source.getSession()
  const samples = []
  let position = session.getScrollTop()

  return new Cypress.Promise((resolve) => {
    let step = 0
    const tick = () => {
      if (step < steps) {
        position += delta
        session.setScrollTop(position)
        step++
      }
      samples.push(session.getScrollTop())
      if (step < steps || samples.length < steps + settle / interval) {
        win.setTimeout(tick, interval)
      } else {
        resolve({ samples, finalPosition: position })
      }
    }
    tick()
  })
}

function expectMonotonic(samples, direction) {
  for (let i = 1; i < samples.length; i++) {
    if (direction > 0) {
      expect(samples[i], `sample ${i} of ${samples.join(',')}`).to.be.at.least(
        samples[i - 1],
      )
    } else {
      expect(samples[i], `sample ${i} of ${samples.join(',')}`).to.be.at.most(
        samples[i - 1],
      )
    }
  }
}

describe('Scroll syncing (lockScrolling enabled)', () => {
  beforeEach(() => {
    cy.visit('/scroll-sync.html')
    cy.get('.acediff__wrap').should('have.length', 1)
    cy.get('.ace_gutter-cell').should('exist')

    // In headless mode, Ace may not calculate lineHeight properly without a resize
    cy.window().then((win) => {
      const { left, right } = win.aceDiffer.getEditors()
      left.resize(true)
      right.resize(true)
    })
    cy.wait(300)
    cy.window().then((win) => {
      if (win.aceDiffer.lineHeight === 0) {
        win.aceDiffer.lineHeight =
          win.aceDiffer.editors.left.ace.renderer.lineHeight
      }
    })
  })

  it('does not overwrite a newer scroll position with the synced echo', () => {
    // Scroll, let the other editor sync, then scroll again before any
    // delayed handler could fire. The latest position must win.
    cy.window().then((win) => {
      const { left } = win.aceDiffer.getEditors()
      const session = left.getSession()
      return new Cypress.Promise((resolve) => {
        session.setScrollTop(500)
        win.setTimeout(() => {
          session.setScrollTop(1000)
          win.setTimeout(resolve, 200)
        }, 20)
      }).then(() => {
        expect(session.getScrollTop()).to.equal(1000)
      })
    })
  })

  it('does not jump backwards when quickly scrolling the left editor', () => {
    cy.window().then((win) => {
      const { left, right } = win.aceDiffer.getEditors()
      return fastScroll(win, left, {
        steps: 40,
        delta: 40,
        interval: 5,
        settle: 200,
      }).then(({ samples, finalPosition }) => {
        expectMonotonic(samples, 1)
        expect(left.getSession().getScrollTop()).to.equal(finalPosition)
        expect(right.getSession().getScrollTop()).to.be.greaterThan(0)
      })
    })
  })

  it('does not jump backwards when quickly scrolling the right editor', () => {
    cy.window().then((win) => {
      const { left, right } = win.aceDiffer.getEditors()
      return fastScroll(win, right, {
        steps: 40,
        delta: 40,
        interval: 5,
        settle: 200,
      }).then(({ samples, finalPosition }) => {
        expectMonotonic(samples, 1)
        expect(right.getSession().getScrollTop()).to.equal(finalPosition)
        expect(left.getSession().getScrollTop()).to.be.greaterThan(0)
      })
    })
  })

  it('does not jump when quickly scrolling back up', () => {
    cy.window().then((win) => {
      const { left } = win.aceDiffer.getEditors()
      left.getSession().setScrollTop(5000)
    })
    cy.wait(100)
    cy.window().then((win) => {
      const { left } = win.aceDiffer.getEditors()
      return fastScroll(win, left, {
        steps: 40,
        delta: -40,
        interval: 5,
        settle: 200,
      }).then(({ samples, finalPosition }) => {
        expectMonotonic(samples, -1)
        expect(left.getSession().getScrollTop()).to.equal(finalPosition)
      })
    })
  })

  it('keeps editors proportionally aligned after scrolling', () => {
    cy.window().then((win) => {
      const { left, right } = win.aceDiffer.getEditors()
      left.getSession().setScrollTop(3000)
    })
    cy.wait(100)
    cy.window().then((win) => {
      const { left, right } = win.aceDiffer.getEditors()
      const lh = win.aceDiffer.lineHeight
      const leftMax =
        left.getSession().getLength() * lh - left.renderer.$size.scrollerHeight
      const rightMax =
        right.getSession().getLength() * lh -
        right.renderer.$size.scrollerHeight
      const expected = (3000 / leftMax) * rightMax
      expect(left.getSession().getScrollTop()).to.equal(3000)
      expect(right.getSession().getScrollTop()).to.be.closeTo(expected, 1)
    })
  })
})
