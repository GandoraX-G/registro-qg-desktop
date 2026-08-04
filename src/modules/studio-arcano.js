import { state, callRenderAll, callRenderSottomeccaniche } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

export function ottieniCharm(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_arcano");
  if(!s || s.charmAttivo) return;
  s.charmAttivo = true;
  showToast("Charm ottenuto: dura 7 giorni narrativi o finché non lo usi");
  callRenderAll(); saveState();
}

export function usaCharm(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_arcano");
  if(!s || !s.charmAttivo) return;
  s.charmAttivo = false;
  showToast("Charm consumato: Identificare lanciato senza slot né componenti");
  callRenderAll(); saveState();
}
