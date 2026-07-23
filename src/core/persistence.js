import { state, STORAGE_KEY, storageOk, setStorageOk } from './state.js';
import { validaStato, migraRotteLegacy } from './validation.js';
import { callRenderAll } from './state.js';
import { showToast } from '../ui/toast.js';

export const TAURI_DISPONIBILE = !!(window.__TAURI__ && window.__TAURI__.core);

export function storageAvailable(){
  try{
    const testKey = "__qg_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  }catch(e){
    return false;
  }
}

export async function loadState(){
  document.getElementById("storageWarning").classList.toggle("show", false);
  try{
    if(TAURI_DISPONIBILE){
      setStorageOk(true);
      const raw = await window.__TAURI__.core.invoke("carica_registro");
      if(raw){
        const parsed = JSON.parse(raw);
        Object.assign(state, parsed);
      }
    }else{
      setStorageOk(storageAvailable());
      document.getElementById("storageWarning").classList.toggle("show", !storageOk);
      if(storageOk){
        const raw = localStorage.getItem(STORAGE_KEY);
        if(raw){
          const parsed = JSON.parse(raw);
          Object.assign(state, parsed);
        }
      }
    }
  }catch(e){
    console.log("Nessun registro salvato in precedenza, o dati corrotti: si parte da zero.", e);
  }
  validaStato();
  migraRotteLegacy();
  document.getElementById("loading").style.display = "none";
  document.getElementById("app").style.display = "flex";
  callRenderAll();
}

let saveTimeout = null;
export function saveState(){
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async ()=>{
    const payload = JSON.stringify(state);
    try{
      if(TAURI_DISPONIBILE){
        await window.__TAURI__.core.invoke("salva_registro", {contenuto: payload});
      }else if(storageOk){
        localStorage.setItem(STORAGE_KEY, payload);
      }else{
        throw new Error("Nessuna destinazione di salvataggio disponibile");
      }
      flashSaved();
    }catch(e){
      console.error("Errore di salvataggio", e);
      document.getElementById("storageWarning").classList.add("show");
      showToast("Salvataggio non riuscito ⚠ — scarica un backup dalla sidebar");
    }
  }, 250);
}

export function flashSaved(){
  const dot = document.getElementById("saveDot");
  const text = document.getElementById("saveText");
  const ora = new Date().toLocaleTimeString("it-IT", {hour:"2-digit", minute:"2-digit", second:"2-digit"});
  text.textContent = "Salvato alle " + ora;
  dot.classList.add("show");
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(()=> dot.classList.remove("show"), 1500);
}
