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

      // Wait for Ace editor to be fully rendered by checking for line numbers in the gutter
      cy.get('.ace_gutter-cell').should('exist')

      // In headless mode, Ace may not calculate lineHeight properly without a resize
      // Force resize and wait for layout to complete
      cy.window().then((win) => {
        const { left, right } = win.aceDiffer.getEditors()
        left.resize(true)
        right.resize(true)
      })

      // Wait for resize to complete and lineHeight to be calculated
      cy.wait(300)

      // Update lineHeight if still 0 (defensive workaround for headless mode)
      cy.window().then((win) => {
        if (win.aceDiffer.lineHeight === 0) {
          win.aceDiffer.lineHeight = win.aceDiffer.editors.left.ace.renderer.lineHeight
        }
      })
    })

    it('can enable lockScrolling after initialization', () => {
      cy.window().then((win) => {
        // Enable lock scrolling
        win.aceDiffer.setOptions({ lockScrolling: true })
        expect(win.aceDiffer.options.lockScrolling).to.equal(true)

        const { left } = win.aceDiffer.getEditors()

        // Scroll left editor - this triggers 'changeScrollTop' event
        // which is throttled (16ms) and then syncs to right editor
        left.getSession().setScrollTop(500)
      })

      // Wait for throttled scroll handler (16ms) plus buffer
      cy.wait(100)

      // Verify scroll synced
      cy.window().then((win) => {
        const { right } = win.aceDiffer.getEditors()
        expect(right.getSession().getScrollTop()).to.be.greaterThan(0)
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
