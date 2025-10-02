import * as vscode from 'vscode';

// Issue 1: No proper activation function signature
export function activate(context) {
    console.log('Extension activated');
    
    // Issue 2: Command registration without proper error handling
    let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
        // Issue 3: No input validation
        vscode.window.showInformationMessage('Hello World!');
    });
    
    // Issue 4: Not adding disposable to context subscriptions (memory leak)
    
    // Issue 5: Synchronous file operations in extension
    const fs = require('fs');
    const config = fs.readFileSync('./config.json', 'utf8');
    
    // Issue 6: No error handling for JSON parsing
    const settings = JSON.parse(config);
    
    // Issue 7: Creating intervals without cleanup
    setInterval(() => {
        console.log('Periodic task');
    }, 5000);
    
    // Issue 8: No proper webview security
    const panel = vscode.window.createWebviewPanel(
        'testView',
        'Test View',
        vscode.ViewColumn.One,
        {
            // Issue 9: Insecure webview options
            enableScripts: true
        }
    );
    
    // Issue 10: Direct HTML without CSP
    panel.webview.html = '<html><body><script>alert("XSS")</script></body></html>';
}

// Issue 11: No deactivate function for cleanup
// Missing: export function deactivate() {}