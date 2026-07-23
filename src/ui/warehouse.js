import { state } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from './toast.js';
import { fmtMo } from '../utils/format.js';
import { CATALOGO, MATERIALI_PREZZI, SCONTO_ACQUISTO_ALTRO_QG, SCONTO_ACQUISTO_MAGAZZINO } from '../core/config.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';
import { valoreMagazzino, personaleRichiesto } from '../engine/qg.js';

let _renderAll, _renderTopbar, _renderFinanze;
export function setWarehouseCallbacks(callbacks) {
  _renderAll = callbacks.renderAll;
  _renderTopbar = callbacks.renderTopbar;
  _renderFinanze = callbacks.renderFinanze;
}

function renderAll() { if (_renderAll) _renderAll(); }
function renderTopbar() { if (_renderTopbar) _renderTopbar(); }
function renderFinanze() { if (_renderFinanze) _renderFinanze(); }

export function renderMagazzino() {
  const body = document.getElementById("wh-inventory-body");
  body.innerHTML = "";
  Object.keys(MATERIALI_PREZZI).forEach(m => {
    const q = state.materiali[m] || 0;
    const prezzo = MATERIALI_PREZZI[m];
    const valore = (prezzo * q).toFixed(1).replace(/\.0$/, "");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m}</td>
      <td class="mono">${prezzo} mo</td>
      <td><input type="number" min="0" class="qty-input mono" data-mat="${m}" value="${q}"></td>
      <td class="mono">${valore} mo</td>
      <td></td>`;
    body.appendChild(tr);
  });
  document.getElementById("wh-total-value").textContent = valoreMagazzino().toFixed(1).replace(/\.0$/, "") + " mo";
  const capEl = document.getElementById("wh-capacity");
  if (capEl) {
    const cap = capacitaMagazzino();
    if (cap > 0) {
      const usato = valoreMagazzinoUsato();
      const pct = Math.min(100, (usato / cap) * 100);
      const warnings = usato >= cap;
      capEl.style.display = "block";
      capEl.innerHTML = `<div class="progress-wrap" style="margin-top:4px;"><div class="progress-bar" style="width:${pct}%;${warnings ? 'background:linear-gradient(180deg, #d4796a, #8a3a2e);' : ''}"></div><div class="progress-label">${usato.toFixed(1)} / ${cap} mo</div></div>`;
      if (warnings) {
        capEl.innerHTML += `<div class="hint" style="color:var(--red-dk);font-weight:600;">Capacità raggiunta: non puoi aggiungere altri materiali finché non ne rimuovi.</div>`;
      }
    } else {
      capEl.style.display = "none";
    }
  }
  document.getElementById("wh-workers").value = state.lavoratori;
  const fabbisogno = personaleRichiesto();
  document.getElementById("wh-workers-need").textContent = fabbisogno;
  const deficitEl = document.getElementById("wh-workers-deficit");
  const deficit = fabbisogno - state.lavoratori;
  if (deficit > 0) {
    deficitEl.style.display = "inline";
    deficitEl.textContent = `⚠ Mancano ${deficit} lavorator${deficit === 1 ? "e" : "i"} rispetto al fabbisogno.`;
  } else {
    deficitEl.style.display = "none";
  }
  renderMagazzinoScontati();
  renderAcquistoPanel();
}

export function hasMagazzino() {
  return state.strutture.some(s => s.catId === "magazzino_str");
}

export function capacitaMagazzino() {
  const mag = state.strutture.find(s => s.catId === "magazzino_str");
  if (!mag) return 0;
  const cat = CATALOGO.find(c => c.id === "magazzino_str");
  const perLivello = (cat && cat.capacitaPerLivello) || 100;
  return perLivello * mag.livello;
}

export function valoreMagazzinoUsato() {
  return valoreMagazzino();
}

export function spazioResiduoMagazzino() {
  const cap = capacitaMagazzino();
  if (cap === 0) return Infinity;
  return Math.max(0, cap - valoreMagazzinoUsato());
}

export function renderMagazzinoScontati() {
  const card = document.getElementById("wh-discounted-wrap");
  const grid = document.getElementById("wh-discounted-grid");
  if (!hasMagazzino()) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";
  grid.innerHTML = "";
  Object.keys(MATERIALI_PREZZI).forEach(m => {
    const scelto = state.magazzinoScontati.includes(m);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm " + (scelto ? "btn-brass" : "btn-outline");
    btn.textContent = m + (scelto ? " ✓" : "");
    btn.dataset.mat = m;
    grid.appendChild(btn);
  });
}

export function toggleMagazzinoScontato(m) {
  const idx = state.magazzinoScontati.indexOf(m);
  if (idx >= 0) {
    state.magazzinoScontati.splice(idx, 1);
  } else {
    if (state.magazzinoScontati.length >= 5) {
      showToast("Puoi scegliere al massimo 5 materiali scontati dal Magazzino ⚠");
      return;
    }
    state.magazzinoScontati.push(m);
  }
  renderMagazzinoScontati();
  renderAcquistoPanel();
  saveState();
}

export function renderAcquistoPanel() {
  const sel = document.getElementById("wh-purchase-material");
  const prevValue = sel.value;
  sel.innerHTML = "";
  Object.keys(MATERIALI_PREZZI).forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = `${m} (${MATERIALI_PREZZI[m]} mo/U)`;
    sel.appendChild(opt);
  });
  if (prevValue && MATERIALI_PREZZI[prevValue] !== undefined) sel.value = prevValue;
  aggiornaOpzioneMag30();
  aggiornaPreviewAcquisto();
}

export function aggiornaOpzioneMag30() {
  const mat = document.getElementById("wh-purchase-material").value;
  const opz = document.getElementById("wh-purchase-discount-option");
  const provenienza = document.getElementById("wh-purchase-source");
  const disponibile = hasMagazzino() && state.magazzinoScontati.includes(mat);
  opz.style.display = disponibile ? "block" : "none";
  if (!disponibile && provenienza.value === "mag30") {
    provenienza.value = "qg20";
  }
}

export function calcCostoAcquisto() {
  const mat = document.getElementById("wh-purchase-material").value;
  const qta = Math.max(0, Number(document.getElementById("wh-purchase-qty").value) || 0);
  const provenienza = document.getElementById("wh-purchase-source").value;
  const prezzoBase = MATERIALI_PREZZI[mat] || 0;
  let sconto = 0;
  if (provenienza === "qg20") sconto = SCONTO_ACQUISTO_ALTRO_QG;
  if (provenienza === "mag30") sconto = SCONTO_ACQUISTO_MAGAZZINO;
  const totale = prezzoBase * qta * (1 - sconto);
  return { mat, qta, totale, sconto };
}

export function aggiornaPreviewAcquisto() {
  const { totale } = calcCostoAcquisto();
  document.getElementById("wh-purchase-cost").textContent = totale.toFixed(1).replace(/\.0$/, "") + " mo";
}

export function eseguiAcquisto() {
  const { mat, qta, totale } = calcCostoAcquisto();
  if (qta <= 0) { showToast("Inserisci una quantità valida ⚠"); return; }
  if (oroDisponibile() < totale) { showToast("Oro insufficiente in tesoreria (oltre la riserva bancaria) ⚠"); return; }
  const cap = capacitaMagazzino();
  if (cap > 0) {
    const prezzoUnitario = MATERIALI_PREZZI[mat] || 0;
    const valoreAggiunta = prezzoUnitario * qta;
    const spazio = spazioResiduoMagazzino();
    if (valoreAggiunta > spazio) {
      showToast(`Capacità Magazzino insufficiente: spazio residuo ${spazio.toFixed(1)} mo, acquisto val ${valoreAggiunta.toFixed(1)} mo ⚠`);
      return;
    }
  }
  registraMovimento(`Acquisto ${qta}U ${mat}`, -totale);
  state.materiali[mat] = (state.materiali[mat] || 0) + qta;
  showToast(`Acquistati ${qta}U di ${mat} per ${totale.toFixed(1).replace(/\.0$/, "")} mo`);
  renderAll();
  saveState();
}

export function initWarehouseEvents() {
  document.getElementById("wh-inventory-body").addEventListener("change", e => {
    const input = e.target.closest("[data-mat]");
    if (!input) return;
    const mat = input.dataset.mat;
    const nuovValore = Math.max(0, Number(input.value) || 0);
    const cap = capacitaMagazzino();
    if (cap > 0) {
      const vecchioValore = (state.materiali[mat] || 0) * (MATERIALI_PREZZI[mat] || 0);
      const nuovoValore = nuovValore * (MATERIALI_PREZZI[mat] || 0);
      const delta = nuovoValore - vecchioValore;
      if (delta > 0 && delta > spazioResiduoMagazzino()) {
        showToast(`Capacità Magazzino insufficiente: spazio residuo ${spazioResiduoMagazzino().toFixed(1)} mo ⚠`);
        renderMagazzino();
        return;
      }
    }
    state.materiali[mat] = nuovValore;
    renderMagazzino();
    renderTopbar();
    saveState();
  });

  document.getElementById("wh-discounted-grid").addEventListener("click", e => {
    const btn = e.target.closest("[data-mat]");
    if (!btn) return;
    toggleMagazzinoScontato(btn.dataset.mat);
  });

  document.getElementById("wh-purchase-material").addEventListener("change", () => {
    aggiornaOpzioneMag30();
    aggiornaPreviewAcquisto();
  });
  document.getElementById("wh-purchase-qty").addEventListener("input", aggiornaPreviewAcquisto);
  document.getElementById("wh-purchase-source").addEventListener("change", aggiornaPreviewAcquisto);
  document.getElementById("wh-purchase-btn").addEventListener("click", eseguiAcquisto);

  document.getElementById("wh-workers").addEventListener("change", e => {
    state.lavoratori = Math.max(0, Number(e.target.value) || 0);
    renderFinanze();
    saveState();
  });

  document.getElementById("wh-workers-adjust-btn").addEventListener("click", () => {
    const fabbisogno = personaleRichiesto();
    state.lavoratori = fabbisogno;
    showToast(`Lavoratori adeguati al fabbisogno: ${fabbisogno}`);
    renderMagazzino();
    renderFinanze();
    renderTopbar();
    saveState();
  });
}
