import { state } from '../core/state.js';
import { CATALOGO, CALENDARIO_MOD_CAMPO_COLTIVATO, RAFFINERIA_CAT_ID } from '../core/config.js';

function haRaffineria(){
  return state.strutture.some(s=>s.catId===RAFFINERIA_CAT_ID);
}

function scelteProduzioneMiniera(s, c){
  return (c.produzione.scelte||[]).filter(sc=>s.livello >= sc.livelloMin);
}

function scelteProduzioneAttivaMiniera(s, c){
  const disponibili = scelteProduzioneMiniera(s, c);
  if(disponibili.length===0) return null;
  const scelta = disponibili.find(sc=>sc.materiale === s.produzioneScelta);
  return scelta || disponibili[disponibili.length-1];
}

function calcolaProduzioneMensile(){
  const righe = [];
  const raffineria = haRaffineria();
  state.strutture.forEach(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    if(!c) return;

    if(c.produzioneStep){
      const tabella = c.produzioneStep.valori;
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

  state.strutture.forEach(s=>{
    if(s.catId !== "fattoria") return;
    const pecore = (s.animali && s.animali.Pecora) || 0;
    if(pecore > 0){
      const qStoffa = pecore + (s.livello || 1);
      righe.push({ strutturaUid: s.uid, nome: 'Fattoria (Pecore)', materiale: 'Stoffa', quantita: qStoffa });
    }
  });

  if (state.satelliti && state.satelliti.length > 0) {
    state.satelliti.forEach(sat => {
      const c = CATALOGO.find(x => x.id === sat.catId);
      if (!c || !c.produzione) return;
      const p = c.produzione;
      if (c.id === 'miniera') {
        const scelte = (c.produzione.scelte || []).filter(sc => 1 >= sc.livelloMin);
        if (scelte.length === 0) return;
        const scelta = scelte[scelte.length - 1];
        righe.push({ strutturaUid: sat.uid, nome: `${c.nome} (satellite)`, materiale: scelta.materiale, quantita: scelta.base + scelta.perLivello });
        return;
      }
      let quantita = p.base + p.perLivello;
      let materiale = p.materiale;
      if (p.stagionale && c.id === 'campo_coltivato') {
        quantita += CALENDARIO_MOD_CAMPO_COLTIVATO[state.calendario.stagione] || 0;
        quantita = Math.max(0, quantita);
      }
      if (raffineria && p.materialeRaffinato) materiale = p.materialeRaffinato;
      righe.push({ strutturaUid: sat.uid, nome: `${c.nome} (satellite)`, materiale, quantita });
    });
  }

  return righe;
}

export {
  haRaffineria,
  scelteProduzioneMiniera,
  scelteProduzioneAttivaMiniera,
  calcolaProduzioneMensile
};
