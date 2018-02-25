describe('Ace-diff API', () => {
  beforeEach(function () {
    cy.visit('http://localhost:8081/test/fixtures/newlines.html');
  });

  context('Diffs with different EOL characters', () => {
    it('shows no diffs', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0);
      });
    });
  });
});
