describe('Theme CSS', () => {
  context('Light theme (default)', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/theme-light.html')
    })

    it('applies light gutter background color', () => {
      cy.get('.acediff__gutter')
        .should('have.css', 'background-color', 'rgb(239, 239, 239)') // #efefef
    })

    it('applies light connector fill color', () => {
      cy.get('.acediff__connector')
        .first()
        .should('have.css', 'fill', 'rgb(216, 242, 255)') // #d8f2ff
    })

    it('applies light connector stroke color', () => {
      cy.get('.acediff__connector')
        .first()
        .should('have.css', 'stroke', 'rgb(162, 215, 242)') // #a2d7f2
    })

    it('applies light diff line background color', () => {
      cy.get('.acediff__diffLine')
        .first()
        .should('have.css', 'background-color', 'rgb(216, 242, 255)') // #d8f2ff
    })

    it('applies dark text color for copy arrows', () => {
      cy.get('.acediff__copy--right div, .acediff__copy--left div')
        .first()
        .should('have.css', 'color', 'rgb(0, 0, 0)') // #000
    })
  })

  context('Twilight theme preset', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/theme-twilight.html')
    })

    it('applies twilight gutter background color', () => {
      cy.get('.acediff__gutter')
        .should('have.css', 'background-color', 'rgb(26, 26, 26)') // #1a1a1a
    })

    it('applies twilight connector fill color', () => {
      cy.get('.acediff__connector')
        .first()
        .should('have.css', 'fill', 'rgb(0, 77, 122)') // #004d7a
    })

    it('applies twilight connector stroke color', () => {
      cy.get('.acediff__connector')
        .first()
        .should('have.css', 'stroke', 'rgb(0, 53, 84)') // #003554
    })

    it('applies twilight diff line background color', () => {
      cy.get('.acediff__diffLine')
        .first()
        .should('have.css', 'background-color', 'rgb(0, 77, 122)') // #004d7a
    })

    it('applies light text color for copy arrows', () => {
      cy.get('.acediff__copy--right div, .acediff__copy--left div')
        .first()
        .should('have.css', 'color', 'rgb(248, 248, 248)') // #f8f8f8
    })
  })
})
