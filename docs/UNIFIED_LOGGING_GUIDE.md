# Unified Logging System Guide

## Overview

The Azure DevOps Integration extension uses a **unified emoji-based logging system** that consolidates all extension logging into the **VS Code Debug Console**. This provides developers with a single source of truth for debugging and monitoring extension behavior.

## 🎯 **Quick Start: Finding Logs**

1. **Open Debug Console:** `View` → `Debug Console` (or `Ctrl+Shift+Y`)
2. **Look for Emoji Indicators:** All extension logs use distinctive emoji prefixes
3. **Filter by Category:** Use emoji indicators to quickly identify log types

## 🔍 **Emoji-Based Log Categories**

### **🔴 ERROR - Critical Issues**
```
🔴 [AzureDevOpsInt][FSM][APPLICATION] Authentication failed for connection: xyz
🔴 [WEBVIEW][ERR] Failed to load work items: Network timeout
```
- **When to Look:** Extension not working, crashes, or user-facing errors
- **Action Required:** Immediate attention needed

### **🟡 WARN - Important Notices**  
```
🟡 [AzureDevOpsInt][FSM][TIMER] Timer exceeded limit (3.5h), stopping automatically
🟡 [WEBVIEW][WARN] Deprecated API call detected
```
- **When to Look:** Unexpected behavior or potential issues
- **Action Suggested:** Review configuration or usage patterns

### **🔵 INFO - General Information**
```
🔵 [WEBVIEW][LOG] [webview] Azure DevOps Integration v1.10.0 - Console bridge active
🔵 [WEBVIEW][LOG] [reactive-main] Application initialized with Universal Reactivity
```
- **When to Look:** Understanding normal operation flow
- **Use Case:** Debugging initialization, state changes, user actions

### **🟢 SUCCESS - Positive Confirmations**
```
🟢 [AzureDevOpsInt][FSM][APPLICATION] Application FSM started successfully
🟢 [AzureDevOpsInt][FSM][CONNECTION] Connection authenticated successfully
```
- **When to Look:** Confirming operations completed correctly
- **Use Case:** Validation that setup/actions worked as expected

## 📊 **Logging Sources**

### **1. Extension Host Logs**
- **Source:** Main extension process (`src/activation.ts`, FSM managers)
- **Prefix:** `[AzureDevOpsInt][FSM][APPLICATION]`, `[AzureDevOpsInt][FSM][TIMER]`, `[AzureDevOpsInt][FSM][CONNECTION]`
- **Contains:** State machine transitions, connection management, timer operations

### **2. Webview Logs**  
- **Source:** Webview UI process (`src/webview/*.ts`)
- **Prefix:** `🔵 [WEBVIEW][LOG]`
- **Contains:** UI interactions, reactive state changes, user actions

### **3. Authentication Logs**
- **Source:** Auth providers (`src/auth/*.ts`)
- **Prefix:** `[EntraAuthProvider]`, `[TokenLifecycle]`
- **Contains:** Authentication flows, token management, session handling

## 🛠 **Developer Usage Patterns**

### **Debugging Extension Activation**
```bash
# Look for this sequence in Debug Console:
🚀 Activation starting with FSM architecture...
🟢 [AzureDevOpsInt][FSM][APPLICATION] Application FSM started successfully
🔍 [WEBVIEW_RESOLVE] resolveWebviewView called!
```

### **Debugging Connection Issues**
```bash
# Check for authentication and connection setup:
🟢 [AzureDevOpsInt][FSM][CONNECTION] ConnectionFSMManager created
[EntraAuthProvider] No cached account found for connection: xxx
🔍 [UPDATE_CONNECTIONS_STORE] Connections update message sent successfully!
```

### **Debugging Webview Reactivity**
```bash
# Look for reactive state updates:
🔵 [WEBVIEW][LOG] [webview-fsm] Connections updated: 2 active: xxx
🔵 [WEBVIEW][LOG] [store] hasConnections() called with reactive count: 2
```

## 🔧 **Advanced Debugging**

### **Enable Detailed FSM Logging**
1. Run command: `Azure DevOps: Show FSM Logs`
2. Look for detailed state transitions:
   ```
   🟢 [AzureDevOpsInt][FSM][APPLICATION] State transition: unknown → {"active":{"ready":"data_loading"}}
   ```

### **Filter Logs by Component**
Use VS Code Debug Console search:
- `[AzureDevOpsInt][FSM][APPLICATION]` - Application state machine
- `[AzureDevOpsInt][FSM][TIMER]` - Timer management  
- `[AzureDevOpsInt][FSM][CONNECTION]` - Connection handling
- `[WEBVIEW][LOG]` - UI component logs
- `[webview-fsm]` - Webview state management

### **Common Debugging Scenarios**

#### **"Extension Not Loading"**
Look for:
```bash
🚀 Activation starting with FSM architecture...
✅ Application FSM started successfully
```
If missing, check for 🔴 error messages during activation.

#### **"Webview Not Showing Data"**
Look for:
```bash
🔍 [WEBVIEW_RESOLVE] Connections to send: 2
🔍 [UPDATE_CONNECTIONS_STORE] Connections update message sent successfully!
🔵 [WEBVIEW][LOG] [webview-fsm] Connections updated: 2
```

#### **"Timer Not Working"**
Look for:
```bash
🟢 [AzureDevOpsInt][FSM][TIMER] FSM Manager started successfully
[ApplicationFSM] Timer actor initialized
```

## 📋 **Log Message Structure**

### **Standard Format:**
```
{emoji} [{source}][{component}] {timestamp} {level} [{category}] {message}
```

### **Examples:**
```bash
# FSM State Machine Log
🟢 [AzureDevOpsInt][FSM][APPLICATION] 2025-10-17T01:11:56.333Z INFO [APPLICATION] Application FSM started successfully

# Webview Component Log  
🔵 [WEBVIEW][LOG] [reactive-main] Application initialized with Universal Reactivity

# Context Manager Log
[ContextManager] Applying action: addConnection (1) [{…}]
```

## 🚨 **Troubleshooting Guide**

### **No Logs Appearing**
1. Ensure Debug Console is open (`Ctrl+Shift+Y`)
2. Check if extension is active (look for activation logs)
3. Try reloading window (`Ctrl+Shift+P` → "Developer: Reload Window")

### **Too Many Logs**
1. Use Debug Console search/filter functionality
2. Focus on emoji categories (🔴 for errors, 🟡 for warnings)
3. Look for specific component prefixes

### **Missing Context**
1. Run `Azure DevOps: Show FSM Status` for current state
2. Check for recent state transitions in FSM logs
3. Look for connection-specific logs with connection IDs

## 💡 **Best Practices**

### **For Users:**
- Always check Debug Console first when reporting issues
- Include relevant emoji-prefixed logs in bug reports
- Use search functionality to filter relevant timeframes

### **For Developers:**
- All new logging should use emoji prefixes
- Include context (connection IDs, state names) in log messages
- Use appropriate log levels (🔴/🟡/🔵/🟢)
- Ensure webview logs bridge to extension console

## 🔗 **Related Commands**

- `Azure DevOps: Open Logs` - Opens Debug Console
- `Azure DevOps: Copy Logs to Clipboard` - Exports recent logs
- `Azure DevOps: Show FSM Status` - Current state machine status
- `Azure DevOps: Show FSM Logs` - Detailed FSM debugging

## 📝 **Implementation Details**

The unified logging system is implemented through:

1. **FSMLogger** (`src/services/FSMLogger.ts`) - Central logging with emoji output
2. **Webview Console Bridge** (`src/activation.ts`) - Bridges webview logs to extension
3. **Enhanced Console Messages** - Consistent emoji prefixes across components

This architecture ensures all logging flows through the VS Code Debug Console with consistent formatting and categorization.