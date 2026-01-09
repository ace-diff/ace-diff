describe('Scroll unlocking', () => {
  context('with lockScrolling disabled (unlocked)', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/scroll-unlock.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('does not sync scroll from left to right editor', () => {
      cy.window().then((win) => {
        // Verify lockScrolling is disabled
        expect(win.aceDiffer.options.lockScrolling).to.equal(false)

        const { left, right } = win.aceDiffer.getEditors()
        const rightSession = right.getSession()
        const initialRightScroll = rightSession.getScrollTop()

        // Scroll the left editor
        const leftSession = left.getSession()
        leftSession.setScrollTop(500)

        cy.wait(50).then(() => {
          // Right editor should not have changed
          expect(rightSession.getScrollTop()).to.equal(initialRightScroll)
        })
      })
    })

    it('does not sync scroll from right to left editor', () => {
      cy.window().then((win) => {
        const { left, right } = win.aceDiffer.getEditors()
        const leftSession = left.getSession()
        const initialLeftScroll = leftSession.getScrollTop()

        // Scroll the right editor
        const rightSession = right.getSession()
        rightSession.setScrollTop(500)

        cy.wait(50).then(() => {
          // Left editor should not have changed
          expect(leftSession.getScrollTop()).to.equal(initialLeftScroll)
        })
      })
    })

    it('allows independent scrolling of both editors', () => {
      cy.window().then((win) => {
        const { left, right } = win.aceDiffer.getEditors()

        // Scroll left to 200, right to 500
        left.getSession().setScrollTop(200)
        right.getSession().setScrollTop(500)

        cy.wait(50).then(() => {
          // Both should maintain their independent positions
          expect(left.getSession().getScrollTop()).to.equal(200)
          expect(right.getSession().getScrollTop()).to.equal(500)
        })
      })
    })
  })

  context('toggling lockScrolling via setOptions', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/scroll-unlock.html')
      cy.get('.acediff__wrap').should('have.length', 1)
      cy.wait(100)
    })

    it('can enable lockScrolling after initialization', () => {
      cy.window().then((win) => {
        // Enable lock scrolling
        win.aceDiffer.setOptions({ lockScrolling: true })
        expect(win.aceDiffer.options.lockScrolling).to.equal(true)

        const { left, right } = win.aceDiffer.getEditors()

        // Scroll left editor to a fixed amount
        left.getSession().setScrollTop(500)

        // Use Cypress retry to wait for scroll sync
        cy.wrap(right.getSession(), { timeout: 2000 }).should((rightSession) => {
          expect(rightSession.getScrollTop()).to.be.greaterThan(0)
        })
      })
    })

    it('can disable lockScrolling after enabling it', () => {
      cy.window().then((win) => {
        // First enable, then disable
        win.aceDiffer.setOptions({ lockScrolling: true })
        win.aceDiffer.setOptions({ lockScrolling: false })
        expect(win.aceDiffer.options.lockScrolling).to.equal(false)

        const { left, right } = win.aceDiffer.getEditors()
        const rightSession = right.getSession()
        const initialRightScroll = rightSession.getScrollTop()

        // Scroll left editor
        left.getSession().setScrollTop(300)

        cy.wait(50).then(() => {
          // Right editor should not have changed
          expect(rightSession.getScrollTop()).to.equal(initialRightScroll)
        })
      })
    })
  })
})
