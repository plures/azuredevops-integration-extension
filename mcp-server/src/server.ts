#!/usr/bin/env node
/**
 * Azure DevOps MCP Server
 * Minimal JSON-RPC 2.0 over stdio exposing core work item operations.
 */
import { AzureDevOpsIntClient } from '../../src/azureClient';

// ---- Types ----
interface JsonRpcRequest<T = any> {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: T;
}
interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: string | number | null;
  result: any;
}
interface JsonRpcError {
  jsonrpc: '2.0';
  id: string | number | null;
  error: { code: number; message: string; data?: any };
}

const STDIN = process.stdin;
const STDOUT = process.stdout;

// Environment configuration (PAT kept outside prompt ingestion scope)
const ORG = process.env.AZDO_ORG || '';
const PROJECT = process.env.AZDO_PROJECT || '';
const PAT = process.env.AZDO_PAT || '';

if (!ORG || !PROJECT || !PAT) {
  log(
    'warn',
    'Missing AZDO_ORG, AZDO_PROJECT or AZDO_PAT environment variables. Requests will fail until set.'
  );
}

let client: AzureDevOpsIntClient | null = null;
function getClient(): AzureDevOpsIntClient {
  if (!client) client = new AzureDevOpsIntClient(ORG, PROJECT, PAT);
  return client;
}

// ---- Logging helper (stderr only) ----
function log(level: 'info' | 'warn' | 'error', msg: string, extra?: any) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(extra !== undefined ? { extra } : {}),
  };
  process.stderr.write(`[mcp-azdo] ${JSON.stringify(payload)}\n`);
}

function respond(obj: JsonRpcSuccess | JsonRpcError) {
  STDOUT.write(JSON.stringify(obj) + '\n');
}

function ok(id: any, result: any): JsonRpcSuccess {
  return { jsonrpc: '2.0', id, result };
}
function err(id: any, code: number, message: string, data?: any): JsonRpcError {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

// ---- Normalization ----
type FlatWorkItem = {
  id: number;
  title?: string;
  state?: string;
  type?: string;
  assignedTo?: string;
  changedDate?: string;
} & Record<string, any>;

function flatten(item: any): FlatWorkItem {
  if (!item) return { id: -1 } as FlatWorkItem;
  // Support already-flattened structure
  if (item.id && item.title !== undefined && item.state !== undefined && item.type !== undefined)
    return item as FlatWorkItem;
  const fields = item.fields || {};
  return {
    id: item.id || fields['System.Id'],
    title: fields['System.Title'],
    state: fields['System.State'],
    type: fields['System.WorkItemType'],
    assignedTo: fields['System.AssignedTo']?.displayName || fields['System.AssignedTo'],
    changedDate: fields['System.ChangedDate'],
  };
}

function flattenArray(items: any[]): FlatWorkItem[] {
  return (items || []).map(flatten);
}

// ---- Method Implementations ----
const methods: Record<string, (id: any, params: any) => Promise<void>> = {
  async ping(id) {
    respond(ok(id, { pong: true, time: Date.now() }));
  },

  async listWorkItems(id, params) {
    const query = params?.query || 'My Activity';
    try {
      const items = await getClient().getWorkItems(query);
      respond(ok(id, flattenArray(items)));
    } catch (e: any) {
      respond(err(id, -32001, 'Failed to list work items', normalizeError(e)));
    }
  },

  async getWorkItem(id, params) {
    if (typeof params?.id !== 'number') return respond(err(id, -32602, 'id (number) is required'));
    try {
      const item = await getClient().getWorkItemById(params.id);
      respond(ok(id, flatten(item)));
    } catch (e: any) {
      respond(err(id, -32002, 'Failed to get work item', normalizeError(e)));
    }
  },

  async createWorkItem(id, params) {
    const { type = 'Task', title, description, assignedTo } = params || {};
    if (!title) return respond(err(id, -32602, 'title is required'));
    try {
      const item = await getClient().createWorkItem(type, title, description, assignedTo);
      respond(ok(id, flatten(item)));
    } catch (e: any) {
      respond(err(id, -32003, 'Failed to create work item', normalizeError(e)));
    }
  },

  async updateWorkItem(id, params) {
    const { workItemId, patch } = params || {};
    if (typeof workItemId !== 'number')
      return respond(err(id, -32602, 'workItemId (number) required'));
    if (!Array.isArray(patch)) return respond(err(id, -32602, 'patch (array) required'));
    try {
      const item = await getClient().updateWorkItem(workItemId, patch);
      respond(ok(id, flatten(item)));
    } catch (e: any) {
      respond(err(id, -32004, 'Failed to update work item', normalizeError(e)));
    }
  },

  async addComment(id, params) {
    const { workItemId, text } = params || {};
    if (typeof workItemId !== 'number' || !text)
      return respond(err(id, -32602, 'workItemId (number) and text required'));
    try {
      const item = await getClient().addWorkItemComment(workItemId, text);
      respond(ok(id, item));
    } catch (e: any) {
      respond(err(id, -32005, 'Failed to add comment', normalizeError(e)));
    }
  },

  async search(id, params) {
    const { term } = params || {};
    if (!term) return respond(err(id, -32602, 'term required'));
    try {
      const items = await getClient().searchWorkItems(term);
      respond(ok(id, flattenArray(items)));
    } catch (e: any) {
      respond(err(id, -32006, 'Failed to search work items', normalizeError(e)));
    }
  },

  async filter(id, params) {
    try {
      const items = await getClient().filterWorkItems(params || {});
      respond(ok(id, flattenArray(items)));
    } catch (e: any) {
      respond(err(id, -32007, 'Failed to filter work items', normalizeError(e)));
    }
  },
};

function normalizeError(e: any) {
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
    let parsed: JsonRpcRequest;
    try {
      parsed = JSON.parse(line);
    } catch {
      log('warn', 'Invalid JSON line', { line });
      continue;
    }
    if (parsed.jsonrpc !== '2.0' || !parsed.method) {
      respond(err(parsed?.id ?? null, -32600, 'Invalid Request'));
      continue;
    }
    const handler = methods[parsed.method];
    if (!handler) {
      respond(err(parsed.id ?? null, -32601, 'Method not found'));
      continue;
    }
    handler(parsed.id ?? null, parsed.params).catch((e) => {
      log('error', 'Unhandled handler error', normalizeError(e));
      respond(err(parsed.id ?? null, -32000, 'Internal error'));
    });
  }
});

STDIN.on('close', () => {
  log('info', 'STDIN closed, exiting');
  process.exit(0);
});

log('info', 'Azure DevOps MCP server started');
