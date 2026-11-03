import { state, callRenderAll, callRenderSottomeccaniche } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';
import { PORTO_MILITARE_CFG, ELIPORTO_ARCANO_CFG } from '../core/config.js';

function hasStrutturaTipo(catId){ return state.strutture.some(s=>s.catId===catId); }
export function hasPortoMilitare(){ return hasStrutturaTipo("porto_militare"); }
export function hasEliportoArcano(){ return hasStrutturaTipo("eliporto_arcano"); }

export function scontoNavaleTotale(){
  let sconto = 0;
  if(hasPortoMilitare()) sconto += (PORTO_MILITARE_CFG.scontoNavaleBasePercento ?? 20) / 100;
  if(hasEliportoArcano()) sconto += (ELIPORTO_ARCANO_CFG.scontoNavaleExtraPercento ?? 10) / 100;
  return sconto;
}

/* Il catalogo ufficiale dei Potenziamenti Navali vive su una pagina esterna
   che non è stata fornita: invece di inventare voci e prezzi, il registro
   tiene quelli che il gruppo acquista davvero, con lo sconto applicato. Così
   la lista diventa un catalogo personale riutilizzabile (si vede quanto è
   costato cosa) senza contrabbandare regole inventate per ufficiali. */
export function registraAcquistoNavale(uidStr, costoBaseInput, nomeInput){
  const base = Math.max(0, Number(costoBaseInput) || 0);
  if(base <= 0){ showToast("Inserisci un costo base valido ⚠", "warning"); return; }
  const sconto = scontoNavaleTotale();
  const totale = base * (1 - sconto);
  if(oroDisponibile() < totale){ showToast("Oro insufficiente in tesoreria (oltre la riserva bancaria) ⚠"); return; }
  const struttura = state.strutture.find(s=>s.uid===uidStr);
  const nome = String(nomeInput || "").trim() || "Potenziamento navale";
  if(!Array.isArray(state.potenziamentiNavali)) state.potenziamentiNavali = [];
  state.potenziamentiNavali.push({
    uid: uid(),
    nome,
    costoBase: base,
    sconto: (sconto*100).toFixed(0),
    totale: Number(totale.toFixed(2)),
    origine: struttura ? (struttura.catId === "eliporto_arcano" ? "Eliporto Arcano" : "Porto Militare") : "",
    quando: `Mese ${state.calendario.mese} · ${state.calendario.stagione}`,
  });
  registraMovimento(`Potenziamento navale — ${nome} (sconto ${(sconto*100).toFixed(0)}%)`, -totale);
  showToast(`Potenziamento navale acquistato per ${totale.toFixed(1).replace(/\.0$/,"")} mo (sconto ${(sconto*100).toFixed(0)}%)`);
  callRenderAll();
  saveState();
}

/* Toglie la riga dal catalogo personale. Non rimborsa nulla: l'oro è già
   stato scalato al momento dell'acquisto, e annullarlo qui falserebbe i
   movimenti registrati. */
export function rimuoviPotenziamentoNavale(voceUid){
  if(!Array.isArray(state.potenziamentiNavali)) return;
  const prima = state.potenziamentiNavali.length;
  state.potenziamentiNavali = state.potenziamentiNavali.filter(v=>v.uid !== voceUid);
  if(state.potenziamentiNavali.length === prima) return;
  showToast("Voce rimossa dal catalogo (l'oro speso resta registrato nei movimenti)");
  callRenderAll();
  saveState();
}

export function cambiaStatoGuerra(uidStr, nuovoStato){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="sala_da_guerra");
  if(!s) return;
  s.statoGuerra = nuovoStato;
  showToast(`Stato Guerra aggiornato: ${nuovoStato}`);
  callRenderSottomeccaniche();
  saveState();
}

export function salvaNoteGuerra(uidStr, note){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="sala_da_guerra");
  if(!s) return;
  s.note = note || "";
  showToast("Note salvate");
  saveState();
}
