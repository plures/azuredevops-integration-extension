import { expect } from 'chai';
import { makeBranchSlug } from '../src/gitUtils.ts';

describe('gitUtils', () => {
  it('makes a slug', () => {
    const s = makeBranchSlug(123, 'Fix bug in API');
    expect(s).to.match(/feature\/wi-123-fix-bug-in-api/);
  });
});
