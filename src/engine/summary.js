import { state } from '../core/state.js';
import { CATALOGO, PUNTI_QG_MAX, MATERIALI_PREZZI, AVAMPOSTO_RAGGIO_KM_PER_LIVELLO } from '../core/config.js';
import { fmtMo } from '../utils/format.js';
import { puntiSpesiTotali, personaleRichiesto, valoreMagazzino } from './qg.js';
import { costoMensileRotte, costiFissiDettaglio, costiVariabiliDettaglio, costiFissiMensili, costiVariabiliMensili, costoMensileTotale, oroDisponibile } from './finance.js';
import { calcolaTokenMensili } from './tokens.js';
import { calcolaProduzioneMensile, haRaffineria } from './production.js';
import { kmDifesiRotta, raggioAvamposto, labelTipoDispiegamento, costoRifornimentoAvamposto, guadagnoPassivoAvamposto } from '../modules/outpost.js';
import { showToast } from '../ui/toast.js';

const SEP = '\u2500'.repeat(40);

function buildSummaryText(){
  const righe = [];
  const L = (s) => (s || '\u2014');

  // ── HEADER ──
  righe.push(`QUARTIER GENERALE \u2014 ${L(state.nome)}`);
  if(state.fondatore || state.cofondatore){
    righe.push(`Fondatore: ${L(state.fondatore)} \u00b7 Co-fondatore: ${L(state.cofondatore)}`);
  }
  const classeLabel = state.classe === "Nessuna" ? "Senza Classe" : `Classe ${state.classe}`;
  righe.push(`${classeLabel} \u00b7 Livello QG ${state.livello}`);
  righe.push(`Calendario: Mese ${state.calendario.mese} \u00b7 ${state.calendario.stagione} \u00b7 Clima: ${state.clima}`);
  righe.push(SEP);

  // ── ECONOMIA ──
  righe.push("");
  righe.push("=== ECONOMIA ===");
  righe.push(`Tesoreria: ${state.oro} mo`);
  righe.push(`Oro disponibile (riserva esclusa): ${fmtMo(oroDisponibile())} mo`);
  righe.push(`Riserva bancaria: ${state.riservaBancaria} mo`);
  righe.push(`Punti QG: ${puntiSpesiTotali()} / ${PUNTI_QG_MAX}`);
  righe.push(`Personale richiesto: ${personaleRichiesto()} \u00b7 Assunti: ${state.lavoratori}`);
  righe.push(SEP);

  // ── TOKEN ──
  const tokenMensili = calcolaTokenMensili();
  righe.push("");
  righe.push("=== TOKEN ===");
  righe.push(`Generazione mensile: Concime ${tokenMensili.concime} \u00b7 Miniera ${tokenMensili.miniera} \u00b7 Pesca ${tokenMensili.pesca}`);
  righe.push(`Bilancio attuale: Concime ${state.token.concime} \u00b7 Miniera ${state.token.miniera} \u00b7 Pesca ${state.token.pesca}`);
  righe.push(`Da spendere: Concime ${state.tokenConcimeDaSpendere} \u00b7 Miniera ${state.tokenMinieraDaSpendere} \u00b7 Pesca ${state.tokenPescaDaSpendere}`);
  righe.push(SEP);

  // ── MEMBRI ──
  righe.push("");
  righe.push("=== MEMBRI ===");
  if(state.membri.length === 0){
    righe.push("  (nessuno)");
  }else{
    state.membri.forEach(m => righe.push(`  \u2022 ${m.nome} \u2014 Lv. ${m.livello}`));
  }
  righe.push(SEP);

  // ── STRUTTURE ──
  righe.push("");
  righe.push("=== STRUTTURE ===");
  if(state.strutture.length === 0){
    righe.push("  (nessuna)");
  }else{
    state.strutture.forEach(s => {
      const c = CATALOGO.find(x => x.id === s.catId);
      if(!c) return;
      righe.push(`  \u2022 ${c.nome} (${c.categoria}) \u2014 Lv. ${s.livello}`);
      righe.push(`    Costo QG: ${s.livello}x ${c.exempt ? "esente" : (c.categoria === "Generali" || c.categoria === state.classe) ? "2 pt" : "4 pt"}`);

      // Sub-mechanics per catId
      if(s.catId === "studio_arcano" && s.charmAttivo){
        righe.push(`    Charm attivo`);
      }
      if(s.catId === "santuario" && s.catalizzatore){
        righe.push(`    Catalizzatore: ${s.catalizzatore.stato}`);
      }
      if(s.catId === "alchimista" && s.pozioni && s.pozioni.length > 0){
        righe.push(`    Pozioni: ${s.pozioni.map(p => `${p.nome} (${p.rarita}) x${p.quantita}`).join(", ")}`);
      }
      if(s.catId === "biblioteca"){
        if(s.temi && s.temi.length > 0) righe.push(`    Temi: ${s.temi.join(", ")}`);
        if(s.indagini && s.indagini.length > 0) righe.push(`    Indagini: ${s.indagini.map(i => `${i.argomento}${i.personaggio ? " (" + i.personaggio + ")" : ""}${i.meseScadenza ? " [scad. mese " + i.meseScadenza + "]" : ""}`).join("; ")}`);
        if(s.bestiario && s.bestiario.length > 0) righe.push(`    Bestiario: ${s.bestiario.map(b => b.nome).join(", ")}`);
      }
      if(s.catId === "giardino" && s.piante && s.piante.length > 0){
        righe.push(`    Piante: ${s.piante.map(p => `${p.nome} (${p.clima}, ${p.mesiCrescita} mesi)`).join(", ")}`);
      }
      if(s.catId === "bottega_artistica" && s.opere && s.opere.length > 0){
        righe.push(`    Opere: ${s.opere.map(o => `${o.stile} (val. ${o.valore} mo)`).join(", ")}`);
      }
      if(s.catId === "studio_diplomatico"){
        if(s.fazioniSelezionate && s.fazioniSelezionate.length > 0) righe.push(`    Fazioni: ${s.fazioniSelezionate.join(", ")}`);
        if(s.companions && s.companions.length > 0) righe.push(`    Companion: ${s.companions.map(c => `${c.nome} (Lv. ${c.livello}, ${c.fazioniOrigine})`).join("; ")}`);
      }
      if(s.catId === "avamposto"){
        const raggio = raggioAvamposto(s);
        const costo = costoRifornimentoAvamposto(s);
        const guadagno = guadagnoPassivoAvamposto(s);
        righe.push(`    Distanza da Porta Ethea: ${s.distanzaPortaEthea || 0} km`);
        righe.push(`    Raggio protezione: ${raggio} km \u00b7 Tipo: ${labelTipoDispiegamento(s.tipoDispiegamento || "standard")}`);
        righe.push(`    Rifornimento ridotto: ${s.rifornimentoRidotto ? "s\u00ec" : "no"} \u00b7 Costo mensile: ${fmtMo(costo)} mo \u00b7 Guadagno passivo: ${fmtMo(guadagno)} mo`);
      }
      if(s.catId === "sala_da_guerra"){
        righe.push(`    Stato guerra: ${L(s.statoGuerra)}`);
        if(s.note) righe.push(`    Note: ${s.note}`);
      }
      if(s.catId === "sala_arcana" && s.rituale){
        righe.push(`    Rituale: ${s.rituale.incantesimo} (Lv. ${s.rituale.livello}) \u2014 ${s.rituale.settimaneRimanenti} settimane rimaste \u2014 ${s.rituale.personaggio}`);
      }
      if(s.catId === "campo_addestramento"){
        if(s.unitaInAddestramento && s.unitaInAddestramento.length > 0) righe.push(`    In addestramento: ${s.unitaInAddestramento.map(u => u.nome).join(", ")}`);
        righe.push(`    Unit\u00e0 allenate: ${s.unitaAllenate || 0}`);
      }
      if(s.catId === "impresa"){
        righe.push(`    Tipo: ${s.tipo === "porta_ethea" ? "Porta Ethea" : "Distanza"} \u00b7 Spesa mensile: ${s.spesaMensile || 0} mo`);
        if(s.strutturaVenditaUid) righe.push(`    Struttura di vendita collegata`);
        if(s.strumenti && s.strumenti.length > 0) righe.push(`    Strumenti: ${s.strumenti.join(", ")}`);
      }
      if(s.catId === "fattoria"){
        const a = s.animali || {};
        const animali = Object.entries(a).filter(([,v]) => v > 0);
        if(animali.length > 0) righe.push(`    Animali: ${animali.map(([k,v]) => `${k} x${v}`).join(", ")}`);
        righe.push(`    Carne sacrificata questo mese: ${s.carneSacrificataQuestoMese ? "s\u00ec" : "no"}`);
      }
      if(s.catId === "segheria"){
        if(s.alberoScelto) righe.push(`    Albero: ${s.alberoScelto}`);
        if(s.semiProdotti && s.semiProdotti.length > 0) righe.push(`    Semi prodotti: ${s.semiProdotti.join(", ")}`);
        if(s.oliProdotti && s.oliProdotti.length > 0) righe.push(`    Oli prodotti: ${s.oliProdotti.map(o => `${o.nome} (${o.elemento})`).join(", ")}`);
      }
      if(s.catId === "sartoria" && s.abitoSpeciale){
        righe.push(`    Abito speciale: ${s.abitoSpeciale.missioniRimaste}/${s.abitoSpeciale.missioniTotali} missioni rimaste \u00b7 Stoffa spesa: ${s.abitoSpeciale.stoffaSpesa}`);
      }
      if(s.catId === "fabbro" && s.affilatura){
        righe.push(`    Affilatura: ${s.affilatura.nome} (${s.affilatura.bonus}) \u2014 ${s.affilatura.missioniRimaste}/${s.affilatura.missioniTotali} missioni \u00b7 Ferro speso: ${s.affilatura.ferroSpeso}`);
      }
      if(s.catId === "locanda"){
        if(s.piattiServiti && s.piattiServiti.length > 0) righe.push(`    Piatti serviti: ${s.piattiServiti.length}`);
        if(s.benti && s.benti.length > 0) righe.push(`    Bent: ${s.benti.map(b => `${b.personaggio} (${b.giorniRimasti}g rimasti)`).join(", ")}`);
      }
      if(s.catId === "sala_svago" && s.spettacoloInCorso){
        const sp = s.spettacoloInCorso;
        righe.push(`    Spettacolo: ${sp.tipo} \u2014 costo ${sp.costo} mo \u2014 ${sp.settimaneRimaste}/${sp.settimanePrep} settimane`);
      }
      if(s.catId === "servizio_edile" && s.strutturaInCostruzione){
        const co = s.strutturaInCostruzione;
        righe.push(`    In costruzione: ${co.nome} (Lv. ${co.livello}) \u2014 ${co.mesiRimasti} mesi rimasti`);
      }
    });
  }
  righe.push(SEP);

  // ── SATELLITI ──
  if(state.satelliti && state.satelliti.length > 0){
    righe.push("");
    righe.push("=== SATELLITI ===");
    state.satelliti.forEach(sat => {
      const c = CATALOGO.find(x => x.id === sat.catId);
      righe.push(`  \u2022 ${c ? c.nome : sat.catId} \u2014 Citt\u00e0: ${L(sat.nomeCitta)}`);
    });
    righe.push(SEP);
  }

  // ── PRODUZIONE MENSILE ──
  const produzione = calcolaProduzioneMensile();
  if(produzione && produzione.length > 0){
    righe.push("");
    righe.push("=== PRODUZIONE MENSILE ===");
    if(haRaffineria()) righe.push("  (Raffineria attiva: produzione raffinata)");
    produzione.forEach(p => {
      righe.push(`  \u2022 ${p.nome}: ${p.materiale} x${p.quantita}`);
    });
    righe.push(SEP);
  }

  // ── MAGAZZINO (MATERIALI) ──
  righe.push("");
  righe.push("=== MAGAZZINO ===");
  const matKeys = Object.keys(state.materiali);
  if(matKeys.length === 0){
    righe.push("  (vuoto)");
  }else{
    let valoreTot = 0;
    matKeys.forEach(m => {
      const q = state.materiali[m] || 0;
      if(q <= 0) return;
      const prezzoUnit = MATERIALI_PREZZI[m] || 0;
      const valoreRiga = prezzoUnit * q;
      valoreTot += valoreRiga;
      righe.push(`  \u2022 ${m}: ${q} (val. ${fmtMo(valoreRiga)} mo)`);
    });
    righe.push(`  Valore totale magazzino: ${fmtMo(valoreTot)} mo`);
    if(state.magazzinoScontati && state.magazzinoScontati.length > 0){
      righe.push(`  Sconti attivi: ${state.magazzinoScontati.join(", ")}`);
    }
  }
  righe.push(SEP);

  // ── ROTTE COMMERCIALI ──
  righe.push("");
  righe.push("=== ROTTE COMMERCIALI ===");
  if(state.rotte.length === 0){
    righe.push("  (nessuna)");
  }else{
    const kmTot = state.rotte.reduce((s,r) => s + Number(r.distanza || 0), 0);
    righe.push(`  Totale: ${state.rotte.length} rotte \u00b7 ${kmTot} km \u00b7 Costo: ${fmtMo(costoMensileRotte())} mo/mese`);
    state.rotte.forEach(r => {
      const difesa = kmDifesiRotta(r);
      const carico = r.carico ? `${r.carico.materiale} x${r.carico.quantita}` : "nessun carico";
      righe.push(`  \u2022 ${r.nome} \u2014 ${r.distanza} km \u00b7 Carico: ${carico}`);
      righe.push(`    Difesa: ${difesa > 0 ? difesa + " km (avamposto)" : "scoperta"}`);
    });
  }
  righe.push(SEP);

  // ── BILANCIO MENSILE ──
  righe.push("");
  righe.push("=== BILANCIO MENSILE ===");
  const fissi = costiFissiDettaglio();
  righe.push("Costi fissi:");
  fissi.forEach(f => righe.push(`  \u2022 ${f.voce}: ${fmtMo(f.importo)} mo (${f.base})`));
  const vari = costiVariabiliDettaglio();
  righe.push("Costi variabili:");
  vari.forEach(v => righe.push(`  \u2022 ${v.voce}: ${fmtMo(v.importo)} mo (${v.base})`));
  righe.push(`  TOTALE USCITE: ${fmtMo(costoMensileTotale())} mo`);
  righe.push(SEP);

  // ── ULTIMI MOVIMENTI ──
  if(state.movimenti && state.movimenti.length > 0){
    righe.push("");
    righe.push("=== ULTIMI MOVIMENTI ===");
    state.movimenti.slice(0, 10).forEach(m => {
      const segno = m.importo >= 0 ? "+" : "";
      righe.push(`  ${m.data} \u2022 ${m.label} \u2022 ${segno}${fmtMo(m.importo)} mo (saldo: ${m.saldoDopo})`);
    });
    righe.push(SEP);
  }

  // ── ALTRI QG ──
  if(state.registroAltriQG && state.registroAltriQG.length > 0){
    righe.push("");
    righe.push("=== ALTRI QG ===");
    state.registroAltriQG.forEach(qg => {
      const tipo = qg.tipo === "creditore" ? "Credito verso" : qg.tipo === "debitore" ? "Debito verso" : qg.tipo;
      righe.push(`  \u2022 ${qg.nome}: ${tipo} ${fmtMo(qg.importo)} mo${qg.saldato ? " (saldato)" : ""}`);
    });
    righe.push(SEP);
  }

  righe.push("");
  righe.push(`Riepilogo generato il ${new Date().toLocaleDateString("it-IT")} alle ${new Date().toLocaleTimeString("it-IT", {hour:"2-digit", minute:"2-digit"})}`);
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
