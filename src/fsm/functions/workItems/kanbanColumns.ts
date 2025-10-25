import type { ApplicationContext } from '../../machines/applicationMachine.js';

export type KanbanColumn = { id: string; title: string; itemIds: number[] };

// Pure function: derives columns from work item list based on System.State
export function computeKanbanColumns(workItems: any[]): KanbanColumn[] {
  const stateMap = new Map<string, number[]>();
  for (const wi of workItems) {
    const id = typeof wi?.id === 'number' ? wi.id : undefined;
    if (id === undefined) continue;
    const state = wi?.fields?.['System.State'] || 'Unknown';
    if (!stateMap.has(state)) stateMap.set(state, []);
    stateMap.get(state)!.push(id);
  }
  const columns: KanbanColumn[] = [];
  for (const [state, ids] of stateMap.entries()) {
    columns.push({ id: state, title: state, itemIds: ids });
  }
  return columns;
}

// Optional helper to access from FSM context
export function getKanbanColumns(context: ApplicationContext): KanbanColumn[] | undefined {
  return context.kanbanColumns;
}
