import { state, SALA_ARCANA_CFG } from '../core/config.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setSalaArcanaRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function livelloIncantesimoMax(s){
  return Math.min(SALA_ARCANA_CFG.livelloIncantesimoMaxAssoluto||5, 2*s.livello - 1);
}

export function costoRituale(livelloIncantesimo){
  if(livelloIncantesimo<=0) return SALA_ARCANA_CFG.costoTrucchettoMo||150;
  return (SALA_ARCANA_CFG.costoPerLivelloIncantesimoMo||550) * livelloIncantesimo;
}

export function avviaRituale(uidStr, personaggio, incantesimo, livelloIncantesimo){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="sala_arcana");
  if(!s || !personaggio || !incantesimo) return;
  if(s.rituale){ showToast("Un rituale è già in corso: nella Sala Arcana se ne può svolgere solo uno alla volta ⚠"); return; }
  const max = livelloIncantesimoMax(s);
  if(livelloIncantesimo > max){ showToast(`Livello incantesimo troppo alto: massimo ${max} per una Sala Arcana Lv.${s.livello} ⚠`); return; }
  const costo = costoRituale(livelloIncantesimo);
  if(oroDisponibile() < costo){ showToast(`Oro insufficiente: servono ${costo} mo oltre la riserva bancaria ⚠`); return; }
  if(!confirm(`Avviare il rituale per "${incantesimo}" (${livelloIncantesimo<=0?"trucchetto":"Lv."+livelloIncantesimo}) per ${personaggio}? Costo: ${costo} mo.`)) return;
  registraMovimento(`Rituale: ${incantesimo} (Sala Arcana)`, -costo);
  const settimane = Math.max(SALA_ARCANA_CFG.settimaneMinimeTrucchetto||1, (SALA_ARCANA_CFG.settimanePerLivelloIncantesimo||1) * livelloIncantesimo);
  s.rituale = { personaggio, incantesimo, livello: livelloIncantesimo, settimaneRimanenti: settimane };
  showToast(`Rituale avviato: ${settimane} settimane di preparazione richieste`);
  renderAll(); saveState();
}

export function annullaRituale(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="sala_arcana");
  if(!s || !s.rituale) return;
  if(!confirm("Annullare il rituale in corso? L'oro speso non viene restituito.")) return;
  s.rituale = null;
  renderAll(); saveState();
}

export function avanzaRitualiArcani(){
  const righe = [];
  state.strutture.forEach(s=>{
    if(s.catId!=="sala_arcana" || !s.rituale) return;
    s.rituale.settimaneRimanenti -= 4;
    if(s.rituale.settimaneRimanenti <= 0){
      righe.push(`  • Rituale completato: ${s.rituale.personaggio} ha appreso "${s.rituale.incantesimo}".`);
      s.rituale = null;
    }
  });
  return righe;
}
