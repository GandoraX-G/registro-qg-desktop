import { state } from '../core/state.js';
import { CAMPO_ADDESTRAMENTO_CFG } from '../core/config.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setCampoAddestramentoRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function unitaMaxAddestrabili(s){ return (CAMPO_ADDESTRAMENTO_CFG.unitaMaxPerLivello||5) * s.livello; }

export function avviaAddestramento(uidStr, nomeUnita){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="campo_addestramento");
  if(!s || !nomeUnita) return;
  if(s.unitaInAddestramento.length >= unitaMaxAddestrabili(s)){ showToast(`Massimo ${unitaMaxAddestrabili(s)} unità in addestramento contemporaneamente (5×livello) ⚠`); return; }
  s.unitaInAddestramento.push({ id: uid(), nome: nomeUnita });
  renderAll(); saveState();
}

export function completaAddestramento(uidStr, unitaId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="campo_addestramento");
  if(!s) return;
  s.unitaInAddestramento = s.unitaInAddestramento.filter(u=>u.id!==unitaId);
  s.unitaAllenate = (s.unitaAllenate||0) + 1;
  showToast("Unità Allenata! Il raggio di protezione degli Avamposti sale a 600km × livello QG");
  renderAll(); saveState();
}
