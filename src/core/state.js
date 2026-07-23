export const state = {
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
  tokenConcimeDaSpendere: 0,
  tokenMinieraDaSpendere: 0,
  tokenPescaDaSpendere: 0,
  satelliti: [],
  resocontoUltimoMese: null
};

export const STORAGE_KEY = "qg_registro_v1";
export const THEME_KEY = "qg_tema";
export const GUIDE_KEY = "qg_guida_nascosta";

export let currentTab = "panoramica";
export let catFilter = "Tutte";
export let structSearchTerm = "";
export let storageOk = true;
export let classeSbloccataManualmente = false;
export let sottomeccanicaAperta = {};

export function setCurrentTab(v) { currentTab = v; }
export function setCatFilter(v) { catFilter = v; }
export function setStructSearchTerm(v) { structSearchTerm = v; }
export function setStorageOk(v) { storageOk = v; }

let _renderAll, _renderSottomeccaniche, _renderDashboard;

export function setRenderAll(fn) { _renderAll = fn; }
export function callRenderAll() { if (_renderAll) _renderAll(); }

export function setRenderSottomeccaniche(fn) { _renderSottomeccaniche = fn; }
export function callRenderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function setRenderDashboard(fn) { _renderDashboard = fn; }
export function callRenderDashboard() { if (_renderDashboard) _renderDashboard(); }
