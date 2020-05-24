describe('Merging code', () => {
  context('Merging new code', () => {
    before(() => {
      cy.visit('http://localhost:8081/cypress-index.html');
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
      cy.get('.acediff__newCodeConnector').should('have.length', 1);
    });

    it('merges code from right to left', () => {
      cy.get('.acediff__newCodeConnector').click();

      cy.window().then((win) => {
        const leftCode = JSON.parse(win.aceDiffer.getEditors().left.getValue());
        const rightCode = JSON.parse(win.aceDiffer.getEditors().right.getValue());
        expect(leftCode.version).to.equal(rightCode.version);
        expect(leftCode.date).to.equal(rightCode.date);
      });
    });

    it('shows no new code arrow', () => {
      cy.get('.acediff__newCodeConnector').should('not.exist');
    });
  });

  context('Merging deleted code', () => {
    before(() => {
      cy.visit('http://localhost:8081/cypress-index.html');
    });

    it('shows different version and date in editors', () => {
      cy.window().then((win) => {
        const leftCode = JSON.parse(win.aceDiffer.getEditors().left.getValue());
        const rightCode = JSON.parse(win.aceDiffer.getEditors().right.getValue());
        expect(rightCode.keywords).to.not.equal(leftCode.keywords);
      });
    });

    it('shows 2 deleted code arrows', () => {
      cy.get('.acediff__deletedCodeConnector').should('have.length', 2);
    });

    it('merges code from left to right', () => {
      cy.get('.acediff__deletedCodeConnector')
        .last()
        .click();

      cy.window().then((win) => {
        const leftCode = JSON.parse(win.aceDiffer.getEditors().left.getValue());
        const rightCode = JSON.parse(win.aceDiffer.getEditors().right.getValue());
        expect(leftCode.keywords).to.deep.equal(rightCode.keywords);
      });
    });
  });

  context('Undo is working', () => {
    before(() => {
      cy.visit('http://localhost:8081/cypress-index.html');
      cy.get('.acediff__deletedCodeConnector')
        .last()
        .click();
    });

    it('allows me to undo merges', () => {
      cy.window().then((win) => {
        win.aceDiffer.getEditors().left.undo();
        const leftCode = JSON.parse(win.aceDiffer.getEditors().left.getValue());
        const rightCode = JSON.parse(win.aceDiffer.getEditors().right.getValue());
        expect(leftCode.keywords).to.not.deep.equal(rightCode.keywords);
      });
    });
  });
});
