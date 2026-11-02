/* Eventi delegati, costruzione, potenziamento e smantellamento. */
import { state, callRenderAll } from '../../core/state.js';
import { saveState } from '../../core/persistence.js';
import { catFilter, structSearchTerm, sottomeccanicaAperta, setCatFilter, setStructSearchTerm } from '../../core/state.js';
import { CATALOGO, MATERIALI_PREZZI, PUNTI_QG_MAX, LIVELLO_STRUTTURA_MAX, RARITA_POZIONI, ARGOMENTI_BIBLIOTECA, TEMI_BIBLIOTECA_SCELTE, PIANTE_SPECIALI, OPERA_ARTE_CFG, STUDIO_DIPLOMATICO_CFG, SALA_ARCANA_CFG, AVAMPOSTO_CFG, CAMPO_ADDESTRAMENTO_CFG, SALA_DA_GUERRA_CFG, IMPRESA_CFG, CATEGORIE, ELIPORTO_ARCANO_CFG } from '../../core/config.js';
import { uid, fmtMo, escapeHtml } from '../../utils/format.js';
import { puntiCosto, puntiSpesiTotali } from '../../engine/qg.js';
import { showToast } from '../toast.js';
import { registraMovimento, oroDisponibile } from '../../engine/finance.js';
import { haRaffineria, scelteProduzioneMiniera, scelteProduzioneAttivaMiniera } from '../../engine/production.js';
import { statoIniziale } from '../../modules/stato-iniziale.js';
import { opzioniDispiegamentoAvamposto, costoDispiegamentoAvamposto, labelTipoDispiegamento, raggioAvamposto, haUnitaAllenate, validaTipoDispiegamentoAvamposto, costoRifornimentoAvamposto, guadagnoPassivoAvamposto, impostaDistanzaAvamposto, toggleRifornimentoRidotto } from '../../modules/outpost.js';
import { avviaAddestramento, completaAddestramento, unitaMaxAddestrabili } from '../../modules/campo-addestramento.js';
import { scontoNavaleTotale, hasEliportoArcano, registraAcquistoNavale, cambiaStatoGuerra, salvaNoteGuerra } from '../../modules/porto-navale.js';
import { struttureVenditaDisponibili, calcolaRicavoImpresa, selezionaStrutturaVenditaImpresa, registraGuadagnoImpresa, aggiungiStrumentoImpresa, rimuoviStrumentoImpresa, registraVenditaImpresa } from '../../modules/impresa.js';
import { ottieniCharm, usaCharm } from '../../modules/studio-arcano.js';
import { costruisciCatalizzatore, caricaCatalizzatore, trasferisciCatalizzatore, costoCatalizzatore, gsMassimoCatalizzatore } from '../../modules/santuario.js';
import { aggiungiPozione, rimuoviPozione, totalePerRarita, usaCalderone } from '../../modules/alchimista.js';
import { toggleTemaBiblioteca, aggiungiTemaPersonalizzato, avviaIndagineTema, aggiungiSottospecieBestiario, aggiungiMaterialeBestiario, avviaIndagineBestiario, rimuoviIndagine } from '../../modules/biblioteca.js';
import { piantaSeme, raccogliPianta } from '../../modules/giardino.js';
import { creaOperaArte, calcolaPrestigioArtistico } from '../../modules/bottega-artistica.js';
import { toggleFazioneSelezionata, ottieniCompanion, rimuoviCompanion } from '../../modules/studio-diplomatico.js';
import { livelloIncantesimoMax, avviaRituale, annullaRituale } from '../../modules/sala-arcana.js';
import { TIPI_ANIMALI, CARNE_PER_ANIMALE, aggiungiAnimale, rimuoviAnimale, sacrificaAnimale } from '../../modules/fattoria.js';
import { ALBERI_LUOGO, scegliAlberoSegheria, ottieniSemeOLio } from '../../modules/segheria.js';
import { SATELLITE_CATALOG_IDS } from './data.js';
export function initStructureEvents() {
  document.getElementById('struct-catalog').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="costruisci"]');
    if (!btn) return;
    costruisciStruttura(btn.dataset.id);
  });

  document.getElementById('struct-catalog').addEventListener('change', e => {
    const sel = e.target.closest('#avampostoTipoSelect');
    if (!sel) return;
    const c = CATALOGO.find(x => x.id === 'avamposto');
    const nota = document.getElementById('avampostoCostoNota');
    if (c && nota) {
      const costoEff = costoDispiegamentoAvamposto(sel.value, c.costo);
      nota.textContent = `Costo effettivo con questa opzione: ${costoEff} mo`;
    }
  });

  document.getElementById('struct-owned-body').addEventListener('click', e => {
    const potBtn = e.target.closest('[data-action="potenzia"]');
    const delBtn = e.target.closest('[data-action="smantella"]');
    if (potBtn) potenziaStruttura(potBtn.dataset.uid);
    if (delBtn) smantellaStruttura(delBtn.dataset.uid);
  });

  document.getElementById('struct-owned-body').addEventListener('change', e => {
    const sel = e.target.closest('[data-action="scelta-miniera"]');
    if (!sel) return;
    const s = state.strutture.find(x => x.uid === sel.dataset.uid);
    if (!s) return;
    s.produzioneScelta = sel.value;
    saveState();
    showToast(`La Miniera estrarrà ${sel.value} dal prossimo "Chiudi mese"`);
  });

  document.getElementById('struct-sub-body').addEventListener('toggle', e => {
    const det = e.target.closest ? e.target.closest('details.sub-card') : null;
    if (!det) return;
    sottomeccanicaAperta[det.dataset.suid] = det.open;
  }, true);

  document.getElementById('struct-sub-body').addEventListener('click', e => {
    const azione = (sel) => e.target.closest(sel);

    const oCh = azione("[data-action='ottieni-charm']"); if (oCh) { ottieniCharm(oCh.dataset.uid); return; }
    const uCh = azione("[data-action='usa-charm']"); if (uCh) { usaCharm(uCh.dataset.uid); return; }
    const cCat = azione("[data-action='costruisci-catalizzatore']"); if (cCat) { costruisciCatalizzatore(cCat.dataset.uid); return; }
    const lCat = azione("[data-action='carica-catalizzatore']"); if (lCat) { caricaCatalizzatore(lCat.dataset.uid); return; }
    const tCat = azione("[data-action='trasferisci-catalizzatore']"); if (tCat) { trasferisciCatalizzatore(tCat.dataset.uid); return; }

    const rPoz = azione("[data-action='rimuovi-pozione']");
    if (rPoz) { rimuoviPozione(rPoz.dataset.uid, rPoz.dataset.pid); return; }

    const aPoz = azione("[data-action='aggiungi-pozione']");
    if (aPoz) {
      const suid = aPoz.dataset.uid;
      const nome = document.querySelector(`[data-field='pozNome'][data-uid='${suid}']`).value.trim();
      const rarita = document.querySelector(`[data-field='pozRarita'][data-uid='${suid}']`).value;
      const quantita = Number(document.querySelector(`[data-field='pozQuantita'][data-uid='${suid}']`).value) || 0;
      if (!nome || quantita <= 0) { showToast('Inserisci nome e quantità della pozione'); return; }
      aggiungiPozione(suid, nome, rarita, quantita);
      return;
    }

    const uCal = azione("[data-action='usa-calderone']");
    if (uCal) {
      const suid = uCal.dataset.uid;
      const rarita = document.querySelector(`[data-field='calderoneRarita'][data-uid='${suid}']`).value;
      const esito = usaCalderone(suid, rarita);
      if (esito) {
        showToast(`Calderone: consumate ${esito.consumate.join(', ')} — tiri 2d100: ${esito.tiro1} e ${esito.tiro2}. Scegli quale risultato applicare dalla Tabella della Mescita delle Pozioni.`);
      }
      return;
    }

    const tTema = azione("[data-action='toggle-tema']");
    if (tTema) { toggleTemaBiblioteca(tTema.dataset.uid, tTema.dataset.tema); return; }

    const aTemaC = azione("[data-action='aggiungi-tema-custom']");
    if (aTemaC) {
      const suid = aTemaC.dataset.uid;
      const nome = document.querySelector(`[data-field='temaCustom'][data-uid='${suid}']`).value.trim();
      if (!nome) { showToast('Inserisci un nome per il nuovo tema'); return; }
      aggiungiTemaPersonalizzato(suid, nome);
      document.querySelector(`[data-field='temaCustom'][data-uid='${suid}']`).value = '';
      return;
    }

    const aIndT = azione("[data-action='avvia-indagine-tema']");
    if (aIndT) {
      const suid = aIndT.dataset.uid;
      const tema = document.querySelector(`[data-field='indagineTema'][data-uid='${suid}']`)?.value;
      const pers = document.querySelector(`[data-field='indaginePersonaggio'][data-uid='${suid}']`).value.trim();
      if (!pers) { showToast('Inserisci il nome del personaggio'); return; }
      avviaIndagineTema(suid, tema, pers);
      return;
    }

    const rInd = azione("[data-action='rimuovi-indagine']");
    if (rInd) { rimuoviIndagine(rInd.dataset.uid, rInd.dataset.iid); return; }

    const aSotto = azione("[data-action='aggiungi-sottospecie']");
    if (aSotto) {
      const suid = aSotto.dataset.uid;
      const nome = document.querySelector(`[data-field='sottospecieCustom'][data-uid='${suid}']`).value.trim();
      if (!nome) { showToast('Inserisci il nome della sottospecie'); return; }
      aggiungiSottospecieBestiario(suid, nome);
      document.querySelector(`[data-field='sottospecieCustom'][data-uid='${suid}']`).value = '';
      return;
    }

    const mBest = azione("[data-action='materiale-bestiario']");
    if (mBest) { aggiungiMaterialeBestiario(mBest.dataset.uid, mBest.dataset.bid); return; }

    const aIndB = azione("[data-action='avvia-indagine-bestiario']");
    if (aIndB) {
      const suid = aIndB.dataset.uid;
      const bid = document.querySelector(`[data-field='bestiarioSelect'][data-uid='${suid}']`)?.value;
      const pers = document.querySelector(`[data-field='bestiarioPersonaggio'][data-uid='${suid}']`)?.value.trim();
      if (!bid || !pers) { showToast('Seleziona la sottospecie e il personaggio'); return; }
      avviaIndagineBestiario(suid, bid, pers);
      return;
    }

    const pSeme = azione("[data-action='pianta-seme']");
    if (pSeme) {
      const suid = pSeme.dataset.uid;
      const nome = document.querySelector(`[data-field='semePianta'][data-uid='${suid}']`).value;
      piantaSeme(suid, nome);
      return;
    }
    const rPianta = azione("[data-action='raccogli-pianta']");
    if (rPianta) { raccogliPianta(rPianta.dataset.uid, rPianta.dataset.pid); return; }

    const cOpera = azione("[data-action='crea-opera']");
    if (cOpera) {
      const suid = cOpera.dataset.uid;
      const stile = document.querySelector(`[data-field='operaStile'][data-uid='${suid}']`).value;
      const materiali = {};
      (OPERA_ARTE_CFG.materialiAmmessi || []).forEach(m => {
        const el = document.querySelector(`[data-field='operaMat-${m}'][data-uid='${suid}']`);
        materiali[m] = el ? Number(el.value) || 0 : 0;
      });
      creaOperaArte(suid, stile, materiali);
      return;
    }
    const calcPrestigio = azione("[data-action='calcola-prestigio']");
    if (calcPrestigio) {
      const suid = calcPrestigio.dataset.uid;
      const regione = document.querySelector(`[data-field='prestigioRegione'][data-uid='${suid}']`).value;
      const pct = calcolaPrestigioArtistico(regione);
      const out = document.getElementById(`prestigioRisultato-${suid}`);
      if (out) out.textContent = `${pct >= 0 ? '+' : ''}${pct}% verso ${regione}`;
      return;
    }

    const tFaz = azione("[data-action='toggle-fazione']");
    if (tFaz) { toggleFazioneSelezionata(tFaz.dataset.uid, tFaz.dataset.fazione); return; }

    const oComp = azione("[data-action='ottieni-companion']");
    if (oComp) {
      const suid = oComp.dataset.uid;
      const nome = document.querySelector(`[data-field='companionNome'][data-uid='${suid}']`).value.trim();
      const lv = Number(document.querySelector(`[data-field='companionLivello'][data-uid='${suid}']`).value) || 1;
      if (!nome) { showToast('Inserisci un nome per il Companion'); return; }
      ottieniCompanion(suid, nome, lv);
      return;
    }
    const rComp = azione("[data-action='rimuovi-companion']");
    if (rComp) { rimuoviCompanion(rComp.dataset.uid, rComp.dataset.cid); return; }

    const aAn = azione("[data-action='aggiungi-animale']");
    if (aAn) { aggiungiAnimale(aAn.dataset.uid, aAn.dataset.tipo); return; }
    const rAn = azione("[data-action='rimuovi-animale']");
    if (rAn) { rimuoviAnimale(rAn.dataset.uid, rAn.dataset.tipo); return; }
    const sacAn = azione("[data-action='sacrifica-animale']");
    if (sacAn) { sacrificaAnimale(sacAn.dataset.uid, sacAn.dataset.tipo); return; }

    const sAlb = azione("[data-action='scegli-albero']");
    if (sAlb) { scegliAlberoSegheria(sAlb.dataset.uid, sAlb.dataset.albero); return; }
    const oSeme = azione("[data-action='ottieni-seme']");
    if (oSeme) { ottieniSemeOLio(oSeme.dataset.uid, 'seme'); return; }
    const oOlio = azione("[data-action='ottieni-olio']");
    if (oOlio) { ottieniSemeOLio(oOlio.dataset.uid, 'olio'); return; }

    const cAbito = azione("[data-action='crea-abito']");
    if (cAbito) {
      const suid = cAbito.dataset.uid;
      const s = state.strutture.find(x => x.uid === suid);
      if (!s) return;
      const c = CATALOGO.find(x => x.id === s.catId);
      const costiStoffa = [5, 8, 11];
      const livIdx = Math.min((s.livello || 1) - 1, 2);
      const stoffaNecessaria = costiStoffa[livIdx];
      if ((state.materiali['Stoffa'] || 0) < stoffaNecessaria) { showToast(`Servono ${stoffaNecessaria} Stoffa (disponibili: ${state.materiali['Stoffa'] || 0}) ⚠`); return; }
      if (s.abitoSpeciale && s.abitoSpeciale.missioniRimaste > 0) { showToast('Hai già un Abito Speciale attivo ⚠'); return; }
      state.materiali['Stoffa'] -= stoffaNecessaria;
      const missioniDurata = [3, 6, 12];
      s.abitoSpeciale = { stoffaSpesa: stoffaNecessaria, missioniTotali: missioniDurata[livIdx], missioniRimaste: missioniDurata[livIdx] };
      showToast(`Abito Speciale creato! −${stoffaNecessaria} Stoffa. Ispirazione Eroica + vantaggio Carisma per ${missioniDurata[livIdx]} missioni.`);
      saveState();
      renderSottomeccaniche();
      return;
    }

    const cAffil = azione("[data-action='crea-affilatura']");
    if (cAffil) {
      const suid = cAffil.dataset.uid;
      const s = state.strutture.find(x => x.uid === suid);
      if (!s) return;
      const costiFerro = [1, 1, 3];
      const livIdx = Math.min((s.livello || 1) - 1, 2);
      const ferroNecessario = costiFerro[livIdx];
      if ((state.materiali['Ferro'] || 0) < ferroNecessario) { showToast(`Servono ${ferroNecessario} Ferro (disponibili: ${state.materiali['Ferro'] || 0}) ⚠`); return; }
      if (s.affilatura && s.affilatura.missioniRimaste > 0) { showToast('Hai già un\'Affilatura attiva ⚠'); return; }
      const nome = document.querySelector(`#affilatura-nome-${suid}`)?.value.trim() || 'Arma';
      state.materiali['Ferro'] -= ferroNecessario;
      const missioniDurata = [3, 6, 12];
      const bonusLiv = [1, 1, 2];
      s.affilatura = { nome, bonus: bonusLiv[livIdx], ferroSpeso: ferroNecessario, missioniTotali: missioniDurata[livIdx], missioniRimaste: missioniDurata[livIdx] };
      showToast(`Affilatura completata! −${ferroNecessario} Ferro. ${nome}: +${bonusLiv[livIdx]} colpi/danno per ${missioniDurata[livIdx]} missioni.`);
      saveState();
      renderSottomeccaniche();
      return;
    }

    const aRit = azione("[data-action='avvia-rituale']");
    if (aRit) {
      const suid = aRit.dataset.uid;
      const pers = document.querySelector(`[data-field='ritualePersonaggio'][data-uid='${suid}']`).value.trim();
      const inc = document.querySelector(`[data-field='ritualeIncantesimo'][data-uid='${suid}']`).value.trim();
      const lv = Number(document.querySelector(`[data-field='ritualeLivello'][data-uid='${suid}']`).value) || 0;
      avviaRituale(suid, pers, inc, lv);
      return;
    }
    const anRit = azione("[data-action='annulla-rituale']");
    if (anRit) { annullaRituale(anRit.dataset.uid); return; }

    const salvaDist = azione("[data-action='salva-distanza-avamposto']");
    if (salvaDist) {
      const suid = salvaDist.dataset.uid;
      const km = document.querySelector(`[data-field='avampostoDistanza'][data-uid='${suid}']`).value;
      impostaDistanzaAvamposto(suid, km);
      return;
    }

    const aAddest = azione("[data-action='avvia-addestramento']");
    if (aAddest) {
      const suid = aAddest.dataset.uid;
      const nome = document.querySelector(`[data-field='unitaNome'][data-uid='${suid}']`).value.trim();
      if (!nome) { showToast('Inserisci il nome dell\'unità'); return; }
      avviaAddestramento(suid, nome);
      return;
    }
    const cAddest = azione("[data-action='completa-addestramento']");
    if (cAddest) { completaAddestramento(cAddest.dataset.uid, cAddest.dataset.uid2); return; }

    const regNav = azione("[data-action='registra-acquisto-navale']");
    if (regNav) {
      const suid = regNav.dataset.uid;
      const costo = document.querySelector(`[data-field='navaleCosto'][data-uid='${suid}']`).value;
      registraAcquistoNavale(suid, costo);
      return;
    }

    const salvaNote = azione("[data-action='salva-note-guerra']");
    if (salvaNote) {
      const suid = salvaNote.dataset.uid;
      const nota = document.querySelector(`[data-field='salaGuerraNote'][data-uid='${suid}']`).value;
      salvaNoteGuerra(suid, nota);
      return;
    }

    const regGuadagno = azione("[data-action='registra-guadagno-impresa']");
    if (regGuadagno) {
      const suid = regGuadagno.dataset.uid;
      const spesa = document.querySelector(`[data-field='impresaSpesa'][data-uid='${suid}']`).value;
      registraGuadagnoImpresa(suid, spesa);
      return;
    }
    const aggStrumento = azione("[data-action='aggiungi-strumento-impresa']");
    if (aggStrumento) {
      const suid = aggStrumento.dataset.uid;
      const input = document.querySelector(`[data-field='impresaStrumentoNuovo'][data-uid='${suid}']`);
      aggiungiStrumentoImpresa(suid, input.value);
      input.value = '';
      return;
    }
    const rimStrumento = azione("[data-action='rimuovi-strumento-impresa']");
    if (rimStrumento) {
      rimuoviStrumentoImpresa(rimStrumento.dataset.uid, rimStrumento.dataset.strumento);
      return;
    }
    const regVendita = azione("[data-action='registra-vendita-impresa']");
    if (regVendita) {
      const suid = regVendita.dataset.uid;
      const valore = document.querySelector(`[data-field='impresaValoreVendita'][data-uid='${suid}']`).value;
      registraVenditaImpresa(suid, valore);
      return;
    }

    const ordPiatto = azione("[data-action='ordina-piatto']");
    if (ordPiatto) {
      const suid = ordPiatto.dataset.uid;
      const s = state.strutture.find(x => x.uid === suid);
      if (!s) return;
      const portataId = ordPiatto.dataset.portata;
      const portata = PORTATE_LOCANDA.find(p => p.id === portataId);
      if (!portata) return;
      const matPrincipale = portata.materiali.split(',')[0].trim();
      if ((state.materiali[matPrincipale] || 0) <= 0) { showToast(`Materiali insufficienti: ${matPrincipale} ⚠`); return; }
      state.materiali[matPrincipale] = Math.max(0, (state.materiali[matPrincipale] || 0) - 1);
      if (!s.piattiServiti) s.piattiServiti = [];
      const personaggio = prompt(`Piatto ${portata.nome} ordinato! Per quale personaggio? (opzionale)`) || '';
      const fresco = confirm('Ingredienti freschi? (provenienti da ≤1000km)');
      s.piattiServiti.push({ portataId: portata.id, personaggio, fresco, mese: state.calendario.mese });
      showToast(`${portata.nome} servito! ${portata.effettoPortata} + ${portata.effettoContorno}${fresco ? ' (fresco: durata ×2)' : ''}`);
      saveState();
      renderSottomeccaniche();
      return;
    }

    const creaBento = azione("[data-action='crea-bento']");
    if (creaBento) {
      const suid = creaBento.dataset.uid;
      const s = state.strutture.find(x => x.uid === suid);
      if (!s) return;
      if (!s.benti) s.benti = [];
      const personaggio = prompt('Per quale personaggio creare il Bento?') || '';
      if (!personaggio) return;
      const giorniScadenza = 2 * (s.livello || 1);
      s.benti.push({ personaggio, giorniRimasti: giorniScadenza, creatoAlMese: state.calendario.mese });
      showToast(`Bento creato per ${personaggio}! Scade tra ${giorniScadenza} giorni. Effetto: 2d8 PF temporanei.`);
      saveState();
      renderSottomeccaniche();
      return;
    }

    const avviaSpettacolo = azione("[data-action='avvia-spettacolo']");
    if (avviaSpettacolo) {
      const suid = avviaSpettacolo.dataset.uid;
      const s = state.strutture.find(x => x.uid === suid);
      if (!s) return;
      const tipo = avviaSpettacolo.dataset.tipo;
      const costo = Number(avviaSpettacolo.dataset.costo);
      if (oroDisponibile() < costo) { showToast(`Oro insufficiente per spettacolo ${tipo} (${costo} mo) ⚠`); return; }
      const settimaneStr = prompt(`Settimane di preparazione per spettacolo ${tipo}? (determina la durata dei benefici)`);
      const settimane = Number(settimaneStr) || 1;
      if (!confirm(`Avviare spettacolo ${tipo} per ${costo} mo con ${settimane} settimane di preparazione?`)) return;
      registraMovimento(`Spettacolo ${tipo} — preparazione ${settimane} settimane`, -costo);
      s.spettacoloInCorso = { tipo, costo, settimanePrep: settimane, settimaneRimaste: settimane };
      showToast(`Spettacolo ${tipo} avviato! ${settimane} settimane di preparazione.`);
      saveState();
      renderSottomeccaniche();
      return;
    }

    const annullaCostruzione = azione("[data-action='annulla-costruzione-edile']");
    if (annullaCostruzione) {
      const suid = annullaCostruzione.dataset.uid;
      const s = state.strutture.find(x => x.uid === suid);
      if (!s || !s.strutturaInCostruzione) return;
      if (!confirm('Annullare la costruzione in corso?')) return;
      s.strutturaInCostruzione = null;
      showToast('Costruzione annullata');
      saveState();
      renderSottomeccaniche();
      return;
    }
  });

  document.getElementById('struct-sub-body').addEventListener('change', e => {
    const rif = e.target.closest("[data-action='toggle-rifornimento-ridotto']");
    if (rif) { toggleRifornimentoRidotto(rif.dataset.uid); return; }
    const statoGuerra = e.target.closest("[data-action='cambia-stato-guerra']");
    if (statoGuerra) { cambiaStatoGuerra(statoGuerra.dataset.uid, statoGuerra.value); return; }
    const selVendita = e.target.closest("[data-action='seleziona-struttura-vendita-impresa']");
    if (selVendita) { selezionaStrutturaVenditaImpresa(selVendita.dataset.uid, selVendita.value); return; }
    if (e.target.id === 'inClimaQG') {
      state.clima = e.target.value;
      saveState();
      renderSottomeccaniche();
      return;
    }
  });

  document.getElementById('struct-search').addEventListener('input', e => {
    setStructSearchTerm(e.target.value);
    renderCatalogo();
  });

  document.getElementById('struct-sat-body').addEventListener('click', e => {
    const delBtn = e.target.closest('[data-action="smantella-satellite"]');
    if (!delBtn) return;
    const satUid = delBtn.dataset.satUid;
    const idx = (state.satelliti || []).findIndex(x => x.uid === satUid);
    if (idx < 0) return;
    const sat = state.satelliti[idx];
    const c = CATALOGO.find(x => x.id === sat.catId);
    if (!confirm(`Smantellare il satellite Lv.1 di ${c ? c.nome : sat.catId} a ${sat.nomeCitta}?`)) return;
    state.satelliti.splice(idx, 1);
    showToast('Satellite smantellato');
    saveState();
    callRenderAll();
  });
}

function costruisciStruttura(catId) {
  const c = CATALOGO.find(x => x.id === catId);
  if (!c) return;
  const costoPunti = puntiCosto(c);
  const spesiAttuali = puntiSpesiTotali();
  const errori = [];

  if (!c.exempt && spesiAttuali + costoPunti > PUNTI_QG_MAX) {
    errori.push(`Punti QG: servono ${costoPunti}, disponibili ${PUNTI_QG_MAX - spesiAttuali}`);
  }
  if (c.limiteCostruzioni && c.limiteCostruzioni.tipo === 'perLivelloQG') {
    const massimo = c.limiteCostruzioni.moltiplicatore * state.livello;
    const attuali = state.strutture.filter(s => s.catId === c.id).length;
    if (attuali >= massimo) {
      errori.push(`Limite raggiunto: massimo ${massimo} ${c.nome} al Livello QG attuale`);
    }
  }
  let tipoDispiegamento = 'standard';
  let costoEffettivo = c.costo;
  if (catId === 'avamposto') {
    const sel = document.getElementById('avampostoTipoSelect');
    tipoDispiegamento = sel ? sel.value : 'standard';
    const validazione = validaTipoDispiegamentoAvamposto(tipoDispiegamento);
    if (!validazione.ok) { showToast(validazione.messaggio, 'warning'); return; }
    costoEffettivo = costoDispiegamentoAvamposto(tipoDispiegamento, c.costo);
  }
  const oroDisp = oroDisponibile();
  if (oroDisp < costoEffettivo) {
    errori.push(`Oro: servono ${fmtMo(costoEffettivo)} mo, disponibili ${fmtMo(oroDisp)} mo`);
  }
  let tipoImpresa = 'distanza';
  if (catId === 'impresa') {
    const selImpresa = document.getElementById('impresaTipoSelect');
    tipoImpresa = selImpresa ? selImpresa.value : 'distanza';
  }
  let materialiSet = c.materiali;
  if (c.materialiOppure && c.materialiOppure.length > 0) {
    const selMat = document.querySelector(`[data-field="matScelta"][data-cid="${catId}"]`);
    if (selMat && selMat.value === 'alternativi') materialiSet = c.materialiOppure;
  }
  const matMancanti = [];
  for (const mat of materialiSet) {
    const disp = state.materiali[mat.m] || 0;
    if (disp < mat.u) {
      matMancanti.push(`${mat.m}: servono ${mat.u}U, disponibili ${disp}U`);
    }
  }
  if (matMancanti.length > 0) {
    errori.push(`Materiali mancanti:\n  • ${matMancanti.join('\n  • ')}`);
  }

  if (errori.length > 0) {
    showToast(`Impossibile costruire ${c.nome}:\n• ${errori.join('\n• ')}`, 'warning');
    return;
  }
  const etichettaDispiegamento = (catId === 'avamposto' && tipoDispiegamento !== 'standard')
    ? ` (${labelTipoDispiegamento(tipoDispiegamento)})` : '';
  registraMovimento(`Costruzione: ${c.nome}${etichettaDispiegamento}`, -costoEffettivo);
  materialiSet.forEach(mat => { state.materiali[mat.m] = (state.materiali[mat.m] || 0) - mat.u; });
  state.strutture.push({ uid: uid(), catId: c.id, livello: 1, materialiScelte: materialiSet === c.materialiOppure ? 'alternativi' : 'primari', ...statoIniziale(c.id, { tipoDispiegamento, tipoImpresa }) });

  if (c.categoria !== 'Generali' && state.classe === 'Nessuna') {
    state.classe = c.categoria;
    showToast(`${c.nome} costruita! Il QG ottiene la Classe ${c.categoria}`);
  } else {
    showToast(`${c.nome} costruita!`);
  }
  saveState();
  callRenderAll();
}

function potenziaStruttura(uidStr) {
  const s = state.strutture.find(x => x.uid === uidStr);
  if (!s) return;
  const c = CATALOGO.find(x => x.id === s.catId);
  if (s.livello >= LIVELLO_STRUTTURA_MAX) { showToast('Livello massimo raggiunto'); return; }
  const errori = [];
  if (state.livello < s.livello + 1) {
    errori.push(`Il QG deve essere almeno di Livello ${s.livello + 1} (attuale: ${state.livello})`);
  }
  const costoPunti = puntiCosto(c);
  if (!c.exempt && puntiSpesiTotali() + costoPunti > PUNTI_QG_MAX) {
    errori.push(`Punti QG: servono ${costoPunti}, disponibili ${PUNTI_QG_MAX - puntiSpesiTotali()}`);
  }
  const oroDisp = oroDisponibile();
  if (oroDisp < c.costo) {
    errori.push(`Oro: servono ${fmtMo(c.costo)} mo, disponibili ${fmtMo(oroDisp)} mo`);
  }
  let matSetPot = c.materiali;
  if (s.materialiScelte === 'alternativi' && c.materialiOppure && c.materialiOppure.length > 0) matSetPot = c.materialiOppure;
  const matMancanti = [];
  for (const mat of matSetPot) {
    const disp = state.materiali[mat.m] || 0;
    if (disp < mat.u) {
      matMancanti.push(`${mat.m}: servono ${mat.u}U, disponibili ${disp}U`);
    }
  }
  if (matMancanti.length > 0) {
    errori.push(`Materiali mancanti:\n  • ${matMancanti.join('\n  • ')}`);
  }
  if (errori.length > 0) {
    showToast(`Impossibile potenziare ${c.nome}:\n• ${errori.join('\n• ')}`, 'warning');
    return;
  }
  registraMovimento(`Potenziamento: ${c.nome} → Lv.${s.livello + 1}`, -c.costo);
  matSetPot.forEach(mat => { state.materiali[mat.m] = (state.materiali[mat.m] || 0) - mat.u; });
  s.livello += 1;
  showToast(`${c.nome} potenziata a Livello ${s.livello}`);
  if (SATELLITE_CATALOG_IDS.includes(s.catId)) {
    const nomeCitta = prompt(`Potenziamento effettuato! Vuoi creare un satellite Lv.1 di ${c.nome} in un'altra città? Inserisci il nome della città (o annulla per saltare):`);
    if (nomeCitta && nomeCitta.trim()) {
      state.satelliti.push({ uid: uid(), catId: s.catId, nomeCitta: nomeCitta.trim() });
      showToast(`Satellite Lv.1 di ${c.nome} creato a ${nomeCitta.trim()}`);
    }
  }
  saveState();
  callRenderAll();
}

function smantellaStruttura(uidStr) {
  const idx = state.strutture.findIndex(x => x.uid === uidStr);
  if (idx < 0) return;
  const s = state.strutture[idx];
  const c = CATALOGO.find(x => x.id === s.catId);
  if (!confirm(`Sei sicuro di voler smantellare ${c.nome} Liv.${s.livello}? L'operazione non è reversibile.`)) return;
  // Restituisci materiali (usando lo stesso set scelto alla costruzione)
  let matSetSm = c.materiali;
  if (s.materialiScelte === 'alternativi' && c.materialiOppure && c.materialiOppure.length > 0) matSetSm = c.materialiOppure;
  matSetSm.forEach(mat => { state.materiali[mat.m] = (state.materiali[mat.m] || 0) + mat.u * s.livello; });
  if (c.id === 'avamposto') {
    const rotteScollegate = state.rotte.filter(r => r.avampostoUid === uidStr).length;
    state.rotte.forEach(r => { if (r.avampostoUid === uidStr) r.avampostoUid = null; });
    showToast(rotteScollegate > 0
      ? `Avamposto smantellato: materiali restituiti, ${rotteScollegate} rotta/e tornate scoperte`
      : 'Avamposto smantellato: materiali restituiti al magazzino');
  } else if (c.categoria === 'Vendita') {
    const impreseScollegate = state.strutture.filter(x => x.catId === 'impresa' && x.strutturaVenditaUid === uidStr);
    impreseScollegate.forEach(imp => { imp.strutturaVenditaUid = null; imp.spesaMensile = 0; });
    showToast(impreseScollegate.length > 0
      ? `${c.nome} smantellata: ${impreseScollegate.length} Impresa/e tornate senza struttura collegata. Materiali restituiti.`
      : `${c.nome} smantellata: materiali restituiti al magazzino`);
  } else {
    showToast(`${c.nome} smantellata: materiali restituiti al magazzino`);
  }
  state.strutture.splice(idx, 1);
  saveState();
  callRenderAll();
}
