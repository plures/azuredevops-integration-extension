use tauri::{Manager, Emitter, AppHandle};
use tauri_plugin_store::StoreExt;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Connection {
    id: String,
    organization: String,
    project: String,
    #[serde(rename = "baseUrl")]
    base_url: String,
    label: Option<String>,
    #[serde(rename = "authMethod")]
    auth_method: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct WorkItem {
    id: u32,
    title: String,
    #[serde(rename = "type")]
    work_item_type: String,
    state: String,
    #[serde(rename = "assignedTo")]
    assigned_to: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WebviewMessage {
    #[serde(rename = "type")]
    msg_type: String,
    #[serde(flatten)]
    data: serde_json::Value,
}

// IPC command handlers
#[tauri::command]
async fn handle_webview_message(message: serde_json::Value) -> Result<(), String> {
    println!("Received webview message: {:?}", message);
    // Handle FSM events and other messages here
    // This will be expanded to interact with the FSM state machine
    Ok(())
}

#[tauri::command]
async fn show_input_dialog(prompt: String, password: bool) -> Result<Option<String>, String> {
    // Placeholder implementation - returns None to simulate user cancellation
    // TODO: Implement custom input dialog UI in future iteration
    // This should present a native dialog or custom Svelte component for user input
    Ok(None)
}

#[tauri::command]
async fn show_selection_dialog(items: Vec<String>, placeholder: Option<String>) -> Result<Option<String>, String> {
    // Placeholder implementation - returns None to simulate user cancellation
    // TODO: Implement custom selection dialog UI in future iteration
    // This should present a dropdown or list selection UI for the user
    Ok(None)
}

// Connection management commands
#[tauri::command]
async fn get_connections(app: AppHandle) -> Result<Vec<Connection>, String> {
    let store = app.store("connections.json")
        .map_err(|e| format!("Failed to open store: {}", e))?;
    
    let connections = store.get("connections")
        .and_then(|v| serde_json::from_value::<Vec<Connection>>(v.clone()).ok())
        .unwrap_or_default();
    
    Ok(connections)
}

#[tauri::command]
async fn save_connection(app: AppHandle, connection: Connection, pat: String) -> Result<(), String> {
    // Save connection to store
    let store = app.store("connections.json")
        .map_err(|e| format!("Failed to open store: {}", e))?;
    
    let mut connections = store.get("connections")
        .and_then(|v| serde_json::from_value::<Vec<Connection>>(v.clone()).ok())
        .unwrap_or_default();
    
    // Update or add connection
    if let Some(existing) = connections.iter_mut().find(|c| c.id == connection.id) {
        *existing = connection.clone();
    } else {
        connections.push(connection.clone());
    }
    
    store.set("connections", json!(connections));
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;
    
    // Save PAT separately in secure store
    let tokens_store = app.store("tokens.json")
        .map_err(|e| format!("Failed to open tokens store: {}", e))?;
    
    tokens_store.set(&connection.id, json!(pat));
    tokens_store.save().map_err(|e| format!("Failed to save tokens: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn save_token(app: AppHandle, connection_id: String, token: String) -> Result<(), String> {
    let tokens_store = app.store("tokens.json")
        .map_err(|e| format!("Failed to open tokens store: {}", e))?;
    
    tokens_store.set(&connection_id, json!(token));
    tokens_store.save().map_err(|e| format!("Failed to save tokens: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn get_token(app: AppHandle, connection_id: String) -> Result<Option<String>, String> {
    let tokens_store = app.store("tokens.json")
        .map_err(|e| format!("Failed to open tokens store: {}", e))?;
    
    let token = tokens_store.get(&connection_id)
        .and_then(|v| v.as_str().map(String::from));
    
    Ok(token)
}

// Work item management commands
#[tauri::command]
async fn get_work_items(
    app: AppHandle,
    connection_id: String,
    wiql: Option<String>
) -> Result<Vec<WorkItem>, String> {
    // Get connection from store
    let store = app.store("connections.json")
        .map_err(|e| format!("Failed to open store: {}", e))?;
    
    let connections = store.get("connections")
        .and_then(|v| serde_json::from_value::<Vec<Connection>>(v.clone()).ok())
        .unwrap_or_default();
    
    let connection = connections.iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;
    
    // Get token for this connection
    let tokens_store = app.store("tokens.json")
        .map_err(|e| format!("Failed to open tokens store: {}", e))?;
    
    let token = tokens_store.get(&connection_id)
        .and_then(|v| v.as_str().map(String::from))
        .ok_or_else(|| "Token not found for connection".to_string())?;
    
    // For now, return an error indicating that API integration is not yet complete
    // This will be updated when the frontend service bridge is implemented
    Err("Azure DevOps API integration in progress. Please use the frontend service directly.".to_string())
    
    // TODO: Once frontend service bridge is set up, call it here
    // The frontend will expose JavaScript functions that this Rust code can invoke
}

// Legacy greet command from template (can be removed later)
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            handle_webview_message,
            show_input_dialog,
            show_selection_dialog,
            get_connections,
            save_connection,
            save_token,
            get_token,
            get_work_items
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
