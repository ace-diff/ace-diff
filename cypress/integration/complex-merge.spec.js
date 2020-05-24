describe('Ace-diff API', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8081/complex-merge.html');
  });

  context('Merging complex diff from the left', () => {
    it('shows 1 diff', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1);
      });
    });

    it('it shows 0 diffs after merging', () => {
      cy.get('.acediff__deletedCodeConnector').click();

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0);
      });
    });
  });

  context('Merging complex diff from the right', () => {
    it('shows 1 diff', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(1);
      });
    });

    it('it shows 0 diffs after merging', () => {
      cy.get('.acediff__newCodeConnector').click();

      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(0);
      });
    });
  });
});
