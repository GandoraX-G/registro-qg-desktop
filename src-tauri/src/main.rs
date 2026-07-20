#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Nome del file su disco in cui viene salvato il registro del QG,
/// dentro la cartella dati dell'applicazione (es. su Windows:
/// %APPDATA%/com.gandora.registroqg/registro.json).
const REGISTRO_FILENAME: &str = "registro.json";

/// Risolve (e crea se necessario) la cartella dati dell'app dove
/// persistiamo il registro. Centralizzata qui così i tre comandi
/// sotto restano piccoli e coerenti tra loro.
fn cartella_dati(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Impossibile determinare la cartella dati dell'app: {e}"))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Impossibile creare la cartella dati ({}): {e}", dir.display()))?;
    Ok(dir)
}

/// Salva il registro (stringa JSON già serializzata dal frontend) su file.
/// Scrittura atomica: si scrive prima su un file temporaneo e poi lo si
/// rinomina sopra al file definitivo, per non lasciare un file corrotto
/// a metà nel caso l'app venga chiusa a metà scrittura.
#[tauri::command]
fn salva_registro(app: tauri::AppHandle, contenuto: String) -> Result<(), String> {
    let dir = cartella_dati(&app)?;
    let path = dir.join(REGISTRO_FILENAME);
    let tmp_path = dir.join(format!("{REGISTRO_FILENAME}.tmp"));

    fs::write(&tmp_path, &contenuto)
        .map_err(|e| format!("Errore durante la scrittura del registro: {e}"))?;
    fs::rename(&tmp_path, &path)
        .map_err(|e| format!("Errore durante il salvataggio definitivo del registro: {e}"))?;
    Ok(())
}

/// Carica il registro da file. Restituisce `None` se non esiste ancora
/// (prima esecuzione dell'app, oppure QG nuovo di zecca).
#[tauri::command]
fn carica_registro(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let dir = cartella_dati(&app)?;
    let path = dir.join(REGISTRO_FILENAME);
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| format!("Errore durante la lettura del registro: {e}"))
}

/// Espone al frontend il percorso su disco del file, utile per mostrarlo
/// nella UI ("i tuoi dati sono salvati qui") o per diagnosticare problemi.
#[tauri::command]
fn percorso_registro(app: tauri::AppHandle) -> Result<String, String> {
    let dir = cartella_dati(&app)?;
    Ok(dir.join(REGISTRO_FILENAME).to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            salva_registro,
            carica_registro,
            percorso_registro
        ])
        .run(tauri::generate_context!())
        .expect("errore durante l'avvio dell'applicazione Tauri");
}
