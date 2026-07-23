import { state } from '../core/state.js';
import { STUDIO_DIPLOMATICO_CFG } from '../core/config.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setStudioDiplomaticoRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function toggleFazioneSelezionata(uidStr, fazione){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_diplomatico");
  if(!s) return;
  const idx = s.fazioniSelezionate.indexOf(fazione);
  if(idx>=0){ s.fazioniSelezionate.splice(idx,1); }
  else{
    if(s.fazioniSelezionate.length >= s.livello){ showToast(`Puoi selezionare al massimo ${s.livello} fazioni al mese (pari al livello della struttura)`); return; }
    s.fazioniSelezionate.push(fazione);
  }
  renderAll(); saveState();
}

export function ottieniCompanion(uidStr, nome, livelloTarget){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_diplomatico");
  if(!s || !nome) return;
  livelloTarget = Math.max(1, Number(livelloTarget) || 1);
  if(s.fazioniSelezionate.length===0){ showToast("Seleziona almeno una fazione prima di ottenere un Companion ⚠"); return; }
  const base = STUDIO_DIPLOMATICO_CFG.costoCompanionBaseMo ?? 50;
  const extra = STUDIO_DIPLOMATICO_CFG.costoCompanionPerLivelloExtraMo ?? 50;
  const costo = base + extra * Math.max(0, livelloTarget - 1);
  if(oroDisponibile() < costo){ showToast(`Oro insufficiente: servono ${costo} mo oltre la riserva bancaria ⚠`); return; }
  if(!confirm(`Ottenere il Companion "${nome}" (Lv.${livelloTarget}) per ${costo} mo?` + (livelloTarget>1 ? " Non potrà salire di livello." : ""))) return;
  registraMovimento(`Companion: ${nome} (Studio Diplomatico)`, -costo);
  s.companions.push({ id: uid(), nome, fazioniOrigine: [...s.fazioniSelezionate], livello: livelloTarget, nonPuoSalireLivello: livelloTarget>1 });
  showToast(`Companion "${nome}" ottenuto`);
  renderAll(); saveState();
}

export function rimuoviCompanion(uidStr, companionId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_diplomatico");
  if(!s) return;
  s.companions = s.companions.filter(c=>c.id!==companionId);
  renderAll(); saveState();
}
