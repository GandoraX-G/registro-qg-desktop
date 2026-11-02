import { CATALOGO as CATALOGO_GLOBALE } from '../core/config.js';
import { state as statoGlobale } from '../core/state.js';

/* Token generati dalle strutture che ne producono. Prende stato e catalogo
   come parametri per poter essere verificato su uno stato finto. */

function calcolaTokenMensili(s = statoGlobale, catalogo = CATALOGO_GLOBALE) {
  const generati = { miniera: 0, pesca: 0, concime: 0 };

  const conta = struttura => {
    const cat = catalogo.find(c => c.id === struttura.catId);
    const tipo = cat && cat.produzione && cat.produzione.token;
    if (tipo && generati[tipo] !== undefined) generati[tipo] += 1;
  };

  s.strutture.forEach(conta);
  (s.satelliti || []).forEach(conta);

  return generati;
}

export {
  calcolaTokenMensili,
};
