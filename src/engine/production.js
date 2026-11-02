import { CATALOGO as CATALOGO_GLOBALE, CALENDARIO_MOD_CAMPO_COLTIVATO as MOD_STAGIONALI, RAFFINERIA_CAT_ID } from '../core/config.js';
import { state as statoGlobale } from '../core/state.js';

/* Produzione mensile delle strutture.

   `state` e catalogo sono parametri (default: quelli reali) e i modificatori
   stagionali arrivano dalla configurazione: la funzione non dipende più da
   un registro globale, quindi si può testare su una campagna inventata. */

function haRaffineria(s = statoGlobale, raffineriaId = RAFFINERIA_CAT_ID) {
  return s.strutture.some(struttura => struttura.catId === raffineriaId);
}

function scelteProduzioneMiniera(struttura, cat) {
  return (cat.produzione.scelte || []).filter(scelta => struttura.livello >= scelta.livelloMin);
}

function scelteProduzioneAttivaMiniera(struttura, cat) {
  const disponibili = scelteProduzioneMiniera(struttura, cat);
  if (disponibili.length === 0) return null;
  return disponibili.find(scelta => scelta.materiale === struttura.produzioneScelta)
    || disponibili[disponibili.length - 1];
}

function quantitaStagionale(cat, quantita, stagione, modificatori) {
  if (!cat.produzione.stagionale || cat.id !== "campo_coltivato") return quantita;
  return Math.max(0, quantita + (modificatori[stagione] || 0));
}

function calcolaProduzioneMensile(s = statoGlobale, catalogo = CATALOGO_GLOBALE, {
  modificatoriStagionali = MOD_STAGIONALI,
  raffineriaId = RAFFINERIA_CAT_ID,
} = {}) {
  const righe = [];
  const raffineria = haRaffineria(s, raffineriaId);

  s.strutture.forEach(struttura => {
    const cat = catalogo.find(c => c.id === struttura.catId);
    if (!cat) return;

    if (cat.produzioneStep) {
      const tabella = cat.produzioneStep.valori;
      const livelli = Object.keys(tabella).map(Number).filter(l => l <= struttura.livello);
      if (livelli.length === 0) return;
      righe.push({
        strutturaUid: struttura.uid,
        nome: cat.nome,
        materiale: cat.produzioneStep.materiale,
        quantita: tabella[Math.max(...livelli)],
      });
      return;
    }
    if (!cat.produzione) return;

    const produzione = cat.produzione;

    if (cat.id === "miniera") {
      const scelta = scelteProduzioneAttivaMiniera(struttura, cat);
      if (!scelta) return;
      righe.push({
        strutturaUid: struttura.uid,
        nome: cat.nome,
        materiale: scelta.materiale,
        quantita: scelta.base + scelta.perLivello * struttura.livello,
      });
      return;
    }

    let quantita = produzione.base + produzione.perLivello * struttura.livello;
    let materiale = produzione.materiale;

    quantita = quantitaStagionale(cat, quantita, s.calendario.stagione, modificatoriStagionali);
    if (raffineria && produzione.materialeRaffinato) materiale = produzione.materialeRaffinato;

    righe.push({ strutturaUid: struttura.uid, nome: cat.nome, materiale, quantita });
  });

  s.strutture.forEach(struttura => {
    if (struttura.catId !== "fattoria") return;
    const pecore = (struttura.animali && struttura.animali.Pecora) || 0;
    if (pecore <= 0) return;
    righe.push({
      strutturaUid: struttura.uid,
      nome: 'Fattoria (Pecore)',
      materiale: 'Stoffa',
      quantita: pecore + (struttura.livello || 1),
    });
  });

  (s.satelliti || []).forEach(satellite => {
    const cat = catalogo.find(c => c.id === satellite.catId);
    if (!cat || !cat.produzione) return;
    const produzione = cat.produzione;

    if (cat.id === 'miniera') {
      const scelte = (produzione.scelte || []).filter(scelta => 1 >= scelta.livelloMin);
      if (scelte.length === 0) return;
      const scelta = scelte[scelte.length - 1];
      righe.push({
        strutturaUid: satellite.uid,
        nome: `${cat.nome} (satellite)`,
        materiale: scelta.materiale,
        quantita: scelta.base + scelta.perLivello,
      });
      return;
    }

    let quantita = quantitaStagionale(cat, produzione.base + produzione.perLivello, s.calendario.stagione, modificatoriStagionali);
    let materiale = produzione.materiale;
    if (raffineria && produzione.materialeRaffinato) materiale = produzione.materialeRaffinato;

    righe.push({
      strutturaUid: satellite.uid,
      nome: `${cat.nome} (satellite)`,
      materiale,
      quantita,
    });
  });

  return righe;
}

export {
  haRaffineria,
  scelteProduzioneMiniera,
  scelteProduzioneAttivaMiniera,
  calcolaProduzioneMensile,
};
