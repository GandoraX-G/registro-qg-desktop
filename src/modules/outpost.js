import { state, callRenderAll, callRenderSottomeccaniche } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';
import {
  ELIPORTO_ARCANO_CFG,
  PORTO_MILITARE_CFG,
  AVAMPOSTO_RAGGIO_KM_PER_LIVELLO,
  AVAMPOSTO_CFG,
  MATERIALI_PREZZI
} from '../core/config.js';

export const TIPI_DISPIEGAMENTO_AVAMPOSTO = [
  {value:"standard", label:"Standard (rotta/territorio da Porta Ethea)"},
  {value:"specchio_acqua", label:"Specchio d'acqua collegato"},
  {value:"unshast_eliporto", label:"Ovunque in Unshast (metà costo)"},
  {value:"piano_dimensionale", label:"Piano Dimensionale Interno (doppio costo)"}
];

export function opzioniDispiegamentoAvamposto(){
  const livMin = ELIPORTO_ARCANO_CFG.livelloQGMinPianoDimensionale ?? 4;
  return TIPI_DISPIEGAMENTO_AVAMPOSTO.map(t=>{
    let abilitato = true, motivo = "";
    if(t.value === "specchio_acqua" && !hasPortoMilitare()){ abilitato = false; motivo = " — richiede Porto Militare"; }
    if(t.value === "unshast_eliporto" && !hasEliportoArcano()){ abilitato = false; motivo = " — richiede Eliporto Arcano"; }
    if(t.value === "piano_dimensionale"){
      if(!hasEliportoArcano()){ abilitato = false; motivo = " — richiede Eliporto Arcano"; }
      else if(state.livello < livMin){ abilitato = false; motivo = ` — richiede QG di Livello ${livMin}+`; }
    }
    return {...t, abilitato, motivo};
  });
}

export function validaTipoDispiegamentoAvamposto(tipo){
  const opz = opzioniDispiegamentoAvamposto().find(o=>o.value===tipo);
  if(!opz) return {ok:false, messaggio:"Tipo di dispiegamento non valido ⚠"};
  if(!opz.abilitato) return {ok:false, messaggio:`Dispiegamento non disponibile: ${opz.label}${opz.motivo} ⚠`};
  return {ok:true};
}

export function costoDispiegamentoAvamposto(tipo, costoBase){
  if(tipo === "unshast_eliporto") return costoBase * (ELIPORTO_ARCANO_CFG.moltiplicatoreCostoStandard ?? 0.5);
  if(tipo === "piano_dimensionale") return costoBase * (ELIPORTO_ARCANO_CFG.moltiplicatoreCostoPianoDimensionale ?? 2);
  return costoBase;
}

export function labelTipoDispiegamento(tipo){
  const t = TIPI_DISPIEGAMENTO_AVAMPOSTO.find(x=>x.value===tipo);
  return t ? t.label : tipo;
}

function hasStrutturaTipo(catId){ return state.strutture.some(s=>s.catId===catId); }
function hasPortoMilitare(){ return hasStrutturaTipo("porto_militare"); }
function hasEliportoArcano(){ return hasStrutturaTipo("eliporto_arcano"); }

export function elencoAvamposti(){
  return state.strutture.filter(s=>s.catId==="avamposto");
}
export function avampostoAssegnatoA(rottaUid){
  return state.rotte.find(r=>r.uid===rottaUid)?.avampostoUid || null;
}
export function avampostoLibero(struttura, rottaUidCorrente){
  return !state.rotte.some(r=>r.avampostoUid===struttura.uid && r.uid!==rottaUidCorrente);
}
export function haUnitaAllenate(){
  return state.strutture.some(s=>s.catId==="campo_addestramento" && (s.unitaAllenate||0) > 0);
}
export function raggioAvamposto(struttura){
  const perLivello = haUnitaAllenate() ? 600 : AVAMPOSTO_RAGGIO_KM_PER_LIVELLO;
  return perLivello * (struttura.livello||1);
}
export function raggioAvampostoEsterno(livello){
  const perLivello = haUnitaAllenate() ? 600 : AVAMPOSTO_RAGGIO_KM_PER_LIVELLO;
  return perLivello * Number(livello||1);
}
export function kmDifesiRotta(r){
  let difesa = 0;
  if(r.avampostoUid){
    const av = state.strutture.find(s=>s.uid===r.avampostoUid && s.catId==="avamposto");
    if(av) difesa = raggioAvamposto(av);
  }
  if(r.avampostoEsternoLivello){
    const esterno = raggioAvampostoEsterno(r.avampostoEsternoLivello);
    difesa = Math.max(difesa, esterno);
  }
  return difesa;
}

export function popolaSelectAvamposti(select, rottaUidCorrente){
  const scelto = select.value;
  select.innerHTML = `<option value="">— nessuno —</option>`;
  elencoAvamposti().forEach(av=>{
    const libero = avampostoLibero(av, rottaUidCorrente);
    const opt = document.createElement("option");
    opt.value = av.uid;
    opt.textContent = `Avamposto (Lv.${av.livello}, raggio ${raggioAvamposto(av)} km)` + (libero ? "" : " — già assegnato altrove");
    if(!libero && av.uid !== scelto) opt.disabled = true;
    select.appendChild(opt);
  });
  select.value = scelto || "";
}

export function popolaSelectCaricoMateriali(){
  const select = document.getElementById("rCaricoMateriale");
  if(!select || select.options.length > 1) return;
  Object.keys(MATERIALI_PREZZI).forEach(m=>{
    const opt = document.createElement("option");
    opt.value = m; opt.textContent = m;
    select.appendChild(opt);
  });
}

export function costoRifornimentoAvamposto(av){
  const per100 = av.rifornimentoRidotto
    ? (AVAMPOSTO_CFG.costoRifornimentoRidottoMoPer100Km||1)
    : (AVAMPOSTO_CFG.costoRifornimentoMoPer100Km||10);
  return (av.distanzaPortaEthea||0)/100 * per100;
}
export function guadagnoPassivoAvamposto(av){
  return raggioAvamposto(av)/100 * (AVAMPOSTO_CFG.guadagnoPassivoMoPer100KmRaggio||25);
}
export function impostaDistanzaAvamposto(uidStr, km){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="avamposto");
  if(!s) return;
  s.distanzaPortaEthea = Math.max(0, Number(km)||0);
  callRenderAll(); saveState();
}
export function toggleRifornimentoRidotto(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="avamposto");
  if(!s) return;
  s.rifornimentoRidotto = !s.rifornimentoRidotto;
  callRenderAll(); saveState();
}
export function applicaAvampostiMensile(){
  const righe = [];
  let entrateNette = 0;
  state.strutture.forEach(av=>{
    if(av.catId!=="avamposto") return;
    let costo = costoRifornimentoAvamposto(av);
    if(av.rifornimentoRidotto){
      const richiesti = AVAMPOSTO_CFG.rifornimentoRidottoMaterialiPerAvamposto||{};
      const scelta = Object.entries(richiesti).find(([m,q])=>(state.materiali[m]||0) >= q);
      if(scelta){
        state.materiali[scelta[0]] -= scelta[1];
      }else{
        costo = costoRifornimentoAvamposto({...av, rifornimentoRidotto:false});
        righe.push(`  • Avamposto: materiali per il rifornimento ridotto insufficienti, applicato il costo pieno.`);
      }
    }
    const guadagno = guadagnoPassivoAvamposto(av);
    entrateNette += guadagno - costo;
  });
  if(state.strutture.some(s=>s.catId==="avamposto")){
    registraMovimento("Avamposti: rifornimenti e guadagno passivo", entrateNette);
    righe.push(`  • Avamposti: ${entrateNette>=0?"+":""}${entrateNette.toFixed(1).replace(/\.0$/,"")} mo netti (rifornimenti − guadagno passivo).`);
  }
  return righe;
}
