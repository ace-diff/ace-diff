describe('Basic usage', () => {
  context('Ace-diff init', () => {
    beforeEach(function () {
      cy.visit('http://localhost:8081/tests/fixtures/');
    });

    it('makes `AceDiff` available globally', () => {
      cy.window().should('have.property', 'AceDiff');
    });

    it('shows 2 Ace editors', () => {
      cy.get('.ace_content').should('have.length', 2);
    });

    it('shows 2 diff connectors', () => {
      cy.get('.acediff-connector').should('have.length', 2);
    });

    it('shows 1 new code arrow', () => {
      cy.get('.acediff-new-code-connector-copy').should('have.length', 1);
    });

    it('shows 2 deleted code arrows', () => {
      cy.get('.acediff-deleted-code-connector-copy').should('have.length', 2);
    });
  });
});
