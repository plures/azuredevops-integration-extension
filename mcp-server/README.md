# Azure DevOps MCP Server

Model Context Protocol style JSON-RPC 2.0 (one JSON object per line on stdio) server that exposes a lean set of Azure DevOps Work Item operations. Designed for agent / toolchain integration with minimal dependencies and predictable shapes.

## Supported Methods (All `jsonrpc: "2.0"`)

| Method           | Params Shape                                                                  | Result                          | Notes                                                      |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| `ping`           | `{}` or omitted                                                               | `{ pong: true, time: epochMs }` | Simple health check                                        |
| `listWorkItems`  | `{ query?: string }`                                                          | `FlatWorkItem[]`                | Named query or raw WIQL string (defaults to "My Activity") |
| `getWorkItem`    | `{ id: number }`                                                              | `FlatWorkItem`                  | Single item (flattened)                                    |
| `createWorkItem` | `{ type?: string, title: string, description?: string, assignedTo?: string }` | `FlatWorkItem`                  | Defaults type to `Task`                                    |
| `updateWorkItem` | `{ workItemId: number, patch: Patch[] }`                                      | `FlatWorkItem`                  | JSON Patch ops (Azure DevOps format)                       |
| `addComment`     | `{ workItemId: number, text: string }`                                        | Azure Comment Response          | Not flattened; original service shape                      |
| `search`         | `{ term: string }`                                                            | `FlatWorkItem[]`                | Title substring OR exact ID match                          |
| `filter`         | `{ sprint?, includeState?, excludeStates?, type?, assignedTo? }`              | `FlatWorkItem[]`                | Composes WIQL dynamically                                  |

## Environment Variables

- `AZDO_ORG` (required)
- `AZDO_PROJECT` (required)
- `AZDO_PAT` (required – Personal Access Token with Work Items (Read & Write))

## Install & Build

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

## JSON-RPC Example

Request:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "listWorkItems", "params": { "query": "My Activity" } }
```

Response (truncated example):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    {
      "id": 123,
      "title": "Implement feature",
      "state": "Active",
      "type": "Task",
      "assignedTo": "Jane Doe"
    }
  ]
}
```

## Flattened Work Item Shape

```ts
interface FlatWorkItem {
  id: number;
  title?: string;
  state?: string;
  type?: string;
  assignedTo?: string;
  changedDate?: string;
  // Additional service-provided fields may be appended in future (non-breaking)
}
```

## Patch Format

Use standard Azure DevOps JSON Patch operations, e.g.

```json
[{ "op": "add", "path": "/fields/System.Title", "value": "New Title" }]
```

## Error Handling

Errors follow JSON-RPC 2.0 with `error.code` values:

| Code           | Meaning                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| -32600         | Invalid request envelope                                                   |
| -32601         | Method not found                                                           |
| -32602         | Invalid params                                                             |
| -32000         | Internal unhandled error                                                   |
| -32001..-32007 | Specific operation failures (list/get/create/update/comment/search/filter) |

`error.data` may include `status` (HTTP status) and `dataSnippet` (response excerpt) when available.

## Notes

- One line in, one line out – no delimiter beyond `\n`.
- Logging (stderr) is structured JSON prefixed with `[mcp-azdo]` and safe for ingestion filtering.
- Returned arrays are currently unpaginated; implement client-side slicing if large.
- Authentication uses PAT Basic auth header per request (no token caching beyond that).

## Future Enhancements

- Iteration endpoints (`getIterations`, `getCurrentIteration`)
- Pull request & build surfaces
- Optional pagination / field projection
- Streaming partial results for large WIQL queries
- Delta endpoints (changed since timestamp)
- Structured metrics endpoint

MIT License.
