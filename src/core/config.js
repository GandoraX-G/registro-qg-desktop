let MATERIALI_PREZZI = {};
let CATALOGO = [];
let PUNTI_QG_MAX = 44;
let LIVELLO_STRUTTURA_MAX = 6;
let LIVELLO_QG_MAX_ATTUALE = 3;
let COSTO_ROTTA_MO_PER_100KM = 5;
let RISCHIO_ROTTA_BASE = 5;
let RISCHIO_ROTTA_PER_100KM = 5;
let SCONTO_ACQUISTO_ALTRO_QG = 0.20;
let SCONTO_ACQUISTO_MAGAZZINO = 0.30;
let COSTO_LAVORATORE_MESE = 1;
let AVAMPOSTO_RAGGIO_KM_PER_LIVELLO = 400;
let LIVELLO_QG_CRITERIO = "massimo";
let LIVELLO_QG_SOGLIE = [];
let CALENDARIO_ORDINE_STAGIONI = ["Primavera","Estate","Autunno","Inverno"];
let CALENDARIO_MOD_CAMPO_COLTIVATO = {};
let RAFFINERIA_CAT_ID = "raffineria";
let RARITA_POZIONI = ["Comune","Non Comune","Raro","Molto Raro","Leggendario"];
let ARGOMENTI_BIBLIOTECA = [];
let TEMI_BIBLIOTECA_SCELTE = 5;
let PIANTE_SPECIALI = [];
let OPERA_ARTE_CFG = {};
let STUDIO_DIPLOMATICO_CFG = {};
let SALA_ARCANA_CFG = {};
let AVAMPOSTO_CFG = {};
let CAMPO_ADDESTRAMENTO_CFG = {};
let PORTO_MILITARE_CFG = {};
let ELIPORTO_ARCANO_CFG = {};
let SALA_DA_GUERRA_CFG = {};
let IMPRESA_CFG = {};

const CATEGORIE = ["Generali","Produzione","Vendita","Militare"];

export {
  MATERIALI_PREZZI,
  CATALOGO,
  PUNTI_QG_MAX,
  LIVELLO_STRUTTURA_MAX,
  LIVELLO_QG_MAX_ATTUALE,
  COSTO_ROTTA_MO_PER_100KM,
  RISCHIO_ROTTA_BASE,
  RISCHIO_ROTTA_PER_100KM,
  SCONTO_ACQUISTO_ALTRO_QG,
  SCONTO_ACQUISTO_MAGAZZINO,
  COSTO_LAVORATORE_MESE,
  AVAMPOSTO_RAGGIO_KM_PER_LIVELLO,
  LIVELLO_QG_CRITERIO,
  LIVELLO_QG_SOGLIE,
  CALENDARIO_ORDINE_STAGIONI,
  CALENDARIO_MOD_CAMPO_COLTIVATO,
  RAFFINERIA_CAT_ID,
  RARITA_POZIONI,
  ARGOMENTI_BIBLIOTECA,
  TEMI_BIBLIOTECA_SCELTE,
  PIANTE_SPECIALI,
  OPERA_ARTE_CFG,
  STUDIO_DIPLOMATICO_CFG,
  SALA_ARCANA_CFG,
  AVAMPOSTO_CFG,
  CAMPO_ADDESTRAMENTO_CFG,
  PORTO_MILITARE_CFG,
  ELIPORTO_ARCANO_CFG,
  SALA_DA_GUERRA_CFG,
  IMPRESA_CFG,
  CATEGORIE,
};

export async function caricaConfig(){
  const res = await fetch("./data/regolamento.json");
  if(!res.ok) throw new Error("Impossibile caricare data/regolamento.json ("+res.status+")");
  const cfg = await res.json();
  MATERIALI_PREZZI = cfg.materiali || {};
  CATALOGO = cfg.catalogo || [];
  const c = cfg.costanti || {};
  PUNTI_QG_MAX = c.puntiQGMax ?? PUNTI_QG_MAX;
  LIVELLO_STRUTTURA_MAX = c.livelloStrutturaMax ?? LIVELLO_STRUTTURA_MAX;
  LIVELLO_QG_MAX_ATTUALE = c.livelloQGMaxAttuale ?? LIVELLO_QG_MAX_ATTUALE;
  COSTO_ROTTA_MO_PER_100KM = c.costoRottaMoPer100Km ?? COSTO_ROTTA_MO_PER_100KM;
  RISCHIO_ROTTA_BASE = c.rischioRottaBasePercento ?? RISCHIO_ROTTA_BASE;
  RISCHIO_ROTTA_PER_100KM = c.rischioRottaPer100KmScopertiPercento ?? RISCHIO_ROTTA_PER_100KM;
  SCONTO_ACQUISTO_ALTRO_QG = (c.scontoAcquistoAltroQGPercento ?? 20) / 100;
  SCONTO_ACQUISTO_MAGAZZINO = (c.scontoAcquistoMagazzinoPercento ?? 30) / 100;
  COSTO_LAVORATORE_MESE = c.costoLavoratoreMoAlMese ?? COSTO_LAVORATORE_MESE;
  AVAMPOSTO_RAGGIO_KM_PER_LIVELLO = c.avampostoRaggioKmPerLivello ?? AVAMPOSTO_RAGGIO_KM_PER_LIVELLO;
  const lq = cfg.livelloQG || {};
  LIVELLO_QG_CRITERIO = lq.criterio || LIVELLO_QG_CRITERIO;
  LIVELLO_QG_SOGLIE = lq.soglie || [];
  const cal = cfg.calendario || {};
  CALENDARIO_ORDINE_STAGIONI = cal.ordineStagioni || CALENDARIO_ORDINE_STAGIONI;
  CALENDARIO_MOD_CAMPO_COLTIVATO = cal.modificatoreCampoColtivato || {};
  RAFFINERIA_CAT_ID = cfg.raffineriaCatId || RAFFINERIA_CAT_ID;
  RARITA_POZIONI = cfg.raritaPozioni || RARITA_POZIONI;
  ARGOMENTI_BIBLIOTECA = cfg.argomentiBiblioteca || [];
  TEMI_BIBLIOTECA_SCELTE = cfg.temiBibliotecaScelteAllaCostruzione ?? TEMI_BIBLIOTECA_SCELTE;
  PIANTE_SPECIALI = cfg.pianteSpeciali || [];
  OPERA_ARTE_CFG = cfg.operaArte || {};
  STUDIO_DIPLOMATICO_CFG = cfg.studioDiplomatico || {};
  SALA_ARCANA_CFG = cfg.salaArcana || {};
  AVAMPOSTO_CFG = cfg.avamposto || {};
  CAMPO_ADDESTRAMENTO_CFG = cfg.campoAddestramento || {};
  PORTO_MILITARE_CFG = cfg.portoMilitare || {};
  ELIPORTO_ARCANO_CFG = cfg.eliportoArcano || {};
  SALA_DA_GUERRA_CFG = cfg.salaDaGuerra || {};
  IMPRESA_CFG = cfg.impresa || {};
}
