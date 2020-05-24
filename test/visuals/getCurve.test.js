const { expect } = require('chai');
const getCurve = require('../../src/visuals/getCurve');

describe('getCurve', () => {
  it('should export getCurve object', () => {
    expect(getCurve).to.exist;
  });

  it('should return correct curve string', () => {
    expect(getCurve(1, 2, 3, 4)).to.equal('M 1 2 C 2,2 2,4 3,4');
  });
});
