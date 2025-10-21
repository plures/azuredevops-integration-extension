/**
 * Webview-specific FSM Types
 * 
 * These types are safe for browser use and don't import Node.js modules.
 * They provide the interface between webview and the FSM system.
 */

// Re-export webview-safe types from the local webview types
export type {
  WorkItem,
  Connection
} from './types.js';

// Import types for use in interfaces
import type { WorkItem, Connection } from './types.js';

// Define webview-safe FSM types without importing from ../fsm/types
export interface FSMSnapshot {
  value: string;
  context: ApplicationContext;
  can: (eventType: string) => boolean;
  matches?: (state: string) => boolean;
}

export interface ApplicationContext {
  connectionId?: string;
  isInitialized: boolean;
  connections?: Connection[];
  activeConnectionId?: string;
  workItemsByConnection?: Map<string, WorkItem[]>;
  timerActor?: any;
  loadingStates?: Map<string, boolean>;
  pendingAuthReminders?: Map<string, any>;
}

export interface FSMActions {
  startConnection: (payload?: any) => void;
  stopConnection: () => void;
  loadWorkItems: (connId?: string, query?: any) => void;
  startTimer: (workItemId?: string | number, title?: string) => void;
  [key: string]: (payload?: any) => void;
}

export interface Selectors {
  [key: string]: any;
}

export interface DebugInterface {
  [key: string]: any;
}

// Webview-specific simplified context (no vscode objects)
export interface WebviewContext {
  connectionId?: string;
  isInitialized: boolean;
  workItems: WorkItem[];
  activeConnection?: Connection;
}

// Safe FSM state interface for webview
export interface WebviewFSMState {
  value: string;
  context: WebviewContext;
  can: (eventType: string) => boolean;
}

// Message types for webview <-> extension communication
export interface WebviewMessage {
  type: string;
  payload?: any;
  id?: string;
}

export interface ExtensionMessage {
  type: string;
  payload?: any;
  id?: string;
}