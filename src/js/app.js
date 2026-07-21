/* ============================================================
   APP.JS — Main application logic, state management, render
   ============================================================ */

import { initTheme, applyTheme } from "./theme.js";
import { loadState, saveState, initStorage } from "./storage.js";
import { initUI, renderAll, switchTab } from "./ui.js";
import { initGuide } from "./guide.js";

// Global constants and state
const STORAGE_KEY = "qg_registro_v1";
const THEME_KEY = "qg_tema";
const GUIDE_KEY = "qg_guida_nascosta";

let state = {
  nome: "Il mio Quartier Generale",
  fondatore: "",
  cofondatore: "",
  classe: "Nessuna",
  livello: 1,
  oro: 0,
  membri: [],
  strutture: [],
  materiali: {},
  lavoratori: 0,
  rotte: [],
  magazzinoScontati: [],
  movimenti: [],
  riservaBancaria: 0,
  registroAltriQG: [],
  calendario: { mese: 1, stagione: "Primavera" },
  clima: "Mite",
  token: { miniera: 0, pesca: 0, concime: 0 },
  resocontoUltimoMese: null,
  guideSeen: false
};

let CATALOGO = [];
let MATERIALI_PREZZI = {};
let CONFIG = {};

async function initApp() {
  try {
    // Load configuration
    const res = await fetch("./data/regolamento.json");
    if (!res.ok) throw new Error(`Regolamento non caricato (${res.status})`);
    CONFIG = await res.json();
    CATALOGO = CONFIG.catalogo || [];
    MATERIALI_PREZZI = CONFIG.materiali || {};
    
    // Load or init state
    await loadState(state, STORAGE_KEY);
    
    // Initialize theme
    initTheme(THEME_KEY);
    
    // Initialize UI
    initUI(state, CATALOGO, MATERIALI_PREZZI, CONFIG);
    
    // Initialize guide
    initGuide();
    
    // Render everything
    renderAll(state);
    
    // Hide loading, show app
    document.getElementById("loading").style.display = "none";
    document.getElementById("app").style.display = "grid";
    
  } catch (err) {
    console.error("Errore durante l'inizializzazione:", err);
    document.getElementById("loading").innerHTML = "❌ Errore. Vedi console.";
  }
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// Export for use in other modules
window.app = { state, CATALOGO, MATERIALI_PREZZI, CONFIG };
