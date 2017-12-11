// import sinon from 'sinon';
import { expect } from 'chai';
import acediff from '../src/';

describe('AceDiff', () => {
  describe('export', () => {
    it('should export acediff object', () => {
      expect(acediff).to.exist;
    });
  });
});
