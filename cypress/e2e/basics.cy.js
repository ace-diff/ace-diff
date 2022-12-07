describe('Basic usage', () => {
  context('Ace-diff init', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8081/cypress-index.html');
    });

    it('makes `AceDiff` available globally', () => {
      cy.window().should('have.property', 'AceDiff');
    });

    it('shows 2 Ace editors', () => {
      cy.get('.ace_content').should('have.length', 2);
    });

    it('shows 2 diff connectors', () => {
      cy.get('.acediff__connector').should('have.length', 2);
    });

    it('shows 1 new code arrow', () => {
      cy.get('.acediff__newCodeConnector').should('have.length', 1);
    });

    it('shows 2 deleted code arrows', () => {
      cy.get('.acediff__deletedCodeConnector').should('have.length', 2);
    });
  });
});
