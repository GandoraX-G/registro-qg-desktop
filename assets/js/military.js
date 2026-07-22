import {
  state, CATALOGO, ELIPORTO_ARCANO_CFG, AVAMPOSTO_CFG,
  CAMPO_ADDESTRAMENTO_CFG, PORTO_MILITARE_CFG, SALA_DA_GUERRA_CFG,
  SALA_ARCANA_CFG, OPERA_ARTE_CFG, IMPRESA_CFG, STUDIO_DIPLOMATICO_CFG,
  PIANTE_SPECIALI, ARGOMENTI_BIBLIOTECA, TEMI_BIBLIOTECA_SCELTE,
  RARITA_POZIONI, MATERIALI_PREZZI, AVAMPOSTO_RAGGIO_KM_PER_LIVELLO,
  saveState
} from './storage.js';

import { uid, fmtMo, registraMovimento, oroDisponibile } from './utils.js';
import { showToast } from './modal.js';

let _renderAll, _renderSottomeccaniche;
export function setRenderCallbacks(renderAllFn, renderSottomeccanicheFn) {
  _renderAll = renderAllFn;
  _renderSottomeccaniche = renderSottomeccanicheFn;
}
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

/* ============================================================
   PORTO MILITARE / ELIPORTO ARCANO (P3 — ondata 5)
   ============================================================ */
const TIPI_DISPIEGAMENTO_AVAMPOSTO = [
  {value:"standard", label:"Standard (rotta/territorio da Porta Ethea)"},
  {value:"specchio_acqua", label:"Specchio d'acqua collegato"},
  {value:"unshast_eliporto", label:"Ovunque in Unshast (metà costo)"},
  {value:"piano_dimensionale", label:"Piano Dimensionale Interno (doppio costo)"}
];

function hasStrutturaTipo(catId){ return state.strutture.some(s=>s.catId===catId); }
function hasPortoMilitare(){ return hasStrutturaTipo("porto_militare"); }
function hasEliportoArcano(){ return hasStrutturaTipo("eliporto_arcano"); }

function opzioniDispiegamentoAvamposto(){
  const livMin = ELIPORTO_ARCANO_CFG.livelloQGMinPianoDimensionale ?? 4;
  return TIPI_DISPIEGAMENTO_AVAMPOSTO.map(t=>{
    let abilitato = true, motivo = "";
    if(t.value === "specchio_acqua" && !hasPortoMilitare()){ abilitato = false; motivo = " — richiede Porto Militare"; }
    if(t.value === "unshast_eliporto" && !hasEliportoArcano()){ abilitato = false; motivo = " — richiede Eliporto Arcano"; }
    if(t.value === "piano_dimensionale"){
      if(!hasEliportoArcano()){ abilitato = false; motivo = " — richiede Eliporto Arcano"; }
      else if(state.livello < livMin){ abilitato = false; motivo = ` — richiede QG di Livello ${livMin}+`; }
    }
    return {...t, abilitato, motivo};
  });
}

function validaTipoDispiegamentoAvamposto(tipo){
  const opz = opzioniDispiegamentoAvamposto().find(o=>o.value===tipo);
  if(!opz) return {ok:false, messaggio:"Tipo di dispiegamento non valido ⚠"};
  if(!opz.abilitato) return {ok:false, messaggio:`Dispiegamento non disponibile: ${opz.label}${opz.motivo} ⚠`};
  return {ok:true};
}

function costoDispiegamentoAvamposto(tipo, costoBase){
  if(tipo === "unshast_eliporto") return costoBase * (ELIPORTO_ARCANO_CFG.moltiplicatoreCostoStandard ?? 0.5);
  if(tipo === "piano_dimensionale") return costoBase * (ELIPORTO_ARCANO_CFG.moltiplicatoreCostoPianoDimensionale ?? 2);
  return costoBase;
}

function labelTipoDispiegamento(tipo){
  const t = TIPI_DISPIEGAMENTO_AVAMPOSTO.find(x=>x.value===tipo);
  return t ? t.label : tipo;
}

function scontoNavaleTotale(){
  let sconto = 0;
  if(hasPortoMilitare()) sconto += (PORTO_MILITARE_CFG.scontoNavaleBasePercento ?? 20) / 100;
  if(hasEliportoArcano()) sconto += (ELIPORTO_ARCANO_CFG.scontoNavaleExtraPercento ?? 10) / 100;
  return sconto;
}

function registraAcquistoNavale(uidStr, costoBaseInput){
  const base = Math.max(0, Number(costoBaseInput) || 0);
  if(base <= 0){ showToast("Inserisci un costo base valido ⚠"); return; }
  const sconto = scontoNavaleTotale();
  const totale = base * (1 - sconto);
  if(oroDisponibile() < totale){ showToast("Oro insufficiente in tesoreria (oltre la riserva bancaria) ⚠"); return; }
  registraMovimento(`Potenziamento navale (sconto ${(sconto*100).toFixed(0)}%)`, -totale);
  showToast(`Potenziamento navale acquistato per ${totale.toFixed(1).replace(/\.0$/,"")} mo (sconto ${(sconto*100).toFixed(0)}%)`);
  renderAll();
  saveState();
}

function cambiaStatoGuerra(uidStr, nuovoStato){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="sala_da_guerra");
  if(!s) return;
  s.statoGuerra = nuovoStato;
  showToast(`Stato Guerra aggiornato: ${nuovoStato}`);
  renderSottomeccaniche();
  saveState();
}

function salvaNoteGuerra(uidStr, note){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="sala_da_guerra");
  if(!s) return;
  s.note = note || "";
  showToast("Note salvate");
  saveState();
}

/* ============================================================
   AVAMPOSTO — utility
   ============================================================ */
function elencoAvamposti(){
  return state.strutture.filter(s=>s.catId==="avamposto");
}
function avampostoAssegnatoA(rottaUid){
  return state.rotte.find(r=>r.uid===rottaUid)?.avampostoUid || null;
}
function avampostoLibero(struttura, rottaUidCorrente){
  return !state.rotte.some(r=>r.avampostoUid===struttura.uid && r.uid!==rottaUidCorrente);
}
function haUnitaAllenate(){
  return state.strutture.some(s=>s.catId==="campo_addestramento" && (s.unitaAllenate||0) > 0);
}
function raggioAvamposto(struttura){
  const base = AVAMPOSTO_RAGGIO_KM_PER_LIVELLO * (struttura.livello||1);
  if(haUnitaAllenate()){
    const conAllenamento = (CAMPO_ADDESTRAMENTO_CFG.raggioAvampostoConAllenateKmPerLivelloQG||600) * state.livello;
    return Math.max(base, conAllenamento);
  }
  return base;
}
function kmDifesiRotta(r){
  if(!r.avampostoUid) return 0;
  const av = state.strutture.find(s=>s.uid===r.avampostoUid && s.catId==="avamposto");
  return av ? raggioAvamposto(av) : 0;
}

function popolaSelectAvamposti(select, rottaUidCorrente){
  const scelto = select.value;
  select.innerHTML = `<option value="">— nessuno —</option>`;
  elencoAvamposti().forEach(av=>{
    const libero = avampostoLibero(av, rottaUidCorrente);
    const opt = document.createElement("option");
    opt.value = av.uid;
    opt.textContent = `Avamposto (Lv.${av.livello}, raggio ${raggioAvamposto(av)} km)` + (libero ? "" : " — già assegnato altrove");
    if(!libero && av.uid !== rottaUidCorrente) opt.disabled = true;
    select.appendChild(opt);
  });
  select.value = scelto || "";
}

function popolaSelectCaricoMateriali(){
  const select = document.getElementById("rCaricoMateriale");
  if(select.options.length > 1) return;
  Object.keys(MATERIALI_PREZZI).forEach(m=>{
    const opt = document.createElement("option");
    opt.value = m; opt.textContent = m;
    select.appendChild(opt);
  });
}

/* ============================================================
   IMPRESA (par. 1.5 del regolamento)
   ============================================================ */
function struttureVenditaDisponibili(){
  return state.strutture.filter(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    return c && c.categoria === "Vendita";
  });
}

function calcolaRicavoImpresa(spesa, livelloImpresa){
  const moltiplicatore = IMPRESA_CFG.moltiplicatoreRicavoPerSpesa ?? 3;
  const bonusPerLivello = IMPRESA_CFG.bonusMoPerLivelloImpresa ?? 10;
  return Math.max(0, spesa) * moltiplicatore + bonusPerLivello * livelloImpresa;
}

function selezionaStrutturaVenditaImpresa(uidStr, strutturaVenditaUid){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="impresa");
  if(!s) return;
  s.strutturaVenditaUid = strutturaVenditaUid || null;
  s.spesaMensile = 0;
  renderSottomeccaniche();
  saveState();
}

function registraGuadagnoImpresa(uidStr, spesaInput){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="impresa");
  if(!s) return;
  const struttura = state.strutture.find(x=>x.uid===s.strutturaVenditaUid);
  if(!struttura){ showToast("Seleziona prima una struttura di vendita ⚠"); return; }
  const spesaMax = (IMPRESA_CFG.spesaMaxMoPerLivelloStrutturaVendita ?? 10) * struttura.livello;
  const spesa = Math.max(0, Number(spesaInput) || 0);
  if(spesa > spesaMax){ showToast(`Spesa oltre il massimo consentito (${spesaMax} mo) ⚠`); return; }
  if(spesa <= 0){ showToast("Inserisci una spesa maggiore di zero ⚠"); return; }
  if(oroDisponibile() < spesa){ showToast("Oro insufficiente in tesoreria (oltre la riserva bancaria) per anticipare la spesa ⚠"); return; }
  const ricavo = calcolaRicavoImpresa(spesa, s.livello);
  const netto = ricavo - spesa;
  s.spesaMensile = spesa;
  registraMovimento(`Impresa "vendita a distanza" — spesa ${fmtMo(spesa)} mo, ricavo ${fmtMo(ricavo)} mo`, netto);
  showToast(`Guadagno registrato: netto +${fmtMo(netto)} mo`);
  renderAll();
  saveState();
}

function aggiungiStrumentoImpresa(uidStr, nome){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="impresa");
  if(!s) return;
  const nomeOk = (nome||"").trim();
  if(!nomeOk){ showToast("Inserisci il nome dello strumento ⚠"); return; }
  const max = (IMPRESA_CFG.strumentiPerLivello ?? 2) * s.livello;
  if((s.strumenti||[]).length >= max){ showToast(`Massimo ${max} strumenti a questo livello ⚠`); return; }
  if(s.strumenti.includes(nomeOk)){ showToast("Strumento già selezionato"); return; }
  s.strumenti.push(nomeOk);
  renderSottomeccaniche();
  saveState();
}

function rimuoviStrumentoImpresa(uidStr, nome){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="impresa");
  if(!s) return;
  s.strumenti = (s.strumenti||[]).filter(x=>x!==nome);
  renderSottomeccaniche();
  saveState();
}

function registraVenditaImpresa(uidStr, valoreInput){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="impresa");
  if(!s) return;
  const tabellaValori = IMPRESA_CFG.valoreMassimoOggettoPerLivello || {};
  const livelliNoti = Object.keys(tabellaValori).map(Number);
  const livelloMaxNoto = livelliNoti.length ? Math.max(...livelliNoti) : s.livello;
  const livelloRiferimento = Math.min(s.livello, livelloMaxNoto);
  const valoreMax = tabellaValori[String(livelloRiferimento)] ?? 0;
  const valore = Math.max(0, Number(valoreInput) || 0);
  if(valore <= 0){ showToast("Inserisci un valore maggiore di zero ⚠"); return; }
  if(valore > valoreMax){ showToast(`Valore oltre il massimo per singolo oggetto (${valoreMax} mo) ⚠`); return; }
  registraMovimento(`Impresa "a Porta Ethea" — vendita oggetto`, valore);
  showToast(`Vendita registrata: +${fmtMo(valore)} mo`);
  renderAll();
  saveState();
}

/* ============================================================
   SOTTO-MECCANICHE — stato iniziale
   ============================================================ */
function statoIniziale(catId, extra){
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
  return {};
}

/* ============================================================
   STUDIO ARCANO — Charm settimanale
   ============================================================ */
function ottieniCharm(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_arcano");
  if(!s || s.charmAttivo) return;
  s.charmAttivo = true;
  showToast("Charm ottenuto: dura 7 giorni narrativi o finché non lo usi");
  renderAll(); saveState();
}
function usaCharm(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_arcano");
  if(!s || !s.charmAttivo) return;
  s.charmAttivo = false;
  showToast("Charm consumato: Identificare lanciato senza slot né componenti");
  renderAll(); saveState();
}

/* ============================================================
   SANTUARIO — Catalizzatore d'Essenza
   ============================================================ */
function costoCatalizzatore(santuario){ return 150 * santuario.livello; }
function gsMassimoCatalizzatore(santuario){ return 3 * santuario.livello; }

function costruisciCatalizzatore(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="santuario");
  if(!s || s.catalizzatore) return;
  const costo = costoCatalizzatore(s);
  if(oroDisponibile() < costo){ showToast(`Oro insufficiente: servono ${costo} mo oltre la riserva bancaria ⚠`); return; }
  if(!confirm(`Costruire un Catalizzatore d'Essenza per ${costo} mo (GS massimo assorbibile: ${gsMassimoCatalizzatore(s)})?`)) return;
  registraMovimento(`Catalizzatore d'Essenza (Santuario)`, -costo);
  s.catalizzatore = { stato: "vuoto" };
  showToast("Catalizzatore costruito");
  renderAll(); saveState();
}
function caricaCatalizzatore(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="santuario");
  if(!s || !s.catalizzatore || s.catalizzatore.stato!=="vuoto") return;
  if(!confirm(`Assorbire l'essenza di una creatura (GS massimo ${gsMassimoCatalizzatore(s)}, incapacitata/morta da meno di un'ora/consenziente)? Se viva, subisce 3 livelli di affaticamento al termine.`)) return;
  s.catalizzatore.stato = "carico";
  showToast("Catalizzatore carico");
  renderAll(); saveState();
}
function trasferisciCatalizzatore(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="santuario");
  if(!s || !s.catalizzatore || s.catalizzatore.stato!=="carico") return;
  const haStudioArcano = state.strutture.some(x=>x.catId==="studio_arcano");
  if(!haStudioArcano){ showToast("Il trasferimento va effettuato in uno Studio Arcano: non ne hai ancora costruito uno ⚠"); return; }
  if(!confirm("Trasferire l'essenza in uno Studio Arcano? Verifica i requisiti del bersaglio (tipo creatura, non caricato, evocato o con caratteristica aumentata magicamente in modo permanente) prima di procedere.")) return;
  s.catalizzatore.stato = "in_attesa";
  showToast("Essenza trasferita: il catalizzatore è scarico e tornerà disponibile alla prossima chiusura del mese");
  renderAll(); saveState();
}

/* ============================================================
   ALCHIMISTA — pozioni in bottega + Calderone Alchemico
   ============================================================ */
function aggiungiPozione(uidStr, nome, rarita, quantita){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="alchimista");
  if(!s || !nome || quantita<=0) return;
  const esistente = s.pozioni.find(p=>p.nome===nome && p.rarita===rarita);
  if(esistente){ esistente.quantita += quantita; }
  else{ s.pozioni.push({id: uid(), nome, rarita, quantita}); }
  renderAll(); saveState();
}
function rimuoviPozione(uidStr, pozioneId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="alchimista");
  if(!s) return;
  s.pozioni = s.pozioni.filter(p=>p.id!==pozioneId);
  renderAll(); saveState();
}
function totalePerRarita(pozioni, rarita){
  return pozioni.filter(p=>p.rarita===rarita).reduce((s,p)=>s+p.quantita,0);
}
function usaCalderone(uidStr, rarita){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="alchimista");
  if(!s) return null;
  if(totalePerRarita(s.pozioni, rarita) < 2){ showToast(`Servono almeno 2 pozioni di rarità ${rarita} ⚠`); return null; }
  let daConsumare = 2;
  const consumate = [];
  s.pozioni.forEach(p=>{
    if(daConsumare<=0 || p.rarita!==rarita) return;
    const presi = Math.min(p.quantita, daConsumare);
    p.quantita -= presi; daConsumare -= presi;
    consumate.push(`${presi}× ${p.nome}`);
  });
  s.pozioni = s.pozioni.filter(p=>p.quantita>0);
  const tiro1 = Math.floor(Math.random()*100)+1;
  const tiro2 = Math.floor(Math.random()*100)+1;
  renderAll(); saveState();
  return { consumate, tiro1, tiro2, rarita };
}

/* ============================================================
   BIBLIOTECA — Temi, Bestiario, Indagini
   ============================================================ */
function toggleTemaBiblioteca(uidStr, tema){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s) return;
  const arg = ARGOMENTI_BIBLIOTECA.find(a=>a.nome===tema);
  if(arg && !arg.selezionabile){ showToast(`"${tema}" non è selezionabile come tema (regolamento)`); return; }
  const idx = s.temi.indexOf(tema);
  if(idx>=0){
    s.temi.splice(idx,1);
  }else{
    if(s.temi.length >= TEMI_BIBLIOTECA_SCELTE){ showToast(`Hai già scelto ${TEMI_BIBLIOTECA_SCELTE} temi: rimuovine uno prima di aggiungerne un altro`); return; }
    s.temi.push(tema);
  }
  renderAll(); saveState();
}
function aggiungiTemaPersonalizzato(uidStr, nome){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s || !nome) return;
  if(s.temi.includes(nome)){ showToast("Tema già presente"); return; }
  s.temi.push(nome);
  showToast(`Nuovo tema "${nome}" aggiunto (richiede almeno 3 libri sulla materia, da narrativa)`);
  renderAll(); saveState();
}
function avviaIndagineTema(uidStr, tema, personaggio){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s || !tema || !personaggio) return;
  s.indagini.push({ id: uid(), tipo: "tema", argomento: tema, personaggio, meseScadenza: state.calendario.mese + 1 });
  showToast(`Indagine avviata: +5 alle prove su "${tema}" per ${personaggio} fino al mese ${state.calendario.mese+1}`);
  renderAll(); saveState();
}
function aggiungiSottospecieBestiario(uidStr, nome){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s || !nome) return;
  if(s.bestiario.find(b=>b.nome===nome)){ showToast("Sottospecie già nel Bestiario"); return; }
  s.bestiario.push({ id: uid(), nome, materiali: 0 });
  renderAll(); saveState();
}
function aggiungiMaterialeBestiario(uidStr, voceId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s) return;
  const v = s.bestiario.find(b=>b.id===voceId);
  if(!v || v.materiali>=3) return;
  v.materiali++;
  if(v.materiali>=3) showToast(`${v.nome} sbloccata nel Bestiario!`);
  renderAll(); saveState();
}
function avviaIndagineBestiario(uidStr, voceId, personaggio){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  const v = s && s.bestiario.find(b=>b.id===voceId);
  if(!s || !v || v.materiali<3 || !personaggio) return;
  s.indagini.push({ id: uid(), tipo: "bestiario", argomento: v.nome, personaggio, meseScadenza: state.calendario.mese + 1 });
  showToast(`Indagine sul Bestiario avviata: +1d6 contro ${v.nome} per ${personaggio} fino al mese ${state.calendario.mese+1}`);
  renderAll(); saveState();
}
function rimuoviIndagine(uidStr, indagineId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s) return;
  s.indagini = s.indagini.filter(i=>i.id!==indagineId);
  renderAll(); saveState();
}

/* ============================================================
   GIARDINO — Piante Speciali
   ============================================================ */
function piantaSeme(uidStr, nomePianta){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="giardino");
  const def = PIANTE_SPECIALI.find(p=>p.nome===nomePianta);
  if(!s || !def) return;
  s.piante.push({ id: uid(), nome: def.nome, clima: def.clima, mesiCrescita: 0, mesiClimaSbagliato: 0 });
  showToast(`${def.nome} piantato (richiede clima ${def.clima}, matura in 1 mese)`);
  renderAll(); saveState();
}
function raccogliPianta(uidStr, piantaId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="giardino");
  if(!s) return;
  s.piante = s.piante.filter(p=>p.id!==piantaId);
  showToast("Pianta raccolta: assegna narrativamente il frutto/materiale ottenuto");
  renderAll(); saveState();
}

function avanzaGiardini(){
  const righe = [];
  state.strutture.forEach(s=>{
    if(s.catId!=="giardino") return;
    const sopravvissute = [];
    s.piante.forEach(p=>{
      const climaOk = p.clima === state.clima;
      if(climaOk){
        p.mesiClimaSbagliato = 0;
        p.mesiCrescita++;
        if(p.mesiCrescita>=1){
          righe.push(`  • ${p.nome} è maturo: pronto per la raccolta.`);
        }
        sopravvissute.push(p);
      }else{
        p.mesiClimaSbagliato++;
        if(p.mesiClimaSbagliato>=1){
          righe.push(`  • ${p.nome} è morto: clima ${p.clima} richiesto, QG in clima ${state.clima}.`);
        }else{
          sopravvissute.push(p);
        }
      }
    });
    s.piante = sopravvissute;
  });
  return righe;
}

/* ============================================================
   BOTTEGA ARTISTICA — Opere d'Arte + calcolatore Prestigio Artistico
   ============================================================ */
function creaOperaArte(uidStr, stile, materialiScelti){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="bottega_artistica");
  if(!s) return;
  if(s.creataQuestoMese){ showToast("Questa Bottega ha già creato un'Opera d'Arte questo mese ⚠"); return; }
  const ammessi = OPERA_ARTE_CFG.materialiAmmessi || [];
  let valore = 0;
  for(const m in materialiScelti){
    const q = Number(materialiScelti[m])||0;
    if(q<=0) continue;
    if(!ammessi.includes(m)){ showToast(`${m} non è un materiale ammesso per un'Opera d'Arte ⚠`); return; }
    const disp = state.materiali[m]||0;
    if(disp < q){ showToast(`Materiali insufficienti: manca ${m} ⚠`); return; }
    valore += q * (MATERIALI_PREZZI[m]||0);
  }
  const soglia = OPERA_ARTE_CFG.valoreMinimoMo || 120;
  if(valore < soglia || valore % soglia !== 0){
    showToast(`Il valore dei materiali scelti (${valore} mo) deve essere un multiplo di ${soglia} mo ⚠`);
    return;
  }
  for(const m in materialiScelti){
    const q = Number(materialiScelti[m])||0;
    if(q>0) state.materiali[m] -= q;
  }
  s.opere.push({ id: uid(), valore, stile });
  s.creataQuestoMese = true;
  showToast(`Opera d'Arte creata: valore ${valore} mo, stile "${stile}"`);
  renderAll(); saveState();
}
function calcolaPrestigioArtistico(regione){
  const soglia = OPERA_ARTE_CFG.valoreMinimoMo || 120;
  const bonusBlocco = OPERA_ARTE_CFG.bonusPerBlocco || 0.20;
  let totale = 0;
  state.strutture.forEach(s=>{
    if(s.catId!=="bottega_artistica") return;
    s.opere.forEach(o=>{
      const giudizio = (OPERA_ARTE_CFG.matrice[o.stile]||{})[regione];
      if(!giudizio) return;
      const blocchi = Math.round(o.valore / soglia);
      totale += (giudizio==="+" ? 1 : -1) * blocchi * bonusBlocco;
    });
  });
  return Math.round(totale*100);
}

/* ============================================================
   STUDIO DIPLOMATICO — Fazioni e Companion
   ============================================================ */
function toggleFazioneSelezionata(uidStr, fazione){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_diplomatico");
  if(!s) return;
  const idx = s.fazioniSelezionate.indexOf(fazione);
  if(idx>=0){ s.fazioniSelezionate.splice(idx,1); }
  else{
    if(s.fazioniSelezionate.length >= s.livello){ showToast(`Puoi selezionare al massimo ${s.livello} fazioni al mese (pari al livello della struttura)`); return; }
    s.fazioniSelezionate.push(fazione);
  }
  renderAll(); saveState();
}
function ottieniCompanion(uidStr, nome, livelloTarget){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_diplomatico");
  if(!s || !nome) return;
  if(s.fazioniSelezionate.length===0){ showToast("Seleziona almeno una fazione prima di ottenere un Companion ⚠"); return; }
  const base = STUDIO_DIPLOMATICO_CFG.costoCompanionBaseMo ?? 50;
  const extra = STUDIO_DIPLOMATICO_CFG.costoCompanionPerLivelloExtraMo ?? 50;
  const costo = base + extra * Math.max(0, livelloTarget - 1);
  if(oroDisponibile() < costo){ showToast(`Oro insufficiente: servono ${costo} mo oltre la riserva bancaria ⚠`); return; }
  if(!confirm(`Ottenere il Companion "${nome}" (Lv.${livelloTarget}) per ${costo} mo?` + (livelloTarget>1 ? " Non potrà salire di livello." : ""))) return;
  registraMovimento(`Companion: ${nome} (Studio Diplomatico)`, -costo);
  s.companions.push({ id: uid(), nome, fazioniOrigine: [...s.fazioniSelezionate], livello: livelloTarget, nonPuoSalireLivello: livelloTarget>1 });
  showToast(`Companion "${nome}" ottenuto`);
  renderAll(); saveState();
}
function rimuoviCompanion(uidStr, companionId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="studio_diplomatico");
  if(!s) return;
  s.companions = s.companions.filter(c=>c.id!==companionId);
  renderAll(); saveState();
}

/* ============================================================
   SALA ARCANA — rituali di apprendimento incantesimi
   ============================================================ */
function livelloIncantesimoMax(s){
  return Math.min(SALA_ARCANA_CFG.livelloIncantesimoMaxAssoluto||5, 2*s.livello - 1);
}
function costoRituale(livelloIncantesimo){
  if(livelloIncantesimo<=0) return SALA_ARCANA_CFG.costoTrucchettoMo||150;
  return (SALA_ARCANA_CFG.costoPerLivelloIncantesimoMo||550) * livelloIncantesimo;
}
function avviaRituale(uidStr, personaggio, incantesimo, livelloIncantesimo){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="sala_arcana");
  if(!s || !personaggio || !incantesimo) return;
  if(s.rituale){ showToast("Un rituale è già in corso: nella Sala Arcana se ne può svolgere solo uno alla volta ⚠"); return; }
  const max = livelloIncantesimoMax(s);
  if(livelloIncantesimo > max){ showToast(`Livello incantesimo troppo alto: massimo ${max} per una Sala Arcana Lv.${s.livello} ⚠`); return; }
  const costo = costoRituale(livelloIncantesimo);
  if(oroDisponibile() < costo){ showToast(`Oro insufficiente: servono ${costo} mo oltre la riserva bancaria ⚠`); return; }
  if(!confirm(`Avviare il rituale per "${incantesimo}" (${livelloIncantesimo<=0?"trucchetto":"Lv."+livelloIncantesimo}) per ${personaggio}? Costo: ${costo} mo.`)) return;
  registraMovimento(`Rituale: ${incantesimo} (Sala Arcana)`, -costo);
  const settimane = Math.max(SALA_ARCANA_CFG.settimaneMinimeTrucchetto||1, (SALA_ARCANA_CFG.settimanePerLivelloIncantesimo||1) * livelloIncantesimo);
  s.rituale = { personaggio, incantesimo, livello: livelloIncantesimo, settimaneRimanenti: settimane };
  showToast(`Rituale avviato: ${settimane} settimane di preparazione richieste`);
  renderAll(); saveState();
}
function annullaRituale(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="sala_arcana");
  if(!s || !s.rituale) return;
  if(!confirm("Annullare il rituale in corso? L'oro speso non viene restituito.")) return;
  s.rituale = null;
  renderAll(); saveState();
}
function avanzaRitualiArcani(){
  const righe = [];
  state.strutture.forEach(s=>{
    if(s.catId!=="sala_arcana" || !s.rituale) return;
    s.rituale.settimaneRimanenti -= 4;
    if(s.rituale.settimaneRimanenti <= 0){
      righe.push(`  • Rituale completato: ${s.rituale.personaggio} ha appreso "${s.rituale.incantesimo}".`);
      s.rituale = null;
    }
  });
  return righe;
}

/* ============================================================
   AVAMPOSTO — rifornimenti mensili + guadagno passivo
   ============================================================ */
function costoRifornimentoAvamposto(av){
  const per100 = av.rifornimentoRidotto
    ? (AVAMPOSTO_CFG.costoRifornimentoRidottoMoPer100Km||1)
    : (AVAMPOSTO_CFG.costoRifornimentoMoPer100Km||10);
  return (av.distanzaPortaEthea||0)/100 * per100;
}
function guadagnoPassivoAvamposto(av){
  return raggioAvamposto(av)/100 * (AVAMPOSTO_CFG.guadagnoPassivoMoPer100KmRaggio||25);
}
function impostaDistanzaAvamposto(uidStr, km){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="avamposto");
  if(!s) return;
  s.distanzaPortaEthea = Math.max(0, Number(km)||0);
  renderAll(); saveState();
}
function toggleRifornimentoRidotto(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="avamposto");
  if(!s) return;
  s.rifornimentoRidotto = !s.rifornimentoRidotto;
  renderAll(); saveState();
}
function applicaAvampostiMensile(){
  const righe = [];
  let entrateNette = 0;
  state.strutture.forEach(av=>{
    if(av.catId!=="avamposto") return;
    let costo = costoRifornimentoAvamposto(av);
    if(av.rifornimentoRidotto){
      const richiesti = AVAMPOSTO_CFG.rifornimentoRidottoMaterialiPerAvamposto||{};
      const scelta = Object.entries(richiesti).find(([m,q])=>(state.materiali[m]||0) >= q);
      if(scelta){
        state.materiali[scelta[0]] -= scelta[1];
      }else{
        costo = costoRifornimentoAvamposto({...av, rifornimentoRidotto:false});
        righe.push(`  • Avamposto: materiali per il rifornimento ridotto insufficienti, applicato il costo pieno.`);
      }
    }
    const guadagno = guadagnoPassivoAvamposto(av);
    entrateNette += guadagno - costo;
  });
  if(state.strutture.some(s=>s.catId==="avamposto")){
    registraMovimento("Avamposti: rifornimenti e guadagno passivo", entrateNette);
    righe.push(`  • Avamposti: ${entrateNette>=0?"+":""}${entrateNette.toFixed(1).replace(/\.0$/,"")} mo netti (rifornimenti − guadagno passivo).`);
  }
  return righe;
}

/* ============================================================
   CAMPO D'ADDESTRAMENTO — unità in addestramento -> Allenate
   ============================================================ */
function unitaMaxAddestrabili(s){ return (CAMPO_ADDESTRAMENTO_CFG.unitaMaxPerLivello||5) * s.livello; }
function avviaAddestramento(uidStr, nomeUnita){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="campo_addestramento");
  if(!s || !nomeUnita) return;
  if(s.unitaInAddestramento.length >= unitaMaxAddestrabili(s)){ showToast(`Massimo ${unitaMaxAddestrabili(s)} unità in addestramento contemporaneamente (5×livello) ⚠`); return; }
  s.unitaInAddestramento.push({ id: uid(), nome: nomeUnita });
  renderAll(); saveState();
}
function completaAddestramento(uidStr, unitaId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="campo_addestramento");
  if(!s) return;
  s.unitaInAddestramento = s.unitaInAddestramento.filter(u=>u.id!==unitaId);
  s.unitaAllenate = (s.unitaAllenate||0) + 1;
  showToast("Unità Allenata! Il raggio di protezione degli Avamposti sale a 600km × livello QG");
  renderAll(); saveState();
}

export {
  TIPI_DISPIEGAMENTO_AVAMPOSTO,
  hasStrutturaTipo, hasPortoMilitare, hasEliportoArcano,
  opzioniDispiegamentoAvamposto, validaTipoDispiegamentoAvamposto,
  costoDispiegamentoAvamposto, labelTipoDispiegamento,
  scontoNavaleTotale, registraAcquistoNavale,
  cambiaStatoGuerra, salvaNoteGuerra,

  elencoAvamposti, avampostoAssegnatoA, avampostoLibero,
  haUnitaAllenate, raggioAvamposto, kmDifesiRotta,
  popolaSelectAvamposti, popolaSelectCaricoMateriali,

  struttureVenditaDisponibili, calcolaRicavoImpresa,
  selezionaStrutturaVenditaImpresa, registraGuadagnoImpresa,
  aggiungiStrumentoImpresa, rimuoviStrumentoImpresa,
  registraVenditaImpresa,

  statoIniziale,

  ottieniCharm, usaCharm,

  costoCatalizzatore, gsMassimoCatalizzatore,
  costruisciCatalizzatore, caricaCatalizzatore, trasferisciCatalizzatore,

  aggiungiPozione, rimuoviPozione, totalePerRarita, usaCalderone,

  toggleTemaBiblioteca, aggiungiTemaPersonalizzato, avviaIndagineTema,
  aggiungiSottospecieBestiario, aggiungiMaterialeBestiario,
  avviaIndagineBestiario, rimuoviIndagine,

  piantaSeme, raccogliPianta, avanzaGiardini,

  creaOperaArte, calcolaPrestigioArtistico,

  toggleFazioneSelezionata, ottieniCompanion, rimuoviCompanion,

  livelloIncantesimoMax, costoRituale, avviaRituale,
  annullaRituale, avanzaRitualiArcani,

  costoRifornimentoAvamposto, guadagnoPassivoAvamposto,
  impostaDistanzaAvamposto, toggleRifornimentoRidotto,
  applicaAvampostiMensile,

  unitaMaxAddestrabili, avviaAddestramento, completaAddestramento
};
