/* Stato iniziale del registro — unica fonte di verità.

   Prima lo stesso oggetto era ricopiato in tre punti (state.js, il reset in
   app.js e defaultState in backup.js): aggiungere un campo significava
   ricordarsene tre volte. Ora si tocca solo questo file.

   Qui vive anche la versione dello schema: il registro salvato la porta con
   sé, così le migrazioni future possono essere applicate in ordine invece di
   essere sparse dentro validaStato(). */

export const SCHEMA_VERSION = 2;

export function createDefaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    nome: "Il mio Quartier Generale",
    fondatore: "",
    cofondatore: "",
    classe: "Nessuna",
    livello: 1,
    oro: 0,
    membri: [],
    strutture: [],
    materiali: {},
    lavoratori: 0,
    rotte: [],
    magazzinoScontati: [],
    movimenti: [],
    riservaBancaria: 0,
    registroAltriQG: [],
    calendario: { mese: 1, stagione: "Primavera" },
    clima: "Mite",
    token: { miniera: 0, pesca: 0, concime: 0 },
    tokenConcimeDaSpendere: 0,
    tokenMinieraDaSpendere: 0,
    tokenPescaDaSpendere: 0,
    satelliti: [],
    resocontoUltimoMese: null,
    speseExtra: [],
  };
}

/* Chiavi riconosciute dal registro: lettura da disco e import di un backup
   accettano solo queste. Un file estraneo non può quindi iniettare campi
   arbitrari (o un __proto__) dentro lo stato. */
export const CHIAVI_STATO = Object.keys(createDefaultState());

/* Estrae da un oggetto parsato solo le chiavi note. Restituisce null se la
   struttura non è un registro. */
export function sanificaRegistro(parsed) {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const pulito = {};
  for (const chiave of CHIAVI_STATO) {
    if (Object.prototype.hasOwnProperty.call(parsed, chiave)) pulito[chiave] = parsed[chiave];
  }
  return pulito;
}

/* Applica un registro parsato a `stato`, ripartendo dai default: quello che
   manca nel file resta al valore iniziale invece di restare appeso a un
   registro precedente. Restituisce false se il file non è un registro. */
export function applicaRegistro(stato, parsed) {
  const pulito = sanificaRegistro(parsed);
  if (!pulito) return false;
  Object.assign(stato, createDefaultState(), pulito);
  return true;
}
