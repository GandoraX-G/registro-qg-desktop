import { state, CATALOGO, MATERIALI_PREZZI, PUNTI_QG_MAX, LIVELLO_STRUTTURA_MAX, RARITA_POZIONI, ARGOMENTI_BIBLIOTECA, TEMI_BIBLIOTECA_SCELTE, PIANTE_SPECIALI, OPERA_ARTE_CFG, STUDIO_DIPLOMATICO_CFG, SALA_ARCANA_CFG, AVAMPOSTO_CFG, CAMPO_ADDESTRAMENTO_CFG, SALA_DA_GUERRA_CFG, IMPRESA_CFG, currentTab, catFilter, structSearchTerm, sottomeccanicaAperta, CATEGORIE, setCatFilter, setStructSearchTerm } from './storage.js';
import { uid, escapeHtml, fmtMo, puntiCosto, puntiSpesiTotali, haRaffineria, scelteProduzioneMiniera, scelteProduzioneAttivaMiniera, registraMovimento, oroDisponibile } from './utils.js';
import { showToast } from './modal.js';
import { opzioniDispiegamentoAvamposto, costoDispiegamentoAvamposto, labelTipoDispiegamento, statoIniziale, raggioAvamposto, haUnitaAllenate, scontoNavaleTotale, hasEliportoArcano, unitaMaxAddestrabili, struttureVenditaDisponibili, calcolaRicavoImpresa, ottieniCharm, usaCharm, costruisciCatalizzatore, caricaCatalizzatore, trasferisciCatalizzatore, costoCatalizzatore, gsMassimoCatalizzatore, aggiungiPozione, rimuoviPozione, totalePerRarita, usaCalderone, toggleTemaBiblioteca, aggiungiTemaPersonalizzato, avviaIndagineTema, aggiungiSottospecieBestiario, aggiungiMaterialeBestiario, avviaIndagineBestiario, rimuoviIndagine, piantaSeme, raccogliPianta, creaOperaArte, calcolaPrestigioArtistico, toggleFazioneSelezionata, ottieniCompanion, rimuoviCompanion, livelloIncantesimoMax, costoRituale, avviaRituale, annullaRituale, costoRifornimentoAvamposto, guadagnoPassivoAvamposto, impostaDistanzaAvamposto, toggleRifornimentoRidotto, avviaAddestramento, completaAddestramento, registraAcquistoNavale, cambiaStatoGuerra, salvaNoteGuerra, selezionaStrutturaVenditaImpresa, registraGuadagnoImpresa, aggiungiStrumentoImpresa, rimuoviStrumentoImpresa, registraVenditaImpresa, validaTipoDispiegamentoAvamposto } from './military.js';
import { saveState } from './storage.js';

let _renderAll;
export function setRenderAll(fn) { _renderAll = fn; }
let _renderDashboard;
export function setRenderDashboard(fn) { _renderDashboard = fn; }

function renderAll() { if (_renderAll) _renderAll(); }
function renderDashboard() { if (_renderDashboard) _renderDashboard(); }

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
      <div class="meta">Costo: ${c.costo} mo · Personale: ${c.personale} · Punti QG: ${c.exempt ? 'esente' : costoPunti}</div>
      <div class="mats">Materiali: ${matStr}</div>
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
      <td>${c.nome}</td>
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

export function renderSottomeccaniche() {
  const wrap = document.getElementById('struct-sub-wrap');
  const body = document.getElementById('struct-sub-body');
  const rilevanti = state.strutture.filter(s => ['studio_arcano', 'santuario', 'alchimista', 'biblioteca', 'giardino', 'bottega_artistica', 'studio_diplomatico', 'sala_arcana', 'avamposto', 'campo_addestramento', 'porto_militare', 'eliporto_arcano', 'sala_da_guerra', 'impresa'].includes(s.catId));
  if (rilevanti.length === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  body.innerHTML = '';
  document.getElementById('struct-sub-count').textContent = rilevanti.length;

  rilevanti.forEach(s => {
    const c = CATALOGO.find(x => x.id === s.catId);
    const card = document.createElement('div');
    card.className = 'card';

    if (s.catId === 'studio_arcano') {
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#128302; ${c.nome} (Lv.${s.livello}) — Charm settimanale</h3>
        <div class="hint" style="margin:0 0 10px;">Dopo un Riposo Lungo nel Bastione, il Charm permette di lanciare <i>Identificare</i> con un'azione, senza slot né componenti. Dura 7 giorni narrativi o finché non lo usi.</div>
        <div class="row" style="align-items:center;">
          <span class="tag ${s.charmAttivo ? 'tag-vendita' : 'tag-generali'}">${s.charmAttivo ? 'Charm attivo' : 'Nessun Charm attivo'}</span>
          <button class="btn btn-outline btn-sm" data-action="ottieni-charm" data-uid="${s.uid}" ${s.charmAttivo ? 'disabled' : ''}>Ottieni Charm (dopo Riposo Lungo)</button>
          <button class="btn btn-brass btn-sm" data-action="usa-charm" data-uid="${s.uid}" ${!s.charmAttivo ? 'disabled' : ''}>Usa Charm (Identificare)</button>
        </div>`;
    }

    if (s.catId === 'santuario') {
      if (!s.catalizzatore) {
        card.innerHTML = `
          <h3 style="margin:0 0 8px;">&#10024; ${c.nome} (Lv.${s.livello}) — Catalizzatore d'Essenza</h3>
          <div class="hint" style="margin:0 0 10px;">Non ancora costruito. Costo: ${costoCatalizzatore(s)} mo — GS massimo assorbibile: ${gsMassimoCatalizzatore(s)}.</div>
          <button class="btn btn-outline btn-sm" data-action="costruisci-catalizzatore" data-uid="${s.uid}">Costruisci Catalizzatore</button>`;
      } else {
        const statoLabel = { vuoto: 'Vuoto', carico: 'Carico', in_attesa: 'Scarico (in attesa)' }[s.catalizzatore.stato];
        const tagClass = { vuoto: 'tag-generali', carico: 'tag-vendita', in_attesa: 'tag-militare' }[s.catalizzatore.stato];
        card.innerHTML = `
          <h3 style="margin:0 0 8px;">&#10024; ${c.nome} (Lv.${s.livello}) — Catalizzatore d'Essenza</h3>
          <div class="hint" style="margin:0 0 10px;">GS massimo assorbibile: ${gsMassimoCatalizzatore(s)}. Una volta trasferita l'essenza, il catalizzatore torna disponibile alla chiusura del mese successivo (approssimazione della settimana d'attesa da regolamento).</div>
          <div class="row" style="align-items:center;">
            <span class="tag ${tagClass}">${statoLabel}</span>
            <button class="btn btn-outline btn-sm" data-action="carica-catalizzatore" data-uid="${s.uid}" ${s.catalizzatore.stato !== 'vuoto' ? 'disabled' : ''}>Assorbi essenza</button>
            <button class="btn btn-brass btn-sm" data-action="trasferisci-catalizzatore" data-uid="${s.uid}" ${s.catalizzatore.stato !== 'carico' ? 'disabled' : ''}>Trasferisci (Potenziamento)</button>
          </div>`;
      }
    }

    if (s.catId === 'alchimista') {
      const opzioniRarita = RARITA_POZIONI.map(r => `<option value="${r}">${r}</option>`).join('');
      const righePozioni = s.pozioni.length === 0
        ? '<div class="hint" style="margin:6px 0;">Nessuna pozione in bottega.</div>'
        : '<table style="margin:6px 0;"><thead><tr><th>Pozione</th><th>Rarit&agrave;</th><th>Quantit&agrave;</th><th></th></tr></thead><tbody>' +
          s.pozioni.map(p => `<tr><td>${escapeHtml(p.nome)}</td><td>${p.rarita}</td><td class="mono">${p.quantita}</td>` +
            `<td><button class="btn btn-danger btn-sm" data-action="rimuovi-pozione" data-uid="${s.uid}" data-pid="${p.id}">Rimuovi</button></td></tr>`).join('') +
          '</tbody></table>';
      const raritaConDue = RARITA_POZIONI.filter(r => totalePerRarita(s.pozioni, r) >= 2);
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#9879;&#65039; ${c.nome} (Lv.${s.livello}) — Calderone Alchemico</h3>
        <div class="hint" style="margin:0 0 6px;">Il Calderone consuma 2 pozioni della stessa rarit&agrave;, tira 2d100 e sceglierai quale dei due risultati applicare consultando la Tabella della Mescita delle Pozioni (nel regolamento/5e.tools — non riprodotta qui per diritti d'autore).</div>
        ${righePozioni}
        <div class="row" style="align-items:flex-end;">
          <div><label>Nome pozione</label><input type="text" data-field="pozNome" data-uid="${s.uid}" placeholder="es. Pozione di Cura"></div>
          <div><label>Rarit&agrave;</label><select data-field="pozRarita" data-uid="${s.uid}">${opzioniRarita}</select></div>
          <div style="max-width:90px;"><label>Quantit&agrave;</label><input type="number" data-field="pozQuantita" data-uid="${s.uid}" min="1" value="1"></div>
          <div style="flex:0 0 auto;"><button class="btn btn-outline btn-sm" data-action="aggiungi-pozione" data-uid="${s.uid}">+ Aggiungi</button></div>
        </div>
        <div class="row" style="align-items:center; margin-top:8px;">
          ${raritaConDue.length === 0
            ? '<span class="hint" style="margin:0;">Servono almeno 2 pozioni della stessa rarit&agrave; per usare il Calderone.</span>'
            : `<label style="margin:0;">Rarit&agrave; da mescere</label><select data-field="calderoneRarita" data-uid="${s.uid}">${raritaConDue.map(r => `<option value="${r}">${r}</option>`).join('')}</select>
               <button class="btn btn-brass btn-sm" data-action="usa-calderone" data-uid="${s.uid}">&#129514; Usa Calderone</button>`}
        </div>`;
    }

    if (s.catId === 'biblioteca') {
      const chipTemi = ARGOMENTI_BIBLIOTECA.filter(a => a.selezionabile).map(a => {
        const attivo = s.temi.includes(a.nome);
        return `<button class="btn btn-sm ${attivo ? 'btn-brass' : 'btn-outline'}" data-action="toggle-tema" data-uid="${s.uid}" data-tema="${escapeHtml(a.nome)}">${attivo ? '✓ ' : ''}${escapeHtml(a.nome)}</button>`;
      }).join(' ');
      const temiExtra = s.temi.filter(t => !ARGOMENTI_BIBLIOTECA.some(a => a.nome === t));
      const bestiarioRighe = s.bestiario.length === 0 ? '<div class="hint" style="margin:4px 0;">Nessuna sottospecie ancora nel Bestiario.</div>' :
        s.bestiario.map(b => `<div class="row" style="align-items:center; margin:4px 0;">
          <span class="tag ${b.materiali >= 3 ? 'tag-vendita' : 'tag-generali'}">${escapeHtml(b.nome)} — ${b.materiali}/3 materiali${b.materiali >= 3 ? ' (sbloccata)' : ''}</span>
          ${b.materiali < 3 ? `<button class="btn btn-outline btn-sm" data-action="materiale-bestiario" data-uid="${s.uid}" data-bid="${b.id}">+1 materiale</button>` : ''}
        </div>`).join('');
      const indaginiRighe = s.indagini.length === 0 ? '' :
        `<div class="hint" style="margin:6px 0 2px;">Bonus attivi (scadono a fine mese ${s.indagini[0]?.meseScadenza ?? ''}):</div>` +
        s.indagini.map(i => `<div class="row" style="align-items:center;">
          <span class="tag tag-vendita">${i.tipo === 'tema' ? `+5 "${escapeHtml(i.argomento)}"` : `+1d6 vs ${escapeHtml(i.argomento)}`} — ${escapeHtml(i.personaggio)}</span>
          <button class="btn btn-danger btn-sm" data-action="rimuovi-indagine" data-uid="${s.uid}" data-iid="${i.id}">Rimuovi</button>
        </div>`).join('');
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#128218; ${c.nome} (Lv.${s.livello}) — Temi, Indagini, Bestiario</h3>
        <div class="hint" style="margin:0 0 6px;">Scegli fino a ${TEMI_BIBLIOTECA_SCELTE} temi (Linguaggio Esotico escluso da regolamento). Un'Indagine d&agrave; +5 alle prove sul tema per 1 mese.</div>
        <div style="margin:6px 0;">${chipTemi}</div>
        ${temiExtra.length ? `<div class="hint">Temi personalizzati: ${temiExtra.map(escapeHtml).join(', ')}</div>` : ''}
        <div class="row" style="align-items:flex-end; margin-top:8px;">
          <div><label>Nuovo tema personalizzato</label><input type="text" data-field="temaCustom" data-uid="${s.uid}" placeholder="min. 3 libri sulla materia"></div>
          <div style="flex:0 0 auto;"><button class="btn btn-outline btn-sm" data-action="aggiungi-tema-custom" data-uid="${s.uid}">+ Aggiungi tema</button></div>
        </div>
        <div class="row" style="align-items:flex-end; margin-top:10px;">
          <div><label>Avvia Indagine su tema</label><select data-field="indagineTema" data-uid="${s.uid}">${s.temi.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}</select></div>
          <div><label>Personaggio</label><input type="text" data-field="indaginePersonaggio" data-uid="${s.uid}" placeholder="es. Antares"></div>
          <div style="flex:0 0 auto;"><button class="btn btn-brass btn-sm" data-action="avvia-indagine-tema" data-uid="${s.uid}" ${s.temi.length === 0 ? 'disabled' : ''}>Avvia Indagine</button></div>
        </div>
        ${indaginiRighe}
        <div class="divider" style="margin:12px 0;"></div>
        <h4 style="margin:0 0 6px;">Bestiario</h4>
        ${bestiarioRighe}
        <div class="row" style="align-items:flex-end; margin-top:8px;">
          <div><label>Nuova sottospecie</label><input type="text" data-field="sottospecieCustom" data-uid="${s.uid}" placeholder="es. Goblin dei Boschi"></div>
          <div style="flex:0 0 auto;"><button class="btn btn-outline btn-sm" data-action="aggiungi-sottospecie" data-uid="${s.uid}">+ Aggiungi</button></div>
          ${s.bestiario.some(b => b.materiali >= 3) ? `
          <div><label>Indagine Bestiario su</label><select data-field="bestiarioSelect" data-uid="${s.uid}">${s.bestiario.filter(b => b.materiali >= 3).map(b => `<option value="${b.id}">${escapeHtml(b.nome)}</option>`).join('')}</select></div>
          <div><label>Personaggio</label><input type="text" data-field="bestiarioPersonaggio" data-uid="${s.uid}" placeholder="es. Thessa"></div>
          <div style="flex:0 0 auto;"><button class="btn btn-brass btn-sm" data-action="avvia-indagine-bestiario" data-uid="${s.uid}">Avvia Indagine</button></div>` : ''}
        </div>`;
    }

    if (s.catId === 'giardino') {
      const opzioniPiante = PIANTE_SPECIALI.map(p => `<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)} (${p.clima})</option>`).join('');
      const righePiante = s.piante.length === 0 ? '<div class="hint" style="margin:6px 0;">Nessuna pianta speciale in coltivazione.</div>' :
        s.piante.map(p => {
          const ok = p.clima === state.clima;
          return `<div class="row" style="align-items:center; margin:4px 0;">
            <span class="tag ${ok ? 'tag-vendita' : 'tag-militare'}">${escapeHtml(p.nome)} (clima ${p.clima}) — ${ok ? (p.mesiCrescita >= 1 ? 'matura' : 'in crescita') : '⚠ clima sbagliato'}</span>
            ${p.mesiCrescita >= 1 ? `<button class="btn btn-brass btn-sm" data-action="raccogli-pianta" data-uid="${s.uid}" data-pid="${p.id}">Raccogli</button>` : ''}
          </div>`;
        }).join('');
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#127793; ${c.nome} (Lv.${s.livello}) — Piante Speciali</h3>
        <div class="hint" style="margin:0 0 6px;">Le piante crescono in 1 mese col clima giusto; se il clima resta sbagliato per un mese intero (≥ le 2 settimane da regolamento) muoiono. Imposta il clima del settore del QG qui sotto.</div>
        <div class="row" style="align-items:center;">
          <label style="margin:0;">Clima del QG</label>
          <select id="inClimaQG">
            <option value="Mite" ${state.clima === 'Mite' ? 'selected' : ''}>Mite</option>
            <option value="Caldo" ${state.clima === 'Caldo' ? 'selected' : ''}>Caldo</option>
            <option value="Freddo" ${state.clima === 'Freddo' ? 'selected' : ''}>Freddo</option>
          </select>
        </div>
        ${righePiante}
        <div class="row" style="align-items:flex-end; margin-top:8px;">
          <div><label>Pianta un seme</label><select data-field="semePianta" data-uid="${s.uid}">${opzioniPiante}</select></div>
          <div style="flex:0 0 auto;"><button class="btn btn-outline btn-sm" data-action="pianta-seme" data-uid="${s.uid}">+ Pianta</button></div>
        </div>`;
    }

    if (s.catId === 'bottega_artistica') {
      const opzioniStile = OPERA_ARTE_CFG.argomenti.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
      const opzioniRegione = OPERA_ARTE_CFG.regioni.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
      const righeOpere = s.opere.length === 0 ? '<div class="hint" style="margin:6px 0;">Nessuna Opera d\'Arte posseduta.</div>' :
        s.opere.map(o => `<div class="tag tag-vendita" style="margin:2px 4px 2px 0; display:inline-block;">${o.valore} mo — ${escapeHtml(o.stile)}</div>`).join('');
      const campiMateriali = (OPERA_ARTE_CFG.materialiAmmessi || []).map(m =>
        `<div style="max-width:110px;"><label>${m}</label><input type="number" min="0" value="0" data-field="operaMat-${m}" data-uid="${s.uid}"></div>`).join('');
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#127912; ${c.nome} (Lv.${s.livello}) — Opere d'Arte e Prestigio Artistico</h3>
        <div class="hint" style="margin:0 0 6px;">1 Opera al mese, pagata in materiali (Pietra/Legna/Oro/Stoffa) per un valore multiplo di ${OPERA_ARTE_CFG.valoreMinimoMo} mo. Ogni Opera d&agrave; ±20% ai profitti degli accordi commerciali con NPC per ogni blocco da 120mo, in base a quanto piace il suo stile alla regione controparte (non si applica ai guadagni delle stanze di vendita).</div>
        <div>${righeOpere}</div>
        <div class="row" style="align-items:flex-end; margin-top:8px;">
          ${campiMateriali}
          <div><label>Stile dell'Opera</label><select data-field="operaStile" data-uid="${s.uid}">${opzioniStile}</select></div>
          <div style="flex:0 0 auto;"><button class="btn btn-brass btn-sm" data-action="crea-opera" data-uid="${s.uid}" ${s.creataQuestoMese ? 'disabled' : ''}>${s.creataQuestoMese ? 'Gi&agrave; creata questo mese' : 'Crea Opera d\'Arte'}</button></div>
        </div>
        <div class="divider" style="margin:12px 0;"></div>
        <h4 style="margin:0 0 6px;">Calcolatore Prestigio Artistico</h4>
        <div class="row" style="align-items:center;">
          <label style="margin:0;">Regione controparte</label>
          <select id="prestigioRegioneSelect-${s.uid}" data-field="prestigioRegione" data-uid="${s.uid}">${opzioniRegione}</select>
          <span class="tag tag-generali" id="prestigioRisultato-${s.uid}">calcola →</span>
          <button class="btn btn-outline btn-sm" data-action="calcola-prestigio" data-uid="${s.uid}">Calcola</button>
        </div>`;
    }

    if (s.catId === 'studio_diplomatico') {
      const fazioni = STUDIO_DIPLOMATICO_CFG.fazioni || [];
      const chipFazioni = fazioni.map(f => {
        const attivo = s.fazioniSelezionate.includes(f);
        return `<button class="btn btn-sm ${attivo ? 'btn-brass' : 'btn-outline'}" data-action="toggle-fazione" data-uid="${s.uid}" data-fazione="${escapeHtml(f)}">${attivo ? '✓ ' : ''}${escapeHtml(f)}</button>`;
      }).join(' ');
      const righeCompanion = s.companions.length === 0 ? '<div class="hint" style="margin:6px 0;">Nessun Companion ottenuto.</div>' :
        s.companions.map(comp => `<div class="row" style="align-items:center; margin:4px 0;">
          <span class="tag tag-militare">${escapeHtml(comp.nome)} — Lv.${comp.livello}${comp.nonPuoSalireLivello ? ' (non pu&ograve; salire di livello)' : ''} — da: ${comp.fazioniOrigine.map(escapeHtml).join(', ')}</span>
          <button class="btn btn-danger btn-sm" data-action="rimuovi-companion" data-uid="${s.uid}" data-cid="${comp.id}">Rimuovi</button>
        </div>`).join('');
      const vantaggioHint = s.livello >= 2 ? '<div class="hint">Dal Lv.2: finch&eacute; possiedi un Companion di un altro esercito, hai vantaggio a Persuasione/Inganno nelle regioni di origine.</div>' : '';
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#129309; ${c.nome} (Lv.${s.livello}) — Fazioni e Companion</h3>
        <div class="hint" style="margin:0 0 6px;">Seleziona fino a ${s.livello} fazioni questo mese (si azzera alla prossima chiusura del mese). Un Companion base costa ${STUDIO_DIPLOMATICO_CFG.costoCompanionBaseMo} mo; ogni livello extra costa altri ${STUDIO_DIPLOMATICO_CFG.costoCompanionPerLivelloExtraMo} mo, ma un Companion comprato gi&agrave; a livello superiore non pu&ograve; salire di livello.</div>
        <div style="margin:6px 0;">${chipFazioni}</div>
        ${vantaggioHint}
        <div class="divider" style="margin:12px 0;"></div>
        ${righeCompanion}
        <div class="row" style="align-items:flex-end; margin-top:8px;">
          <div><label>Nome Companion</label><input type="text" data-field="companionNome" data-uid="${s.uid}" placeholder="es. Vessa"></div>
          <div style="max-width:110px;"><label>Livello</label><input type="number" min="1" value="1" data-field="companionLivello" data-uid="${s.uid}"></div>
          <div style="flex:0 0 auto;"><button class="btn btn-brass btn-sm" data-action="ottieni-companion" data-uid="${s.uid}">Ottieni Companion</button></div>
        </div>`;
    }

    if (s.catId === 'sala_arcana') {
      const max = livelloIncantesimoMax(s);
      if (!s.rituale) {
        card.innerHTML = `
          <h3 style="margin:0 0 8px;">&#127744; ${c.nome} (Lv.${s.livello}) — Rituale di Apprendimento</h3>
          <div class="hint" style="margin:0 0 6px;">Un solo rituale alla volta. Livello massimo incantesimo apprendibile: ${max}. Costo: ${SALA_ARCANA_CFG.costoTrucchettoMo} mo (trucchetto) o ${SALA_ARCANA_CFG.costoPerLivelloIncantesimoMo} mo × livello.</div>
          <div class="row" style="align-items:flex-end;">
            <div><label>Personaggio</label><input type="text" data-field="ritualePersonaggio" data-uid="${s.uid}" placeholder="es. Antares"></div>
            <div><label>Incantesimo</label><input type="text" data-field="ritualeIncantesimo" data-uid="${s.uid}" placeholder="es. Palla di Fuoco"></div>
            <div style="max-width:110px;"><label>Livello (0=trucchetto)</label><input type="number" min="0" max="${max}" value="0" data-field="ritualeLivello" data-uid="${s.uid}"></div>
            <div style="flex:0 0 auto;"><button class="btn btn-brass btn-sm" data-action="avvia-rituale" data-uid="${s.uid}">Avvia Rituale</button></div>
          </div>`;
      } else {
        const r = s.rituale;
        card.innerHTML = `
          <h3 style="margin:0 0 8px;">&#127744; ${c.nome} (Lv.${s.livello}) — Rituale in corso</h3>
          <div class="row" style="align-items:center;">
            <span class="tag tag-vendita">${escapeHtml(r.personaggio)} → "${escapeHtml(r.incantesimo)}" (${r.livello <= 0 ? 'trucchetto' : 'Lv.' + r.livello}) — ${Math.max(0, r.settimaneRimanenti)} settimane rimanenti</span>
            <button class="btn btn-danger btn-sm" data-action="annulla-rituale" data-uid="${s.uid}">Annulla</button>
          </div>
          <div class="hint">Avanza di ~4 settimane ad ogni "Chiudi mese" (approssimazione: l'app non ha un calendario settimanale).</div>`;
      }
    }

    if (s.catId === 'avamposto') {
      const raggio = raggioAvamposto(s);
      const costo = costoRifornimentoAvamposto(s);
      const guadagno = guadagnoPassivoAvamposto(s);
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#127781;&#65039; ${c.nome} (Lv.${s.livello}) — Rifornimenti e Guadagno Passivo</h3>
        <div class="hint" style="margin:0 0 6px;">Tipo di dispiegamento: <b>${labelTipoDispiegamento(s.tipoDispiegamento || 'standard')}</b>. Raggio di protezione attuale: ${raggio} km${haUnitaAllenate() ? ' (bonus Unit&agrave; Allenate attivo)' : ''}. Ogni mese: costo rifornimento in base alla distanza da Porta Ethea, guadagno passivo di ${AVAMPOSTO_CFG.guadagnoPassivoMoPer100KmRaggio} mo/100km di raggio difeso.</div>
        <div class="row" style="align-items:center;">
          <div><label>Distanza da Porta Ethea (km)</label><input type="number" min="0" value="${s.distanzaPortaEthea || 0}" data-field="avampostoDistanza" data-uid="${s.uid}" style="max-width:130px;"></div>
          <button class="btn btn-outline btn-sm" data-action="salva-distanza-avamposto" data-uid="${s.uid}">Salva</button>
          <label style="margin:0;"><input type="checkbox" data-action="toggle-rifornimento-ridotto" data-uid="${s.uid}" ${s.rifornimentoRidotto ? 'checked' : ''}> Rifornimento ridotto (consuma Pesce/Carne/Beni vegetali invece di mo)</label>
        </div>
        <div class="hint">Stima del mese corrente: costo ${costo.toFixed(1).replace(/\.0$/, '')} mo, guadagno ${guadagno.toFixed(1).replace(/\.0$/, '')} mo.</div>`;
    }

    if (s.catId === 'campo_addestramento') {
      const max = unitaMaxAddestrabili(s);
      const righeInAddestramento = s.unitaInAddestramento.length === 0 ? '<div class="hint" style="margin:6px 0;">Nessuna unit&agrave; in addestramento.</div>' :
        s.unitaInAddestramento.map(u => `<div class="row" style="align-items:center; margin:4px 0;">
          <span class="tag tag-generali">${escapeHtml(u.nome)}</span>
          <button class="btn btn-brass btn-sm" data-action="completa-addestramento" data-uid="${s.uid}" data-uid2="${u.id}">Segna come Allenata</button>
        </div>`).join('');
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#127919; ${c.nome} (Lv.${s.livello}) — Addestramento Unit&agrave;</h3>
        <div class="hint" style="margin:0 0 6px;">Fino a ${max} unit&agrave; in addestramento contemporaneamente (5×livello). Le unit&agrave; Allenate (${s.unitaAllenate || 0} finora) portano il raggio di protezione di TUTTI gli Avamposti del QG a 600km × livello QG.</div>
        ${righeInAddestramento}
        <div class="row" style="align-items:flex-end; margin-top:8px;">
          <div><label>Nome unit&agrave;</label><input type="text" data-field="unitaNome" data-uid="${s.uid}" placeholder="es. Squadra Corvo"></div>
          <div style="flex:0 0 auto;"><button class="btn btn-outline btn-sm" data-action="avvia-addestramento" data-uid="${s.uid}">+ Avvia addestramento</button></div>
        </div>`;
    }

    if (s.catId === 'porto_militare') {
      const sconto = scontoNavaleTotale();
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#9875; ${c.nome} (Lv.${s.livello}) — Sconto sui Potenziamenti Navali</h3>
        <div class="hint" style="margin:0 0 6px;">Abilita nel catalogo l'opzione "Specchio d'acqua collegato" per gli Avamposti. Sconto navale attuale: <b>${(sconto * 100).toFixed(0)}%</b>${hasEliportoArcano() ? ' (20% Porto Militare + 10% Eliporto Arcano)' : ''}. Il catalogo dei Potenziamenti Navali &egrave; su una pagina esterna non consultabile da qui: inserisci il costo base per applicare lo sconto.</div>
        <div class="row" style="align-items:flex-end;">
          <div><label>Costo base potenziamento (mo)</label><input type="number" min="0" data-field="navaleCosto" data-uid="${s.uid}" style="max-width:150px;"></div>
          <div style="flex:0 0 auto;"><button class="btn btn-outline btn-sm" data-action="registra-acquisto-navale" data-uid="${s.uid}">Registra acquisto</button></div>
        </div>`;
    }

    if (s.catId === 'eliporto_arcano') {
      const sconto = scontoNavaleTotale();
      const livMin = ELIPORTO_ARCANO_CFG.livelloQGMinPianoDimensionale ?? 4;
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#128641; ${c.nome} (Lv.${s.livello}) — Dispiegamento Rapido e Sconto Navale</h3>
        <div class="hint" style="margin:0 0 6px;">Abilita nel catalogo le opzioni "Ovunque in Unshast" (met&agrave; costo) e, dal Livello QG ${livMin}, "Piano Dimensionale Interno" (doppio costo) per gli Avamposto. Il dimezzamento del tempo di dispiegamento &egrave; un effetto narrativo non tracciato numericamente qui, perch&eacute; l'app segue un calendario mensile e non un tempo di costruzione separato. Sconto navale attuale: <b>${(sconto * 100).toFixed(0)}%</b>.</div>
        <div class="row" style="align-items:flex-end;">
          <div><label>Costo base potenziamento (mo)</label><input type="number" min="0" data-field="navaleCosto" data-uid="${s.uid}" style="max-width:150px;"></div>
          <div style="flex:0 0 auto;"><button class="btn btn-outline btn-sm" data-action="registra-acquisto-navale" data-uid="${s.uid}">Registra acquisto</button></div>
        </div>`;
    }

    if (s.catId === 'sala_da_guerra') {
      const stati = SALA_DA_GUERRA_CFG.statiDisponibili || ['Nessuna pianificazione'];
      const opzioniStato = stati.map(st => `<option value="${escapeHtml(st)}" ${s.statoGuerra === st ? 'selected' : ''}>${escapeHtml(st)}</option>`).join('');
      card.innerHTML = `
        <h3 style="margin:0 0 8px;">&#9876;&#65039; ${c.nome} (Lv.${s.livello}) — Organizzazione della Guerra</h3>
        <div class="hint" style="margin:0 0 6px;">Il regolamento rimanda per le regole dettagliate alla scheda "Guerra" separata (attivit&agrave; complessa, consigliata a giocatori esperti): non essendo qui disponibile quella scheda, questa stanza offre solo un tracciamento di stato e note, senza calcoli o meccaniche di battaglia.</div>
        <div class="row" style="align-items:center;">
          <label style="margin:0;">Stato attuale</label>
          <select data-action="cambia-stato-guerra" data-uid="${s.uid}">${opzioniStato}</select>
        </div>
        <div class="row" style="align-items:flex-end; margin-top:8px;">
          <div style="flex:1;"><label>Note (piani, alleati, obiettivi...)</label><textarea data-field="salaGuerraNote" data-uid="${s.uid}" rows="3" style="width:100%;">${escapeHtml(s.note || '')}</textarea></div>
          <div style="flex:0 0 auto;"><button class="btn btn-outline btn-sm" data-action="salva-note-guerra" data-uid="${s.uid}">Salva note</button></div>
        </div>`;
    }

    if (s.catId === 'impresa') {
      card.innerHTML = renderCardImpresa(s, c);
    }

    const h3Match = card.innerHTML.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    const titoloSommario = h3Match ? h3Match[1] : c.nome;
    const corpo = h3Match ? card.innerHTML.replace(h3Match[0], '') : card.innerHTML;
    const details = document.createElement('details');
    details.className = `card sub-card cat-${(c.categoria || 'generali').toLowerCase()}`;
    details.dataset.suid = s.uid;
    if (sottomeccanicaAperta[s.uid] !== false) details.open = true;
    details.innerHTML = `<summary>${titoloSommario}</summary><div class="sub-card-body">${corpo}</div>`;
    body.appendChild(details);
  });
}

export function renderCardImpresa(s, c) {
  if (s.tipo === 'porta_ethea') {
    const maxStrumenti = (IMPRESA_CFG.strumentiPerLivello ?? 2) * s.livello;
    const tabellaValori = IMPRESA_CFG.valoreMassimoOggettoPerLivello || {};
    const livelliNoti = Object.keys(tabellaValori).map(Number).sort((a, b) => a - b);
    const livelloMaxNoto = livelliNoti.length ? Math.max(...livelliNoti) : s.livello;
    const livelloRiferimento = Math.min(s.livello, livelloMaxNoto);
    const valoreMax = tabellaValori[String(livelloRiferimento)] ?? 0;
    const notaAssunzione = s.livello > livelloMaxNoto
      ? ` (il regolamento specifica il tetto solo fino al Lv.${livelloMaxNoto}; oltre, si assume lo stesso valore — assunzione dichiarata)` : '';
    const chipStrumenti = (s.strumenti || []).map(str => `<span class="tag tag-vendita">${escapeHtml(str)} <button data-action="rimuovi-strumento-impresa" data-uid="${s.uid}" data-strumento="${escapeHtml(str)}" style="background:none;border:none;cursor:pointer;color:inherit;">&#10005;</button></span>`).join(' ');
    const puoAggiungere = (s.strumenti || []).length < maxStrumenti;
    return `
      <h3 style="margin:0 0 8px;">&#127978; ${c.nome} (Lv.${s.livello}) — Vendita a Porta Ethea</h3>
      <div class="hint" style="margin:0 0 6px;">Scegli fino a ${maxStrumenti} tipi di strumenti da artigiano (2 × livello) per cui almeno un membro del QG &egrave; competente. Valore massimo per singolo oggetto venduto: ${valoreMax} mo${notaAssunzione}.</div>
      <div style="margin:6px 0;">${chipStrumenti || '<span class="hint">Nessuno strumento selezionato.</span>'}</div>
      <div class="row" style="align-items:flex-end;">
        <div><label>Nuovo strumento</label><input type="text" data-field="impresaStrumentoNuovo" data-uid="${s.uid}" placeholder="es. Strumenti da falegname" ${puoAggiungere ? '' : 'disabled'}></div>
        <div style="flex:0 0 auto;"><button class="btn btn-outline btn-sm" data-action="aggiungi-strumento-impresa" data-uid="${s.uid}" ${puoAggiungere ? '' : 'disabled'}>+ Aggiungi</button></div>
      </div>
      <div class="divider" style="margin:12px 0;"></div>
      <div class="row" style="align-items:flex-end;">
        <div><label>Valore oggetto venduto (mo, max ${valoreMax})</label><input type="number" min="0" max="${valoreMax}" data-field="impresaValoreVendita" data-uid="${s.uid}" style="max-width:150px;"></div>
        <div style="flex:0 0 auto;"><button class="btn btn-brass btn-sm" data-action="registra-vendita-impresa" data-uid="${s.uid}">Registra vendita</button></div>
      </div>`;
  }

  const struttureVendita = struttureVenditaDisponibili();
  const strutturaScelta = struttureVendita.find(x => x.uid === s.strutturaVenditaUid) || null;
  const livelloStrutturaVendita = strutturaScelta ? strutturaScelta.livello : 0;
  const spesaMax = (IMPRESA_CFG.spesaMaxMoPerLivelloStrutturaVendita ?? 10) * livelloStrutturaVendita;
  const opzioniStruttura = '<option value="">— seleziona —</option>' + struttureVendita.map(x => {
    const cInfo = CATALOGO.find(cc => cc.id === x.catId);
    return `<option value="${x.uid}" ${s.strutturaVenditaUid === x.uid ? 'selected' : ''}>${escapeHtml(cInfo ? cInfo.nome : x.catId)} (Lv.${x.livello})</option>`;
  }).join('');
  const spesaAttuale = Math.min(s.spesaMensile || 0, spesaMax);
  const ricavo = calcolaRicavoImpresa(spesaAttuale, s.livello);
  const netto = ricavo - spesaAttuale;
  return `
    <h3 style="margin:0 0 8px;">&#127978; ${c.nome} (Lv.${s.livello}) — Vendita a Distanza</h3>
    <div class="hint" style="margin:0 0 6px;">Scegli una struttura di vendita che possiedi: puoi spendere fino a ${IMPRESA_CFG.spesaMaxMoPerLivelloStrutturaVendita ?? 10} mo × il suo livello. In cambio ricevi 30 mo ogni 10 mo spesi, + 10 mo × il livello dell'Impresa.</div>
    <div class="row" style="align-items:center;">
      <label style="margin:0;">Struttura di vendita</label>
      <select data-action="seleziona-struttura-vendita-impresa" data-uid="${s.uid}">${opzioniStruttura}</select>
      ${struttureVendita.length === 0 ? '<span class="hint">Nessuna struttura di categoria Vendita costruita.</span>' : ''}
    </div>
    <div class="row" style="align-items:flex-end; margin-top:8px;">
      <div><label>Spesa questo mese (mo, max ${spesaMax})</label><input type="number" min="0" max="${spesaMax}" value="${spesaAttuale}" data-field="impresaSpesa" data-uid="${s.uid}" style="max-width:150px;" ${strutturaScelta ? '' : 'disabled'}></div>
      <div style="flex:0 0 auto;"><button class="btn btn-brass btn-sm" data-action="registra-guadagno-impresa" data-uid="${s.uid}" ${strutturaScelta ? '' : 'disabled'}>Registra guadagno mensile</button></div>
    </div>
    <div class="hint">Stima: spesa ${fmtMo(spesaAttuale)} mo → ricavo ${fmtMo(ricavo)} mo (netto +${fmtMo(netto)} mo).</div>`;
}

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
    showToast(`La Miniera estrarr&agrave; ${sel.value} dal prossimo "Chiudi mese"`);
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
      if (!nome || quantita <= 0) { showToast('Inserisci nome e quantit&agrave; della pozione'); return; }
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
      if (!nome) { showToast('Inserisci il nome dell\'unit&agrave;'); return; }
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
}

function costruisciStruttura(catId) {
  const c = CATALOGO.find(x => x.id === catId);
  if (!c) return;
  const costoPunti = puntiCosto(c);
  const spesiAttuali = puntiSpesiTotali();

  if (!c.exempt && spesiAttuali + costoPunti > PUNTI_QG_MAX) {
    showToast('Punti QG insufficienti (max 44) ⚠');
    return;
  }
  if (c.limiteCostruzioni && c.limiteCostruzioni.tipo === 'perLivelloQG') {
    const massimo = c.limiteCostruzioni.moltiplicatore * state.livello;
    const attuali = state.strutture.filter(s => s.catId === c.id).length;
    if (attuali >= massimo) {
      showToast(`Limite raggiunto: massimo ${massimo} ${c.nome} al Livello QG attuale (${c.limiteCostruzioni.moltiplicatore}× livello) ⚠`);
      return;
    }
  }
  let tipoDispiegamento = 'standard';
  let costoEffettivo = c.costo;
  if (catId === 'avamposto') {
    const sel = document.getElementById('avampostoTipoSelect');
    tipoDispiegamento = sel ? sel.value : 'standard';
    const validazione = validaTipoDispiegamentoAvamposto(tipoDispiegamento);
    if (!validazione.ok) { showToast(validazione.messaggio); return; }
    costoEffettivo = costoDispiegamentoAvamposto(tipoDispiegamento, c.costo);
  }
  if (oroDisponibile() < costoEffettivo) {
    showToast('Oro insufficiente in tesoreria (oltre la riserva bancaria) ⚠');
    return;
  }
  let tipoImpresa = 'distanza';
  if (catId === 'impresa') {
    const selImpresa = document.getElementById('impresaTipoSelect');
    tipoImpresa = selImpresa ? selImpresa.value : 'distanza';
  }
  for (const mat of c.materiali) {
    const disp = state.materiali[mat.m] || 0;
    if (disp < mat.u) {
      showToast(`Materiali insufficienti: manca ${mat.m} ⚠`);
      return;
    }
  }
  const etichettaDispiegamento = (catId === 'avamposto' && tipoDispiegamento !== 'standard')
    ? ` (${labelTipoDispiegamento(tipoDispiegamento)})` : '';
  registraMovimento(`Costruzione: ${c.nome}${etichettaDispiegamento}`, -costoEffettivo);
  c.materiali.forEach(mat => { state.materiali[mat.m] = (state.materiali[mat.m] || 0) - mat.u; });
  state.strutture.push({ uid: uid(), catId: c.id, livello: 1, ...statoIniziale(c.id, { tipoDispiegamento, tipoImpresa }) });

  if (c.categoria !== 'Generali' && state.classe === 'Nessuna') {
    state.classe = c.categoria;
    showToast(`${c.nome} costruita! Il QG ottiene la Classe ${c.categoria}`);
  } else {
    showToast(`${c.nome} costruita!`);
  }
  saveState();
  renderAll();
}

function potenziaStruttura(uidStr) {
  const s = state.strutture.find(x => x.uid === uidStr);
  if (!s) return;
  const c = CATALOGO.find(x => x.id === s.catId);
  if (s.livello >= LIVELLO_STRUTTURA_MAX) { showToast('Livello massimo raggiunto'); return; }
  if (state.livello < s.livello + 1) {
    showToast(`Il QG deve essere almeno di Livello ${s.livello + 1} per potenziare questa struttura ⚠`);
    return;
  }
  const costoPunti = puntiCosto(c);
  if (!c.exempt && puntiSpesiTotali() + costoPunti > PUNTI_QG_MAX) {
    showToast('Punti QG insufficienti per il potenziamento ⚠'); return;
  }
  if (oroDisponibile() < c.costo) { showToast('Oro insufficiente per il potenziamento (oltre la riserva bancaria) ⚠'); return; }
  for (const mat of c.materiali) {
    const disp = state.materiali[mat.m] || 0;
    if (disp < mat.u) { showToast(`Materiali insufficienti: manca ${mat.m} ⚠`); return; }
  }
  registraMovimento(`Potenziamento: ${c.nome} → Lv.${s.livello + 1}`, -c.costo);
  c.materiali.forEach(mat => { state.materiali[mat.m] = (state.materiali[mat.m] || 0) - mat.u; });
  s.livello += 1;
  showToast(`${c.nome} potenziata a Livello ${s.livello}`);
  saveState();
  renderAll();
}

function smantellaStruttura(uidStr) {
  const idx = state.strutture.findIndex(x => x.uid === uidStr);
  if (idx < 0) return;
  const s = state.strutture[idx];
  const c = CATALOGO.find(x => x.id === s.catId);
  if (c.id === 'avamposto') {
    c.materiali.forEach(mat => { state.materiali[mat.m] = (state.materiali[mat.m] || 0) + mat.u; });
    const rotteScollegate = state.rotte.filter(r => r.avampostoUid === uidStr).length;
    state.rotte.forEach(r => { if (r.avampostoUid === uidStr) r.avampostoUid = null; });
    showToast(rotteScollegate > 0
      ? `Avamposto smantellato: materiali restituiti, ${rotteScollegate} rotta/e tornate scoperte`
      : 'Avamposto smantellato: materiali restituiti al magazzino');
  } else if (c.categoria === 'Vendita') {
    const impreseScollegate = state.strutture.filter(x => x.catId === 'impresa' && x.strutturaVenditaUid === uidStr);
    impreseScollegate.forEach(imp => { imp.strutturaVenditaUid = null; imp.spesaMensile = 0; });
    showToast(impreseScollegate.length > 0
      ? `${c.nome} smantellata: ${impreseScollegate.length} Impresa/e tornate senza struttura collegata`
      : `${c.nome} smantellata`);
  } else {
    showToast(`${c.nome} smantellata`);
  }
  state.strutture.splice(idx, 1);
  saveState();
  renderAll();
}
