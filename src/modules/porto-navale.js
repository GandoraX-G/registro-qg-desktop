import { state } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';
import { PORTO_MILITARE_CFG, ELIPORTO_ARCANO_CFG } from '../core/config.js';

let _renderAll, _renderSottomeccaniche;
export function setPortoNavaleRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

function hasStrutturaTipo(catId){ return state.strutture.some(s=>s.catId===catId); }
export function hasPortoMilitare(){ return hasStrutturaTipo("porto_militare"); }
export function hasEliportoArcano(){ return hasStrutturaTipo("eliporto_arcano"); }

export function scontoNavaleTotale(){
  let sconto = 0;
  if(hasPortoMilitare()) sconto += (PORTO_MILITARE_CFG.scontoNavaleBasePercento ?? 20) / 100;
  if(hasEliportoArcano()) sconto += (ELIPORTO_ARCANO_CFG.scontoNavaleExtraPercento ?? 10) / 100;
  return sconto;
}

export function registraAcquistoNavale(uidStr, costoBaseInput){
  const base = Math.max(0, Number(costoBaseInput) || 0);
  if(base <= 0){ showToast("Inserisci un costo base valido ⚠"); return; }
  const sconto = scontoNavaleTotale();
  const totale = base * (1 - sconto);
  if(oroDisponibile() < totale){ showToast("Oro insufficiente in tesoreria (oltre la riserva bancaria) ⚠"); return; }
  registraMovimento(`Potenziamento navale (sconto ${(sconto*100).toFixed(0)}%)`, -totale);
  showToast(`Potenziamento navale acquistato per ${totale.toFixed(1).replace(/\.0$/,"")} mo (sconto ${(sconto*100).toFixed(0)}%)`);
  renderAll();
  saveState();
}

export function cambiaStatoGuerra(uidStr, nuovoStato){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="sala_da_guerra");
  if(!s) return;
  s.statoGuerra = nuovoStato;
  showToast(`Stato Guerra aggiornato: ${nuovoStato}`);
  renderSottomeccaniche();
  saveState();
}

export function salvaNoteGuerra(uidStr, note){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="sala_da_guerra");
  if(!s) return;
  s.note = note || "";
  showToast("Note salvate");
  saveState();
}
