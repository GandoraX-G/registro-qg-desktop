import { state } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setStudioArcanoRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function ottieniCharm(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_arcano");
  if(!s || s.charmAttivo) return;
  s.charmAttivo = true;
  showToast("Charm ottenuto: dura 7 giorni narrativi o finché non lo usi");
  renderAll(); saveState();
}

export function usaCharm(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_arcano");
  if(!s || !s.charmAttivo) return;
  s.charmAttivo = false;
  showToast("Charm consumato: Identificare lanciato senza slot né componenti");
  renderAll(); saveState();
}
