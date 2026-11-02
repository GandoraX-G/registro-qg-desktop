import { state, STORAGE_KEY, storageOk, setStorageOk, salvataggioBloccato, setSalvataggioBloccato, callRenderAll } from './state.js';
import { validaStato, applicaMigrazioni } from './validation.js';
import { sanificaRegistro } from './defaultState.js';
import { showToast } from '../ui/toast.js';

// Guardie per l'ambiente: i moduli del motore vengono importati anche dai
// test in Node, dove window/document non esistono.
export const TAURI_DISPONIBILE = typeof window !== "undefined" && !!(window.__TAURI__ && window.__TAURI__.core);

const PREFISSO_QUARANTENA = STORAGE_KEY + '.danneggiato.';

// Copia del registro illeggibile tenuta in memoria: serve al download di recupero
// anche quando localStorage è pieno e non accetta la chiave di quarantena.
let rawInQuarantena = null;

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

  let raw = null;
  let dettaglio = null;

  try{
    if(TAURI_DISPONIBILE){
      setStorageOk(true);
      raw = await window.__TAURI__.core.invoke("carica_registro");
    }else{
      setStorageOk(storageAvailable());
      document.getElementById("storageWarning").classList.toggle("show", !storageOk);
      if(storageOk) raw = localStorage.getItem(STORAGE_KEY);
    }
  }catch(e){
    // Nessun registro leggibile: primo avvio, oppure file non accessibile.
    // Qui non c'è nulla da mettere in quarantena, perché non abbiamo letto dati.
    console.warn("Lettura del registro non riuscita:", e);
    raw = null;
  }

  if(raw){
    try{
      const pulito = sanificaRegistro(JSON.parse(raw));
      if(!pulito){
        throw new Error("struttura inattesa");
      }
      Object.assign(state, pulito);
    }catch(e){
      dettaglio = (e && e.message) ? e.message : "JSON non valido";
    }
  }

  if(dettaglio){
    // I dati esistono ma non sono leggibili: si conservano e si sospendono i
    // salvataggi, altrimenti il primo saveState() li sovrascriverebbe per sempre.
    mettiInQuarantena(raw);
    setSalvataggioBloccato(true);
    mostraRecupero(dettaglio);
    showToast("Il registro salvato non è leggibile: salvataggi sospesi ⚠", "danger");
  }

  applicaMigrazioni();
  validaStato();
  document.getElementById("loading").style.display = "none";
  document.getElementById("app").style.display = "grid";
  callRenderAll();
}

function mettiInQuarantena(raw){
  rawInQuarantena = raw;
  const quando = new Date().toISOString().replace(/[:.]/g, "-");
  try{
    localStorage.setItem(PREFISSO_QUARANTENA + quando, raw);
  }catch(e){
    console.warn("Copia di quarantena non salvata (quota piena?): il registro resta scaricabile da questa sessione.", e);
  }
}

function scaricaRegistroGrezzo(){
  const blob = new Blob([rawInQuarantena || ""], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `QG_registro_danneggiato_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 0);
  showToast("Registro danneggiato scaricato: conservalo prima di ripartire");
}

export function chiudiRecupero(){
  const box = document.getElementById("datiDanneggiati");
  if(box) box.remove();
}

function mostraRecupero(dettaglio){
  if(!document.body || document.getElementById("datiDanneggiati")) return;

  const box = document.createElement("div");
  box.id = "datiDanneggiati";
  box.setAttribute("role", "alertdialog");
  box.setAttribute("aria-live", "assertive");
  box.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;max-width:min(680px,calc(100vw - 24px));background:#2a1e10;color:#f5edd8;border:1px solid #b9924f;border-radius:14px;box-shadow:0 12px 28px rgba(24,14,5,.35);padding:14px 16px;font-family:'Spectral',Georgia,serif;font-size:14px;line-height:1.45;";

  const titolo = document.createElement("strong");
  titolo.textContent = "Il registro salvato non è leggibile";
  titolo.style.cssText = "display:block;font-family:'Cinzel',serif;font-size:15px;color:#e6bd76;margin-bottom:6px;";

  const testo = document.createElement("p");
  testo.textContent = `Dettaglio: ${dettaglio}. Il file originale NON verrà sovrascritto finché non scegli. Scaricalo e conservalo: spesso è recuperabile a mano.`;
  testo.style.cssText = "margin:0 0 10px;";

  const azioni = document.createElement("div");
  azioni.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";

  const scarica = document.createElement("button");
  scarica.type = "button";
  scarica.textContent = "Scarica il registro danneggiato";
  scarica.style.cssText = "background:#b9924f;color:#2c1d12;border:none;border-radius:8px;padding:8px 12px;font:inherit;font-weight:600;cursor:pointer;";
  scarica.onclick = scaricaRegistroGrezzo;

  const riparti = document.createElement("button");
  riparti.type = "button";
  riparti.textContent = "Riparti da un registro vuoto";
  riparti.style.cssText = "background:transparent;color:#e6bd76;border:1px solid rgba(185,146,79,.5);border-radius:8px;padding:8px 12px;font:inherit;cursor:pointer;";
  riparti.onclick = ()=>{
    if(!confirm("Il registro danneggiato resta in quarantena, ma da ora si riparte da zero e i salvataggi riprendono. Continuare?")) return;
    setSalvataggioBloccato(false);
    box.remove();
    saveState();
    showToast("Salvataggio riattivato");
  };

  azioni.append(scarica, riparti);
  box.append(titolo, testo, azioni);
  document.body.appendChild(box);
}

let saveTimeout = null;
// Ultimo JSON effettivamente scritto: serve a non riscrivere nulla di identico.
let ultimoPayload = null;
// Payload in attesa di essere scritto: se la finestra si chiude prima del
// debounce, flushSave() lo scrive subito invece di perdere l'ultima modifica.
let payloadInAttesa = null;

async function scriviOra(payload){
  if(TAURI_DISPONIBILE){
    await window.__TAURI__.core.invoke("salva_registro", {contenuto: payload});
  }else if(storageOk){
    localStorage.setItem(STORAGE_KEY, payload);
  }else{
    throw new Error("Nessuna destinazione di salvataggio disponibile");
  }
  ultimoPayload = payload;
  payloadInAttesa = null;
}

export function saveState(){
  // Finché il registro è in quarantena nessuna scrittura deve sovrascriverlo.
  if(salvataggioBloccato) return;

  payloadInAttesa = JSON.stringify(state);
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async ()=>{
    const payload = payloadInAttesa;
    if(payload === null) return;
    // Stato invariato: nessuna scrittura, nessuna quota consumata.
    if(payload === ultimoPayload){ flashSaved(); payloadInAttesa = null; return; }
    try{
      await scriviOra(payload);
      flashSaved();
    }catch(e){
      ultimoPayload = null; // il prossimo saveState() deve ritentare
      console.error("Errore di salvataggio", e);
      document.getElementById("storageWarning").classList.add("show");
      showToast("Salvataggio non riuscito ⚠ — scarica un backup dalla sidebar");
    }
  }, 250);
}

/* Scrive subito l'ultima modifica in attesa. Chiamato quando la finestra sta
   per chiudersi: senza questo, un salvataggio entro 250 ms dalla modifica
   andava perso (chiudere l'app subito dopo aver editato un campo). */
export function flushSave(){
  if(salvataggioBloccato) return;
  const payload = payloadInAttesa;
  if(payload === null || payload === ultimoPayload) return;
  clearTimeout(saveTimeout);
  saveTimeout = null;

  if(!TAURI_DISPONIBILE && storageOk){
    try{
      localStorage.setItem(STORAGE_KEY, payload);
      ultimoPayload = payload;
      payloadInAttesa = null;
    }catch(e){
      console.error("Errore di salvataggio (flush)", e);
    }
    return;
  }
  // Su Tauri l'invoke è asincrono: lo avviamo senza aspettare la risposta.
  scriviOra(payload).catch(e => console.error("Errore di salvataggio (flush)", e));
}

if(typeof window !== "undefined"){
  window.addEventListener('pagehide', flushSave);
}
if(typeof document !== "undefined"){
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden') flushSave();
  });
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
