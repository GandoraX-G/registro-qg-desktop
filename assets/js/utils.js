import {
  state,
  MATERIALI_PREZZI,
  CATALOGO,
  PUNTI_QG_MAX,
  COSTO_ROTTA_MO_PER_100KM,
  RISCHIO_ROTTA_BASE,
  RISCHIO_ROTTA_PER_100KM,
  RAFFINERIA_CAT_ID,
  CALENDARIO_ORDINE_STAGIONI,
  CALENDARIO_MOD_CAMPO_COLTIVATO
} from './storage.js';

import { kmDifesiRotta, applicaAvampostiMensile, avanzaGiardini, avanzaRitualiArcani } from './military.js';
import { showToast } from './modal.js';

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function escapeHtml(s){
  const d = document.createElement("div"); d.textContent = s||""; return d.innerHTML;
}

function fmtMo(n){
  return (Math.round(n*10)/10).toFixed(1).replace(/\.0$/,"");
}

function puntiCosto(struttura){
  if(struttura.exempt) return 0;
  if(struttura.categoria === "Generali") return 2;
  if(struttura.categoria === state.classe) return 2;
  return 4;
}

function puntiSpesiTotali(){
  return state.strutture.reduce((sum, s)=>{
    const cat = CATALOGO.find(c=>c.id===s.catId);
    if(!cat) return sum;
    return sum + puntiCosto(cat) * s.livello;
  }, 0);
}

function personaleRichiesto(){
  return state.strutture.reduce((sum,s)=>{
    const cat = CATALOGO.find(c=>c.id===s.catId);
    return sum + (cat ? cat.personale : 0);
  },0);
}

function valoreMagazzino(){
  return Object.entries(state.materiali).reduce((sum,[m,q])=>{
    const prezzo = MATERIALI_PREZZI[m] || 0;
    return sum + prezzo * (q||0);
  },0);
}

function costoMensileRotte(){
  return state.rotte.reduce((sum,r)=> sum + (r.distanza/100)*COSTO_ROTTA_MO_PER_100KM, 0);
}

/* ============================================================
   FINANZE — costi fissi/variabili e storico movimenti
   ============================================================ */
function costiFissiDettaglio(){
  return [
    {
      voce: "Stipendi lavoratori",
      base: `${state.lavoratori} lavorator${state.lavoratori===1?"e":"i"} × 1 mo`,
      importo: state.lavoratori
    }
  ];
}

function costiVariabiliDettaglio(){
  const righe = [];
  const kmTot = state.rotte.reduce((s,r)=>s+Number(r.distanza||0),0);
  righe.push({
    voce: "Rotte commerciali",
    base: state.rotte.length ? `${kmTot} km totali × 5 mo/100km` : "Nessuna rotta attiva",
    importo: costoMensileRotte()
  });
  return righe;
}

function costiFissiMensili(){
  return costiFissiDettaglio().reduce((s,r)=>s+r.importo,0);
}

function costiVariabiliMensili(){
  return costiVariabiliDettaglio().reduce((s,r)=>s+r.importo,0);
}

function costoMensileTotale(){
  return costiFissiMensili() + costiVariabiliMensili();
}

function registraMovimento(label, importo){
  state.oro += importo;
  state.movimenti.unshift({
    data: new Date().toLocaleDateString("it-IT", {day:"2-digit", month:"2-digit", year:"numeric"}) + " " +
          new Date().toLocaleTimeString("it-IT", {hour:"2-digit", minute:"2-digit"}),
    label,
    importo,
    saldoDopo: state.oro
  });
  if(state.movimenti.length > 60) state.movimenti.length = 60;
}

// Fondi "spendibili" dalle azioni volontarie dell'app (costruzioni, acquisti,
// potenziamenti...), al netto della riserva bancaria fissa che l'utente non
// vuole veder intaccata da queste azioni. L'upkeep obbligatorio di fine mese
// NON usa questa funzione: si paga comunque, ma la chiusura mese avvisa se
// scende sotto la riserva.
function oroDisponibile(){
  return state.oro - (state.riservaBancaria || 0);
}

// Rischio attacco su una rotta: percentuale base + una quota per ogni blocco di
// 100km non difesi (valori presi da regolamento.json, non più hardcoded).
function calcRischio(distanza, difesa){
  const dif = Math.min(Number(difesa)||0, Number(distanza)||0);
  const nonDifesi = Math.max(0,(Number(distanza)||0) - dif);
  if(nonDifesi <= 0) return 0;
  const blocchi = Math.ceil(nonDifesi/100);
  return Math.min(100, RISCHIO_ROTTA_BASE + RISCHIO_ROTTA_PER_100KM*blocchi);
}

/* ============================================================
   MOTORE DEL CICLO MENSILE (P2)
   ------------------------------------------------------------
   Copre: produzione delle strutture di Produzione (con scelta
   materiale per la Miniera e modificatore stagionale per il Campo
   Coltivato), sinergia con la Raffineria, generazione dei Token
   mensili, upkeep (stipendi + rotte, già esistenti), e un tiro di
   rischio-attacco per ogni rotta commerciale.

   Cosa NON copre ancora (rimandato a P3, dove ogni struttura avrà
   la sua sotto-meccanica dedicata): spesa dei Token sulle tabelle,
   Opera d'Arte della Bottega Artistica, Stoffa extra da pecore in
   Fattoria, "Ottenere Carne", semi/oli della Segheria, decadimento
   di piante/bento/charm (queste strutture non hanno ancora uno
   stato proprio da far decadere).
   ============================================================ */

function haRaffineria(){
  return state.strutture.some(s=>s.catId===RAFFINERIA_CAT_ID);
}

// Determina cosa produce una singola Miniera questo mese, rispettando la
// scelta del giocatore (s.produzioneScelta) tra i livelli/materiali
// sbloccati dal suo livello attuale; di default usa il livello più alto
// disponibile.
function scelteProduzioneMiniera(s, c){
  return (c.produzione.scelte||[]).filter(sc=>s.livello >= sc.livelloMin);
}
function scelteProduzioneAttivaMiniera(s, c){
  const disponibili = scelteProduzioneMiniera(s, c);
  if(disponibili.length===0) return null;
  const scelta = disponibili.find(sc=>sc.materiale === s.produzioneScelta);
  return scelta || disponibili[disponibili.length-1]; // default: livello più alto sbloccato
}

// Calcola la produzione mensile di tutte le strutture di Produzione.
// Ritorna un array di righe {strutturaUid, nome, materiale, quantita} pronte
// sia per essere sommate al magazzino sia per essere mostrate nel resoconto.
function calcolaProduzioneMensile(){
  const righe = [];
  const raffineria = haRaffineria();
  state.strutture.forEach(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    if(!c) return;

    if(c.produzioneStep){
      const tabella = c.produzioneStep.valori;
      // usa il valore del livello corrente, o quello più alto disponibile sotto di esso
      const livelliDisponibili = Object.keys(tabella).map(Number).filter(l=>l<=s.livello);
      if(livelliDisponibili.length===0) return;
      const quantita = tabella[Math.max(...livelliDisponibili)];
      righe.push({ strutturaUid: s.uid, nome: c.nome, materiale: c.produzioneStep.materiale, quantita });
      return;
    }
    if(!c.produzione) return;
    const p = c.produzione;

    if(c.id === "miniera"){
      const scelta = scelteProduzioneAttivaMiniera(s, c);
      if(!scelta) return;
      const quantita = scelta.base + scelta.perLivello * s.livello;
      righe.push({ strutturaUid: s.uid, nome: c.nome, materiale: scelta.materiale, quantita });
      return;
    }

    let quantita = p.base + p.perLivello * s.livello;
    let materiale = p.materiale;

    if(p.stagionale && c.id === "campo_coltivato"){
      quantita += CALENDARIO_MOD_CAMPO_COLTIVATO[state.calendario.stagione] || 0;
      quantita = Math.max(0, quantita);
    }
    if(raffineria && p.materialeRaffinato){
      materiale = p.materialeRaffinato;
    }
    righe.push({ strutturaUid: s.uid, nome: c.nome, materiale, quantita });
  });
  return righe;
}

// Token generati questo mese: 1 per ogni struttura attiva del tipo giusto
// (Miniera -> Token Miniera, Pescheria -> Token Pesca, Fattoria -> Token
// Concime). La spesa dei token sulle tabelle dedicate arriva in P3.
function calcolaTokenMensili(){
  const generati = { miniera: 0, pesca: 0, concime: 0 };
  state.strutture.forEach(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    const tipo = c && c.produzione && c.produzione.token;
    if(tipo && generati[tipo] !== undefined) generati[tipo]++;
  });
  return generati;
}

// Tira il rischio-attacco per ogni rotta. Se la rotta ha un carico dichiarato
// (opzionale: materiale + quantità che trasporta di solito) e il tiro fallisce,
// ne perde metà dal magazzino, come da regolamento ("perdita di metà delle
// risorse trasportate"). Se non è stato dichiarato nessun carico, il tiro
// viene comunque effettuato e loggato, ma senza risorse da sottrarre: non
// esiste ancora un sistema di "merci in transito" tracciato in automatico
// (arriverà con l'economia inter-QG di P4).
function tiraRischioRotte(){
  return state.rotte.map(r=>{
    const difesa = kmDifesiRotta(r);
    const rischioPct = calcRischio(r.distanza, difesa);
    const tiro = Math.floor(Math.random()*100)+1; // 1-100
    const colpita = tiro <= rischioPct;
    let perso = null;
    if(colpita && r.carico && r.carico.materiale && r.carico.quantita>0){
      perso = Math.ceil(r.carico.quantita/2);
      state.materiali[r.carico.materiale] = Math.max(0, (state.materiali[r.carico.materiale]||0) - perso);
    }
    return { rotta: r.nome, rischioPct, tiro, colpita, materiale: r.carico?.materiale||null, perso };
  });
}

function prossimaStagione(stagioneAttuale){
  const idx = CALENDARIO_ORDINE_STAGIONI.indexOf(stagioneAttuale);
  return CALENDARIO_ORDINE_STAGIONI[(idx+1) % CALENDARIO_ORDINE_STAGIONI.length] || stagioneAttuale;
}

// Esegue l'intera chiusura del mese: produzione -> magazzino, token, tiri
// rischio sulle rotte, upkeep dalla tesoreria, avanzamento calendario.
// Ritorna il resoconto (righe di testo) da mostrare/salvare, senza ancora
// applicare nulla al render — quello lo fa il chiamante dopo la conferma.
function eseguiChiusuraMese(){
  const righe = [];
  righe.push(`═══ Chiusura di ${state.calendario.stagione}, mese ${state.calendario.mese} ═══`);

  // 1) Produzione
  const produzione = calcolaProduzioneMensile();
  if(produzione.length===0){
    righe.push("Produzione: nessuna struttura di Produzione attiva.");
  }else{
    righe.push("Produzione:");
    produzione.forEach(p=>{
      state.materiali[p.materiale] = (state.materiali[p.materiale]||0) + p.quantita;
      righe.push(`  • ${p.nome} → +${p.quantita} ${p.materiale}`);
    });
  }

  // 1bis) Piante speciali del Giardino (crescita/morte in base al clima)
  const righeGiardino = avanzaGiardini();
  if(righeGiardino.length>0){
    righe.push("Giardino — piante speciali:");
    righe.push(...righeGiardino);
  }

  // 2) Token
  const token = calcolaTokenMensili();
  const tokenGenerati = Object.entries(token).filter(([,v])=>v>0);
  if(tokenGenerati.length>0){
    righe.push("Token generati (spendibili su tabelle dedicate — funzione in arrivo):");
    tokenGenerati.forEach(([tipo,v])=>{
      state.token[tipo] = (state.token[tipo]||0) + v;
      righe.push(`  • Token ${tipo}: +${v} (totale ${state.token[tipo]})`);
    });
  }

  // 3) Rischio rotte
  if(state.rotte.length>0){
    righe.push("Rotte commerciali:");
    tiraRischioRotte().forEach(esito=>{
      if(!esito.colpita){
        righe.push(`  • ${esito.rotta}: tiro ${esito.tiro} vs ${esito.rischioPct}% — nessun attacco`);
      }else if(esito.perso){
        righe.push(`  • ${esito.rotta}: ATTACCATA (tiro ${esito.tiro} vs ${esito.rischioPct}%) — persi ${esito.perso} ${esito.materiale}`);
      }else{
        righe.push(`  • ${esito.rotta}: ATTACCATA (tiro ${esito.tiro} vs ${esito.rischioPct}%) — nessun carico dichiarato, nessuna perdita applicata`);
      }
    });
  }

  // 4bis) Catalizzatori d'Essenza scarichi: tornano disponibili dopo l'attesa
  let catalizzatoriPronti = 0;
  state.strutture.forEach(s=>{
    if(s.catId==="santuario" && s.catalizzatore && s.catalizzatore.stato==="in_attesa"){
      s.catalizzatore.stato = "vuoto";
      catalizzatoriPronti++;
    }
  });
  if(catalizzatoriPronti>0) righe.push(`${catalizzatoriPronti} Catalizzatore/i d'Essenza tornato/i disponibile/i.`);

  // 4ter) Indagini della Biblioteca scadute (bonus +5 / bestiario, durata 1 mese)
  let indaginiScadute = 0;
  state.strutture.forEach(s=>{
    if(s.catId!=="biblioteca") return;
    const primaCount = s.indagini.length;
    s.indagini = s.indagini.filter(i=>i.meseScadenza > state.calendario.mese);
    indaginiScadute += primaCount - s.indagini.length;
  });
  if(indaginiScadute>0) righe.push(`${indaginiScadute} bonus da Indagine scaduto/i (fine del mese).`);

  // 4quater) Reset mensili: Bottega Artistica (1 Opera/mese) e Studio Diplomatico (fazioni)
  state.strutture.forEach(s=>{
    if(s.catId==="bottega_artistica") s.creataQuestoMese = false;
    if(s.catId==="studio_diplomatico") s.fazioniSelezionate = [];
  });

  // 4quinquies) Sala Arcana: avanzamento rituali in corso
  const righeRituali = avanzaRitualiArcani();
  if(righeRituali.length>0){ righe.push("Sala Arcana:"); righe.push(...righeRituali); }

  // 4sexies) Avamposti: rifornimenti mensili e guadagno passivo (gap P1 colmato in P3)
  const righeAvamposti = applicaAvampostiMensile();
  if(righeAvamposti.length>0){ righe.push("Avamposti:"); righe.push(...righeAvamposti); }

  // 4) Upkeep (stipendi + rotte) — logica di finanza già esistente
  const totaleUpkeep = costoMensileTotale();
  if(totaleUpkeep>0){
    registraMovimento(`Chiusura mese (stipendi ${fmtMo(costiFissiMensili())} mo, rotte ${fmtMo(costiVariabiliMensili())} mo)`, -totaleUpkeep);
    righe.push(`Upkeep pagato: -${fmtMo(totaleUpkeep)} mo (saldo: ${fmtMo(state.oro)} mo)`);
  }else{
    righe.push("Upkeep: nessun costo da pagare.");
  }

  // 5) Avanza calendario
  const stagionePrecedente = state.calendario.stagione;
  state.calendario.mese++;
  if(state.calendario.mese % 3 === 1 && state.calendario.mese>1){
    state.calendario.stagione = prossimaStagione(stagionePrecedente);
  }
  righe.push(`Si passa al mese ${state.calendario.mese} (${state.calendario.stagione}).`);

  return righe;
}

function contaStruttureCategoria(cat){
  return state.strutture.filter(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    return c && c.categoria===cat;
  }).length;
}

function hasStrutturaSpecializzata(){
  return state.strutture.some(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    return c && c.categoria !== "Generali";
  });
}

function buildSummaryText(){
  const righe = [];
  righe.push(`Quartier Generale — ${state.nome || "(senza nome)"}`);
  if(state.fondatore || state.cofondatore){
    righe.push(`Fondatore: ${state.fondatore || "—"} · Co-fondatore: ${state.cofondatore || "—"}`);
  }
  const classeLabel = state.classe==="Nessuna" ? "Senza Classe" : "Classe " + state.classe;
  righe.push(`${classeLabel} · Livello QG ${state.livello}`);
  righe.push("");
  righe.push(`Tesoreria: ${state.oro} mo`);
  righe.push(`Punti QG: ${puntiSpesiTotali()} / ${PUNTI_QG_MAX}`);
  righe.push(`Personale richiesto: ${personaleRichiesto()} (+ ${state.lavoratori} lavoratori assunti)`);
  righe.push("");
  righe.push("Membri:");
  if(state.membri.length===0){ righe.push("  (nessuno)"); }
  state.membri.forEach(m=> righe.push(`  • ${m.nome} — Lv. ${m.livello}`));
  righe.push("");
  righe.push("Strutture costruite:");
  if(state.strutture.length===0){ righe.push("  (nessuna)"); }
  state.strutture.forEach(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    if(c) righe.push(`  • ${c.nome} (${c.categoria}) — Lv. ${s.livello}`);
  });
  const kmTot = state.rotte.reduce((s,r)=>s+Number(r.distanza||0),0);
  if(state.rotte.length>0){
    righe.push("");
    righe.push(`Rotte commerciali (${kmTot} km totali, ${costoMensileRotte().toFixed(1).replace(/\.0$/,"")} mo/mese):`);
    state.rotte.forEach(r=>{
      const difesa = kmDifesiRotta(r);
      righe.push(`  • ${r.nome} — ${r.distanza} km (${difesa>0 ? difesa+" km difesi da avamposto" : "scoperta"})`);
    });
  }
  righe.push("");
  righe.push(`Bilancio mensile — Costi fissi: ${fmtMo(costiFissiMensili())} mo · Costi variabili: ${fmtMo(costiVariabiliMensili())} mo · Totale: ${fmtMo(costoMensileTotale())} mo`);
  return righe.join("\n");
}

async function copySummary(){
  const testo = buildSummaryText();
  try{
    await navigator.clipboard.writeText(testo);
    showToast("Riepilogo copiato negli appunti");
  }catch(e){
    // fallback per contesti senza permessi clipboard (es. file:// in alcuni browser)
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
      showToast("Impossibile copiare automaticamente ⚠");
    }
    ta.remove();
  }
}

export {
  uid,
  escapeHtml,
  fmtMo,
  puntiCosto,
  puntiSpesiTotali,
  personaleRichiesto,
  valoreMagazzino,
  costoMensileRotte,
  costiFissiDettaglio,
  costiVariabiliDettaglio,
  costiFissiMensili,
  costiVariabiliMensili,
  costoMensileTotale,
  registraMovimento,
  oroDisponibile,
  calcRischio,
  contaStruttureCategoria,
  hasStrutturaSpecializzata,
  buildSummaryText,
  haRaffineria,
  scelteProduzioneMiniera,
  scelteProduzioneAttivaMiniera,
  calcolaProduzioneMensile,
  calcolaTokenMensili,
  tiraRischioRotte,
  prossimaStagione,
  eseguiChiusuraMese,
  copySummary
};
