/**
 * Improved VS Code Extension with proper TypeScript types, error handling, and security
 */
import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';

// Proper TypeScript interfaces
interface ExtensionConfig {
    greeting: string;
    autoSave: boolean;
    refreshInterval: number;
}

interface DisposableResource {
    dispose(): void;
}

class ExtensionManager {
    private disposables: vscode.Disposable[] = [];
    private intervals: NodeJS.Timeout[] = [];
    private config: ExtensionConfig;
    
    constructor(private context: vscode.ExtensionContext) {
        this.config = this.loadConfiguration();
    }
    
    private loadConfiguration(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration('improvedExtension');
        return {
            greeting: config.get<string>('greeting', 'Hello World!'),
            autoSave: config.get<boolean>('autoSave', true),
            refreshInterval: config.get<number>('refreshInterval', 30000)
        };
    }
    
    async initialize(): Promise<void> {
        try {
            // Register commands with proper error handling
            await this.registerCommands();
            
            // Setup webview with security
            await this.setupSecureWebview();
            
            // Load configuration asynchronously
            await this.loadConfigurationFile();
            
            // Setup periodic tasks with cleanup
            this.setupPeriodicTasks();
            
            console.log('Extension initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize extension:', error);
            vscode.window.showErrorMessage(`Extension initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    private async registerCommands(): Promise<void> {
        // Command with input validation and error handling
        const helloWorldCommand = vscode.commands.registerCommand(
            'improvedExtension.helloWorld', 
            async () => {
                try {
                    const result = await vscode.window.showInformationMessage(
                        this.config.greeting,
                        { modal: false },
                        'OK', 'Settings'
                    );
                    
                    if (result === 'Settings') {
                        await vscode.commands.executeCommand('workbench.action.openSettings', 'improvedExtension');
                    }
                    
                } catch (error) {
                    console.error('Hello World command failed:', error);
                    vscode.window.showErrorMessage('Failed to show greeting message');
                }
            }
        );
        
        // Command with user input validation
        const getUserInputCommand = vscode.commands.registerCommand(
            'improvedExtension.getUserInput',
            async () => {
                try {
                    const input = await vscode.window.showInputBox({
                        prompt: 'Enter your name',
                        placeHolder: 'John Doe',
                        validateInput: (value: string) => {
                            if (!value || value.trim().length === 0) {
                                return 'Name cannot be empty';
                            }
                            if (value.length > 50) {
                                return 'Name is too long (max 50 characters)';
                            }
                            return null;
                        }
                    });
                    
                    if (input) {
                        const sanitizedInput = this.sanitizeInput(input);
                        vscode.window.showInformationMessage(`Hello, ${sanitizedInput}!`);
                    }
                    
                } catch (error) {
                    console.error('Get user input command failed:', error);
                    vscode.window.showErrorMessage('Failed to get user input');
                }
            }
        );
        
        // Properly add to disposables for cleanup
        this.disposables.push(helloWorldCommand, getUserInputCommand);
    }
    
    private sanitizeInput(input: string): string {
        // Basic sanitization - remove potentially harmful characters
        return input
            .trim()
            .replace(/[<>&"']/g, '')
            .substring(0, 50);
    }
    
    private async loadConfigurationFile(): Promise<void> {
        try {
            const configPath = path.join(this.context.extensionPath, 'config.json');
            
            // Check if file exists before reading
            try {
                await fs.access(configPath);
            } catch {
                // File doesn't exist, create default config
                const defaultConfig = {
                    version: '1.0.0',
                    features: ['helloWorld', 'userInput']
                };
                
                await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
                console.log('Created default configuration file');
                return;
            }
            
            const configContent = await fs.readFile(configPath, 'utf8');
            
            // Validate JSON before parsing
            if (!configContent.trim()) {
                throw new Error('Configuration file is empty');
            }
            
            const parsedConfig = JSON.parse(configContent);
            console.log('Configuration loaded successfully:', parsedConfig);
            
        } catch (error) {
            console.error('Failed to load configuration file:', error);
            
            if (error instanceof SyntaxError) {
                vscode.window.showWarningMessage('Configuration file contains invalid JSON. Using defaults.');
            } else {
                vscode.window.showWarningMessage('Failed to load configuration. Using defaults.');
            }
        }
    }
    
    private setupPeriodicTasks(): void {
        if (this.config.autoSave) {
            const intervalId = setInterval(async () => {
                try {
                    // Perform periodic save operation
                    await vscode.workspace.saveAll();
                    console.log('Auto-save completed');
                } catch (error) {
                    console.error('Auto-save failed:', error);
                }
            }, this.config.refreshInterval);
            
            // Store interval for cleanup
            this.intervals.push(intervalId);
        }
    }
    
    private async setupSecureWebview(): Promise<void> {
        try {
            const panel = vscode.window.createWebviewPanel(
                'improvedExtension.secureView',
                'Secure View',
                vscode.ViewColumn.One,
                {
                    // Secure webview options
                    enableScripts: true,
                    enableCommandUris: false,
                    enableForms: false,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
                    ]
                }
            );
            
            // Generate nonce for CSP
            const nonce = this.generateNonce();
            
            // Secure HTML with Content Security Policy
            panel.webview.html = this.getSecureWebviewHtml(panel.webview, nonce);
            
            // Handle messages from webview
            panel.webview.onDidReceiveMessage(
                (message) => this.handleWebviewMessage(message),
                undefined,
                this.disposables
            );
            
            // Cleanup when panel is disposed
            panel.onDidDispose(
                () => console.log('Webview panel disposed'),
                null,
                this.disposables
            );
            
            this.disposables.push(panel);
            
        } catch (error) {
            console.error('Failed to setup webview:', error);
            vscode.window.showErrorMessage('Failed to create webview');
        }
    }
    
    private generateNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    
    private getSecureWebviewHtml(webview: vscode.Webview, nonce: string): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
                <title>Secure Extension View</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; }
                    button { padding: 10px 20px; margin: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Secure Extension View</h1>
                    <p>This webview is properly secured with CSP headers.</p>
                    <button onclick="sendMessage()">Send Message to Extension</button>
                </div>
                
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    
                    function sendMessage() {
                        vscode.postMessage({
                            command: 'hello',
                            data: 'Hello from webview'
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }
    
    private handleWebviewMessage(message: any): void {
        try {
            switch (message.command) {
                case 'hello':
                    console.log('Received message from webview:', message.data);
                    vscode.window.showInformationMessage('Message received from webview!');
                    break;
                    
                default:
                    console.warn('Unknown webview message command:', message.command);
            }
        } catch (error) {
            console.error('Failed to handle webview message:', error);
        }
    }
    
    // Proper cleanup method
    dispose(): void {
        // Dispose all registered disposables
        this.disposables.forEach(disposable => {
            try {
                disposable.dispose();
            } catch (error) {
                console.error('Failed to dispose resource:', error);
            }
        });
        
        // Clear all intervals
        this.intervals.forEach(interval => {
            clearInterval(interval);
        });
        
        // Clear arrays
        this.disposables.length = 0;
        this.intervals.length = 0;
        
        console.log('Extension manager disposed');
    }
}

// Global extension manager instance
let extensionManager: ExtensionManager | undefined;

// Proper activation function with TypeScript types
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('Activating improved extension...');
    
    try {
        extensionManager = new ExtensionManager(context);
        await extensionManager.initialize();
        
        // Add extension manager to context for proper cleanup
        context.subscriptions.push({
            dispose: () => extensionManager?.dispose()
        });
        
    } catch (error) {
        console.error('Extension activation failed:', error);
        vscode.window.showErrorMessage(`Failed to activate extension: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
}

// Proper deactivation function for cleanup
export function deactivate(): void {
    console.log('Deactivating improved extension...');
    
    try {
        extensionManager?.dispose();
        extensionManager = undefined;
    } catch (error) {
        console.error('Extension deactivation failed:', error);
    }
}