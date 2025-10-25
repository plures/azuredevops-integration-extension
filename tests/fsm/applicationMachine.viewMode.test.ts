import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createActor } from 'xstate';
import { applicationMachine } from '../../src/fsm/machines/applicationMachine.js';

async function waitFor<TState>(actor: any, predicate: (state: any) => boolean, timeout = 1500) {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const check = () => {
      const snapshot = actor.getSnapshot();
      if (snapshot && predicate(snapshot)) {
        resolve();
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error('waitFor timeout'));
        return;
      }
      setTimeout(check, 10);
    };
    check();
  });
}

async function activateToReady() {
  const actor = createActor(applicationMachine);
  actor.start();
  actor.send({ type: 'ACTIVATE', context: {} as any });
  // Wait for setupUI completion
  await waitFor(actor, (s) => s.matches('active.setup.waiting_for_panel'));
  actor.send({ type: 'UPDATE_WEBVIEW_PANEL', webviewPanel: {} });
  await waitFor(actor, (s) => s.matches('active.ready'));
  return actor;
}

describe('applicationMachine view mode toggling', () => {
  it('toggles between list and kanban with no work items', async () => {
    const actor = await activateToReady();
    const initial = actor.getSnapshot();
    expect(initial.context.viewMode).to.equal('list');
    expect(initial.context.kanbanColumns).to.be.undefined;

    actor.send({ type: 'TOGGLE_VIEW' });
    const afterKanban = actor.getSnapshot();
    expect(afterKanban.context.viewMode).to.equal('kanban');
    expect(afterKanban.context.kanbanColumns).to.be.an('array').that.has.length(0);

    actor.send({ type: 'TOGGLE_VIEW' });
    const afterList = actor.getSnapshot();
    expect(afterList.context.viewMode).to.equal('list');
    expect(afterList.context.kanbanColumns).to.be.undefined;
  });

  it('derives kanban columns from loaded work items and clears on return to list', async () => {
    const actor = await activateToReady();
    const workItems = [
      { id: 1, fields: { 'System.State': 'New' } },
      { id: 2, fields: { 'System.State': 'Active' } },
      { id: 3, fields: { 'System.State': 'New' } },
      { id: 4, fields: {} }, // Missing state -> Unknown
    ];

    actor.send({ type: 'WORK_ITEMS_LOADED', workItems });
    const loaded = actor.getSnapshot();
    expect(loaded.context.pendingWorkItems?.workItems).to.have.length(4);

    actor.send({ type: 'TOGGLE_VIEW', view: 'kanban' });
    const kanban = actor.getSnapshot();
    expect(kanban.context.viewMode).to.equal('kanban');
    expect(kanban.context.kanbanColumns).to.be.an('array');

    // Validate grouping
    const columns = kanban.context.kanbanColumns!;
    const byId = Object.fromEntries(columns.map((c: any) => [c.id, c.itemIds]));
    expect(byId['New']).to.deep.equal([1, 3]);
    expect(byId['Active']).to.deep.equal([2]);
    expect(byId['Unknown']).to.deep.equal([4]);

    actor.send({ type: 'TOGGLE_VIEW', view: 'list' });
    const backToList = actor.getSnapshot();
    expect(backToList.context.viewMode).to.equal('list');
    expect(backToList.context.kanbanColumns).to.be.undefined;
  });
});
