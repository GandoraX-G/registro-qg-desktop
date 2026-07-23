import { state } from '../core/state.js';
import { OPERA_ARTE_CFG, MATERIALI_PREZZI } from '../core/config.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setBottegaArtisticaRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function creaOperaArte(uidStr, stile, materialiScelti){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="bottega_artistica");
  if(!s) return;
  if(s.creataQuestoMese){ showToast("Questa Bottega ha già creato un'Opera d'Arte questo mese ⚠"); return; }
  const ammessi = OPERA_ARTE_CFG.materialiAmmessi || [];
  let valore = 0;
  for(const m in materialiScelti){
    const q = Number(materialiScelti[m])||0;
    if(q<=0) continue;
    if(!ammessi.includes(m)){ showToast(`${m} non è un materiale ammesso per un'Opera d'Arte ⚠`); return; }
    const disp = state.materiali[m]||0;
    if(disp < q){ showToast(`Materiali insufficienti: manca ${m} ⚠`); return; }
    valore += q * (MATERIALI_PREZZI[m]||0);
  }
  const soglia = OPERA_ARTE_CFG.valoreMinimoMo || 120;
  if(valore < soglia || valore % soglia !== 0){
    showToast(`Il valore dei materiali scelti (${valore} mo) deve essere un multiplo di ${soglia} mo ⚠`);
    return;
  }
  for(const m in materialiScelti){
    const q = Number(materialiScelti[m])||0;
    if(q>0) state.materiali[m] -= q;
  }
  s.opere.push({ id: uid(), valore, stile });
  s.creataQuestoMese = true;
  showToast(`Opera d'Arte creata: valore ${valore} mo, stile "${stile}"`);
  renderAll(); saveState();
}

export function calcolaPrestigioArtistico(regione){
  const soglia = OPERA_ARTE_CFG.valoreMinimoMo || 120;
  const bonusBlocco = OPERA_ARTE_CFG.bonusPerBlocco || 0.20;
  let totale = 0;
  state.strutture.forEach(s=>{
    if(s.catId!=="bottega_artistica") return;
    s.opere.forEach(o=>{
      const giudizio = (OPERA_ARTE_CFG.matrice[o.stile]||{})[regione];
      if(!giudizio) return;
      const blocchi = Math.round(o.valore / soglia);
      totale += (giudizio==="+" ? 1 : -1) * blocchi * bonusBlocco;
    });
  });
  return Math.round(totale*100);
}
