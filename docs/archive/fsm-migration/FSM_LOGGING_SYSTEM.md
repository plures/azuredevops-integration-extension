# 🎯 FSM-Integrated Logging System

## Overview

A comprehensive, production-ready logging system specifically designed for FSM architecture with configurable levels, component filtering, and runtime management.

## Features

### ✅ **Configurable Log Levels**

- `DEBUG`: Detailed debugging information
- `INFO`: General informational messages
- `WARN`: Warning conditions
- `ERROR`: Error conditions
- `OFF`: Disable logging

### ✅ **FSM Component Filtering**

- `APPLICATION`: Application-wide FSM orchestration
- `CONNECTION`: Connection management and authentication
- `TIMER`: Timer FSM and time tracking
- `WEBVIEW`: Webview UI and messaging
- `AUTH`: Authentication flows and token management
- `DATA`: Data synchronization and caching
- `ADAPTER`: Legacy compatibility adapters
- `MACHINE`: Individual state machine transitions

### ✅ **Multiple Output Destinations**

- **Console**: Developer console (DevTools)
- **Output Channel**: VS Code Output Channel
- **File**: Log file output (future feature)

### ✅ **FSM Context Tracking**

- State transitions with from/to states
- Event tracking with machine context
- Connection ID and instance tracking
- Machine ID identification
- Timestamp and stack trace support

## Usage Examples

### Basic Logging

```typescript
import { createComponentLogger, FSMComponent } from './fsm/logging/FSMLogger.js';

const logger = createComponentLogger(FSMComponent.CONNECTION, 'MyConnectionManager');

logger.info('Connection established', { connectionId: 'conn-123' });
logger.warn('Connection timeout detected', { connectionId: 'conn-123', timeout: 30000 });
logger.error('Authentication failed', { connectionId: 'conn-123' }, { reason: 'Invalid PAT' });
```

### FSM-Specific Logging

```typescript
// State transitions
logger.logStateTransition('disconnected', 'authenticating', 'CONNECT', 'connectionMachine');

// Events
logger.logEvent('AUTH_SUCCESS', 'authenticating', 'connectionMachine', { tokenType: 'PAT' });

// Errors
logger.logError(new Error('Connection failed'), 'connecting', 'connectionMachine');
```

### Global Logger Access

```typescript
import { fsmLogger, FSMComponent } from './fsm/logging/FSMLogger.js';

fsmLogger.info(FSMComponent.APPLICATION, 'Extension activated');
fsmLogger.debug(FSMComponent.TIMER, 'Timer state updated', { state: 'running' });
```

## Configuration Management

### VS Code Settings Integration

All logging configuration is stored in VS Code settings and can be changed at runtime:

```json
{
  "azureDevOpsIntegration.logging.enabled": true,
  "azureDevOpsIntegration.logging.level": "INFO",
  "azureDevOpsIntegration.logging.components": {
    "APPLICATION": true,
    "CONNECTION": true,
    "TIMER": true,
    "WEBVIEW": false,
    "AUTH": true,
    "DATA": false,
    "ADAPTER": false,
    "MACHINE": false
  },
  "azureDevOpsIntegration.logging.destinations": {
    "console": true,
    "outputChannel": true,
    "file": false
  }
}
```

### Runtime Configuration

```typescript
import { fsmLogger } from './fsm/logging/FSMLogger.js';

// Change log level
fsmLogger.updateConfiguration({ level: LogLevel.DEBUG });

// Enable specific components
fsmLogger.updateConfiguration({
  components: { APPLICATION: true, MACHINE: true },
});

// Change output destinations
fsmLogger.updateConfiguration({
  destinations: { console: false, outputChannel: true },
});
```

## Commands & UI

### Available Commands

- **`Azure DevOps Int (Debug): Configure FSM Logging`**: Interactive logging configuration
- **`Azure DevOps Int (Debug): Show FSM Logs`**: Open FSM logs output channel

### Configuration UI Features

1. **Log Level Selection**: Quick pick for minimum log level
2. **Component Filtering**: Multi-select for FSM components
3. **Output Destinations**: Configure where logs are sent
4. **Log Export**: Copy all logs to clipboard
5. **Log Statistics**: View logging stats and buffer status
6. **Clear Buffer**: Clear all cached log entries

## Integration Examples

### ApplicationFSMManager

```typescript
export class ApplicationFSMManager {
  private logger = createComponentLogger(FSMComponent.APPLICATION, 'ApplicationFSM');

  async start(): Promise<void> {
    this.logger.info('Starting application state machine...');

    this.appActor.subscribe((state) => {
      this.logger.logStateTransition(
        'unknown',
        typeof state.value === 'string' ? state.value : JSON.stringify(state.value),
        'STATE_CHANGE',
        'applicationMachine'
      );
    });

    this.logger.info('Application FSM started successfully');
  }
}
```

### ConnectionAdapter

```typescript
export class ConnectionAdapter {
  private logger = createComponentLogger(FSMComponent.ADAPTER, 'ConnectionAdapter');

  setUseFSM(enabled: boolean): void {
    this.useFSM = enabled;
    this.logger.info(`FSM ${enabled ? 'enabled' : 'disabled'}`);
  }

  private async ensureActiveConnectionFSM(): Promise<any> {
    this.logger.info('FSM connection requested', { connectionId }, { options });
    // ... implementation
  }
}
```

## Performance Optimizations

- **Lazy Initialization**: Logger only initializes when first used
- **Level Filtering**: Messages below minimum level are not processed
- **Component Filtering**: Disabled components produce no overhead
- **Buffer Management**: Automatic buffer size management with configurable limits
- **Async Operations**: Non-blocking log operations

## Output Format

### Formatted Log Example

```
2025-10-15T10:30:45.123Z INFO  [APPLICATION] {id:ApplicationFSM, state:active, machine:applicationMachine} Application FSM started successfully
2025-10-15T10:30:45.125Z DEBUG [CONNECTION]  {conn:c5a2c7bf-2248-476c-82f1-bcf94b1a0e55, state:authenticating, event:CONNECT} FSM connection requested
  Data: {
    "connectionId": "c5a2c7bf-2248-476c-82f1-bcf94b1a0e55",
    "options": { "refresh": true }
  }
2025-10-15T10:30:45.127Z WARN  [CONNECTION]  {conn:c5a2c7bf-2248-476c-82f1-bcf94b1a0e55, state:auth_failed} Connection authentication failed
2025-10-15T10:30:45.128Z ERROR [CONNECTION]  {conn:c5a2c7bf-2248-476c-82f1-bcf94b1a0e55} FSM Error: PAT not found in secrets
```

## Migration Benefits

### Replaced Manual Console Logs

Instead of scattered `console.log()` statements throughout FSM components, we now have:

- **Structured logging** with consistent format
- **Contextual information** automatically included
- **Runtime configurability** without code changes
- **Component-specific filtering** for targeted debugging
- **Professional output formatting** with timestamps and context
- **Buffer management** for log history and export
- **Performance optimization** with smart filtering

### No Legacy Code Changes

The logging system is completely isolated to FSM components and doesn't touch any existing legacy code paths, ensuring:

- **Zero regression risk** for existing functionality
- **Clean separation** between FSM and legacy logging
- **Gradual adoption** as FSM components are enhanced
- **Backward compatibility** with existing debug patterns

---

## Result: Production-Ready FSM Logging

The extension now has a **comprehensive, configurable logging system** that:

✅ **Eliminates ad-hoc debug console.log statements**  
✅ **Provides structured, contextual logging for all FSM components**  
✅ **Supports runtime configuration without code changes**  
✅ **Offers professional debugging and troubleshooting capabilities**  
✅ **Maintains zero impact on legacy code paths**  
✅ **Enables efficient development and production debugging**

The logging system is fully integrated with the FSM architecture and ready for production use! 🎯
