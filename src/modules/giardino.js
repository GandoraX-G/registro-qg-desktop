import { state, PIANTE_SPECIALI } from '../core/config.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setGiardinoRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function piantaSeme(uidStr, nomePianta){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="giardino");
  const def = PIANTE_SPECIALI.find(p=>p.nome===nomePianta);
  if(!s || !def) return;
  s.piante.push({ id: uid(), nome: def.nome, clima: def.clima, mesiCrescita: 0, mesiClimaSbagliato: 0 });
  showToast(`${def.nome} piantato (richiede clima ${def.clima}, matura in 1 mese)`);
  renderAll(); saveState();
}

export function raccogliPianta(uidStr, piantaId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="giardino");
  if(!s) return;
  s.piante = s.piante.filter(p=>p.id!==piantaId);
  showToast("Pianta raccolta: assegna narrativamente il frutto/materiale ottenuto");
  renderAll(); saveState();
}

export function avanzaGiardini(){
  const righe = [];
  state.strutture.forEach(s=>{
    if(s.catId!=="giardino") return;
    const sopravvissute = [];
    s.piante.forEach(p=>{
      const climaOk = p.clima === state.clima;
      if(climaOk){
        p.mesiClimaSbagliato = 0;
        p.mesiCrescita++;
        if(p.mesiCrescita>=1){
          righe.push(`  • ${p.nome} è maturo: pronto per la raccolta.`);
        }
        sopravvissute.push(p);
      }else{
        p.mesiClimaSbagliato++;
        if(p.mesiClimaSbagliato>=1){
          righe.push(`  • ${p.nome} è morto: clima ${p.clima} richiesto, QG in clima ${state.clima}.`);
        }else{
          sopravvissute.push(p);
        }
      }
    });
    s.piante = sopravvissute;
  });
  return righe;
}
