/* ============================================================
   STORAGE — Persistent state management (Tauri file or localStorage)
   ============================================================ */

const STORAGE_KEY = "qg_registro_v1";
const TAURI_DISPONIBILE = !!(window.__TAURI__ && window.__TAURI__.core);

function storageAvailable() {
  try {
    const testKey = "__qg_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

export async function loadState(state, storageKey = STORAGE_KEY) {
  const storageWarning = document.getElementById("storageWarning");
  if (storageWarning) {
    storageWarning.classList.toggle("show", false);
  }

  try {
    if (TAURI_DISPONIBILE) {
      const raw = await window.__TAURI__.core.invoke("carica_registro");
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.assign(state, parsed);
      }
      return true;
    } else {
      const ok = storageAvailable();
      if (storageWarning) {
        storageWarning.classList.toggle("show", !ok);
      }
      if (ok) {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          Object.assign(state, parsed);
        }
      }
      return ok;
    }
  } catch (e) {
    console.log("Nessun registro salvato in precedenza, o dati corrotti: si parte da zero.", e);
    return false;
  }
}

export async function saveState(state, storageKey = STORAGE_KEY) {
  try {
    const json = JSON.stringify(state);

    if (TAURI_DISPONIBILE) {
      await window.__TAURI__.core.invoke("salva_registro", { dati: json });
    } else {
      const ok = storageAvailable();
      if (ok) {
        localStorage.setItem(storageKey, json);
      }
    }

    // Show save indicator
    const saveDot = document.getElementById("saveDot");
    const saveText = document.getElementById("saveText");
    if (saveDot && saveText) {
      saveDot.classList.add("show");
      saveText.textContent = "Salvato ✓";
      setTimeout(() => {
        saveDot.classList.remove("show");
        saveText.textContent = "In attesa di modifiche…";
      }, 2000);
    }
  } catch (e) {
    console.error("Errore durante il salvataggio:", e);
    const saveText = document.getElementById("saveText");
    if (saveText) {
      saveText.textContent = "Errore di salvataggio";
      saveText.style.color = "var(--red-dk)";
      setTimeout(() => {
        saveText.style.color = "unset";
        saveText.textContent = "In attesa di modifiche…";
      }, 3000);
    }
  }
}

export function isStorageAvailable() {
  return TAURI_DISPONIBILE || storageAvailable();
}

export function isTauriAvailable() {
  return TAURI_DISPONIBILE;
}

// Auto-save on state changes
let autoSaveTimer = null;

export function scheduleAutoSave(state, storageKey = STORAGE_KEY, delayMs = 1000) {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveState(state, storageKey);
  }, delayMs);
}

// Export data as JSON for backup
export function exportStateAsJSON(state, filename = "qg_backup.json") {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import data from JSON
export function importStateFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (err) {
        reject(new Error("File JSON non valido"));
      }
    };
    reader.onerror = () => reject(new Error("Errore durante la lettura del file"));
    reader.readAsText(file);
  });
}
