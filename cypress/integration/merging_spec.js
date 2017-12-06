describe('Merging code', () => {
  context('Merging new code', () => {
    before(function () {
      cy.visit('http://localhost:8081/tests/fixtures/');
    });

    it('shows different version and date in editors', () => {
      cy.window().then((win) => {
        const leftCode = JSON.parse(win.aceDiffer.getEditors().left.getValue());
        const rightCode = JSON.parse(win.aceDiffer.getEditors().right.getValue());
        expect(leftCode.version).to.not.equal(rightCode.version);
        expect(leftCode.date).to.not.equal(rightCode.date);
      });
    });

    it('shows 1 new code arrow', () => {
      cy.get('.acediff-new-code-connector-copy').should('have.length', 1);
    });

    it('merges code from right to left', () => {
      cy.get('.acediff-new-code-connector-copy').click();

      cy.window().then((win) => {
        const leftCode = JSON.parse(win.aceDiffer.getEditors().left.getValue());
        const rightCode = JSON.parse(win.aceDiffer.getEditors().right.getValue());
        expect(leftCode.version).to.equal(rightCode.version);
        expect(leftCode.date).to.equal(rightCode.date);
      });
    });

    it('shows no new code arrow', () => {
      cy.get('.acediff-new-code-connector-copy').should('not.exist');
    });
  });

  context('Merging deleted code', () => {
    before(function () {
      cy.visit('http://localhost:8081/tests/fixtures/');
    });

    it('shows different version and date in editors', () => {
      cy.window().then((win) => {
        const leftCode = JSON.parse(win.aceDiffer.getEditors().left.getValue());
        const rightCode = JSON.parse(win.aceDiffer.getEditors().right.getValue());
        expect(rightCode.keywords).to.not.equal(leftCode.keywords);
      });
    });

    it('shows 2 deleted code arrows', () => {
      cy.get('.acediff-deleted-code-connector-copy').should('have.length', 2);
    });

    it('merges code from left to right', () => {
      cy.get('.acediff-deleted-code-connector-copy')
      .last()
      .click();

      cy.window().then((win) => {
        const leftCode = JSON.parse(win.aceDiffer.getEditors().left.getValue());
        const rightCode = JSON.parse(win.aceDiffer.getEditors().right.getValue());
        expect(leftCode.keywords).to.deep.equal(rightCode.keywords);
      });
    });
  });
});
