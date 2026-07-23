import { state } from '../core/state.js';
import { CATALOGO, PUNTI_QG_MAX } from '../core/config.js';
import { fmtMo } from '../utils/format.js';
import { puntiSpesiTotali, personaleRichiesto } from './qg.js';
import { costoMensileRotte, costiFissiMensili, costiVariabiliMensili, costoMensileTotale } from './finance.js';
import { kmDifesiRotta } from '../modules/outpost.js';
import { showToast } from '../ui/toast.js';

function buildSummaryText(){
  const righe = [];
  righe.push(`Quartier Generale \u2014 ${state.nome || "(senza nome)"}`);
  if(state.fondatore || state.cofondatore){
    righe.push(`Fondatore: ${state.fondatore || "\u2014"} \u00b7 Co-fondatore: ${state.cofondatore || "\u2014"}`);
  }
  const classeLabel = state.classe==="Nessuna" ? "Senza Classe" : "Classe " + state.classe;
  righe.push(`${classeLabel} \u00b7 Livello QG ${state.livello}`);
  righe.push("");
  righe.push(`Tesoreria: ${state.oro} mo`);
  righe.push(`Punti QG: ${puntiSpesiTotali()} / ${PUNTI_QG_MAX}`);
  righe.push(`Personale richiesto: ${personaleRichiesto()} (+ ${state.lavoratori} lavoratori assunti)`);
  righe.push("");
  righe.push("Membri:");
  if(state.membri.length===0){ righe.push("  (nessuno)"); }
  state.membri.forEach(m=> righe.push(`  \u2022 ${m.nome} \u2014 Lv. ${m.livello}`));
  righe.push("");
  righe.push("Strutture costruite:");
  if(state.strutture.length===0){ righe.push("  (nessuna)"); }
  state.strutture.forEach(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    if(c) righe.push(`  \u2022 ${c.nome} (${c.categoria}) \u2014 Lv. ${s.livello}`);
  });
  const kmTot = state.rotte.reduce((s,r)=>s+Number(r.distanza||0),0);
  if(state.rotte.length>0){
    righe.push("");
    righe.push(`Rotte commerciali (${kmTot} km totali, ${costoMensileRotte().toFixed(1).replace(/\.0$/,"")} mo/mese):`);
    state.rotte.forEach(r=>{
      const difesa = kmDifesiRotta(r);
      righe.push(`  \u2022 ${r.nome} \u2014 ${r.distanza} km (${difesa>0 ? difesa+" km difesi da avamposto" : "scoperta"})`);
    });
  }
  righe.push("");
  righe.push(`Bilancio mensile \u2014 Costi fissi: ${fmtMo(costiFissiMensili())} mo \u00b7 Costi variabili: ${fmtMo(costiVariabiliMensili())} mo \u00b7 Totale: ${fmtMo(costoMensileTotale())} mo`);
  return righe.join("\n");
}

async function copySummary(){
  const testo = buildSummaryText();
  try{
    await navigator.clipboard.writeText(testo);
    showToast("Riepilogo copiato negli appunti");
  }catch(e){
    const ta = document.createElement("textarea");
    ta.value = testo;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try{
      document.execCommand("copy");
      showToast("Riepilogo copiato negli appunti");
    }catch(e2){
      showToast("Impossibile copiare automaticamente \u26a0");
    }
    ta.remove();
  }
}

export {
  buildSummaryText,
  copySummary
};
