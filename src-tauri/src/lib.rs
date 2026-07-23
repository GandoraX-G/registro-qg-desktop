mod commands;

pub fn run() {
    tauri::Builder::default()
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
