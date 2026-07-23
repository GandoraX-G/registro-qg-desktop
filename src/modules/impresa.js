import { state } from '../core/state.js';
import { CATALOGO, IMPRESA_CFG } from '../core/config.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setImpresaRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function struttureVenditaDisponibili(){
  return state.strutture.filter(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    return c && c.categoria === "Vendita";
  });
}

export function calcolaRicavoImpresa(spesa, livelloImpresa){
  const moltiplicatore = IMPRESA_CFG.moltiplicatoreRicavoPerSpesa ?? 3;
  const bonusPerLivello = IMPRESA_CFG.bonusMoPerLivelloImpresa ?? 10;
  return Math.max(0, spesa) * moltiplicatore + bonusPerLivello * livelloImpresa;
}

export function selezionaStrutturaVenditaImpresa(uidStr, strutturaVenditaUid){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="impresa");
  if(!s) return;
  s.strutturaVenditaUid = strutturaVenditaUid || null;
  s.spesaMensile = 0;
  renderSottomeccaniche();
  saveState();
}

export function registraGuadagnoImpresa(uidStr, spesaInput){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="impresa");
  if(!s) return;
  const struttura = state.strutture.find(x=>x.uid===s.strutturaVenditaUid);
  if(!struttura){ showToast("Seleziona prima una struttura di vendita ⚠"); return; }
  const spesaMax = (IMPRESA_CFG.spesaMaxMoPerLivelloStrutturaVendita ?? 10) * struttura.livello;
  const spesa = Math.max(0, Number(spesaInput) || 0);
  if(spesa > spesaMax){ showToast(`Spesa oltre il massimo consentito (${spesaMax} mo) ⚠`); return; }
  if(spesa <= 0){ showToast("Inserisci una spesa maggiore di zero ⚠"); return; }
  if(oroDisponibile() < spesa){ showToast("Oro insufficiente in tesoreria (oltre la riserva bancaria) per anticipare la spesa ⚠"); return; }
  const ricavo = calcolaRicavoImpresa(spesa, s.livello);
  const netto = ricavo - spesa;
  s.spesaMensile = spesa;
  registraMovimento(`Impresa "vendita a distanza" — spesa ${fmtMo(spesa)} mo, ricavo ${fmtMo(ricavo)} mo`, netto);
  showToast(`Guadagno registrato: netto +${fmtMo(netto)} mo`);
  renderAll();
  saveState();
}

export function aggiungiStrumentoImpresa(uidStr, nome){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="impresa");
  if(!s) return;
  const nomeOk = (nome||"").trim();
  if(!nomeOk){ showToast("Inserisci il nome dello strumento ⚠"); return; }
  const max = (IMPRESA_CFG.strumentiPerLivello ?? 2) * s.livello;
  if((s.strumenti||[]).length >= max){ showToast(`Massimo ${max} strumenti a questo livello ⚠`); return; }
  if((s.strumenti||[]).includes(nomeOk)){ showToast("Strumento già selezionato"); return; }
  s.strumenti = s.strumenti || [];
  s.strumenti.push(nomeOk);
  renderSottomeccaniche();
  saveState();
}

export function rimuoviStrumentoImpresa(uidStr, nome){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="impresa");
  if(!s) return;
  s.strumenti = (s.strumenti||[]).filter(x=>x!==nome);
  renderSottomeccaniche();
  saveState();
}

export function registraVenditaImpresa(uidStr, valoreInput){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="impresa");
  if(!s) return;
  const tabellaValori = IMPRESA_CFG.valoreMassimoOggettoPerLivello || {};
  const livelliNoti = Object.keys(tabellaValori).map(Number);
  const livelloMaxNoto = livelliNoti.length ? Math.max(...livelliNoti) : s.livello;
  const livelloRiferimento = Math.min(s.livello, livelloMaxNoto);
  const valoreMax = tabellaValori[String(livelloRiferimento)] ?? 0;
  const valore = Math.max(0, Number(valoreInput) || 0);
  if(valore <= 0){ showToast("Inserisci un valore maggiore di zero ⚠"); return; }
  if(valore > valoreMax){ showToast(`Valore oltre il massimo per singolo oggetto (${valoreMax} mo) ⚠`); return; }
  registraMovimento(`Impresa "a Porta Ethea" — vendita oggetto`, valore);
  showToast(`Vendita registrata: +${fmtMo(valore)} mo`);
  renderAll();
  saveState();
}
