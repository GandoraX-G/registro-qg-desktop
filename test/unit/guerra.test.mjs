/* Sala da Guerra: il motore legge le forze dal registro e riassume il piano.
   Le regole di battaglia non ci sono (la scheda "Guerra" del regolamento non è
   stata fornita), quindi qui si verifica solo ciò che l'app può calcolare. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { forzeDisponibili, riepilogoObiettivi, etichettaAvanzamento } from '../../src/engine/guerra.js';

test('le forze contano le unità Allenate di tutti i campi', () => {
  const forze = forzeDisponibili([
    { catId: 'campo_addestramento', unitaAllenate: 3, unitaInAddestramento: [] },
    { catId: 'campo_addestramento', unitaAllenate: 2, unitaInAddestramento: [] },
    { catId: 'miniera' },
  ]);
  assert.equal(forze.allenate, 5);
  assert.equal(forze.inAddestramento, 0);
});

test('le unità in addestramento sono contate a parte, con i nomi', () => {
  const forze = forzeDisponibili([
    {
      catId: 'campo_addestramento',
      unitaAllenate: 1,
      unitaInAddestramento: [{ id: 'a', nome: 'Squadra Corvo' }, { id: 'b', nome: 'Lance di Ferro' }],
    },
  ]);
  assert.equal(forze.allenate, 1);
  assert.equal(forze.inAddestramento, 2);
  assert.deepEqual(forze.nomiInAddestramento, ['Squadra Corvo', 'Lance di Ferro']);
});

test('senza Sale da Guerra o con dati sporchi non si producono NaN', () => {
  assert.deepEqual(forzeDisponibili([]), { allenate: 0, inAddestramento: 0, nomiInAddestramento: [] });
  const forze = forzeDisponibili([{ catId: 'campo_addestramento', unitaAllenate: 'molte', unitaInAddestramento: null }]);
  assert.equal(forze.allenate, 0);
  assert.equal(forze.inAddestramento, 0);
});

test('il riepilogo del piano distingue chiusi e aperti', () => {
  const obiettivi = [{ fatto: true }, { fatto: false }, { fatto: true }];
  assert.deepEqual(riepilogoObiettivi(obiettivi), { totale: 3, fatti: 2, aperti: 1, completato: false });
});

test('un piano senza obiettivi non è "completato"', () => {
  assert.deepEqual(riepilogoObiettivi([]), { totale: 0, fatti: 0, aperti: 0, completato: false });
  assert.equal(etichettaAvanzamento([]), 'nessun obiettivo');
  assert.equal(etichettaAvanzamento([{ fatto: true }, { fatto: false }]), '1/2 obiettivi');
});
