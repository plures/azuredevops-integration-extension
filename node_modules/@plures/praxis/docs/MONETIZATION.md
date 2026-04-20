# GitHub-Based Monetization

This document describes the GitHub-native monetization implementation for Praxis Cloud.

## Overview

Praxis Cloud uses GitHub as the exclusive authentication and billing provider, aligning with the Microsoft partnership constraint. This enables:

- **GitHub OAuth** for secure authentication
- **GitHub Sponsors** for recurring subscriptions
- **GitHub Marketplace** for enterprise SaaS billing (preparatory)
- **Auto-provisioning** based on GitHub identity

## Architecture

```
┌─────────────────┐
│   GitHub User   │
└────────┬────────┘
         │ OAuth Device Flow
         ▼
┌─────────────────┐
│  Praxis CLI     │
│  praxis login   │
└────────┬────────┘
         │ GitHub Token
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Praxis Cloud   │────▶│ GitHub Sponsors  │
│  Relay Service  │     │ API              │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│ Auto-Provision  │
│ Tenant/Storage  │
└─────────────────┘
```

## Subscription Tiers

### Free Tier

- **Cost**: Free
- **Limits**:
  - 1,000 syncs/month
  - 10 MB storage
  - 1 app/project
  - Community support

### Solo Tier ($5/month via GitHub Sponsors)

- **Limits**:
  - 50,000 syncs/month
  - 1 GB storage
  - 10 apps/projects
  - Standard support

### Team Tier ($20/month via GitHub Sponsors)

- **Limits**:
  - 500,000 syncs/month
  - 10 GB storage
  - 50 apps/projects
  - 10 team members
  - Standard support

### Enterprise Tier ($50/month via GitHub Sponsors/Marketplace)

- **Limits**:
  - 5,000,000 syncs/month
  - 100 GB storage
  - 1,000 apps/projects
  - Unlimited team members
  - Priority support
  - SLA guarantees

## Authentication Flow

### 1. CLI Authentication

```bash
# Using device flow (recommended)
praxis login

# Using personal access token
praxis login --token ghp_xxxxx

# Check authentication
praxis whoami

# Logout
praxis logout
```

### 2. Device Flow Process

1. User runs `praxis login`
2. CLI requests device code from GitHub
3. User visits verification URL and enters code
4. CLI polls for access token
5. Token and user info stored locally in `~/.praxis/auth.json`
6. CLI checks GitHub Sponsors status
7. Auto-provisions tenant and storage

### 3. Programmatic Authentication

```typescript
import { authenticateWithDeviceFlow } from '@plures/praxis/cloud';

const result = await authenticateWithDeviceFlow('YOUR_CLIENT_ID');
if (result.success) {
  console.log(`Authenticated as ${result.user?.login}`);
  console.log(`Token: ${result.token}`);
}
```

## GitHub App Setup

### Creating the GitHub App

1. Visit https://github.com/settings/apps/new
2. Use the manifest at `github/app/manifest.yml`
3. Configure OAuth callback URL
4. Enable webhooks for sponsorship events
5. Generate and store client secret

### Required Permissions

- **User permissions**: `emails:read`
- **OAuth scopes**: `read:user`, `user:email`
- **Webhook events**: `sponsorship`, `marketplace_purchase`

### Environment Variables

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Praxis Cloud
PRAXIS_RELAY_ENDPOINT=https://praxis-relay.azurewebsites.net
PRAXIS_APP_ID=your_app_id
```

## GitHub Sponsors Integration

### Setting Up Sponsors Tiers

1. Enable GitHub Sponsors for your organization
2. Create tiers matching Praxis pricing:
   - Solo: $5/month
   - Team: $20/month
   - Enterprise: $50/month
3. Configure webhook to notify relay service

### Checking Subscription Status

```typescript
import { createSponsorsClient } from '@plures/praxis/cloud';

const client = createSponsorsClient(githubToken);
const subscription = await client.getSubscription('username');

console.log(`Tier: ${subscription.tier}`);
console.log(`Status: ${subscription.status}`);
```

### Handling Sponsorship Events

Webhook payload example:

```json
{
  "action": "created",
  "sponsorship": {
    "sponsor": {
      "login": "username",
      "id": 12345
    },
    "tier": {
      "name": "Solo",
      "monthly_price_in_cents": 500
    }
  }
}
```

## GitHub Marketplace Integration (Preparatory)

### Marketplace Plans

Plans are pre-configured in `src/cloud/marketplace.ts`:

- **Praxis Cloud Solo**: $5/month or $50/year
- **Praxis Cloud Team**: $20/month or $200/year
- **Praxis Cloud Enterprise**: $50/month or $500/year

### Marketplace Listing

See `github/marketplace/` for listing templates and screenshots.

### Webhook Handler

```typescript
import { createMarketplaceClient } from '@plures/praxis/cloud';

const client = createMarketplaceClient(githubToken);

// Handle webhook event
app.post('/webhook/marketplace', (req, res) => {
  const event = req.body;
  const result = client.handleWebhookEvent(event);

  if (result) {
    // Provision or update tenant
    console.log(`User ${result.userLogin} subscribed to ${result.subscription.tier}`);
  }

  res.status(200).send('OK');
});
```

## Auto-Provisioning

### Tenant Creation

When a user authenticates, a tenant is automatically provisioned:

```typescript
import { provisionTenant, createTenant } from '@plures/praxis/cloud';

const result = await provisionTenant(githubUser, subscription);

if (result.success) {
  console.log(`Tenant ID: ${result.tenant.id}`);
  console.log(`Storage: ${result.tenant.storageNamespace}`);
}
```

### Storage Namespace

Storage namespaces follow Azure Blob Storage naming rules:

- Format: `gh-{username}-{hash}`
- Example: `gh-testuser-0009ix`
- Lowercase, alphanumeric, hyphens only
- 3-63 characters

### Access Control

Access to cloud features is controlled by subscription tier:

```typescript
import { hasAccessToTier, SubscriptionTier } from '@plures/praxis/cloud';

if (hasAccessToTier(subscription, SubscriptionTier.TEAM)) {
  // Allow team features
}
```

## Usage Tracking

### Checking Usage

```bash
praxis cloud usage
```

Output:

```
App ID: my-app

Metrics:
  Total Syncs: 1,234
  Events Forwarded: 5,678
  Facts Synced: 12,345
  Storage Used: 45.67 KB

Period: 720.0 hours
```

### Enforcing Limits

```typescript
import { checkUsageLimits } from '@plures/praxis/cloud';

const result = checkUsageLimits(subscription, {
  syncCount: 1500,
  storageBytes: 15 * 1024 * 1024,
  teamMembers: 1,
  appCount: 2,
});

if (!result.withinLimits) {
  console.error('Usage limits exceeded:');
  result.violations.forEach((v) => console.error(`  - ${v}`));
}
```

## Security

### Token Storage

Authentication tokens are stored securely:

- **Location**: `~/.praxis/auth.json`
- **Permissions**: `0600` (owner read/write only)
- **Contents**: Encrypted in production

### Best Practices

1. **Never commit tokens** to source control
2. **Rotate tokens regularly**
3. **Use environment variables** for CI/CD
4. **Revoke tokens** when no longer needed
5. **Use GitHub App tokens** for production services

## Development

### Local Testing

```bash
# Set up test environment
export GITHUB_CLIENT_ID=your_test_client_id
export GITHUB_TOKEN=ghp_test_token

# Run tests
npm test

# Test CLI commands
npm run build
node dist/cli/index.js login
```

### Mocking GitHub API

For tests, use mock responses:

```typescript
// Mock GitHub API
vi.mock('../cloud/sponsors.js', () => ({
  createSponsorsClient: vi.fn(() => ({
    getSubscription: vi.fn(async () => ({
      tier: SubscriptionTier.SOLO,
      status: SubscriptionStatus.ACTIVE,
      // ...
    })),
  })),
}));
```

## Troubleshooting

### "Not authenticated" Error

```bash
# Re-authenticate
praxis logout
praxis login
```

### "Token expired" Error

```bash
# Refresh authentication
praxis login
```

### "Usage limits exceeded" Error

Check your current usage:

```bash
praxis cloud usage
```

Upgrade your tier:

```bash
# Visit GitHub Sponsors
open https://github.com/sponsors/plures
```

## Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps)
- [GitHub Sponsors API](https://docs.github.com/en/graphql/reference/objects#sponsor)
- [GitHub Marketplace](https://docs.github.com/en/apps/github-marketplace)
- [Azure Blob Storage](https://docs.microsoft.com/en-us/azure/storage/blobs/)

## Support

For billing or subscription issues:

- **GitHub Sponsors**: Contact via GitHub
- **Enterprise**: Email enterprise@plures.dev
- **Community**: https://github.com/plures/praxis/discussions
