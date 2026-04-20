# Orchestration with DSC/MCP

Praxis provides built-in support for orchestrating distributed systems using Desired State Configuration (DSC) and Model Context Protocol (MCP).

## Overview

Praxis orchestration enables:

- **Multi-Node Coordination**: Manage distributed application instances
- **State Synchronization**: Keep distributed state consistent
- **Health Monitoring**: Automatic health checks and recovery
- **Auto-Scaling**: Dynamic node provisioning
- **Configuration Management**: Centralized DSC management
- **Self-Healing**: Automatic failure detection and recovery

## Core Concepts

### Desired State Configuration (DSC)

DSC defines the desired state of your distributed system:

- Node configurations
- Service dependencies
- Resource allocation
- Network topology
- Security policies

### Model Context Protocol (MCP)

MCP enables:

- Inter-node communication
- State distribution
- Event propagation
- Consensus mechanisms

## Getting Started

### Enable Orchestration

In your schema:

```typescript
export const appSchema: PraxisSchema = {
  // ... other schema config

  orchestration: {
    type: 'dsc',
    nodes: [
      {
        id: 'primary',
        type: 'primary',
        config: {
          host: 'localhost',
          port: 8080,
          role: 'primary',
        },
      },
      {
        id: 'replica-1',
        type: 'replica',
        config: {
          host: 'localhost',
          port: 8081,
          role: 'replica',
          replicateFrom: 'primary',
        },
      },
    ],
    sync: {
      interval: 5000,
      conflictResolution: 'last-write-wins',
      targets: ['primary', 'replica-1'],
    },
    health: {
      interval: 30000,
      endpoints: ['/health', '/metrics'],
      timeout: 5000,
    },
  },
};
```

### Launch Orchestration

```bash
praxis orchestrate --config src/schemas/app.schema.ts
```

## Node Types

### Primary Node

Main coordinator node:

- Accepts write operations
- Coordinates state distribution
- Manages replica health
- Handles failover

### Replica Node

Read-replica node:

- Receives state updates from primary
- Serves read operations
- Can become primary on failover
- Maintains local cache

### Worker Node

Processing node:

- Executes background jobs
- Processes queued tasks
- Reports status to primary
- Auto-scales based on load

### Gateway Node

Entry point node:

- Load balancing
- Request routing
- Authentication
- Rate limiting

## Configuration

### DSC Configuration File

Create `orchestration/dsc.config.ts`:

```typescript
import type { OrchestrationConfig } from '@plures/praxis/orchestration';

export const dscConfig: OrchestrationConfig = {
  // Cluster configuration
  cluster: {
    name: 'my-praxis-cluster',
    region: 'us-east-1',
    nodes: {
      primary: 1,
      replica: 2,
      worker: 3,
      gateway: 1,
    },
  },

  // Node configuration
  nodeDefaults: {
    memory: '512MB',
    cpu: '0.5',
    disk: '10GB',
    network: 'private',
  },

  // State sync configuration
  sync: {
    protocol: 'websocket',
    interval: 5000,
    batchSize: 100,
    compression: true,
    encryption: true,
    conflictResolution: {
      strategy: 'last-write-wins',
      customResolver: './resolvers/custom.ts',
    },
  },

  // Health monitoring
  health: {
    checkInterval: 30000,
    timeout: 5000,
    retries: 3,
    endpoints: {
      liveness: '/health/live',
      readiness: '/health/ready',
      metrics: '/metrics',
    },
    alerts: {
      email: ['ops@example.com'],
      slack: 'https://hooks.slack.com/...',
    },
  },

  // Auto-scaling
  scaling: {
    enabled: true,
    metrics: ['cpu', 'memory', 'requests'],
    rules: [
      {
        metric: 'cpu',
        threshold: 80,
        action: 'scale-up',
        cooldown: 300000,
      },
      {
        metric: 'requests',
        threshold: 1000,
        action: 'scale-up',
        cooldown: 300000,
      },
    ],
    limits: {
      minNodes: 2,
      maxNodes: 10,
    },
  },

  // Service discovery
  discovery: {
    enabled: true,
    protocol: 'consul',
    ttl: 60000,
    tags: ['praxis', 'production'],
  },

  // Load balancing
  loadBalancing: {
    strategy: 'round-robin', // 'round-robin' | 'least-conn' | 'ip-hash'
    stickySession: true,
    healthCheck: true,
  },
};
```

## State Synchronization

### Sync Strategies

**Last-Write-Wins**:

```typescript
conflictResolution: 'last-write-wins';
```

**Merge Strategy**:

```typescript
conflictResolution: 'merge';
```

**Custom Resolver**:

```typescript
conflictResolution: {
  strategy: 'custom',
  resolver: (local, remote) => {
    // Custom merge logic
    return merged;
  },
}
```

### Event Distribution

Events are automatically distributed to all nodes:

```typescript
// Node A dispatches event
engine.step([LoginEvent.create({ userId: 'user123' })]);

// Event propagates to all nodes via MCP
// Each node applies the event to its local state
```

### State Queries

Query distributed state:

```typescript
// Query primary node
const state = await orchestrator.getState('primary');

// Query all nodes
const allStates = await orchestrator.getAllStates();

// Query with filter
const activeNodes = await orchestrator.getStates({
  role: 'replica',
  status: 'active',
});
```

## Health Monitoring

### Health Checks

Define health check endpoints:

```typescript
// src/orchestration/health.ts
export const healthChecks = {
  liveness: async () => {
    // Check if node is alive
    return { status: 'ok' };
  },

  readiness: async () => {
    // Check if node is ready to serve requests
    const dbReady = await checkDatabase();
    const cacheReady = await checkCache();

    return {
      status: dbReady && cacheReady ? 'ok' : 'not-ready',
      details: { database: dbReady, cache: cacheReady },
    };
  },

  metrics: async () => {
    // Return metrics
    return {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      requests: requestCounter.count,
    };
  },
};
```

### Failure Detection

Automatic failure detection:

- Heartbeat monitoring
- Health check failures
- Network partition detection
- Resource exhaustion alerts

### Recovery Actions

Configured recovery actions:

- **Restart**: Restart failed node
- **Failover**: Promote replica to primary
- **Scale**: Add new nodes
- **Alert**: Notify operations team

## Auto-Scaling

### Scaling Rules

Define when to scale:

```typescript
scaling: {
  rules: [
    {
      name: 'high-cpu',
      metric: 'cpu',
      threshold: 80,
      duration: 60000, // sustained for 1 minute
      action: 'scale-up',
      amount: 1, // add 1 node
    },
    {
      name: 'low-load',
      metric: 'requests',
      threshold: 100,
      duration: 300000, // sustained for 5 minutes
      action: 'scale-down',
      amount: 1, // remove 1 node
    },
  ],
}
```

### Manual Scaling

Scale via CLI:

```bash
# Scale up
praxis orchestrate scale up --nodes 2

# Scale down
praxis orchestrate scale down --nodes 1

# Set exact count
praxis orchestrate scale set --nodes 5
```

## Example: Self-Healing System

### Configuration

```typescript
const selfHealingConfig = {
  health: {
    checkInterval: 10000,
    failureThreshold: 3,
    recoveryActions: [
      {
        condition: 'node-unhealthy',
        action: 'restart',
        maxRetries: 3,
      },
      {
        condition: 'restart-failed',
        action: 'failover',
      },
      {
        condition: 'primary-failed',
        action: 'promote-replica',
        targetRole: 'primary',
      },
    ],
  },
};
```

### Monitoring

```bash
# Monitor cluster status
praxis orchestrate status

# Watch health in real-time
praxis orchestrate health --watch

# View node details
praxis orchestrate node info primary
```

## Integration with Praxis Logic

### Distributed Events

Events propagate across nodes:

```typescript
// Define distributed event
const UserLoginEvent = defineEvent<'USER_LOGIN', { userId: string }>('USER_LOGIN');

// Dispatch on any node
engine.step([UserLoginEvent.create({ userId: 'user123' })]);

// Event automatically propagates to all nodes
// Each node processes the event with its local logic
```

### Distributed Facts

Facts are synchronized across nodes:

```typescript
// Primary node creates fact
const fact = UserLoggedIn.create({ userId: 'user123', nodeId: 'primary' });

// Fact syncs to all replicas
// Replicas can query the fact locally
```

### Distributed Constraints

Constraints can be enforced cluster-wide:

```typescript
const maxUsersConstraint = defineConstraint({
  id: 'max-users-global',
  description: 'Maximum 10000 active users cluster-wide',
  impl: async (state) => {
    // Query all nodes for user count
    const totalUsers = await orchestrator.aggregateMetric('active-users');
    return totalUsers <= 10000;
  },
});
```

## Production Deployment

### Container Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY dist ./dist
COPY orchestration ./orchestration

CMD ["praxis", "orchestrate", "--config", "orchestration/dsc.config.ts"]
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: praxis-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: praxis-app
  template:
    metadata:
      labels:
        app: praxis-app
    spec:
      containers:
        - name: praxis
          image: my-praxis-app:latest
          ports:
            - containerPort: 8080
          env:
            - name: NODE_TYPE
              value: 'replica'
            - name: PRIMARY_HOST
              value: 'praxis-primary'
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
```

## Monitoring & Observability

### Metrics

Collect cluster metrics:

- Request rate per node
- State sync latency
- Health check status
- Resource usage
- Event throughput

### Logging

Centralized logging:

```typescript
orchestration: {
  logging: {
    level: 'info',
    format: 'json',
    outputs: [
      { type: 'console' },
      { type: 'file', path: '/var/log/praxis.log' },
      { type: 'elasticsearch', url: 'http://elastic:9200' },
    ],
  },
}
```

### Tracing

Distributed tracing with OpenTelemetry:

```typescript
orchestration: {
  tracing: {
    enabled: true,
    serviceName: 'praxis-app',
    exporter: 'jaeger',
    endpoint: 'http://jaeger:14268/api/traces',
  },
}
```

## Troubleshooting

### Split Brain

Detect and resolve split brain:

```bash
praxis orchestrate diagnose split-brain
praxis orchestrate resolve split-brain --strategy quorum
```

### Network Partition

Handle network partitions:

```typescript
sync: {
  partitionTolerance: {
    strategy: 'availability', // or 'consistency'
    timeout: 30000,
  },
}
```

### State Divergence

Reconcile diverged state:

```bash
praxis orchestrate reconcile --force
```

## Best Practices

1. **Start Small**: Begin with 2-3 nodes
2. **Monitor Everything**: Enable comprehensive monitoring
3. **Test Failures**: Practice failover scenarios
4. **Document Topology**: Keep network diagrams updated
5. **Automate Recovery**: Configure self-healing
6. **Version Carefully**: Coordinate version upgrades
7. **Backup State**: Regular state snapshots
8. **Secure Communication**: Use TLS for node communication

## Next Steps

- Review orchestration examples
- Test failover scenarios
- Configure monitoring
- Set up alerts
- Plan capacity
- Document runbooks

## Resources

- [Orchestration Examples](../../examples/orchestration/)
- [DSC Reference](../api/dsc.md)
- [MCP Protocol](../api/mcp.md)
- [Production Guide](./production.md)

Build resilient, distributed applications with Praxis orchestration! 🌐
