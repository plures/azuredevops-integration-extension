import WebSocket from 'ws';
import { componentLogger, LogEntry, Component } from './ComponentLogger.js';
import { eventHandlers } from '../stores/eventHandlers.js';

export class LiveCanvasBridge {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDisposed = false;
  private readonly url = 'ws://localhost:3001';
  private dispatcher: (event: any) => void;

  constructor(dispatcher: (event: any) => void) {
    this.dispatcher = dispatcher;
    this.connect();
    componentLogger.onLogEntry(this.handleLogEntry.bind(this));
  }

  private connect() {
    if (this.isDisposed) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        // Connected to Live Canvas - send inspection data
        this.sendLogicInspection();
      });

      this.ws.on('error', (_err) => {
        // Silent error to avoid spamming console if canvas isn't running
        // console.debug('[LiveCanvasBridge] Connection error', err);
      });

      this.ws.on('close', () => {
        this.ws = null;
        if (!this.isDisposed) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'TRIGGER_EVENT') {
            this.handleTriggerEvent(msg);
          }
        } catch (e) {
          // Silently ignore parse errors
        }
      });
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  private handleLogEntry(entry: LogEntry) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    if (entry.message.startsWith('Event:')) {
      this.sendFsmEvent(entry);
    } else if (entry.message.startsWith('State transition:')) {
      this.sendStateChange(entry);
    } else {
      this.sendLogEntry(entry);
    }
  }

  private sendFsmEvent(entry: LogEntry) {
    this.send({
      type: 'FSM_EVENT',
      event: entry.context?.event || 'unknown',
      payload: entry.data,
    });
  }

  private sendStateChange(entry: LogEntry) {
    this.send({
      type: 'FSM_STATE_CHANGE',
      from: entry.message.split('→')[0].replace('State transition:', '').trim(),
      to: entry.context?.state || 'unknown',
      machine: entry.context?.machineId || entry.component,
    });
  }

  private sendLogEntry(entry: LogEntry) {
    this.send({
      type: 'LOG_ENTRY',
      level: entry.level,
      component: entry.component,
      message: entry.message,
    });
  }

  private handleTriggerEvent(msg: any) {
    componentLogger.info(
      Component.APPLICATION,
      `Received remote trigger: ${msg.event}`,
      undefined,
      msg.payload
    );

    if (this.dispatcher) {
      this.dispatcher({
        type: msg.event,
        ...msg.payload,
      });
    }
  }

  private send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private sendLogicInspection() {
    const inspection = Object.entries(eventHandlers).map(([type, handler]) => {
      const code = handler.toString();
      // Simple heuristic to detect empty/trivial handlers
      // Remove comments and whitespace
      const cleanCode = code
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s/g, '');

      // Check for empty body
      // Arrow functions: () => {} -> clean: ()=>{ }
      // Function expressions: function() {} -> clean: function(){}
      const isUnhandled =
        cleanCode.endsWith('{}') ||
        cleanCode.endsWith('{return;}') ||
        cleanCode.endsWith('{returnundefined;}');

      return {
        type,
        status: isUnhandled ? 'unhandled' : 'handled',
        snippet: code.length > 100 ? code.substring(0, 100) + '...' : code,
      };
    });

    this.send({
      type: 'LOGIC_INSPECTION',
      events: inspection,
    });
  }

  public dispose() {
    this.isDisposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
