import { state } from './state.js';
import { LIVELLO_QG_CRITERIO, LIVELLO_QG_SOGLIE, LIVELLO_QG_MAX_ATTUALE } from './config.js';
import { uid } from '../utils/format.js';
import { showToast } from '../ui/toast.js';

export function validaStato(){
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
  if(typeof state.tokenConcimeDaSpendere !== "number" || state.tokenConcimeDaSpendere < 0) state.tokenConcimeDaSpendere = 0;
  if(typeof state.tokenMinieraDaSpendere !== "number" || state.tokenMinieraDaSpendere < 0) state.tokenMinieraDaSpendere = 0;
  if(typeof state.tokenPescaDaSpendere !== "number" || state.tokenPescaDaSpendere < 0) state.tokenPescaDaSpendere = 0;
  if(!Array.isArray(state.satelliti)) state.satelliti = [];
  state.rotte.forEach(r => {
    if(typeof r.uid !== "string") r.uid = uid();
    if(typeof r.nome !== "string") r.nome = "Rotta senza nome";
    if(typeof r.distanza !== "number") r.distanza = 0;
    if(r.avampostoUid === undefined) r.avampostoUid = null;
  });
  state.strutture.forEach(s => {
    if(typeof s.uid !== "string") s.uid = uid();
    if(typeof s.catId !== "string") s.catId = "";
    if(typeof s.livello !== "number" || s.livello < 1) s.livello = 1;
  });
  state.membri.forEach(m => {
    if(typeof m.nome !== "string") m.nome = "Sconosciuto";
    if(typeof m.livello !== "number") m.livello = 1;
  });
}

export function migraRotteLegacy(){
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

export function calcolaLivelloQGDaMembri(){
  if(!state.membri || state.membri.length===0) return 1;
  const livelli = state.membri.map(m=>Number(m.livello)||0).filter(l=>l>0);
  if(livelli.length===0) return 1;
  let riferimento;
  if(LIVELLO_QG_CRITERIO === "minimo") riferimento = Math.min(...livelli);
  else if(LIVELLO_QG_CRITERIO === "media") riferimento = livelli.reduce((a,b)=>a+b,0)/livelli.length;
  else riferimento = Math.max(...livelli);

  let livelloQG = 1;
  const soglie = [...LIVELLO_QG_SOGLIE].sort((a,b)=>a.livelloPersonaggioMin - b.livelloPersonaggioMin);
  soglie.forEach(s=>{ if(riferimento >= s.livelloPersonaggioMin) livelloQG = s.qg; });

  return Math.min(livelloQG, LIVELLO_QG_MAX_ATTUALE);
}
