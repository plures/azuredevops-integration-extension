use tauri::{Manager, Emitter};
use serde::{Deserialize, Serialize};

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
            show_selection_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
