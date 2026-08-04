import { CATALOGO, PUNTI_QG_MAX, MATERIALI_PREZZI, CATEGORIE } from '../core/config.js';
import { state } from '../core/state.js';
import { escapeHtml, fmtMo } from '../utils/format.js';
import { showToast } from './toast.js';

let preventivo = [];

function getCostoPunti(c, classeQG) {
  if (c.exempt) return 0;
  if (c.categoria === classeQG) return 2;
  if (c.categoria === 'Generali') return 2;
  return 4;
}

function getCostoOro(c) {
  return c.costo || 0;
}

function getMateriali(c) {
  return c.materiali || [];
}

function calcolaTotale() {
  let oroTotale = 0;
  let puntiTotale = 0;
  let personaleTotale = 0;
  const materialiTutti = {};

  for (const item of preventivo) {
    const cat = CATALOGO.find(s => s.id === item.id);
    if (!cat) continue;
    for (let i = 0; i < item.qty; i++) {
      oroTotale += getCostoOro(cat);
      puntiTotale += getCostoPunti(cat, state.classe);
      personaleTotale += cat.personale || 0;
      for (const mat of getMateriali(cat)) {
        materialiTutti[mat.m] = (materialiTutti[mat.m] || 0) + mat.u;
      }
    }
  }

  return { oroTotale, puntiTotale, personaleTotale, materialiTutti };
}

function getDisponibilita() {
  const puntiUsati = state.strutture.reduce((sum, s) => {
    const cat = CATALOGO.find(c => c.id === s.catId);
    return sum + (cat ? getCostoPunti(cat, state.classe) : 0);
  }, 0);
  return {
    oro: state.oro,
    punti: PUNTI_QG_MAX - puntiUsati,
    materiali: { ...state.materiali }
  };
}

function renderPreventivo() {
  const body = document.getElementById('prev-body');
  const summaryOro = document.getElementById('prev-summary-oro');
  const summaryPunti = document.getElementById('prev-summary-punti');
  const summaryPersonale = document.getElementById('prev-summary-personale');
  const summaryMats = document.getElementById('prev-summary-materials');
  const emptyEl = document.getElementById('prev-empty');
  const listEl = document.getElementById('prev-list');
  const tableBody = document.getElementById('prev-table-body');
  const compareBody = document.getElementById('prev-compare-body');

  if (!body) return;

  const { oroTotale, puntiTotale, personaleTotale, materialiTutti } = calcolaTotale();
  const disp = getDisponibilita();

  if (summaryOro) summaryOro.textContent = fmtMo(oroTotale);
  if (summaryPunti) summaryPunti.textContent = `${puntiTotale} / ${PUNTI_QG_MAX}`;
  if (summaryPersonale) summaryPersonale.textContent = `${personaleTotale} uomini`;

  if (summaryMats) {
    const mats = Object.entries(materialiTutti);
    if (mats.length === 0) {
      summaryMats.innerHTML = '<span class="hint">Nessun materiale selezionato</span>';
    } else {
      summaryMats.innerHTML = mats.map(([m, u]) =>
        `<span class="tag" style="background:var(--blue-dk);margin:2px;">${escapeHtml(m)}: ${u} U</span>`
      ).join('');
    }
  }

  if (tableBody) {
    tableBody.innerHTML = '';
    if (preventivo.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (listEl) listEl.style.display = 'none';
    } else {
      if (emptyEl) emptyEl.style.display = 'none';
      if (listEl) listEl.style.display = 'block';

      for (const item of preventivo) {
        const cat = CATALOGO.find(s => s.id === item.id);
        if (!cat) continue;
        const punti = getCostoPunti(cat, state.classe);
        const oro = getCostoOro(cat) * item.qty;
        const puntiT = punti * item.qty;
        const pers = (cat.personale || 0) * item.qty;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(cat.nome)}</td>
          <td><span class="tag tag-${(cat.categoria || 'generali').toLowerCase()}">${escapeHtml(cat.categoria)}</span></td>
          <td class="mono">${punti}</td>
          <td class="mono">${fmtMo(getCostoOro(cat))}</td>
          <td>
            <div class="row" style="gap:4px;align-items:center;">
              <button class="btn btn-outline btn-sm" data-prev-action="dec" data-prev-id="${cat.id}">−</button>
              <span class="mono" style="min-width:24px;text-align:center;">${item.qty}</span>
              <button class="btn btn-outline btn-sm" data-prev-action="inc" data-prev-id="${cat.id}">+</button>
            </div>
          </td>
          <td class="mono">${fmtMo(oro)}</td>
          <td class="mono">${puntiT}</td>
          <td class="mono">${pers}</td>
          <td><button class="btn btn-danger btn-sm" data-prev-action="remove" data-prev-id="${cat.id}">✕</button></td>
        `;
        tableBody.appendChild(tr);
      }
    }
  }

  if (compareBody) {
    compareBody.innerHTML = '';
    const mats = Object.entries(materialiTutti);
    if (mats.length > 0) {
      for (const [m, u] of mats) {
        const has = disp.materiali[m] || 0;
        const diff = has - u;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(m)}</td>
          <td class="mono">${u} U</td>
          <td class="mono">${has} U</td>
          <td class="mono ${diff >= 0 ? 'amount-pos' : 'amount-neg'}">${diff >= 0 ? '+' : ''}${diff} U</td>
        `;
        compareBody.appendChild(tr);
      }
    }

    const oroRow = document.createElement('tr');
    oroRow.innerHTML = `
      <td><strong>Oro</strong></td>
      <td class="mono"><strong>${fmtMo(oroTotale)}</strong></td>
      <td class="mono"><strong>${fmtMo(disp.oro)}</strong></td>
      <td class="mono ${(disp.oro - oroTotale) >= 0 ? 'amount-pos' : 'amount-neg'}"><strong>${(disp.oro - oroTotale) >= 0 ? '+' : ''}${fmtMo(disp.oro - oroTotale)}</strong></td>
    `;
    compareBody.appendChild(oroRow);

    const puntiRow = document.createElement('tr');
    puntiRow.innerHTML = `
      <td><strong>Punti QG</strong></td>
      <td class="mono"><strong>${puntiTotale}</strong></td>
      <td class="mono"><strong>${disp.punti}</strong></td>
      <td class="mono ${(disp.punti - puntiTotale) >= 0 ? 'amount-pos' : 'amount-neg'}"><strong>${(disp.punti - puntiTotale) >= 0 ? '+' : ''}${disp.punti - puntiTotale}</strong></td>
    `;
    compareBody.appendChild(puntiRow);
  }
}

function renderCatalogoPreventivo() {
  const grid = document.getElementById('prev-catalog-grid');
  const searchInput = document.getElementById('prev-search');
  if (!grid) return;

  const search = (searchInput?.value || '').toLowerCase();
  grid.innerHTML = '';

  const filtered = CATALOGO.filter(c => {
    if (search && !c.nome.toLowerCase().includes(search) && !c.categoria.toLowerCase().includes(search)) return false;
    return true;
  });

  for (const cat of filtered) {
    const item = preventivo.find(p => p.id === cat.id);
    const qty = item ? item.qty : 0;
    const punti = getCostoPunti(cat, state.classe);

    const div = document.createElement('div');
    div.className = 'struct-card';
    div.innerHTML = `
      <h4>${escapeHtml(cat.nome)} <span class="tag tag-${(cat.categoria || 'generali').toLowerCase()}">${escapeHtml(cat.categoria)}</span></h4>
      <div class="meta">${punti} pt · ${fmtMo(cat.costo)} mo · ${cat.personale || 0} uomini</div>
      <div class="mats">${(cat.materiali || []).map(m => `${m.u}× ${m.m}`).join(', ') || 'Nessun materiale'}</div>
      <div class="foot">
        <span class="hint">${qty > 0 ? `×${qty} nel preventivo` : 'Non selezionato'}</span>
        <div style="display:flex;gap:4px;">
          ${qty > 0 ? `<button class="btn btn-danger btn-sm" data-prev-action="remove" data-prev-id="${cat.id}">✕</button>` : ''}
          <button class="btn btn-brass btn-sm" data-prev-action="add" data-prev-id="${cat.id}">+ Aggiungi</button>
        </div>
      </div>
    `;
    grid.appendChild(div);
  }
}

function updatePreventivo(id, delta) {
  const existing = preventivo.find(p => p.id === id);
  if (delta > 0) {
    if (existing) {
      existing.qty += delta;
    } else {
      preventivo.push({ id, qty: 1 });
    }
  } else if (delta < 0) {
    if (existing) {
      existing.qty += delta;
      if (existing.qty <= 0) {
        preventivo = preventivo.filter(p => p.id !== id);
      }
    }
  }
}

function initPreventivoEvents() {
  document.getElementById('prev-catalog-grid')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-prev-action]');
    if (!btn) return;
    const action = btn.dataset.prevAction;
    const id = btn.dataset.prevId;
    if (action === 'add') updatePreventivo(id, 1);
    else if (action === 'remove') updatePreventivo(id, -999);
    renderCatalogoPreventivo();
    renderPreventivo();
  });

  document.getElementById('prev-table-body')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-prev-action]');
    if (!btn) return;
    const action = btn.dataset.prevAction;
    const id = btn.dataset.prevId;
    if (action === 'inc') updatePreventivo(id, 1);
    else if (action === 'dec') updatePreventivo(id, -1);
    else if (action === 'remove') updatePreventivo(id, -999);
    renderCatalogoPreventivo();
    renderPreventivo();
  });

  document.getElementById('prev-search')?.addEventListener('input', () => {
    renderCatalogoPreventivo();
  });

  document.getElementById('prev-clear-btn')?.addEventListener('click', () => {
    if (preventivo.length === 0) return;
    if (!confirm('Vuoi svuotare il preventivo?')) return;
    preventivo = [];
    renderCatalogoPreventivo();
    renderPreventivo();
    showToast('Preventivo svuotato');
  });

  document.getElementById('prev-save-btn')?.addEventListener('click', () => {
    if (preventivo.length === 0) {
      showToast('Aggiungi almeno una struttura al preventivo', 'warning');
      return;
    }
    try {
      localStorage.setItem('qg_preventivo', JSON.stringify(preventivo));
      showToast('Preventivo salvato');
    } catch (e) {
      showToast('Errore nel salvataggio', 'danger');
    }
  });

  document.getElementById('prev-load-btn')?.addEventListener('click', () => {
    try {
      const saved = localStorage.getItem('qg_preventivo');
      if (!saved) {
        showToast('Nessun preventivo salvato trovato', 'warning');
        return;
      }
      preventivo = JSON.parse(saved);
      renderCatalogoPreventivo();
      renderPreventivo();
      showToast('Preventivo caricato');
    } catch (e) {
      showToast('Errore nel caricamento', 'danger');
    }
  });
}

function loadSavedPreventivo() {
  try {
    const saved = localStorage.getItem('qg_preventivo');
    if (saved) preventivo = JSON.parse(saved);
  } catch (e) {}
}

export { renderPreventivo, renderCatalogoPreventivo, initPreventivoEvents, loadSavedPreventivo };
