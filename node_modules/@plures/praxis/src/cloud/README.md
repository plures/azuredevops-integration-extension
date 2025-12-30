# Praxis Cloud Relay

Azure-hosted relay service for Praxis Cloud monetization (Tier 1).

## Features

- **PluresDB CRDT Sync** - Synchronize facts and events across clients
- **Event Forwarding** - Publish events to Azure Event Grid / Service Bus
- **Schema Registry** - Store and retrieve application schemas
- **Encrypted Blob Storage** - Secure storage for generated docs and components
- **GitHub OAuth** - Identity provider integration
- **Usage Metering** - Track usage for billing purposes

## Quick Start

### 1. Setup Cloud Connection

```bash
# Install Praxis
npm install @plures/praxis

# Initialize cloud connection
npx praxis cloud init
```

The wizard will:

1. Authenticate with GitHub
2. Configure the Azure endpoint
3. Test the connection
4. Save configuration to `.praxis-cloud.json`

### 2. Use in Your Application

```typescript
import { connectRelay } from '@plures/praxis/cloud';

// Connect to cloud relay
const relay = await connectRelay('https://praxis-relay.azurewebsites.net', {
  appId: 'my-app',
  authToken: 'your-github-token',
  autoSync: true,
  syncInterval: 5000,
});

// Sync data
await relay.sync({
  type: 'delta',
  appId: 'my-app',
  clock: {},
  facts: [{ tag: 'TaskCreated', payload: { id: '1', title: 'Buy milk' } }],
  events: [],
  timestamp: Date.now(),
});

// Get usage metrics
const usage = await relay.getUsage();
console.log(`Syncs: ${usage.syncCount}, Events: ${usage.eventCount}`);

// Check health
const health = await relay.getHealth();
console.log(`Status: ${health.status}`);

// Disconnect
await relay.disconnect();
```

## CLI Commands

### `praxis cloud init`

Setup wizard to connect your app to Praxis Cloud.

```bash
npx praxis cloud init --endpoint https://praxis-relay.azurewebsites.net --app-id my-app
```

Options:

- `-e, --endpoint <url>` - Azure Function App endpoint URL
- `-a, --app-id <id>` - Application identifier
- `--auto-sync` - Enable automatic synchronization
- `--interval <ms>` - Sync interval in milliseconds

### `praxis cloud status`

Check connection status and service health.

```bash
npx praxis cloud status
```

### `praxis cloud sync`

Manually trigger synchronization.

```bash
npx praxis cloud sync
```

### `praxis cloud usage`

View usage metrics for billing.

```bash
npx praxis cloud usage
```

## API Reference

### `connectRelay(endpoint, options)`

Connect to Praxis Cloud Relay.

**Parameters:**

- `endpoint: string` - Azure Function App endpoint URL
- `options: CloudRelayConfig` - Configuration options
  - `appId: string` - Application identifier (required)
  - `authToken?: string` - GitHub OAuth token
  - `autoSync?: boolean` - Enable automatic sync
  - `syncInterval?: number` - Sync interval in ms (default: 5000)
  - `encryption?: boolean` - Enable encryption for blob storage

**Returns:** `Promise<CloudRelayClient>`

### `CloudRelayClient`

#### `connect(): Promise<void>`

Connect to the relay service.

#### `disconnect(): Promise<void>`

Disconnect from the relay service.

#### `sync(message: CRDTSyncMessage): Promise<void>`

Sync facts and events using CRDT protocol.

**Parameters:**

- `message.type` - "sync" | "delta" | "snapshot"
- `message.appId` - Application identifier
- `message.clock` - Vector clock for causality
- `message.facts?` - Facts to sync
- `message.events?` - Events to forward
- `message.timestamp` - Timestamp

#### `getUsage(): Promise<UsageMetrics>`

Get usage metrics for the current billing period.

**Returns:**

- `syncCount` - Number of sync operations
- `eventCount` - Number of events forwarded
- `factCount` - Number of facts synced
- `storageBytes` - Storage used in bytes
- `periodStart` - Period start timestamp
- `periodEnd` - Period end timestamp

#### `getHealth(): Promise<HealthCheckResponse>`

Get service health status.

**Returns:**

- `status` - "healthy" | "degraded" | "unhealthy"
- `services` - Status of individual services
  - `relay` - Relay service status
  - `eventGrid` - Event Grid status
  - `storage` - Blob storage status
  - `auth` - Authentication status

#### `getStatus(): RelayStatus`

Get current connection status (synchronous).

**Returns:**

- `connected` - Connection state
- `lastSync` - Last sync timestamp
- `endpoint` - Endpoint URL
- `appId` - Application identifier

## Azure Deployment

### Prerequisites

- Azure account
- Azure CLI installed
- Azure Functions Core Tools

### Deploy to Azure

1. **Create Azure Function App:**

```bash
az functionapp create \
  --name praxis-cloud-relay \
  --resource-group praxis-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --storage-account praxisstorage
```

2. **Deploy Functions:**

The GitHub Actions workflow (`.github/workflows/azure-functions.yml`) automatically deploys on push to `main`.

Or deploy manually:

```bash
cd src/cloud/relay
func azure functionapp publish praxis-cloud-relay
```

### Environment Variables

Configure in Azure Portal or via CLI:

```bash
az functionapp config appsettings set \
  --name praxis-cloud-relay \
  --resource-group praxis-rg \
  --settings \
    "GITHUB_CLIENT_ID=your-client-id" \
    "GITHUB_CLIENT_SECRET=your-client-secret" \
    "AZURE_STORAGE_CONNECTION_STRING=your-connection-string"
```

## Endpoints

The relay exposes the following HTTP endpoints:

### `GET /health`

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "version": "0.1.0",
  "services": {
    "relay": true,
    "eventGrid": true,
    "storage": true,
    "auth": true
  }
}
```

### `POST /sync`

CRDT synchronization endpoint.

**Request:**

```json
{
  "type": "delta",
  "appId": "my-app",
  "clock": { "my-app": 5 },
  "facts": [{ "tag": "TaskCreated", "payload": { "id": "1" } }],
  "events": [],
  "timestamp": 1234567890
}
```

**Response:**

```json
{
  "success": true,
  "clock": { "my-app": 5 },
  "timestamp": 1234567890
}
```

### `GET /usage?appId=<appId>`

Usage metrics endpoint.

**Response:**

```json
{
  "appId": "my-app",
  "syncCount": 100,
  "eventCount": 500,
  "factCount": 1000,
  "storageBytes": 102400,
  "periodStart": 1234567890,
  "periodEnd": 1234567890
}
```

### `GET /stats?appId=<appId>`

Aggregated statistics endpoint.

**Response:**

```json
{
  "appId": "my-app",
  "totalSyncs": 100,
  "usage": { ... },
  "lastSync": 1234567890
}
```

## Authentication

Praxis Cloud uses GitHub OAuth for authentication.

### Device Flow (CLI)

The CLI uses GitHub's device flow for authentication:

```typescript
import { authenticateWithDeviceFlow } from '@plures/praxis/cloud';

const result = await authenticateWithDeviceFlow('your-client-id');

if (result.success) {
  console.log(`Authenticated as ${result.user.login}`);
  console.log(`Token: ${result.token}`);
}
```

### Web Flow

For web applications, use the standard OAuth flow:

```typescript
import { createGitHubOAuth } from '@plures/praxis/cloud';

const oauth = createGitHubOAuth({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'http://localhost:3000/callback',
});

// Redirect user to GitHub
window.location.href = oauth.getAuthorizationUrl();

// In callback route:
const result = await oauth.exchangeCode(code);
```

## Configuration File

The `.praxis-cloud.json` file stores your cloud configuration:

```json
{
  "endpoint": "https://praxis-relay.azurewebsites.net",
  "appId": "my-app",
  "authToken": "gho_xxxxxxxxxxxx",
  "autoSync": true,
  "syncInterval": 5000
}
```

**Security Note:** Add `.praxis-cloud.json` to your `.gitignore` to avoid committing credentials.

## Pricing (Tier 1)

Praxis Cloud Base Tier includes:

- **PluresDB CRDT Sync** - Up to 10,000 syncs/month
- **Event Forwarding** - Up to 50,000 events/month
- **Blob Storage** - 1 GB encrypted storage
- **GitHub OAuth** - Unlimited authentications

Additional usage is billed per:

- Sync operations: $0.001 per sync
- Events: $0.0001 per event
- Storage: $0.10 per GB/month

## Support

- [Documentation](https://github.com/plures/praxis/tree/main/docs)
- [GitHub Issues](https://github.com/plures/praxis/issues)
- [Discussions](https://github.com/plures/praxis/discussions)

## License

MIT
