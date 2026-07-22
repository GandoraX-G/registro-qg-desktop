/* ============================================================
   DATI DI RIFERIMENTO — estratti dalla Meccanica dei QG
   ============================================================ */

/* Questi valori vengono popolati da caricaConfig() leggendo src/data/regolamento.json.
   Non sono più hardcoded qui: per applicare una patch al regolamento (nuovi prezzi,
   nuove soglie, nuove strutture) modifica quel file, non questo script. */
let MATERIALI_PREZZI = {};
let CATALOGO = [];
let PUNTI_QG_MAX = 44;
let LIVELLO_STRUTTURA_MAX = 6;
let LIVELLO_QG_MAX_ATTUALE = 3;
let COSTO_ROTTA_MO_PER_100KM = 5;
let RISCHIO_ROTTA_BASE = 5;
let RISCHIO_ROTTA_PER_100KM = 5;
let SCONTO_ACQUISTO_ALTRO_QG = 0.20;
let SCONTO_ACQUISTO_MAGAZZINO = 0.30;
let COSTO_LAVORATORE_MESE = 1;
let AVAMPOSTO_RAGGIO_KM_PER_LIVELLO = 400;
let LIVELLO_QG_CRITERIO = "massimo";
let LIVELLO_QG_SOGLIE = [];
let CALENDARIO_ORDINE_STAGIONI = ["Primavera","Estate","Autunno","Inverno"];
let CALENDARIO_MOD_CAMPO_COLTIVATO = {};
let RAFFINERIA_CAT_ID = "raffineria";
let RARITA_POZIONI = ["Comune","Non Comune","Raro","Molto Raro","Leggendario"];
let ARGOMENTI_BIBLIOTECA = [];
let TEMI_BIBLIOTECA_SCELTE = 5;
let PIANTE_SPECIALI = [];
let OPERA_ARTE_CFG = {};
let STUDIO_DIPLOMATICO_CFG = {};
let SALA_ARCANA_CFG = {};
let AVAMPOSTO_CFG = {};
let CAMPO_ADDESTRAMENTO_CFG = {};
let PORTO_MILITARE_CFG = {};
let ELIPORTO_ARCANO_CFG = {};
let SALA_DA_GUERRA_CFG = {};
let IMPRESA_CFG = {};

async function caricaConfig(){
  const res = await fetch("./data/regolamento.json");
  if(!res.ok) throw new Error("Impossibile caricare data/regolamento.json ("+res.status+")");
  const cfg = await res.json();
  MATERIALI_PREZZI = cfg.materiali || {};
  CATALOGO = cfg.catalogo || [];
  const c = cfg.costanti || {};
  PUNTI_QG_MAX = c.puntiQGMax ?? PUNTI_QG_MAX;
  LIVELLO_STRUTTURA_MAX = c.livelloStrutturaMax ?? LIVELLO_STRUTTURA_MAX;
  LIVELLO_QG_MAX_ATTUALE = c.livelloQGMaxAttuale ?? LIVELLO_QG_MAX_ATTUALE;
  COSTO_ROTTA_MO_PER_100KM = c.costoRottaMoPer100Km ?? COSTO_ROTTA_MO_PER_100KM;
  RISCHIO_ROTTA_BASE = c.rischioRottaBasePercento ?? RISCHIO_ROTTA_BASE;
  RISCHIO_ROTTA_PER_100KM = c.rischioRottaPer100KmScopertiPercento ?? RISCHIO_ROTTA_PER_100KM;
  SCONTO_ACQUISTO_ALTRO_QG = (c.scontoAcquistoAltroQGPercento ?? 20) / 100;
  SCONTO_ACQUISTO_MAGAZZINO = (c.scontoAcquistoMagazzinoPercento ?? 30) / 100;
  COSTO_LAVORATORE_MESE = c.costoLavoratoreMoAlMese ?? COSTO_LAVORATORE_MESE;
  AVAMPOSTO_RAGGIO_KM_PER_LIVELLO = c.avampostoRaggioKmPerLivello ?? AVAMPOSTO_RAGGIO_KM_PER_LIVELLO;
  const lq = cfg.livelloQG || {};
  LIVELLO_QG_CRITERIO = lq.criterio || LIVELLO_QG_CRITERIO;
  LIVELLO_QG_SOGLIE = lq.soglie || [];
  const cal = cfg.calendario || {};
  CALENDARIO_ORDINE_STAGIONI = cal.ordineStagioni || CALENDARIO_ORDINE_STAGIONI;
  CALENDARIO_MOD_CAMPO_COLTIVATO = cal.modificatoreCampoColtivato || {};
  RAFFINERIA_CAT_ID = cfg.raffineriaCatId || RAFFINERIA_CAT_ID;
  RARITA_POZIONI = cfg.raritaPozioni || RARITA_POZIONI;
  ARGOMENTI_BIBLIOTECA = cfg.argomentiBiblioteca || [];
  TEMI_BIBLIOTECA_SCELTE = cfg.temiBibliotecaScelteAllaCostruzione ?? TEMI_BIBLIOTECA_SCELTE;
  PIANTE_SPECIALI = cfg.pianteSpeciali || [];
  OPERA_ARTE_CFG = cfg.operaArte || {};
  STUDIO_DIPLOMATICO_CFG = cfg.studioDiplomatico || {};
  SALA_ARCANA_CFG = cfg.salaArcana || {};
  AVAMPOSTO_CFG = cfg.avamposto || {};
  CAMPO_ADDESTRAMENTO_CFG = cfg.campoAddestramento || {};
  PORTO_MILITARE_CFG = cfg.portoMilitare || {};
  ELIPORTO_ARCANO_CFG = cfg.eliportoArcano || {};
  SALA_DA_GUERRA_CFG = cfg.salaDaGuerra || {};
  IMPRESA_CFG = cfg.impresa || {};
}


const CATEGORIE = ["Generali","Produzione","Vendita","Militare"];

/* ============================================================
   STATO
   ============================================================ */
let state = {
  nome: "Il mio Quartier Generale",
  fondatore: "",
  cofondatore: "",
  classe: "Nessuna",
  livello: 1,
  oro: 0,
  membri: [],
  strutture: [],   // {uid, catId, livello, produzioneScelta?}
  materiali: {},   // {nomeMateriale: quantità}
  lavoratori: 0,
  rotte: [],       // {uid, nome, distanza, avampostoUid, carico?: {materiale, quantita}}
  magazzinoScontati: [],  // fino a 5 nomi di materiali con sconto Magazzino al 30%
  movimenti: [],   // {data, label, importo, saldoDopo} — storico automatico della tesoreria
  riservaBancaria: 0, // soglia che le spese volontarie dall'app non dovrebbero intaccare (upkeep obbligatorio la ignora, ma avvisa)
  registroAltriQG: [], // {uid, nome, tipo:"da_ricevere"|"da_dare"|"entrata"|"uscita", importo, nota, saldato:bool}
                        // — "da_ricevere"/"da_dare": crediti/debiti aperti, applicati alla tesoreria solo al Salda.
                        // — "entrata"/"uscita": movimenti già avvenuti verso un altro QG, applicati subito alla
                        //   tesoreria alla creazione (saldato:true da subito) — voluti dall'utente per tenere lo
                        //   storico economico ordinato per QG, oltre ai crediti/debiti in sospeso.
  calendario: { mese: 1, stagione: "Primavera" },
  clima: "Mite", // clima del settore in cui si trova il QG — determina quali Piante Speciali attecchiscono nel Giardino
  token: { miniera: 0, pesca: 0, concime: 0 }, // generati mensilmente; la spesa su tabelle è in P3
  resocontoUltimoMese: null // ultimo report generato da "Chiudi mese", per rivederlo senza doverlo rigenerare
};

const STORAGE_KEY = "qg_registro_v1";
const THEME_KEY = "qg_tema";
const GUIDE_KEY = "qg_guida_nascosta";
let currentTab = "panoramica";
let catFilter = "Tutte";
let structSearchTerm = "";
let storageOk = true;
let classeSbloccataManualmente = false; // sblocco temporaneo (non persistito) del menu Classe
let sottomeccanicaAperta = {}; // stato collassato/espanso (non persistito) dei pannelli in Sotto-meccaniche, per uid struttura

// Setter functions (required because ES module imports are read-only bindings)
export function setCurrentTab(v) { currentTab = v; }
export function setCatFilter(v) { catFilter = v; }
export function setStructSearchTerm(v) { structSearchTerm = v; }

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

/* ============================================================
   PERSISTENZA
   ------------------------------------------------------------
   Fonte primaria: file nativo sul disco, tramite due comandi Rust
   (salva_registro / carica_registro) esposti da src-tauri/src/main.rs.
   Questo evita che il registro sparisca svuotando la cache del webview
   o disinstallando/reinstallando l'app — cosa che poteva succedere
   quando l'unica copia viveva in localStorage.

   Se per qualsiasi motivo l'app gira fuori da Tauri (es. apri
   index.html in un browser normale durante lo sviluppo dell'interfaccia),
   window.__TAURI__ non esiste: in quel caso si torna a localStorage
   così puoi comunque testare la UI senza dover compilare l'app.
   ============================================================ */
const TAURI_DISPONIBILE = !!(window.__TAURI__ && window.__TAURI__.core);

function storageAvailable(){
  try{
    const testKey = "__qg_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  }catch(e){
    return false;
  }
}

async function loadState(){
  document.getElementById("storageWarning").classList.toggle("show", false);
  try{
    if(TAURI_DISPONIBILE){
      storageOk = true;
      const raw = await window.__TAURI__.core.invoke("carica_registro");
      if(raw){
        const parsed = JSON.parse(raw);
        state = Object.assign(state, parsed);
      }
    }else{
      storageOk = storageAvailable();
      document.getElementById("storageWarning").classList.toggle("show", !storageOk);
      if(storageOk){
        const raw = localStorage.getItem(STORAGE_KEY);
        if(raw){
          const parsed = JSON.parse(raw);
          state = Object.assign(state, parsed);
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
  renderAll();
}

// Validazione e correzione dello stato caricato: garantisce che tutti i
// campi obbligatori esistano e abbiano il tipo corretto, evitando crash
// se un backup vecchio manca di campi aggiunti in versioni recenti.
function validaStato(){
  if(typeof state.nome !== "string") state.nome = "Il mio Quartier Generale";
  if(typeof state.fondatore !== "string") state.fondatore = "";
  if(typeof state.cofondatore !== "string") state.cofondatore = "";
  if(typeof state.classe !== "string") state.classe = "Nessuna";
  if(typeof state.livello !== "number" || state.livello < 1) state.livello = 1;
  if(typeof state.oro !== "number") state.oro = 0;
  if(!Array.isArray(state.membri)) state.membri = [];
  if(!Array.isArray(state.strutture)) state.strutture = [];
  if(typeof state.materiali !== "object" || state.materiali === null) state.materiali = {};
  if(typeof state.lavoratori !== "number" || state.lavoratori < 0) state.lavoratori = 0;
  if(!Array.isArray(state.rotte)) state.rotte = [];
  if(!Array.isArray(state.magazzinoScontati)) state.magazzinoScontati = [];
  if(!Array.isArray(state.movimenti)) state.movimenti = [];
  if(typeof state.riservaBancaria !== "number") state.riservaBancaria = 0;
  if(!Array.isArray(state.registroAltriQG)) state.registroAltriQG = [];
  if(typeof state.calendario !== "object" || state.calendario === null) state.calendario = {mese:1, stagione:"Primavera"};
  if(typeof state.calendario.mese !== "number") state.calendario.mese = 1;
  if(typeof state.calendario.stagione !== "string") state.calendario.stagione = "Primavera";
  if(typeof state.clima !== "string") state.clima = "Mite";
  if(typeof state.token !== "object" || state.token === null) state.token = {miniera:0, pesca:0, concime:0};
  // Validazione array rotte: ogni rotta deve avere i campi minimi
  state.rotte.forEach(r => {
    if(typeof r.uid !== "string") r.uid = uid();
    if(typeof r.nome !== "string") r.nome = "Rotta senza nome";
    if(typeof r.distanza !== "number") r.distanza = 0;
    if(r.avampostoUid === undefined) r.avampostoUid = null;
  });
  // Validazione array strutture: ogni struttura deve avere i campi minimi
  state.strutture.forEach(s => {
    if(typeof s.uid !== "string") s.uid = uid();
    if(typeof s.catId !== "string") s.catId = "";
    if(typeof s.livello !== "number" || s.livello < 1) s.livello = 1;
  });
  // Validazione membri
  state.membri.forEach(m => {
    if(typeof m.nome !== "string") m.nome = "Sconosciuto";
    if(typeof m.livello !== "number") m.livello = 1;
  });
}

// Migrazione una tantum: le rotte create con versioni precedenti dell'app
// avevano un campo "difesa" numerico libero, digitato a mano, invece di un
// vero collegamento a un Avamposto costruito. Non possiamo indovinare a
// quale Avamposto corrispondesse quel numero, quindi lo segnaliamo invece
// di far sparire silenziosamente la copertura: la rotta risulta scoperta
// finché non le si riassegna esplicitamente un Avamposto dalla tabella.
function migraRotteLegacy(){
  let daSegnalare = 0;
  state.rotte.forEach(r=>{
    if(r.avampostoUid === undefined){
      if(typeof r.difesa === "number" && r.difesa > 0) daSegnalare++;
      r.avampostoUid = null;
      delete r.difesa;
    }
  });
  if(daSegnalare > 0){
    showToast(`⚠ ${daSegnalare} rotta/e create con una versione precedente sono tornate "scoperte": riassegna l'Avamposto dalla tabella Rotte`);
  }
}

let _renderAll, _showToast;
export function setStorageCallbacks(renderAllFn, showToastFn) {
  _renderAll = renderAllFn;
  _showToast = showToastFn;
}
function renderAll() { if (_renderAll) _renderAll(); }
function showToast(msg, type) { if (_showToast) _showToast(msg, type); }

let saveTimeout = null;
function saveState(){
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

function flashSaved(){
  const dot = document.getElementById("saveDot");
  const text = document.getElementById("saveText");
  const ora = new Date().toLocaleTimeString("it-IT", {hour:"2-digit", minute:"2-digit", second:"2-digit"});
  text.textContent = "Salvato alle " + ora;
  dot.classList.add("show");
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(()=> dot.classList.remove("show"), 1500);
}

function exportBackup(){
  try{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dataOggi = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `QG_backup_${(state.nome||"registro").replace(/[^a-z0-9]+/gi,"_")}_${dataOggi}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Backup scaricato");
  }catch(e){
    console.error("Errore nell'esportazione", e);
    showToast("Errore nell'esportazione ⚠");
  }
}

function importBackup(file){
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const parsed = JSON.parse(ev.target.result);
      if(typeof parsed !== "object" || parsed === null) throw new Error("Formato non valido");
      if(!confirm("Importare questo backup sovrascriverà il registro attuale su questo dispositivo. Continuare?")) return;
      state = Object.assign({
        nome:"Il mio Quartier Generale", fondatore:"", cofondatore:"", classe:"Nessuna", livello:1,
        oro:0, membri:[], strutture:[], materiali:{}, lavoratori:0, rotte:[], magazzinoScontati:[], movimenti:[],
        riservaBancaria:0, registroAltriQG:[]
      }, parsed);
      saveState();
      renderAll();
      showToast("Backup importato");
    }catch(e){
      console.error("Errore nell'importazione", e);
      showToast("File di backup non valido ⚠");
    }
  };
  reader.readAsText(file);
}

function calcolaLivelloQGDaMembri(){
  if(!state.membri || state.membri.length===0) return 1;
  const livelli = state.membri.map(m=>Number(m.livello)||0).filter(l=>l>0);
  if(livelli.length===0) return 1;
  let riferimento;
  if(LIVELLO_QG_CRITERIO === "minimo") riferimento = Math.min(...livelli);
  else if(LIVELLO_QG_CRITERIO === "media") riferimento = livelli.reduce((a,b)=>a+b,0)/livelli.length;
  else riferimento = Math.max(...livelli); // default: "massimo"

  let livelloQG = 1;
  const soglie = [...LIVELLO_QG_SOGLIE].sort((a,b)=>a.livelloPersonaggioMin - b.livelloPersonaggioMin);
  soglie.forEach(s=>{ if(riferimento >= s.livelloPersonaggioMin) livelloQG = s.qg; });

  return Math.min(livelloQG, LIVELLO_QG_MAX_ATTUALE);
}


export {
  state,
  STORAGE_KEY,
  THEME_KEY,
  GUIDE_KEY,
  TAURI_DISPONIBILE,
  caricaConfig,
  setStorageCallbacks,
  MATERIALI_PREZZI,
  CATALOGO,
  PUNTI_QG_MAX,
  LIVELLO_STRUTTURA_MAX,
  LIVELLO_QG_MAX_ATTUALE,
  COSTO_ROTTA_MO_PER_100KM,
  RISCHIO_ROTTA_BASE,
  RISCHIO_ROTTA_PER_100KM,
  SCONTO_ACQUISTO_ALTRO_QG,
  SCONTO_ACQUISTO_MAGAZZINO,
  COSTO_LAVORATORE_MESE,
  AVAMPOSTO_RAGGIO_KM_PER_LIVELLO,
  LIVELLO_QG_CRITERIO,
  LIVELLO_QG_SOGLIE,
  CALENDARIO_ORDINE_STAGIONI,
  CALENDARIO_MOD_CAMPO_COLTIVATO,
  RAFFINERIA_CAT_ID,
  RARITA_POZIONI,
  ARGOMENTI_BIBLIOTECA,
  TEMI_BIBLIOTECA_SCELTE,
  PIANTE_SPECIALI,
  OPERA_ARTE_CFG,
  STUDIO_DIPLOMATICO_CFG,
  SALA_ARCANA_CFG,
  AVAMPOSTO_CFG,
  CAMPO_ADDESTRAMENTO_CFG,
  PORTO_MILITARE_CFG,
  ELIPORTO_ARCANO_CFG,
  SALA_DA_GUERRA_CFG,
  IMPRESA_CFG,
  CATEGORIE,
  currentTab,
  setCurrentTab,
  catFilter,
  setCatFilter,
  structSearchTerm,
  setStructSearchTerm,
  storageOk,
  classeSbloccataManualmente,
  sottomeccanicaAperta,
  storageAvailable,
  loadState,
  validaStato,
  migraRotteLegacy,
  saveState,
  flashSaved,
  exportBackup,
  importBackup,
  calcolaLivelloQGDaMembri
};
