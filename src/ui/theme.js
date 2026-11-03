/* Tema dell'interfaccia: chiaro (pergamena), scuro (notte) oppure "come il
   sistema". La preferenza vive nel registro (`state.tema`), così resta la
   stessa ad ogni avvio e viaggia con i backup.

   Il colore vero e proprio non passa da qui: `applicaTema` scrive solo
   `data-theme` sull'elemento <html> e il foglio di stile fa il resto, perché
   tutti i colori dell'app sono già variabili CSS in `:root`. */

import { state } from '../core/state.js';

export const TEMI = ['auto', 'chiaro', 'scuro'];

/* Preferenza → tema effettivo. `sistemaScuro` arriva da matchMedia ed è un
   parametro esplicito, così la regola si verifica senza un browser. */
export function temaEffettivo(preferenza, sistemaScuro = false) {
  if (preferenza === 'chiaro' || preferenza === 'scuro') return preferenza;
  return sistemaScuro ? 'scuro' : 'chiaro';
}

let querySistema = null;

function sistemaPreferisceScuro() {
  return !!(querySistema && querySistema.matches);
}

/* Applica il tema (di norma quello salvato) e riallinea il menu. */
export function applicaTema(preferenza = state.tema) {
  const effettivo = temaEffettivo(preferenza, sistemaPreferisceScuro());

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = effettivo === 'scuro' ? 'dark' : 'light';
    const menu = document.getElementById('dash-in-tema');
    if (menu) menu.value = TEMI.includes(preferenza) ? preferenza : 'auto';
  }

  return effettivo;
}

/* Cambio scelto dall'utente: normalizza, salva nel registro (il chiamante
   decide quando scrivere su disco) e applica subito. */
export function impostaTema(preferenza) {
  state.tema = TEMI.includes(preferenza) ? preferenza : 'auto';
  return applicaTema(state.tema);
}

/* Da chiamare una volta all'avvio, dopo aver letto il registro. Con
   preferenza "auto" resta in ascolto: se il sistema passa a scuro mentre
   l'app è aperta, il tema segue. */
export function initTema() {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    querySistema = window.matchMedia('(prefers-color-scheme: dark)');
    const alCambio = () => {
      if (state.tema === 'auto' || !TEMI.includes(state.tema)) applicaTema(state.tema);
    };
    if (querySistema.addEventListener) querySistema.addEventListener('change', alCambio);
    else if (querySistema.addListener) querySistema.addListener(alCambio);
  }

  return applicaTema(state.tema);
}
