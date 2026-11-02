import { RISCHIO_ROTTA_BASE, RISCHIO_ROTTA_PER_100KM } from '../core/config.js';
import { state as statoGlobale } from '../core/state.js';
import { kmDifesiRotta } from '../modules/outpost.js';

/* Probabilità di attacco su una rotta: 5% base + 5% per ogni 100 km non
   coperti da una difesa. Funzione pura: è la regola più delicata dell'app,
   quindi niente stato globale e niente Math.random al suo interno. */
function calcRischio(distanza, difesa, {
  base = RISCHIO_ROTTA_BASE,
  per100 = RISCHIO_ROTTA_PER_100KM,
} = {}) {
  const km = Number(distanza) || 0;
  const difesi = Math.min(Number(difesa) || 0, km);
  const nonDifesi = Math.max(0, km - difesi);
  if (nonDifesi <= 0) return 0;
  const blocchi = Math.ceil(nonDifesi / 100);
  return Math.min(100, base + per100 * blocchi);
}

/* Applica il tiro a tutte le rotte e sottrae metà carico quando l'attacco va a
   segno. `rng` è iniettabile per rendere i test deterministici. */
function tiraRischioRotte(s = statoGlobale, rng = Math.random) {
  return s.rotte.map(rotta => {
    const difesa = kmDifesiRotta(rotta, s);
    const rischioPct = calcRischio(rotta.distanza, difesa);
    const tiro = Math.floor(rng() * 100) + 1;
    const colpita = tiro <= rischioPct;
    let perso = null;
    if (colpita && rotta.carico && rotta.carico.materiale && rotta.carico.quantita > 0) {
      perso = Math.ceil(rotta.carico.quantita / 2);
      s.materiali[rotta.carico.materiale] = Math.max(0, (s.materiali[rotta.carico.materiale] || 0) - perso);
    }
    return {
      rotta: rotta.nome,
      rischioPct,
      tiro,
      colpita,
      materiale: rotta.carico?.materiale || null,
      perso,
    };
  });
}

export {
  calcRischio,
  tiraRischioRotte,
};
