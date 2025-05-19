import getCurve from '../../src/visuals/getCurve';

describe('getCurve', () => {
  it('should export getCurve object', () => {
    expect(getCurve).toBeDefined();
  });

  it('should return correct curve string', () => {
    expect(getCurve(1, 2, 3, 4)).toEqual('M 1 2 C 2,2 2,4 3,4');
  });
});
