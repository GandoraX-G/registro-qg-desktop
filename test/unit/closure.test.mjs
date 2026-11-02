/* Chiusura del mese: è un'operazione di integrazione (produzione, token,
   rischi, sotto-meccaniche, tesoreria), quindi gira sul registro reale con la
   configurazione vera da regolamento.json. I tiri sono deterministici. */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { caricaConfig, COSTO_LAVORATORE_MESE } from '../../src/core/config.js';
import { createDefaultState } from '../../src/core/defaultState.js';
import { state } from '../../src/core/state.js';
import { eseguiChiusuraMese } from '../../src/engine/closure.js';

await caricaConfig();

beforeEach(() => {
  Object.assign(state, createDefaultState());
});

test('chiude il mese: produce, paga l\'upkeep e avanza il calendario', () => {
  state.oro = 100;
  state.lavoratori = 2;
  state.strutture = [{ uid: 'c1', catId: 'campo_coltivato', livello: 1 }];

  const righe = eseguiChiusuraMese(() => 0.99); // nessun attacco alle rotte

  assert.ok(righe.length > 3, 'il resoconto deve contenere più righe');
  assert.equal(state.calendario.mese, 2);
  assert.equal(state.calendario.stagione, 'Primavera');
  assert.equal(state.oro, 100 - 2 * COSTO_LAVORATORE_MESE);
  assert.equal(state.movimenti.length, 1);
  assert.equal(state.movimenti[0].saldoDopo, state.oro);
  const prodotto = Object.values(state.materiali).reduce((a, b) => a + b, 0);
  assert.ok(prodotto > 0, 'il campo coltivato deve aver prodotto qualcosa');
});

test('la stagione avanza ogni tre mesi', () => {
  state.calendario = { mese: 3, stagione: 'Primavera' };
  eseguiChiusuraMese(() => 0.99);
  assert.equal(state.calendario.mese, 4);
  assert.equal(state.calendario.stagione, 'Estate');
});

test('la rotta attaccata sottrae metà carico e paga il costo km', () => {
  state.oro = 100;
  state.lavoratori = 0;
  state.materiali = { Legna: 10 };
  state.rotte = [{
    uid: 'r1', nome: 'Rotta Est', distanza: 100,
    avampostoUid: null, carico: { materiale: 'Legna', quantita: 10 },
  }];

  eseguiChiusuraMese(() => 0); // tiro 1: attacco sempre riuscito

  assert.equal(state.materiali.Legna, 5);
  // 5 mo di rotta (100 km) + nessun lavoratore
  assert.equal(state.oro, 95);
});

test('senza costi l\'upkeep non registra movimenti', () => {
  state.oro = 50;
  const righe = eseguiChiusuraMese(() => 0.99);
  assert.equal(state.movimenti.length, 0);
  assert.ok(righe.some(r => /Upkeep: nessun costo/.test(r)));
  assert.equal(state.oro, 50);
});

test('il resoconto della chiusura resta consultabile', () => {
  eseguiChiusuraMese(() => 0.99);
  assert.ok(state.resocontoUltimoMese === null || typeof state.resocontoUltimoMese === 'string');
});
