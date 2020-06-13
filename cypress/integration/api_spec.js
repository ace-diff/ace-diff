describe('Ace-diff API', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8081/cypress-index.html');
  });

  context('getEditors()', () => {
    it('returns left and right editors', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getEditors()).to.have.all.keys('left', 'right');
      });
    });
  });

  context('setOptions()', () => {
    it('lets you set the ace-diff options', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.options.diffGranularity).to.equal('broad');
        win.aceDiffer.setOptions({
          diffGranularity: 'specific',
        });
        expect(win.aceDiffer.options.diffGranularity).to.equal('specific');
      });
    });
  });

  context('getNumDiffs()', () => {
    it('gets you the number of diffs', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.getNumDiffs()).to.equal(2);
      });
    });
  });

  context('diff()', () => {
    // TODO: is there a good way to test this?
    it('updates the diff', () => {
      cy.window().then((win) => {
        expect(win.aceDiffer.diff()).to.equal(undefined);
      });
    });
  });
});
