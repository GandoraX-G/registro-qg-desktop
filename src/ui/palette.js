/* Palette di ricerca globale (Ctrl+K).

   Indicizza catalogo, strutture possedute, magazzino, membri, movimenti e
   rotte, e per ogni risultato porta l'utente nella tab giusta. L'indice si
   ricostruisce ad ogni apertura: il registro cambia di continuo e una cache
   da invalidare sarebbe solo un'altra cosa che può restare indietro. */

import { state } from '../core/state.js';
import { CATALOGO, MATERIALI_PREZZI } from '../core/config.js';
import { costruisciIndice, cerca } from '../engine/ricerca.js';
import { escapeHtml } from '../utils/format.js';

let naviga = () => {};
let vociCorrenti = [];
let selezione = -1;
let focusPrecedente = null;

function elementi() {
  return {
    sfondo: document.getElementById('searchModalBg'),
    campo: document.getElementById('search-input'),
    lista: document.getElementById('search-results'),
  };
}

function indiceCorrente() {
  return costruisciIndice({
    catalogo: CATALOGO || [],
    strutture: state.strutture || [],
    materiali: state.materiali || {},
    prezzi: MATERIALI_PREZZI || {},
    membri: state.membri || [],
    movimenti: state.movimenti || [],
    rotte: state.rotte || [],
  });
}

function evidenzia(posizione) {
  const { lista } = elementi();
  if (!lista) return;
  const voci = [...lista.querySelectorAll('[role="option"]')];
  if (voci.length === 0) { selezione = -1; return; }
  selezione = Math.max(0, Math.min(posizione, voci.length - 1));
  voci.forEach((el, i) => {
    const attivo = i === selezione;
    el.setAttribute('aria-selected', attivo ? 'true' : 'false');
    if (attivo) {
      el.scrollIntoView({ block: 'nearest' });
    }
  });
}

function disegna(termine) {
  const { lista } = elementi();
  if (!lista) return;
  vociCorrenti = cerca(indiceCorrente(), termine);
  selezione = -1;

  if (vociCorrenti.length === 0) {
    lista.innerHTML = `<li class="palette-empty">Nessun risultato per “${escapeHtml(termine)}”.</li>`;
    return;
  }

  lista.innerHTML = vociCorrenti.map((v, i) => `
    <li role="none">
      <button type="button" role="option" id="palette-voce-${i}" aria-selected="false"
              class="palette-item" data-indice="${i}">
        <span class="palette-tipo">${escapeHtml(v.tipo)}</span>
        <span class="palette-titolo">${escapeHtml(v.titolo)}</span>
        ${v.dettaglio ? `<span class="palette-dettaglio">${escapeHtml(v.dettaglio)}</span>` : ''}
      </button>
    </li>`).join('');

  evidenzia(0);
}

function scegli(posizione) {
  const voce = vociCorrenti[posizione];
  if (!voce) return;
  chiudi();
  naviga(voce.tab);
}

function chiudi() {
  const { sfondo, campo, lista } = elementi();
  if (!sfondo || sfondo.style.display === 'none') return;
  sfondo.style.display = 'none';
  if (campo) campo.value = '';
  if (lista) lista.innerHTML = '';
  vociCorrenti = [];
  selezione = -1;
  if (focusPrecedente && typeof focusPrecedente.focus === 'function') focusPrecedente.focus();
  focusPrecedente = null;
}

export function apriPalette() {
  const { sfondo, campo } = elementi();
  if (!sfondo || !campo) return;
  focusPrecedente = document.activeElement;
  sfondo.style.display = 'flex';
  campo.value = '';
  disegna('');
  campo.focus();
}

export function initPalette({ onNavigate } = {}) {
  if (typeof onNavigate === 'function') naviga = onNavigate;

  const { sfondo, campo, lista } = elementi();
  if (!sfondo || !campo || !lista) return;

  campo.addEventListener('input', e => disegna(e.target.value));

  campo.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); evidenzia(selezione + 1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); evidenzia(selezione - 1); return; }
    if (e.key === 'Enter') { e.preventDefault(); scegli(selezione); return; }
    if (e.key === 'Escape') { e.preventDefault(); chiudi(); }
  });

  lista.addEventListener('click', e => {
    const bottone = e.target.closest('[data-indice]');
    if (bottone) scegli(Number(bottone.dataset.indice));
  });

  // Click sullo sfondo (fuori dal riquadro) chiude, come per la guida.
  sfondo.addEventListener('click', e => { if (e.target.id === 'searchModalBg') chiudi(); });
  sfondo.addEventListener('keydown', e => { if (e.key === 'Escape') chiudi(); });
}

export { chiudi as chiudiPalette };
