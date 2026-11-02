import { state as statoGlobale } from '../core/state.js';

/* Costi di costruzione e potenziamento, con la modalità "solo punti QG".

   Serve a chi ricrea un Quartier Generale di cui non ha i salvataggi: con la
   modalità attiva costruire e potenziare non addebita materiali né oro, e non
   serve oro in tesoreria. Restano validi i punti QG, i limiti per livello e
   tutte le altre regole.

   Le strutture costruite (o potenziate) così restano marcate "senza costi":
   smantellarle non restituisce materiali che non sono mai stati pagati.
   Altrimenti la modalità diventerebbe un modo per generare materiali dal
   nulla accendendola, costruendo, spegnendola e smantellando. */

function soloPuntiQG(s = statoGlobale) {
  return s.modalitaSoloPuntiQG === true;
}

/* Cosa va verificato e cosa va scalato per pagare un costo.
   Restituisce dati grezzi: i messaggi per l'utente li compone chi chiama,
   così il motore non dipende dalla UI. */
function valutaCosti({ costoOro = 0, oroDisponibile = 0, materiali = [], giacenze = {} } = {}, s = statoGlobale) {
  if (soloPuntiQG(s)) {
    return { errori: [], oroDaPagare: 0, materialiDaScalare: [], costoSospeso: true };
  }

  const materialiDaScalare = materiali || [];
  const mancanti = materialiDaScalare
    .filter(mat => (giacenze[mat.m] || 0) < mat.u)
    .map(mat => ({ materiale: mat.m, richiesti: mat.u, disponibili: giacenze[mat.m] || 0 }));

  const errori = [];
  if (oroDisponibile < costoOro) {
    errori.push({ tipo: 'oro', richiesti: costoOro, disponibili: oroDisponibile });
  }
  if (mancanti.length > 0) {
    errori.push({ tipo: 'materiali', mancanti });
  }

  return { errori, oroDaPagare: costoOro, materialiDaScalare, costoSospeso: false };
}

/* Materiali da rimettere in magazzino smantellando una struttura: nessuno se
   è stata costruita (o potenziata) in modalità solo punti QG. */
function materialiRestituiti(struttura, materiali = []) {
  if (!struttura || struttura.costoSospeso === true) return [];
  return materiali || [];
}

export {
  soloPuntiQG,
  valutaCosti,
  materialiRestituiti,
};
