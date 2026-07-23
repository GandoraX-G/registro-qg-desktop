import { state } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setAlchimistaRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function aggiungiPozione(uidStr, nome, rarita, quantita){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="alchimista");
  if(!s || !nome || quantita<=0) return;
  const esistente = s.pozioni.find(p=>p.nome===nome && p.rarita===rarita);
  if(esistente){ esistente.quantita += quantita; }
  else{ s.pozioni.push({id: uid(), nome, rarita, quantita}); }
  renderAll(); saveState();
}

export function rimuoviPozione(uidStr, pozioneId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="alchimista");
  if(!s) return;
  s.pozioni = s.pozioni.filter(p=>p.id!==pozioneId);
  renderAll(); saveState();
}

export function totalePerRarita(pozioni, rarita){
  return pozioni.filter(p=>p.rarita===rarita).reduce((s,p)=>s+p.quantita,0);
}

export function usaCalderone(uidStr, rarita){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="alchimista");
  if(!s) return null;
  if(totalePerRarita(s.pozioni, rarita) < 2){ showToast(`Servono almeno 2 pozioni di rarità ${rarita} ⚠`); return null; }
  let daConsumare = 2;
  const consumate = [];
  s.pozioni.forEach(p=>{
    if(daConsumare<=0 || p.rarita!==rarita) return;
    const presi = Math.min(p.quantita, daConsumare);
    p.quantita -= presi; daConsumare -= presi;
    consumate.push(`${presi}× ${p.nome}`);
  });
  s.pozioni = s.pozioni.filter(p=>p.quantita>0);
  const tiro1 = Math.floor(Math.random()*100)+1;
  const tiro2 = Math.floor(Math.random()*100)+1;
  renderAll(); saveState();
  return { consumate, tiro1, tiro2, rarita };
}
