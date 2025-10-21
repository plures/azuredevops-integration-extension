import type * as vscode from 'vscode';

type RegisterAllCommandsFn = (context: vscode.ExtensionContext) => void | Promise<void>;
type ForwardProviderMessageFn = (connectionId: string, message: unknown) => void;
type GetSecretPATFn = (
  context: vscode.ExtensionContext,
  connectionId?: string
) => Promise<string | undefined>;
type LoadedConnectionsReader = () => unknown[];
type ActiveConnectionIdReader = () => string | null | undefined;
type ApplicationActorAccessor = () => unknown;
type ApplicationEventDispatcher = (event: unknown) => void;
type WebviewMessageHandler = (message: unknown) => void | Promise<void>;
export type ActiveConnectionHandlerOptions = {
  refresh?: boolean;
  notify?: boolean;
  interactive?: boolean;
};

type ActiveConnectionHandler = (
  connectionId: string,
  options?: ActiveConnectionHandlerOptions
) => unknown | Promise<unknown>;

let extensionContextRef: vscode.ExtensionContext | undefined;
let registerAllCommandsFn: RegisterAllCommandsFn | undefined;
let forwardProviderMessageFn: ForwardProviderMessageFn | undefined;
let getSecretPATFn: GetSecretPATFn | undefined;
let loadedConnectionsReader: LoadedConnectionsReader = () => [];
let activeConnectionIdReader: ActiveConnectionIdReader = () => null;
let applicationActorAccessor: ApplicationActorAccessor | undefined;
let applicationEventDispatcher: ApplicationEventDispatcher | undefined;
let webviewMessageHandler: WebviewMessageHandler | undefined;
let activeConnectionHandler: ActiveConnectionHandler | undefined;

export function setExtensionContextRef(context: vscode.ExtensionContext): void {
  extensionContextRef = context;
  // Preserve legacy global for existing helpers that access extension context via global scope
  (globalThis as any).extensionContext = context;
}

export function getExtensionContextRef(): vscode.ExtensionContext | undefined {
  return extensionContextRef;
}

export function setRegisterAllCommands(fn: RegisterAllCommandsFn): void {
  registerAllCommandsFn = fn;
}

export async function invokeRegisterAllCommands(context: vscode.ExtensionContext): Promise<void> {
  if (!registerAllCommandsFn) {
    return;
  }
  await registerAllCommandsFn(context);
}

export function setForwardProviderMessage(fn: ForwardProviderMessageFn): void {
  forwardProviderMessageFn = fn;
}

export function forwardProviderMessage(connectionId: string, message: unknown): void {
  if (!forwardProviderMessageFn) {
    return;
  }
  forwardProviderMessageFn(connectionId, message);
}

export function setGetSecretPAT(fn: GetSecretPATFn): void {
  getSecretPATFn = fn;
}

export async function getSecretPAT(
  context: vscode.ExtensionContext,
  connectionId?: string
): Promise<string | undefined> {
  if (!getSecretPATFn) {
    return undefined;
  }
  return getSecretPATFn(context, connectionId);
}

export function setLoadedConnectionsReader(fn: LoadedConnectionsReader): void {
  loadedConnectionsReader = fn;
}

export function getLoadedConnections(): unknown[] {
  return loadedConnectionsReader();
}

export function setActiveConnectionIdReader(fn: ActiveConnectionIdReader): void {
  activeConnectionIdReader = fn;
}

export function getActiveConnectionId(): string | null | undefined {
  return activeConnectionIdReader();
}

export function setWebviewMessageHandler(handler: WebviewMessageHandler | undefined): void {
  webviewMessageHandler = handler;
}

export async function invokeWebviewMessageHandler(message: unknown): Promise<void> {
  if (!webviewMessageHandler) {
    return;
  }

  try {
    await webviewMessageHandler(message);
  } catch (error) {
    console.error('[extensionHostBridge] Webview message handler failed', error);
  }
}

export function setActiveConnectionHandler(handler: ActiveConnectionHandler | undefined): void {
  activeConnectionHandler = handler;
}

export async function invokeActiveConnectionHandler(
  connectionId: string,
  options?: ActiveConnectionHandlerOptions
): Promise<unknown> {
  if (!activeConnectionHandler) {
    return undefined;
  }

  try {
    return await activeConnectionHandler(connectionId, options);
  } catch (error) {
    console.error('[extensionHostBridge] Active connection handler failed', error);
    return undefined;
  }
}

export function setApplicationStoreBridge(options: {
  getActor: ApplicationActorAccessor;
  send: ApplicationEventDispatcher;
}): void {
  applicationActorAccessor = options.getActor;
  applicationEventDispatcher = options.send;
}

export function clearApplicationStoreBridge(): void {
  applicationActorAccessor = undefined;
  applicationEventDispatcher = undefined;
}

export function getApplicationStoreActor(): unknown {
  return applicationActorAccessor ? applicationActorAccessor() : undefined;
}

export function sendApplicationStoreEvent(event: unknown): void {
  if (!applicationEventDispatcher) {
    return;
  }
  applicationEventDispatcher(event);
}
