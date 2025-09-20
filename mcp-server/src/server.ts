#!/usr/bin/env node
/**
 * Azure DevOps MCP Server
 * Implements JSON-RPC 2.0 over stdio and supports the Model Context Protocol (MCP)
 * initialize + tools/list + tools/call flow while keeping backward-compatible
 * ad-hoc method names (e.g., listWorkItems, getWorkItem, etc.).
 */
import { AzureDevOpsIntClient } from '../../src/azureClient';

// ---- Types ----
// Using plain JS objects to maximize compatibility with JSON parsers during linting
// Shapes documented via JSDoc below.

const STDIN = process.stdin;
const STDOUT = process.stdout;

// Environment configuration (PAT kept outside prompt ingestion scope)
const ORG = process.env.AZDO_ORG || '';
const PROJECT = process.env.AZDO_PROJECT || '';
const PAT = process.env.AZDO_PAT || '';

if (!ORG || !PROJECT || !PAT) {
  log(
    'warn',
    'Missing AZDO_ORG, AZDO_PROJECT or AZDO_PAT environment variables. Requests will fail until set.',
    null
  );
}

let client = null;
function getClient() {
  if (!client) client = new AzureDevOpsIntClient(ORG, PROJECT, PAT);
  return client;
}

// ---- Logging helper (stderr only) ----
function log(level, msg, extra) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(extra !== undefined ? { extra } : {}),
  };
  process.stderr.write(`[mcp-azdo] ${JSON.stringify(payload)}\n`);
}

function respond(obj) {
  STDOUT.write(JSON.stringify(obj) + '\n');
}

function ok(id, result) {
  return { jsonrpc: '2.0', id, result };
}
function err(id, code, message, data) {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

// ---- Normalization ----
function extractIdFromUrl(url) {
  if (!url) return undefined;
  const m = url.match(/workItems\/(\d+)/i);
  return m ? Number(m[1]) : undefined;
}

function flatten(item) {
  if (!item) return { id: -1 };
  // Support already-flattened structure
  if (item.id && item.title !== undefined && item.state !== undefined && item.type !== undefined)
    return item;
  const fields = item.fields || {};
  const rels = Array.isArray(item.relations)
  ? item.relations
    .map((r) => ({ rel: r.rel, id: extractIdFromUrl(r.url) }))
    .filter((r) => typeof r.id === 'number')
    : undefined;
  return {
    id: item.id || fields['System.Id'],
    title: fields['System.Title'],
    state: fields['System.State'],
    type: fields['System.WorkItemType'],
    assignedTo: fields['System.AssignedTo']?.displayName || fields['System.AssignedTo'],
    changedDate: fields['System.ChangedDate'],
    relations: rels,
  };
}

function flattenArray(items) {
  return (items || []).map(flatten);
}

// ---- Operation Implementations (return values) ----
const ops = {
  async ping() {
    return { pong: true, time: Date.now() };
  },

  async listWorkItems(params) {
    const query = params?.query || 'My Work Items';
    const items = await getClient().getWorkItems(query);
    return flattenArray(items);
  },

  async getWorkItem(params) {
    if (typeof params?.id !== 'number') throw invalidParams('id (number) is required');
    const item = await getClient().getWorkItemById(params.id);
    return flatten(item);
  },

  async createWorkItem(params) {
    const { type = 'Task', title, description, assignedTo } = params || {};
    if (!title) throw invalidParams('title is required');
    const item = await getClient().createWorkItem(type, title, description, assignedTo);
    return flatten(item);
  },

  async updateWorkItem(params) {
    const { workItemId, patch } = params || {};
    if (typeof workItemId !== 'number') throw invalidParams('workItemId (number) required');
    if (!Array.isArray(patch)) throw invalidParams('patch (array) required');
    const item = await getClient().updateWorkItem(workItemId, patch);
    return flatten(item);
  },

  async addComment(params) {
    const { workItemId, text } = params || {};
    if (typeof workItemId !== 'number' || !text)
      throw invalidParams('workItemId (number) and text required');
    return getClient().addWorkItemComment(workItemId, text);
  },

  async search(params) {
    const { term } = params || {};
    if (!term) throw invalidParams('term required');
    const items = await getClient().searchWorkItems(term);
    return flattenArray(items);
  },

  async filter(params) {
    const items = await getClient().filterWorkItems(params || {});
    return flattenArray(items);
  },

  async getWorkItemRelations(params) {
    const wid = typeof params?.id === 'number' ? params.id : undefined;
    if (!wid) throw invalidParams('id (number) is required');
    const rels = await getClient().getWorkItemRelations(wid);
    return (rels || [])
  .map((r) => ({ rel: r.rel, id: extractIdFromUrl(r.url) }))
  .filter((r) => typeof r.id === 'number');
  },

  async getWorkItemGraph(params) {
    const rootId = typeof params?.id === 'number' ? params.id : undefined;
    const up = typeof params?.depthUp === 'number' ? params.depthUp : 2;
    const down = typeof params?.depthDown === 'number' ? params.depthDown : 2;
    if (!rootId) throw invalidParams('id (number) is required');
    return getClient().getWorkItemGraph(rootId, up, down);
  },

  async addTimeEntry(params) {
    const wid = typeof params?.workItemId === 'number' ? params.workItemId : undefined;
    const hours = typeof params?.hours === 'number' ? params.hours : undefined;
    const note = typeof params?.note === 'string' ? params.note : undefined;
    if (!wid || !hours) throw invalidParams('workItemId and hours required');
    await getClient().addTimeEntry(wid, hours, note);
    return { ok: true };
  },

  async createLinkedWorkItem(params) {
    const parentId = typeof params?.parentId === 'number' ? params.parentId : undefined;
    const type = params?.type || 'Task';
    const title = params?.title;
    const description = params?.description;
    const assignedTo = params?.assignedTo;
    if (!parentId || !title) throw invalidParams('parentId (number) and title are required');
    const item = await getClient().createWorkItemUnderParent(
      parentId,
      type,
      title,
      description,
      assignedTo
    );
    return flatten(item);
  },

  async getWorkItemTypes() {
    return getClient().getWorkItemTypes();
  },

  async getWorkItemTypeStates(params) {
    const wt = typeof params?.type === 'string' ? params.type : undefined;
    if (!wt) throw invalidParams('type (string) is required');
    return getClient().getWorkItemTypeStates(wt);
  },

  async getMyActiveContext(params) {
    const query = params?.query || 'My Work Items';
    const items = await getClient().getWorkItems(query);
    const flat = flattenArray(items);
    const withRels = await Promise.all(
      flat.map(async (fi) => {
        try {
          const rels = await getClient().getWorkItemRelations(fi.id);
          const simp = (rels || [])
            .map((r) => ({ rel: r.rel, id: extractIdFromUrl(r.url) }))
            .filter((r) => typeof r.id === 'number');
          return { ...fi, relations: simp };
        } catch {
          return fi;
        }
      })
    );
    return withRels;
  },
};

function invalidParams(message) {
  const e = new Error(message);
  // Attach code recognizable by our dispatcher
  // @ts-ignore
  e.code = -32602;
  // @ts-ignore
  return e;
}

// ---- MCP Tools metadata ----
const toolDefs = [
  {
    name: 'listWorkItems',
    description: 'List work items by named query or WIQL',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'getWorkItem',
    description: 'Get a single work item by id',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'number' } },
      additionalProperties: false,
    },
  },
  {
    name: 'createWorkItem',
    description: 'Create a new work item',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        type: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        assignedTo: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'updateWorkItem',
    description: 'Apply JSON Patch operations to a work item',
    inputSchema: {
      type: 'object',
      required: ['workItemId', 'patch'],
      properties: {
        workItemId: { type: 'number' },
        patch: { type: 'array', items: { type: 'object' } },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'addComment',
    description: 'Add a comment to a work item',
    inputSchema: {
      type: 'object',
      required: ['workItemId', 'text'],
      properties: { workItemId: { type: 'number' }, text: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'search',
    description: 'Search work items by title substring or id',
    inputSchema: {
      type: 'object',
      required: ['term'],
      properties: { term: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'filter',
    description: 'Filter work items by sprint, type, and state',
    inputSchema: { type: 'object', additionalProperties: true },
  },
  {
    name: 'getWorkItemRelations',
    description: 'Get relations (parent/child) for a work item',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'number' } },
      additionalProperties: false,
    },
  },
  {
    name: 'getWorkItemGraph',
    description: 'Get a graph of related work items around a root id',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number' },
        depthUp: { type: 'number' },
        depthDown: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'addTimeEntry',
    description: 'Add a time entry to a work item (CompletedWork increment)',
    inputSchema: {
      type: 'object',
      required: ['workItemId', 'hours'],
      properties: {
        workItemId: { type: 'number' },
        hours: { type: 'number' },
        note: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'createLinkedWorkItem',
    description: 'Create a work item under a parent (Hierarchy-Reverse link)',
    inputSchema: {
      type: 'object',
      required: ['parentId', 'title'],
      properties: {
        parentId: { type: 'number' },
        type: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        assignedTo: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'getWorkItemTypes',
    description: 'List available work item types in the project',
    inputSchema: { type: 'object', additionalProperties: false },
  },
  {
    name: 'getWorkItemTypeStates',
    description: 'List valid states for a given work item type',
    inputSchema: {
      type: 'object',
      required: ['type'],
      properties: { type: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'getMyActiveContext',
    description: 'Get my active items with immediate relations',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      additionalProperties: false,
    },
  },
];

// ---- Adapter: JSON-RPC Methods (MCP + legacy) ----
const methods = {
  async ping(id) {
    try {
      const r = await ops.ping();
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, e?.code ?? -32000, e?.message || 'Ping error', normalizeError(e)));
    }
  },

  async listWorkItems(id, params) {
    try {
      const r = await ops.listWorkItems(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32001, 'Failed to list work items', normalizeError(e)));
    }
  },

  async getWorkItem(id, params) {
    try {
      const r = await ops.getWorkItem(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32002, 'Failed to get work item', normalizeError(e)));
    }
  },

  async createWorkItem(id, params) {
    try {
      const r = await ops.createWorkItem(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32003, 'Failed to create work item', normalizeError(e)));
    }
  },

  async updateWorkItem(id, params) {
    try {
      const r = await ops.updateWorkItem(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32004, 'Failed to update work item', normalizeError(e)));
    }
  },

  async addComment(id, params) {
    try {
      const r = await ops.addComment(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32005, 'Failed to add comment', normalizeError(e)));
    }
  },

  async search(id, params) {
    try {
      const r = await ops.search(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32006, 'Failed to search work items', normalizeError(e)));
    }
  },

  async filter(id, params) {
    try {
      const r = await ops.filter(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32007, 'Failed to filter work items', normalizeError(e)));
    }
  },

  async getWorkItemRelations(id, params) {
    try {
      const r = await ops.getWorkItemRelations(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32008, 'Failed to get relations', normalizeError(e)));
    }
  },

  async getWorkItemGraph(id, params) {
    try {
      const r = await ops.getWorkItemGraph(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32009, 'Failed to build work item graph', normalizeError(e)));
    }
  },

  async addTimeEntry(id, params) {
    try {
      const r = await ops.addTimeEntry(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32010, 'Failed to add time entry', normalizeError(e)));
    }
  },

  async createLinkedWorkItem(id, params) {
    try {
      const r = await ops.createLinkedWorkItem(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32011, 'Failed to create linked work item', normalizeError(e)));
    }
  },

  async getWorkItemTypes(id) {
    try {
      const r = await ops.getWorkItemTypes();
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32012, 'Failed to get work item types', normalizeError(e)));
    }
  },

  async getWorkItemTypeStates(id, params) {
    try {
      const r = await ops.getWorkItemTypeStates(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32013, 'Failed to get states', normalizeError(e)));
    }
  },

  async getMyActiveContext(id, params) {
    try {
      const r = await ops.getMyActiveContext(params);
      respond(ok(id, r));
    } catch (e) {
      respond(err(id, -32014, 'Failed to get active context', normalizeError(e)));
    }
  },

  // ---- MCP Methods ----
  async initialize(id, _params) {
    // Advertise protocol and capabilities (tools + logging)
    const result = {
      protocolVersion: '2025-06-18',
      serverInfo: { name: 'azure-devops-mcp', version: '0.1.0' },
      capabilities: { tools: {}, logging: {} },
    };
    respond(ok(id, result));
  },

  async 'tools/list'(id) {
    respond(ok(id, { tools: toolDefs }));
  },

  async 'tools/call'(id, params) {
    const name = params && typeof params.name === 'string' ? params.name : undefined;
    const args = params?.arguments ?? {};
    if (!name || typeof name !== 'string') return respond(err(id, -32602, 'name required', null));
    const fn = ops[name];
    if (typeof fn !== 'function') return respond(err(id, -32601, `Unknown tool: ${name}`, null));
    try {
      const r = await fn(args);
      respond(ok(id, { content: [{ type: 'json', json: r }] }));
    } catch (e) {
      log('warn', 'tools/call error', normalizeError(e));
      respond(ok(id, { content: [{ type: 'text', text: e?.message || 'Tool error' }], isError: true }));
    }
  },

  async shutdown(id) {
    respond(ok(id, null));
    try {
      STDIN.pause();
    } catch {
      /* noop */
    }
    process.nextTick(() => process.exit(0));
  },
};

function normalizeError(e) {
  if (!e) return undefined;
  const obj: any = { message: e.message || String(e) };
  const r = e.response || {};
  if (r.status) obj.status = r.status;
  if (r.data)
    obj.dataSnippet =
      typeof r.data === 'string' ? r.data.slice(0, 500) : JSON.stringify(r.data).slice(0, 500);
  return obj;
}

// ---- Input Loop ----
let buffer = '';
STDIN.setEncoding('utf8');
STDIN.on('data', (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      log('warn', 'Invalid JSON line', { line });
      continue;
    }
    if (parsed.jsonrpc !== '2.0' || !parsed.method) {
      respond(err(parsed?.id ?? null, -32600, 'Invalid Request', null));
      continue;
    }
    const handler = methods[parsed.method];
    if (!handler) {
      respond(err(parsed.id ?? null, -32601, 'Method not found', null));
      continue;
    }
    handler(parsed.id ?? null, parsed.params)
      .catch((e) => {
        log('error', 'Unhandled handler error', normalizeError(e));
        respond(err(parsed.id ?? null, -32000, 'Internal error', null));
      });
  }
});

STDIN.on('close', () => {
  log('info', 'STDIN closed, exiting', null);
  process.exit(0);
});

log('info', 'Azure DevOps MCP server started', null);
