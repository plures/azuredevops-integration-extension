# Azure DevOps MCP Server

A Model Context Protocol (MCP) tools server over stdio that exposes Azure DevOps operations for work items, comments, time logging, and more. It follows the MCP tools workflow (initialize → tools/list → tools/call) and also preserves legacy JSON‑RPC method names for compatibility.

## Protocols supported

- MCP tools protocol (preferred): `initialize`, `tools/list`, `tools/call`, `shutdown`
- Legacy JSON‑RPC 2.0 methods (backward‑compatible): `ping`, `listWorkItems`, `getWorkItem`, etc. — these delegate to the same underlying operations

## Environment variables

- `AZDO_ORG` (required)
- `AZDO_PROJECT` (required)
- `AZDO_PAT` (required – Personal Access Token with Work Items Read/Write; Code Read/Write for PRs; Build Read for builds)

## Install & build

PowerShell:

```powershell
cd mcp-server
npm install
npm run build
```

Or Bash:

```bash
cd mcp-server
npm install && npm run build
```

## Run

PowerShell example:

```powershell
$env:AZDO_ORG="yourOrg"; $env:AZDO_PROJECT="YourProject"; $env:AZDO_PAT="xxxxx"; node dist/server.js
```

Unix shell:

```bash
AZDO_ORG=yourOrg AZDO_PROJECT=YourProject AZDO_PAT=xxxxx node dist/server.js
```

## MCP tools workflow

1) initialize

Request:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": { "protocolVersion": "2025-06-18" } }
```

Response (example):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-06-18",
    "serverInfo": { "name": "azure-devops-mcp", "version": "0.1.0" },
    "capabilities": { "tools": {}, "logging": {} }
  }
}
```

1) tools/list

```json
{ "jsonrpc": "2.0", "id": 2, "method": "tools/list" }
```

Response (truncated):

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      { "name": "listWorkItems", "description": "List work items via named query or WIQL", "inputSchema": { "type": "object", "properties": { "query": {"type":"string"} } } },
      { "name": "getWorkItem", "description": "Get a work item by id", "inputSchema": { "type": "object", "required":["id"], "properties": { "id": {"type":"number"} } } },
      { "name": "createWorkItem", "description": "Create a work item", "inputSchema": { "type": "object", "required":["title"], "properties": { "type": {"type":"string"}, "title": {"type":"string"}, "description": {"type":"string"}, "assignedTo": {"type":"string"} } } },
      { "name": "updateWorkItem", "description": "Apply JSON Patch ops to a work item", "inputSchema": { "type": "object", "required":["workItemId","patch"], "properties": { "workItemId": {"type":"number"}, "patch": {"type":"array"} } } },
      { "name": "addComment", "description": "Add a comment to a work item", "inputSchema": { "type": "object", "required":["workItemId","text"], "properties": { "workItemId": {"type":"number"}, "text": {"type":"string"} } } },
      { "name": "search", "description": "Search work items by title substring or exact id", "inputSchema": { "type": "object", "required":["term"], "properties": { "term": {"type":"string"} } } },
      { "name": "filter", "description": "Filter work items with WIQL composition", "inputSchema": { "type": "object" } },
      { "name": "getWorkItemRelations", "description": "List relations for a work item", "inputSchema": { "type": "object", "required":["id"], "properties": { "id": {"type":"number"} } } },
      { "name": "getWorkItemGraph", "description": "Traverse parents/children around a root id", "inputSchema": { "type": "object", "required":["rootId"], "properties": { "rootId": {"type":"number"}, "depthUp": {"type":"number"}, "depthDown": {"type":"number"} } } },
      { "name": "addTimeEntry", "description": "Log completed work hours and optional note", "inputSchema": { "type": "object", "required":["id","hours"], "properties": { "id": {"type":"number"}, "hours": {"type":"number"}, "note": {"type":"string"} } } },
      { "name": "createLinkedWorkItem", "description": "Create a child under a parent id", "inputSchema": { "type": "object", "required":["parentId","type","title"], "properties": { "parentId": {"type":"number"}, "type": {"type":"string"}, "title": {"type":"string"}, "description": {"type":"string"}, "assignedTo": {"type":"string"} } } },
      { "name": "getWorkItemTypes", "description": "List available work item types", "inputSchema": { "type": "object", "properties": {} } },
      { "name": "getWorkItemTypeStates", "description": "List states for a work item type", "inputSchema": { "type": "object", "required":["workItemType"], "properties": { "workItemType": {"type":"string"} } } },
      { "name": "getMyActiveContext", "description": "Convenience: current sprint + my items", "inputSchema": { "type": "object", "properties": {} } }
    ]
  }
}
```

1) tools/call

```json
{ "jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": { "name": "listWorkItems", "arguments": { "query": "My Work Items" } } }
```

Response (example):

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [ { "type": "json", "json": [ {"id": 123, "title": "Implement feature", "state": "Active", "type": "Task"} ] } ]
  }
}
```

On error, the server returns a single content item with `isError: true` and a text message.

## Flattened work item shape

```ts
interface FlatWorkItem {
  id: number;
  title?: string;
  state?: string;
  type?: string;
  assignedTo?: string;
  changedDate?: string;
}
```

## Patch format

Use standard Azure DevOps JSON Patch operations, e.g.

```json
[{ "op": "add", "path": "/fields/System.Title", "value": "New Title" }]
```

## Legacy JSON‑RPC method compatibility

You can still call methods like `listWorkItems`, `getWorkItem`, `createWorkItem`, etc. using a classic JSON‑RPC 2.0 envelope. These are internally routed to the same operations used by `tools/call`.

## Notes

- One line in, one line out – each JSON envelope is newline‑delimited
- Logging (stderr) is structured JSON with prefix `[mcp-azdo]`
- Returned arrays are unpaginated; slice on the client if needed
- Authentication uses PAT Basic auth per request

## Roadmap

- Iterations helpers exposed as tools (`getIterations`, `getCurrentIteration`)
- PR and build tools
- Optional pagination and field projection
- Streaming for large WIQL results

MIT License.
