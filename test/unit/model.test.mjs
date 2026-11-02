/* Modello del registro: default unico, sanificazione delle chiavi importate
   e migrazioni. Sono i guardrail che impediscono a un backup estraneo di
   iniettare campi nello stato. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEMA_VERSION,
  CHIAVI_STATO,
  createDefaultState,
  sanificaRegistro,
  applicaRegistro,
} from '../../src/core/defaultState.js';

test('lo stato di default ha la versione di schema e le chiavi attese', () => {
  const s = createDefaultState();
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(CHIAVI_STATO.sort(), Object.keys(s).sort());
  assert.equal(s.calendario.mese, 1);
  assert.equal(s.classe, 'Nessuna');
});

test('due stati di default non condividono array e oggetti annidati', () => {
  const a = createDefaultState();
  const b = createDefaultState();
  assert.notStrictEqual(a.strutture, b.strutture);
  assert.notStrictEqual(a.calendario, b.calendario);
  a.strutture.push({ uid: 'x' });
  assert.equal(b.strutture.length, 0);
});

test('la sanificazione tiene solo le chiavi note', () => {
  const pulito = sanificaRegistro({
    nome: 'Bastione',
    campoInventato: 42,
    strutture: [],
  });
  assert.deepEqual(Object.keys(pulito).sort(), ['nome', 'strutture']);
  assert.equal(pulito.campoInventato, undefined);
});

test('la sanificazione rifiuta ciò che non è un registro', () => {
  assert.equal(sanificaRegistro(null), null);
  assert.equal(sanificaRegistro('[]'), null);
  assert.equal(sanificaRegistro([{ nome: 'x' }]), null);
});

test('un __proto__ nel file importato non tocca il prototipo dello stato', () => {
  const s = createDefaultState();
  const malevolo = JSON.parse('{"nome":"Ok","__proto__":{"iniettato":true}}');
  assert.equal(applicaRegistro(s, malevolo), true);
  assert.equal(s.iniettato, undefined);
  assert.equal(Object.getPrototypeOf(s), Object.prototype);
  assert.equal({}.iniettato, undefined);
  assert.equal(s.nome, 'Ok');
});

test('applicare un registro riparte dai default', () => {
  const s = createDefaultState();
  s.oro = 999;
  s.membri = [{ nome: 'vecchio', livello: 9 }];
  applicaRegistro(s, { nome: 'Nuovo QG' });
  assert.equal(s.nome, 'Nuovo QG');
  assert.equal(s.oro, 0);
  assert.deepEqual(s.membri, []);
});
