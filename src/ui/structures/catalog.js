/* Catalogo delle strutture costruibili e tabella delle strutture possedute. */
import { state, callRenderAll } from '../../core/state.js';
import { saveState } from '../../core/persistence.js';
import { catFilter, structSearchTerm, sottomeccanicaAperta, setCatFilter, setStructSearchTerm } from '../../core/state.js';
import { CATALOGO, MATERIALI_PREZZI, PUNTI_QG_MAX, LIVELLO_STRUTTURA_MAX, RARITA_POZIONI, ARGOMENTI_BIBLIOTECA, TEMI_BIBLIOTECA_SCELTE, PIANTE_SPECIALI, OPERA_ARTE_CFG, STUDIO_DIPLOMATICO_CFG, SALA_ARCANA_CFG, AVAMPOSTO_CFG, CAMPO_ADDESTRAMENTO_CFG, SALA_DA_GUERRA_CFG, IMPRESA_CFG, CATEGORIE, ELIPORTO_ARCANO_CFG } from '../../core/config.js';
import { uid, fmtMo, escapeHtml } from '../../utils/format.js';
import { puntiCosto, puntiSpesiTotali } from '../../engine/qg.js';
import { soloPuntiQG } from '../../engine/costruzione.js';
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
import { renderSottomeccaniche } from './submechanics.js';
export function renderCatalogo() {
  const filters = document.getElementById('struct-filters');
  filters.innerHTML = '';
  ['Tutte', ...CATEGORIE].forEach(cat => {
    const b = document.createElement('button');
    b.textContent = cat;
    b.className = 'filter-chip';
    if (cat === catFilter) b.classList.add('active');
    b.onclick = () => { setCatFilter(cat); renderCatalogo(); };
    filters.appendChild(b);
  });

  const grid = document.getElementById('struct-catalog');
  grid.innerHTML = '';
  const searchLower = (structSearchTerm || '').toLowerCase();
  const lista = CATALOGO.filter(c => {
    if (catFilter !== 'Tutte' && c.categoria !== catFilter) return false;
    if (!searchLower) return true;
    return c.nome.toLowerCase().includes(searchLower)
      || c.desc.toLowerCase().includes(searchLower)
      || (c.materiali || []).some(m => m.m.toLowerCase().includes(searchLower));
  });
  lista.forEach(c => {
    const costoPunti = puntiCosto(c);
    const matStr = c.materiali.length ? c.materiali.map(m => `${m.m} ${m.u}U`).join(', ') : '—';
    const haOppure = c.materialiOppure && c.materialiOppure.length > 0;
    const matStrOppure = haOppure ? c.materialiOppure.map(m => `${m.m} ${m.u}U`).join(', ') : '';
    const soloPunti = soloPuntiQG();
    const card = document.createElement('div');
    card.className = 'struct-card';
    const selettoreDispiegamento = c.id === 'avamposto'
      ? `<div style="margin:6px 0;">
           <label style="display:block; font-size:12px; margin-bottom:2px;">Tipo di dispiegamento</label>
           <select id="avampostoTipoSelect" style="width:100%;">
             ${opzioniDispiegamentoAvamposto().map(o => `<option value="${o.value}" ${!o.abilitato ? 'disabled' : ''}>${o.label}${o.motivo}</option>`).join('')}
           </select>
           <div class="hint" id="avampostoCostoNota" style="margin:4px 0 0;">Costo effettivo con questa opzione: ${c.costo} mo</div>
         </div>`
      : '';
    const selettoreImpresa = c.id === 'impresa'
      ? `<div style="margin:6px 0;">
           <label style="display:block; font-size:12px; margin-bottom:2px;">Tipo di Impresa</label>
           <select id="impresaTipoSelect" style="width:100%;">
             <option value="distanza">Vendita a distanza (struttura di vendita + rotta)</option>
             <option value="porta_ethea">A Porta Ethea (strumenti da artigiano)</option>
           </select>
         </div>`
      : '';
    card.innerHTML = `
      <h4>${c.nome} <span class="tag tag-${c.categoria.toLowerCase()}">${c.categoria}</span></h4>
      <div class="meta">Costo: ${soloPunti ? 'sospeso' : `${c.costo} mo`} · Personale: ${c.personale} · Punti QG: ${c.exempt ? 'esente' : costoPunti}</div>
      ${soloPunti
        ? `<div class="mats">Materiali: sospesi (modalità solo punti QG)</div>`
        : haOppure
        ? `<div class="mats"><label style="margin:0;">Materiali:</label>
            <select data-field="matScelta" data-cid="${c.id}" style="max-width:100%; margin:4px 0;">
              <option value="primari">${matStr}</option>
              <option value="alternativi">${matStrOppure}</option>
            </select></div>`
        : `<div class="mats">Materiali: ${matStr}</div>`
      }
      <div class="desc">${c.desc}</div>
      ${selettoreDispiegamento}
      ${selettoreImpresa}
      <div class="foot"><button class="btn btn-brass btn-sm" data-action="costruisci" data-id="${c.id}">Costruisci</button></div>
    `;
    grid.appendChild(card);
  });
  if (lista.length === 0) {
    const emptyMsg = searchLower
      ? `Nessuna struttura trovata per "${structSearchTerm}". Prova con un'altra ricerca.`
      : 'Nessuna struttura disponibile in questa categoria.';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'catalog-empty';
    emptyDiv.innerHTML = `<div class="icon">&#9878;</div>${emptyMsg}`;
    grid.appendChild(emptyDiv);
  }
}

export function renderStrutturePossedute() {
  const body = document.getElementById('struct-owned-body');
  const empty = document.getElementById('struct-owned-empty');
  body.innerHTML = '';
  if (state.strutture.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  state.strutture.forEach(s => {
    const c = CATALOGO.find(x => x.id === s.catId);
    if (!c) return;
    const punti = puntiCosto(c) * s.livello;
    let selettoreProduzione = '';
    if (c.id === 'miniera') {
      const opzioni = scelteProduzioneMiniera(s, c);
      if (opzioni.length > 1) {
        const attiva = scelteProduzioneAttivaMiniera(s, c);
        selettoreProduzione = `<select class="mono" data-action="scelta-miniera" data-uid="${s.uid}" style="max-width:150px;">` +
          opzioni.map(o => `<option value="${o.materiale}" ${o.materiale === attiva.materiale ? 'selected' : ''}>Estrae: ${o.materiale}</option>`).join('') +
          `</select>`;
      }
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.nome}${s.costoSospeso ? ' <span class="tag tag-generali">senza costi</span>' : ''}</td>
      <td><span class="tag tag-${c.categoria.toLowerCase()}">${c.categoria}</span></td>
      <td class="mono">Lv. ${s.livello}</td>
      <td class="mono">${c.exempt ? 'esente' : punti}</td>
      <td>
        ${selettoreProduzione}
        <button class="btn btn-outline btn-sm" data-action="potenzia" data-uid="${s.uid}">Potenzia</button>
        <button class="btn btn-danger btn-sm" data-action="smantella" data-uid="${s.uid}">Smantella</button>
      </td>`;
    body.appendChild(tr);
  });
  renderSottomeccaniche();
}

