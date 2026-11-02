import {
  CATALOGO as CATALOGO_GLOBALE,
  MATERIALI_PREZZI as PREZZI_GLOBALI,
} from '../core/config.js';
import { state as statoGlobale } from '../core/state.js';

/* Motore del QG: punti spesi, personale, valore del magazzino.

   Ogni funzione prende `state` e il catalogo come parametri (default: il
   registro e la configurazione reali). I chiamanti esistenti non cambiano,
   ma i test possono passare uno stato finto senza toccare l'app. */

function puntiCosto(struttura, classe = statoGlobale.classe) {
  if (struttura.exempt) return 0;
  if (struttura.categoria === "Generali") return 2;
  if (struttura.categoria === classe) return 2;
  return 4;
}

function puntiSpesiTotali(s = statoGlobale, catalogo = CATALOGO_GLOBALE) {
  return s.strutture.reduce((somma, struttura) => {
    const cat = catalogo.find(c => c.id === struttura.catId);
    if (!cat) return somma;
    return somma + puntiCosto(cat, s.classe) * struttura.livello;
  }, 0);
}

function personaleRichiesto(s = statoGlobale, catalogo = CATALOGO_GLOBALE) {
  return s.strutture.reduce((somma, struttura) => {
    const cat = catalogo.find(c => c.id === struttura.catId);
    return somma + (cat ? cat.personale : 0);
  }, 0);
}

function valoreMagazzino(s = statoGlobale, prezzi = PREZZI_GLOBALI) {
  return Object.entries(s.materiali).reduce((somma, [materiale, quantita]) => {
    const prezzo = prezzi[materiale] || 0;
    return somma + prezzo * (quantita || 0);
  }, 0);
}

function contaStruttureCategoria(categoria, s = statoGlobale, catalogo = CATALOGO_GLOBALE) {
  return s.strutture.filter(struttura => {
    const cat = catalogo.find(c => c.id === struttura.catId);
    return cat && cat.categoria === categoria;
  }).length;
}

function hasStrutturaSpecializzata(s = statoGlobale, catalogo = CATALOGO_GLOBALE) {
  return s.strutture.some(struttura => {
    const cat = catalogo.find(c => c.id === struttura.catId);
    return cat && cat.categoria !== "Generali";
  });
}

export {
  puntiCosto,
  puntiSpesiTotali,
  personaleRichiesto,
  valoreMagazzino,
  contaStruttureCategoria,
  hasStrutturaSpecializzata,
};
