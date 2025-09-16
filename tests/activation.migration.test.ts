import { expect } from 'chai';
import { migrateLegacyPAT } from '../src/activation';
import { makeMockContext } from './helpers/mockContext';

describe('activation migration helpers', () => {
  it('migrates PAT from globalState to secrets', async () => {
    const ctx = makeMockContext();
    await ctx.globalState.update('azureDevOpsInt.pat', 'old-value');
    // call migration
    await migrateLegacyPAT(ctx as any);
    const secret = await ctx.secrets.get('azureDevOpsInt.pat');
    expect(secret).to.equal('old-value');
  });
});
