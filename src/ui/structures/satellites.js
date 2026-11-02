/* Satelliti delle strutture produttive. */
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
export function renderSatelliti() {
  const wrap = document.getElementById('struct-sat-wrap');
  const body = document.getElementById('struct-sat-body');
  if (!wrap || !body) return;
  if (!state.satelliti || state.satelliti.length === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  document.getElementById('struct-sat-count').textContent = state.satelliti.length;
  body.innerHTML = '';
  state.satelliti.forEach(sat => {
    const c = CATALOGO.find(x => x.id === sat.catId);
    const nome = c ? c.nome : sat.catId;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border,#ccc2);';
    div.innerHTML = `
      <span style="font-weight:600;">${escapeHtml(nome)}</span>
      <span class="tag tag-generali">Lv. 1</span>
      <span style="font-size:12px;color:var(--text-secondary,#888);">📍 ${escapeHtml(sat.nomeCitta)}</span>
      <span style="font-size:11px;color:var(--text-secondary,#888);font-style:italic;">Non potenziabile</span>
      <button class="btn btn-danger btn-sm" data-action="smantella-satellite" data-sat-uid="${sat.uid}">Smantella</button>`;
    body.appendChild(div);
  });
}

