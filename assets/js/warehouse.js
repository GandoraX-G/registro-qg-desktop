import { state, MATERIALI_PREZZI, SCONTO_ACQUISTO_ALTRO_QG, SCONTO_ACQUISTO_MAGAZZINO, saveState } from './storage.js';
import { valoreMagazzino, personaleRichiesto, fmtMo, registraMovimento, oroDisponibile } from './utils.js';
import { showToast } from './modal.js';

// Re-imported at module level by the app coordinator; warehouse module
// calls them after mutations that require a full re-render.
let renderAll, renderTopbar, renderFinanze;

export function setWarehouseCallbacks(callbacks) {
  renderAll = callbacks.renderAll;
  renderTopbar = callbacks.renderTopbar;
  renderFinanze = callbacks.renderFinanze;
}

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

/* ============================================================
   ACQUISTO MATERIALI (con sconti Economia Interna)
   ============================================================ */
export function hasMagazzino() {
  return state.strutture.some(s => s.catId === "magazzino_str");
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
    state.materiali[mat] = Math.max(0, Number(input.value) || 0);
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
