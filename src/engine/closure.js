import { calcolaProduzioneMensile, haRaffineria } from './production.js';
import { calcolaTokenMensili } from './tokens.js';
import { tiraRischioRotte } from './risk.js';
import { costoMensileTotale, costiFissiMensili, costiVariabiliMensili, registraMovimento } from './finance.js';
import { prossimaStagione } from '../core/calendar.js';
import { state } from '../core/state.js';
import { CALENDARIO_MOD_CAMPO_COLTIVATO } from '../core/config.js';
import { fmtMo, uid } from '../utils/format.js';
import { kmDifesiRotta, applicaAvampostiMensile } from '../modules/outpost.js';
import { avanzaGiardini } from '../modules/giardino.js';
import { avanzaRitualiArcani } from '../modules/sala-arcana.js';

function eseguiChiusuraMese(){
  const righe = [];
  righe.push(`\u2550\u2550\u2550 Chiusura di ${state.calendario.stagione}, mese ${state.calendario.mese} \u2550\u2550\u2550`);

  const produzione = calcolaProduzioneMensile();
  if(produzione.length===0){
    righe.push("Produzione: nessuna struttura di Produzione attiva.");
  }else{
    righe.push("Produzione:");
    produzione.forEach(p=>{
      state.materiali[p.materiale] = (state.materiali[p.materiale]||0) + p.quantita;
      righe.push(`  \u2022 ${p.nome} \u2192 +${p.quantita} ${p.materiale}`);
    });
  }

  const righeGiardino = avanzaGiardini();
  if(righeGiardino.length>0){
    righe.push("Giardino \u2014 piante speciali:");
    righe.push(...righeGiardino);
  }

  const token = calcolaTokenMensili();
  const tokenGenerati = Object.entries(token).filter(([,v])=>v>0);
  if(tokenGenerati.length>0){
    righe.push("Token generati:");
    tokenGenerati.forEach(([tipo,v])=>{
      state.token[tipo] = (state.token[tipo]||0) + v;
      righe.push(`  \u2022 Token ${tipo}: +${v} (totale disponibili: ${state.token[tipo]})`);
    });
  }

  const tokenConcimeDaSpent = Math.min(state.token.concime || 0, Number(state.tokenConcimeDaSpendere) || 0);
  if(tokenConcimeDaSpent > 0){
    state.token.concime -= tokenConcimeDaSpent;
    const bonusVegetali = tokenConcimeDaSpent * 10;
    const materialeBonus = haRaffineria() ? "Beni vegetali raffinati" : "Beni vegetali";
    state.materiali[materialeBonus] = (state.materiali[materialeBonus] || 0) + bonusVegetali;
    righe.push(`Token Concime spesi: ${tokenConcimeDaSpent} \u2192 +${bonusVegetali} ${materialeBonus} (da Campo Coltivato e/o Giardino)`);
  }
  state.tokenConcimeDaSpendere = 0;

  function spendTokenDice(tokenType, label) {
    const key = 'token' + tokenType.charAt(0).toUpperCase() + tokenType.slice(1) + 'DaSpendere';
    const maxSpent = Math.min(state.token[tokenType] || 0, Number(state[key]) || 0, 3);
    if (maxSpent <= 0) return;
    state.token[tokenType] -= maxSpent;
    const sides = maxSpent === 1 ? 6 : maxSpent === 2 ? 10 : 12;
    const roll = Math.floor(Math.random() * sides) + 1;
    righe.push(`Token ${label} spesi: ${maxSpent} \u2192 tiro d${sides} = ${roll} (risultato da consultare sulla tabella del luogo)`);
  }
  spendTokenDice('miniera', 'Miniera');
  spendTokenDice('pesca', 'Pesca');
  state.tokenMinieraDaSpendere = 0;
  state.tokenPescaDaSpendere = 0;

  if(state.rotte.length>0){
    righe.push("Rotte commerciali:");
    tiraRischioRotte().forEach(esito=>{
      if(!esito.colpita){
        righe.push(`  \u2022 ${esito.rotta}: tiro ${esito.tiro} vs ${esito.rischioPct}% \u2014 nessun attacco`);
      }else if(esito.perso){
        righe.push(`  \u2022 ${esito.rotta}: ATTACCATA (tiro ${esito.tiro} vs ${esito.rischioPct}%) \u2014 persi ${esito.perso} ${esito.materiale}`);
      }else{
        righe.push(`  \u2022 ${esito.rotta}: ATTACCATA (tiro ${esito.tiro} vs ${esito.rischioPct}%) \u2014 nessun carico dichiarato, nessuna perdita applicata`);
      }
    });
  }

  let catalizzatoriPronti = 0;
  state.strutture.forEach(s=>{
    if(s.catId==="santuario" && s.catalizzatore && s.catalizzatore.stato==="in_attesa"){
      s.catalizzatore.stato = "vuoto";
      catalizzatoriPronti++;
    }
  });
  if(catalizzatoriPronti>0) righe.push(`${catalizzatoriPronti} Catalizzatore/i d'Essenza tornato/i disponibile/i.`);

  let indaginiScadute = 0;
  state.strutture.forEach(s=>{
    if(s.catId!=="biblioteca") return;
    if(!s.indagini) s.indagini = [];
    const primaCount = s.indagini.length;
    s.indagini = s.indagini.filter(i=>i.meseScadenza > state.calendario.mese);
    indaginiScadute += primaCount - s.indagini.length;
  });
  if(indaginiScadute>0) righe.push(`${indaginiScadute} bonus da Indagine scaduto/i (fine del mese).`);

  state.strutture.forEach(s=>{
    if(s.catId==="bottega_artistica") s.creataQuestoMese = false;
    if(s.catId==="studio_diplomatico") s.fazioniSelezionate = [];
    if(s.catId==="fattoria") s.carneSacrificataQuestoMese = false;
    if(s.catId==="sartoria" && s.abitoSpeciale && s.abitoSpeciale.missioniRimaste > 0) {
      s.abitoSpeciale.missioniRimaste--;
      if(s.abitoSpeciale.missioniRimaste <= 0) righe.push(`Abito Speciale esaurito.`);
    }
    if(s.catId==="fabbro" && s.affilatura && s.affilatura.missioniRimaste > 0) {
      s.affilatura.missioniRimaste--;
      if(s.affilatura.missioniRimaste <= 0) righe.push(`Affilatura di ${s.affilatura.nome} esaurita.`);
    }
    if(s.catId==="locanda" && s.benti && s.benti.length > 0) {
      const giorniMese = 30;
      let bentiScaduti = 0;
      s.benti = s.benti.filter(b => {
        b.giorniRimasti -= giorniMese;
        if (b.giorniRimasti <= 0) { bentiScaduti++; return false; }
        return true;
      });
      if(bentiScaduti > 0) righe.push(`${bentiScaduti} Bento scaduto/i.`);
    }
    if(s.catId==="sala_svago" && s.spettacoloInCorso) {
      const settimaneMese = 4;
      s.spettacoloInCorso.settimaneRimaste -= settimaneMese;
      if(s.spettacoloInCorso.settimaneRimaste <= 0) {
        righe.push(`Spettacolo ${s.spettacoloInCorso.tipo} completato! Tutti gli assistiti ottengono: ${s.spettacoloInCorso.tipo === 'Piccolo' ? 'Aiuto + Interdizione alla morte' : s.spettacoloInCorso.tipo === 'Medio' ? 'Aiuto (3\u00b0) + Conoscenza delle leggende' : 'Aiuto (4\u00b0) + Banchetto degli eroi'}.`);
        s.spettacoloInCorso = null;
      } else {
        righe.push(`Spettacolo ${s.spettacoloInCorso.tipo}: ${s.spettacoloInCorso.settimaneRimaste} settimane rimaste.`);
      }
    }
    if(s.catId==="servizio_edile" && s.strutturaInCostruzione) {
      s.strutturaInCostruzione.mesiRimasti--;
      if(s.strutturaInCostruzione.mesiRimasti <= 0) {
        const nuova = s.strutturaInCostruzione;
        state.strutture.push({ uid: uid(), catId: nuova.catId, livello: 1, materialiScelte: nuova.materialiScelte || 'primari' });
        righe.push(`Servizio Edile: ${nuova.nome} completata e aggiunta alle strutture!`);
        s.strutturaInCostruzione = null;
      } else {
        righe.push(`Servizio Edile: ${s.strutturaInCostruzione.nome} \u2014 ${s.strutturaInCostruzione.mesiRimasti} mese/i rimasto/i.`);
      }
    }
  });

  const righeRituali = avanzaRitualiArcani();
  if(righeRituali.length>0){ righe.push("Sala Arcana:"); righe.push(...righeRituali); }

  const righeAvamposti = applicaAvampostiMensile();
  if(righeAvamposti.length>0){ righe.push("Avamposti:"); righe.push(...righeAvamposti); }

  const totaleUpkeep = costoMensileTotale();
  if(totaleUpkeep>0){
    registraMovimento(`Chiusura mese (stipendi ${fmtMo(costiFissiMensili())} mo, rotte ${fmtMo(costiVariabiliMensili())} mo)`, -totaleUpkeep);
    righe.push(`Upkeep pagato: -${fmtMo(totaleUpkeep)} mo (saldo: ${fmtMo(state.oro)} mo)`);
  }else{
    righe.push("Upkeep: nessun costo da pagare.");
  }

  const stagionePrecedente = state.calendario.stagione;
  state.calendario.mese++;
    if(state.calendario.mese % 3 === 1 && state.calendario.mese>1){
    state.calendario.stagione = prossimaStagione(stagionePrecedente);
  }
  righe.push(`Si passa al mese ${state.calendario.mese} (${state.calendario.stagione}).`);

  return righe;
}

export { eseguiChiusuraMese };
