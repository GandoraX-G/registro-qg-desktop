import { createDefaultState } from './defaultState.js';

/* Il registro dell'app. È un singleton per scelta (una sola campagna per
   dispositivo), ma chi lo consuma nel motore riceve `state` come parametro,
   così le regole sono testabili su uno stato finto. */
export const state = createDefaultState();

export const STORAGE_KEY = "qg_registro_v1";
export const GUIDE_KEY = "qg_guida_nascosta";

export let currentTab = "panoramica";
export let catFilter = "Tutte";
export let structSearchTerm = "";
export let storageOk = true;
// Diventa true quando il registro salvato è illeggibile: blocca le scritture
// per non sovrascrivere dati che l'utente può ancora recuperare.
export let salvataggioBloccato = false;
export let sottomeccanicaAperta = {};

export function setCurrentTab(v) { currentTab = v; }
export function setCatFilter(v) { catFilter = v; }
export function setStructSearchTerm(v) { structSearchTerm = v; }
export function setStorageOk(v) { storageOk = v; }
export function setSalvataggioBloccato(v) { salvataggioBloccato = v; }

let _renderAll, _renderSottomeccaniche, _renderDashboard;

export function setRenderAll(fn) { _renderAll = fn; }
export function callRenderAll() { if (_renderAll) _renderAll(); }

export function setRenderSottomeccaniche(fn) { _renderSottomeccaniche = fn; }
export function callRenderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function setRenderDashboard(fn) { _renderDashboard = fn; }
export function callRenderDashboard() { if (_renderDashboard) _renderDashboard(); }
