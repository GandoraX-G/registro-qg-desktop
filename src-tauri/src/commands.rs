use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const REGISTRO_FILENAME: &str = "registro.json";

fn cartella_dati(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Impossibile determinare la cartella dati dell'app: {e}"))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Impossibile creare la cartella dati ({}): {e}", dir.display()))?;
    Ok(dir)
}

#[tauri::command]
pub fn salva_registro(app: tauri::AppHandle, contenuto: String) -> Result<(), String> {
    let dir = cartella_dati(&app)?;
    let path = dir.join(REGISTRO_FILENAME);
    let tmp_path = dir.join(format!("{REGISTRO_FILENAME}.tmp"));
    fs::write(&tmp_path, &contenuto)
        .map_err(|e| format!("Errore durante la scrittura del registro: {e}"))?;
    fs::rename(&tmp_path, &path)
        .map_err(|e| format!("Errore durante il salvataggio definitivo del registro: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn carica_registro(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let dir = cartella_dati(&app)?;
    let path = dir.join(REGISTRO_FILENAME);
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| format!("Errore durante la lettura del registro: {e}"))
}

#[tauri::command]
pub fn percorso_registro(app: tauri::AppHandle) -> Result<String, String> {
    let dir = cartella_dati(&app)?;
    Ok(dir.join(REGISTRO_FILENAME).to_string_lossy().to_string())
}
