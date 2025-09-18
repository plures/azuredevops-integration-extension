// Shared normalization utilities for work items
// Supports both raw Azure DevOps shape: { id, fields: { 'System.Title': ... } }
// and previously flattened shape: { id, title, state, type, assignedTo, ... }

export interface NormalizedWorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  assignedTo: string | undefined;
  priority: number | undefined;
  tags: string[];
  iterationPath?: string;
  description?: string;
  raw: any; // original object for advanced scenarios
}

export function getField(item: any, field: string): any {
  if (!item) return undefined;
  switch (field) {
    case 'System.Id':
      return item.id ?? item.fields?.['System.Id'];
    case 'System.Title':
      return item.title ?? item.fields?.['System.Title'];
    case 'System.State':
      return item.state ?? item.fields?.['System.State'];
    case 'System.WorkItemType':
      return item.type ?? item.fields?.['System.WorkItemType'];
    case 'System.AssignedTo': {
      const a = item.assignedTo || item.fields?.['System.AssignedTo'];
      if (a && typeof a === 'object') return a.displayName || a.uniqueName || a.name;
      return a;
    }
    case 'System.Tags': {
      if (item.tags) return Array.isArray(item.tags) ? item.tags.join(';') : item.tags;
      return item.fields?.['System.Tags'];
    }
    case 'Microsoft.VSTS.Common.Priority':
      return item.priority ?? item.fields?.['Microsoft.VSTS.Common.Priority'];
    case 'System.IterationPath':
      return item.iterationPath ?? item.fields?.['System.IterationPath'];
    case 'System.AreaPath':
      return item.areaPath ?? item.fields?.['System.AreaPath'];
    case 'System.Description':
      return item.description ?? item.fields?.['System.Description'];
    default:
      return item[field] ?? item.fields?.[field];
  }
}

export function toNormalized(item: any): NormalizedWorkItem {
  const id = Number(getField(item, 'System.Id'));
  const title = String(getField(item, 'System.Title') || `Work Item #${id}`);
  const state = String(getField(item, 'System.State') || 'Unknown');
  const type = String(getField(item, 'System.WorkItemType') || 'Unknown');
  const assignedRaw = getField(item, 'System.AssignedTo');
  const assignedTo = assignedRaw || undefined;
  const priority = getField(item, 'Microsoft.VSTS.Common.Priority');
  const tagsField = getField(item, 'System.Tags');
  const tags =
    typeof tagsField === 'string'
      ? tagsField.split(';').filter(Boolean)
      : Array.isArray(tagsField)
      ? tagsField
      : [];
  const iterationPath = getField(item, 'System.IterationPath');
  const description = getField(item, 'System.Description');

  return {
    id,
    title,
    state,
    type,
    assignedTo,
    priority,
    tags,
    iterationPath,
    description,
    raw: item,
  };
}

export function normalizeArray(items: any[]): NormalizedWorkItem[] {
  return items.map(toNormalized);
}
