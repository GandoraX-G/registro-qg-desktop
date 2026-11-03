mod commands;

pub fn run() {
    tauri::Builder::default()
        // Ricorda dimensioni e posizione della finestra tra un avvio e l'altro:
        // senza plugin l'app ripartiva sempre a 1280x800. Il permesso
        // `window-state:default` è dichiarato in capabilities/default.json.
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            crate::commands::salva_registro,
            crate::commands::carica_registro,
            crate::commands::percorso_registro,
            crate::commands::esporta_backup,
            crate::commands::importa_backup
        ])
        .run(tauri::generate_context!())
        .expect("errore durante l'avvio dell'applicazione Tauri");
}
