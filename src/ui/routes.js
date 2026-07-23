import { state } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from './toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { COSTO_ROTTA_MO_PER_100KM, MATERIALI_PREZZI } from '../core/config.js';
import { escapeHtml } from '../utils/format.js';
import { calcRischio } from '../engine/risk.js';
import { costoMensileRotte } from '../engine/finance.js';
import { popolaSelectAvamposti, kmDifesiRotta } from '../modules/outpost.js';

function popolaSelectCaricoMateriali() {
  const select = document.getElementById("route-cargo-material");
  if (select.options.length > 1) return;
  Object.keys(MATERIALI_PREZZI).forEach(m => {
    const opt = document.createElement("option");
    opt.value = m; opt.textContent = m;
    select.appendChild(opt);
  });
}

export function renderRotte() {
  const body = document.getElementById("route-body");
  const empty = document.getElementById("route-empty");
  body.innerHTML = "";

  popolaSelectAvamposti(document.getElementById("route-outpost"), null);
  popolaSelectCaricoMateriali();

  if (state.rotte.length === 0) {
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    state.rotte.forEach(r => {
      const difesa = kmDifesiRotta(r);
      const rischio = calcRischio(r.distanza, difesa);
      const costo = (r.distanza / 100 * COSTO_ROTTA_MO_PER_100KM).toFixed(1).replace(/\.0$/, "");
      const caricoLabel = r.carico ? `${r.carico.quantita} ${r.carico.materiale}` : `<span style="opacity:.6;">nessuno</span>`;
      let cls = "badge-risk-low";
      if (rischio >= 20) cls = "badge-risk-high"; else if (rischio >= 10) cls = "badge-risk-mid";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(r.nome)}</td>
        <td class="mono">${r.distanza} km</td>
        <td><select class="mono" data-action="cambia-avamposto" data-uid="${r.uid}" style="max-width:210px;"></select></td>
        <td class="mono">${caricoLabel}</td>
        <td class="mono">${costo} mo</td>
        <td class="${cls}">${rischio}% ${rischio === 0 ? "(protetta)" : ""}</td>
        <td><button class="btn btn-danger btn-sm" data-action="del-rotta" data-uid="${r.uid}">Rimuovi</button></td>`;
      body.appendChild(tr);
      const sel = tr.querySelector("[data-action='cambia-avamposto']");
      popolaSelectAvamposti(sel, r.uid);
      sel.value = r.avampostoUid || "";
    });
  }
  const kmTot = state.rotte.reduce((s, r) => s + Number(r.distanza || 0), 0);
  document.getElementById("route-total-km").textContent = kmTot + " km";
  document.getElementById("route-total-cost").textContent = costoMensileRotte().toFixed(1).replace(/\.0$/, "") + " mo";
  document.getElementById("route-warning").style.display = kmTot > 400 ? "block" : "none";
}

export function initRoutesEvents() {
  document.getElementById("route-add-btn").addEventListener("click", () => {
    const nome = document.getElementById("route-name").value.trim();
    const distanza = Number(document.getElementById("route-distance").value);
    const avampostoUid = document.getElementById("route-outpost").value || null;
    const caricoMateriale = document.getElementById("route-cargo-material").value || null;
    const caricoQuantita = Number(document.getElementById("route-cargo-qty").value) || 0;
    if (!nome || !distanza) { showToast("Inserisci nome e distanza della rotta"); return; }
    const carico = (caricoMateriale && caricoQuantita > 0) ? { materiale: caricoMateriale, quantita: caricoQuantita } : null;
    state.rotte.push({ uid: uid(), nome, distanza, avampostoUid, carico });
    document.getElementById("route-name").value = "";
    document.getElementById("route-distance").value = "";
    document.getElementById("route-cargo-material").value = "";
    document.getElementById("route-cargo-qty").value = "";
    renderRotte();
    saveState();
  });

  document.getElementById("route-body").addEventListener("click", e => {
    const btn = e.target.closest("[data-action='del-rotta']");
    if (!btn) return;
    state.rotte = state.rotte.filter(r => r.uid !== btn.dataset.uid);
    renderRotte();
    saveState();
  });

  document.getElementById("route-body").addEventListener("change", e => {
    const sel = e.target.closest("[data-action='cambia-avamposto']");
    if (!sel) return;
    const r = state.rotte.find(x => x.uid === sel.dataset.uid);
    if (!r) return;
    r.avampostoUid = sel.value || null;
    renderRotte();
    saveState();
  });
}
