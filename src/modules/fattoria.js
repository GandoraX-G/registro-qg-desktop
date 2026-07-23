import { state } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setFattoriaRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export const TIPI_ANIMALI = ['Pollo','Capra','Pecora','Mucca'];
export const CARNE_PER_ANIMALE = { Pollo: 5, Capra: 10, Pecora: 2, Mucca: 15 };

export function maxAnimaliPerTipo(s){ return 5 * (s.livello || 1); }

export function aggiungiAnimale(uidStr, tipo){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="fattoria");
  if(!s || !TIPI_ANIMALI.includes(tipo)) return;
  if(!s.animali) s.animali = {};
  if((s.animali[tipo]||0) >= maxAnimaliPerTipo(s)){ showToast(`Massimo ${maxAnimaliPerTipo(s)} ${tipo} per Fattoria Lv.${s.livello} ⚠`); return; }
  s.animali[tipo] = (s.animali[tipo]||0) + 1;
  showToast(`${tipo} aggiunto/a alla Fattoria`);
  renderAll(); saveState();
}

export function rimuoviAnimale(uidStr, tipo){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="fattoria");
  if(!s || !s.animali || (s.animali[tipo]||0) <= 0) return;
  s.animali[tipo]--;
  renderAll(); saveState();
}

export function sacrificaAnimale(uidStr, tipo){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="fattoria");
  if(!s) return;
  if(s.carneSacrificataQuestoMese){ showToast('Hai già sacrificato un animale quest\'unità per questa Fattoria ⚠'); return; }
  if(!s.animali || (s.animali[tipo]||0) <= 0){ showToast(`Nessun ${tipo} da sacrificare ⚠`); return; }
  const quantita = CARNE_PER_ANIMALE[tipo];
  if(!quantita){ showToast('Tipo animale non valido ⚠'); return; }
  s.animali[tipo]--;
  s.carneSacrificataQuestoMese = true;
  const raff = haRaffineria();
  const materiale = raff ? 'Carne animale raffinata' : 'Carne animale';
  state.materiali[materiale] = (state.materiali[materiale]||0) + quantita;
  showToast(`Sacrificato 1 ${tipo} → +${quantita} ${materiale}`);
  renderAll(); saveState();
}

export function stoffaDaPecore(){
  let totale = 0;
  state.strutture.forEach(s=>{
    if(s.catId !== "fattoria") return;
    const pecore = (s.animali && s.animali.Pecora) || 0;
    if(pecore > 0) totale += pecore + (s.livello || 1);
  });
  return totale;
}
