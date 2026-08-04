import { SALA_DA_GUERRA_CFG } from '../core/config.js';

export function statoIniziale(catId, extra){
  if(catId === "studio_arcano") return { charmAttivo: false };
  if(catId === "santuario") return { catalizzatore: null };
  if(catId === "alchimista") return { pozioni: [] };
  if(catId === "biblioteca") return { temi: [], bestiario: [], indagini: [] };
  if(catId === "giardino") return { piante: [] };
  if(catId === "bottega_artistica") return { opere: [], creataQuestoMese: false };
  if(catId === "studio_diplomatico") return { fazioniSelezionate: [], companions: [] };
  if(catId === "avamposto") return { distanzaPortaEthea: 0, rifornimentoRidotto: false, tipoDispiegamento: (extra && extra.tipoDispiegamento) || "standard" };
  if(catId === "sala_da_guerra") return { statoGuerra: (SALA_DA_GUERRA_CFG.statiDisponibili || ["Nessuna pianificazione"])[0], note: "" };
  if(catId === "sala_arcana") return { rituale: null };
  if(catId === "campo_addestramento") return { unitaInAddestramento: [], unitaAllenate: 0 };
  if(catId === "impresa") return { tipo: (extra && extra.tipoImpresa) || "distanza", strutturaVenditaUid: null, spesaMensile: 0, strumenti: [] };
  if(catId === "fattoria") return { animali: { Pollo: 0, Capra: 0, Pecora: 0, Mucca: 0 }, carneSacrificataQuestoMese: false };
  if(catId === "segheria") return { alberoScelto: null, semiProdotti: [], oliProdotti: [] };
  return {};
}
