/* Piano della Sala da Guerra: obiettivi e diario.

   Il regolamento rimanda a una scheda "Guerra" separata che non è stata
   fornita, quindi qui non ci sono calcoli di battaglia: solo il piano che il
   gruppo scrive. Stato e note vivono già sulla struttura (`statoGuerra`,
   `note`); qui si aggiungono gli obiettivi come checklist e un diario datato
   col mese di campagna, così si ricostruisce quando è successo cosa. */

import { state, callRenderSottomeccaniche } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid } from '../utils/format.js';

function sala(uidStr) {
  return state.strutture.find(x => x.uid === uidStr && x.catId === 'sala_da_guerra');
}

function assicuraPiano(s) {
  if (!Array.isArray(s.obiettivi)) s.obiettivi = [];
  if (!Array.isArray(s.diario)) s.diario = [];
}

function quando() {
  const mese = state.calendario?.mese ?? 1;
  const stagione = state.calendario?.stagione ?? '';
  return stagione ? `Mese ${mese} · ${stagione}` : `Mese ${mese}`;
}

export function aggiungiObbiettivo(uidStr, testo) {
  const s = sala(uidStr);
  const pulito = String(testo || '').trim();
  if (!s) return;
  if (!pulito) { showToast('Scrivi l\'obiettivo da aggiungere ⚠', 'warning'); return; }
  assicuraPiano(s);
  s.obiettivi.push({ id: uid(), testo: pulito, fatto: false });
  showToast(`Obiettivo aggiunto: ${pulito}`);
  callRenderSottomeccaniche();
  saveState();
}

export function toggleObiettivo(uidStr, obiettivoId) {
  const s = sala(uidStr);
  if (!s) return;
  assicuraPiano(s);
  const obiettivo = s.obiettivi.find(o => o.id === obiettivoId);
  if (!obiettivo) return;
  obiettivo.fatto = !obiettivo.fatto;
  callRenderSottomeccaniche();
  saveState();
}

export function rimuoviObiettivo(uidStr, obiettivoId) {
  const s = sala(uidStr);
  if (!s) return;
  assicuraPiano(s);
  const prima = s.obiettivi.length;
  s.obiettivi = s.obiettivi.filter(o => o.id !== obiettivoId);
  if (s.obiettivi.length === prima) return;
  showToast('Obiettivo rimosso');
  callRenderSottomeccaniche();
  saveState();
}

export function aggiungiVoceDiario(uidStr, testo) {
  const s = sala(uidStr);
  const pulito = String(testo || '').trim();
  if (!s) return;
  if (!pulito) { showToast('Scrivi la voce di diario ⚠', 'warning'); return; }
  assicuraPiano(s);
  // Le voci nuove stanno in cima: l'ultimo avvenimento è quello che interessa.
  s.diario.unshift({ id: uid(), testo: pulito, quando: quando() });
  showToast('Voce aggiunta al diario del piano');
  callRenderSottomeccaniche();
  saveState();
}

export function rimuoviVoceDiario(uidStr, voceId) {
  const s = sala(uidStr);
  if (!s) return;
  assicuraPiano(s);
  const prima = s.diario.length;
  s.diario = s.diario.filter(v => v.id !== voceId);
  if (s.diario.length === prima) return;
  showToast('Voce di diario rimossa');
  callRenderSottomeccaniche();
  saveState();
}
