/* Calendario (ciclo delle stagioni) e livello QG dedotto dai membri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prossimaStagione } from '../../src/core/calendar.js';
import { calcolaLivelloQGDaMembri } from '../../src/core/validation.js';

const SOGLIE = [
  { livelloPersonaggioMin: 3, qg: 1 },
  { livelloPersonaggioMin: 7, qg: 2 },
  { livelloPersonaggioMin: 11, qg: 3 },
  { livelloPersonaggioMin: 15, qg: 4 },
];

test('stagioni: ciclo Primavera → Estate → Autunno → Inverno → Primavera', () => {
  assert.equal(prossimaStagione('Primavera'), 'Estate');
  assert.equal(prossimaStagione('Estate'), 'Autunno');
  assert.equal(prossimaStagione('Autunno'), 'Inverno');
  assert.equal(prossimaStagione('Inverno'), 'Primavera');
});

test('livello QG: senza membri è 1', () => {
  assert.equal(calcolaLivelloQGDaMembri([], { soglie: SOGLIE, max: 6 }), 1);
  assert.equal(calcolaLivelloQGDaMembri([{ livello: 0 }], { soglie: SOGLIE, max: 6 }), 1);
});

test('livello QG: criterio "massimo" (default) usa il membro più alto', () => {
  const membri = [{ livello: 4 }, { livello: 12 }];
  assert.equal(calcolaLivelloQGDaMembri(membri, { criterio: 'massimo', soglie: SOGLIE, max: 6 }), 3);
});

test('livello QG: criterio "minimo" e "media"', () => {
  const membri = [{ livello: 3 }, { livello: 12 }];
  assert.equal(calcolaLivelloQGDaMembri(membri, { criterio: 'minimo', soglie: SOGLIE, max: 6 }), 1);
  assert.equal(calcolaLivelloQGDaMembri(membri, { criterio: 'media', soglie: SOGLIE, max: 6 }), 2);
});

test('livello QG: limitato al massimo di campagna attuale', () => {
  const membri = [{ livello: 20 }];
  assert.equal(calcolaLivelloQGDaMembri(membri, { soglie: SOGLIE, max: 6 }), 4);
  assert.equal(calcolaLivelloQGDaMembri(membri, { soglie: SOGLIE, max: 3 }), 3);
});
