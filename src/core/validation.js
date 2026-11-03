import { LIVELLO_QG_CRITERIO, LIVELLO_QG_SOGLIE, LIVELLO_QG_MAX_ATTUALE } from './config.js';
import { SCHEMA_VERSION } from './defaultState.js';
import { state } from './state.js';
import { uid } from '../utils/format.js';
import { showToast } from '../ui/toast.js';

/* Normalizzazione di un registro letto da disco o importato: prima le
   migrazioni (una sequenza, non logica sparsa), poi il controllo dei tipi. */

export function migraRotteLegacy(s = state) {
  let daSegnalare = 0;
  s.rotte.forEach(rotta => {
    if (rotta.avampostoUid === undefined) {
      if (typeof rotta.difesa === "number" && rotta.difesa > 0) daSegnalare++;
      rotta.avampostoUid = null;
      delete rotta.difesa;
    }
  });
  if (daSegnalare > 0) {
    showToast(`⚠ ${daSegnalare} rotta/e create con una versione precedente sono tornate "scoperte": riassegna l'Avamposto dalla tabella Rotte`);
  }
}

export function applicaMigrazioni(s = state) {
  migraRotteLegacy(s);

  // v1 → v2: le "spese extra" diventano voci del Registro Spese.
  if (Array.isArray(s.speseExtra) && s.speseExtra.length > 0 && Array.isArray(s.registroAltriQG)) {
    s.speseExtra.forEach(spesa => {
      s.registroAltriQG.push({
        uid: spesa.uid || uid(),
        nome: spesa.descrizione || '',
        tipo: 'spesa',
        importo: spesa.importo || 0,
        nota: '',
        saldato: true,
      });
    });
    s.speseExtra = [];
  }

  s.schemaVersion = SCHEMA_VERSION;
  return s;
}

export function validaStato(s = state) {
  if (typeof s.nome !== "string") s.nome = "Il mio Quartier Generale";
  if (typeof s.fondatore !== "string") s.fondatore = "";
  if (typeof s.cofondatore !== "string") s.cofondatore = "";
  if (typeof s.classe !== "string") s.classe = "Nessuna";
  if (typeof s.livello !== "number" || s.livello < 1) s.livello = 1;
  if (typeof s.oro !== "number") s.oro = 0;
  if (typeof s.modalitaSoloPuntiQG !== "boolean") s.modalitaSoloPuntiQG = false;
  if (s.tema !== "chiaro" && s.tema !== "scuro") s.tema = "auto";
  if (!Array.isArray(s.membri)) s.membri = [];
  if (!Array.isArray(s.strutture)) s.strutture = [];
  if (typeof s.materiali !== "object" || s.materiali === null || Array.isArray(s.materiali)) s.materiali = {};
  if (typeof s.lavoratori !== "number" || s.lavoratori < 0) s.lavoratori = 0;
  if (!Array.isArray(s.rotte)) s.rotte = [];
  if (!Array.isArray(s.magazzinoScontati)) s.magazzinoScontati = [];
  if (!Array.isArray(s.movimenti)) s.movimenti = [];
  if (typeof s.riservaBancaria !== "number") s.riservaBancaria = 0;
  if (!Array.isArray(s.registroAltriQG)) s.registroAltriQG = [];
  if (typeof s.calendario !== "object" || s.calendario === null) s.calendario = { mese: 1, stagione: "Primavera" };
  if (typeof s.calendario.mese !== "number") s.calendario.mese = 1;
  if (typeof s.calendario.stagione !== "string") s.calendario.stagione = "Primavera";
  if (typeof s.clima !== "string") s.clima = "Mite";
  if (typeof s.token !== "object" || s.token === null) s.token = { miniera: 0, pesca: 0, concime: 0 };
  if (typeof s.tokenConcimeDaSpendere !== "number" || s.tokenConcimeDaSpendere < 0) s.tokenConcimeDaSpendere = 0;
  if (typeof s.tokenMinieraDaSpendere !== "number" || s.tokenMinieraDaSpendere < 0) s.tokenMinieraDaSpendere = 0;
  if (typeof s.tokenPescaDaSpendere !== "number" || s.tokenPescaDaSpendere < 0) s.tokenPescaDaSpendere = 0;
  if (!Array.isArray(s.satelliti)) s.satelliti = [];
  if (!Array.isArray(s.speseExtra)) s.speseExtra = [];
  if (!Array.isArray(s.potenziamentiNavali)) s.potenziamentiNavali = [];
  s.potenziamentiNavali = s.potenziamentiNavali.filter(v => v && typeof v === "object");
  if (s.resocontoUltimoMese === undefined) s.resocontoUltimoMese = null;

  s.rotte.forEach(rotta => {
    if (typeof rotta.uid !== "string") rotta.uid = uid();
    if (typeof rotta.nome !== "string") rotta.nome = "Rotta senza nome";
    if (typeof rotta.distanza !== "number") rotta.distanza = 0;
    if (rotta.avampostoUid === undefined) rotta.avampostoUid = null;
  });
  s.strutture.forEach(struttura => {
    if (typeof struttura.uid !== "string") struttura.uid = uid();
    if (typeof struttura.catId !== "string") struttura.catId = "";
    if (typeof struttura.livello !== "number" || struttura.livello < 1) struttura.livello = 1;
    // Piano della Sala da Guerra: checklist e diario restano array anche se
    // un backup vecchio non li conosce.
    if (struttura.obiettivi !== undefined && !Array.isArray(struttura.obiettivi)) struttura.obiettivi = [];
    if (struttura.diario !== undefined && !Array.isArray(struttura.diario)) struttura.diario = [];
  });
  s.membri.forEach(membro => {
    if (typeof membro.nome !== "string") membro.nome = "Sconosciuto";
    if (typeof membro.livello !== "number") membro.livello = 1;
  });
  return s;
}

/* Livello del QG dedotto dai membri. `membri` e i parametri di soglia sono
   iniettabili, così la regola si può verificare senza toccare il registro. */
export function calcolaLivelloQGDaMembri(membri = state.membri, {
  criterio = LIVELLO_QG_CRITERIO,
  soglie = LIVELLO_QG_SOGLIE,
  max = LIVELLO_QG_MAX_ATTUALE,
} = {}) {
  if (!membri || membri.length === 0) return 1;
  const livelli = membri.map(membro => Number(membro.livello) || 0).filter(livello => livello > 0);
  if (livelli.length === 0) return 1;

  let riferimento;
  if (criterio === "minimo") riferimento = Math.min(...livelli);
  else if (criterio === "media") riferimento = livelli.reduce((a, b) => a + b, 0) / livelli.length;
  else riferimento = Math.max(...livelli);

  let livelloQG = 1;
  [...soglie]
    .sort((a, b) => a.livelloPersonaggioMin - b.livelloPersonaggioMin)
    .forEach(soglia => {
      if (riferimento >= soglia.livelloPersonaggioMin) livelloQG = soglia.qg;
    });

  return Math.min(livelloQG, max);
}
