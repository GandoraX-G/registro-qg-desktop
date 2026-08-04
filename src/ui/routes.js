import { state } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from './toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { COSTO_ROTTA_MO_PER_100KM, MATERIALI_PREZZI } from '../core/config.js';
import { escapeHtml } from '../utils/format.js';
import { calcRischio } from '../engine/risk.js';
import { costoMensileRotte } from '../engine/finance.js';
import { popolaSelectAvamposti, kmDifesiRotta, avampostoLibero } from '../modules/outpost.js';

const CATALOGO_MAT = Object.entries(MATERIALI_PREZZI).map(([m, v]) => ({ m, v }));

function popolaSelectCaricoMateriali(select) {
  if (select.options.length > 1) return;
  CATALOGO_MAT.forEach(({ m }) => {
    const opt = document.createElement("option");
    opt.value = m; opt.textContent = m;
    select.appendChild(opt);
  });
}

function calcolaCostoRotta(distanza) {
  return (distanza / 100 * COSTO_ROTTA_MO_PER_100KM);
}

function costoRottaStr(distanza) {
  return calcolaCostoRotta(distanza).toFixed(1).replace(/\.0$/, "");
}

function perditaAtesaRotta(r) {
  if (!r.carico || !r.carico.materiale || !r.carico.quantita) return 0;
  const difesa = kmDifesiRotta(r);
  const rischio = calcRischio(r.distanza, difesa) / 100;
  const prezzoUnita = MATERIALI_PREZZI[r.carico.materiale] || 0;
  const valoreCarico = r.carico.quantita * prezzoUnita;
  return rischio * (valoreCarico / 2);
}

function avampostoUidGiaAssegnato(uidStr, rottaUidEsclusa) {
  return state.rotte.some(r => r.avampostoUid === uidStr && r.uid !== rottaUidEsclusa);
}

function erroriValidazione(nome, distanza, avampostoUid, rottaUidEsclusa) {
  const err = [];
  if (!nome) err.push("Nome mancante");
  if (!distanza || distanza <= 0) err.push("Distanza non valida");
  if (avampostoUid && avampostoUidGiaAssegnato(avampostoUid, rottaUidEsclusa)) {
    err.push("Avamposto già assegnato a un'altra rotta");
  }
  return err;
}

export function renderRotte() {
  const body = document.getElementById("route-body");
  const empty = document.getElementById("route-empty");
  body.innerHTML = "";

  if (state.rotte.length === 0) {
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    state.rotte.forEach(r => {
      const difesa = kmDifesiRotta(r);
      const rischio = calcRischio(r.distanza, difesa);
      const costo = costoRottaStr(r.distanza);
      const caricoLabel = r.carico
        ? `<span class="mono">${r.carico.quantita} ${escapeHtml(r.carico.materiale)}</span>`
        : `<span style="opacity:.4;">non dichiarato</span>`;
      let riskCls = "badge-risk-low";
      if (rischio >= 20) riskCls = "badge-risk-high"; else if (rischio >= 10) riskCls = "badge-risk-mid";

      let difesaLabel;
      if (r.avampostoUid) {
        const av = state.strutture.find(s => s.uid === r.avampostoUid);
        difesaLabel = av ? `<span class="tag tag-militare">Mio Lv.${av.livello}</span>` : `<span style="opacity:.4;">-</span>`;
      } else if (r.avampostoEsternoLivello) {
        difesaLabel = `<span class="tag tag-vendita">Esterno Lv.${r.avampostoEsternoLivello}</span>`;
      } else {
        difesaLabel = `<span style="opacity:.4;">nessuna</span>`;
      }

      const tr = document.createElement("tr");
      tr.dataset.uid = r.uid;
      tr.innerHTML = `
        <td>${escapeHtml(r.nome)}</td>
        <td class="mono">${r.distanza} km</td>
        <td>${difesaLabel}</td>
        <td class="mono">${costo} mo</td>
        <td class="${riskCls}">${rischio}%</td>
        <td>${caricoLabel}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" data-action="edit-rotta" data-uid="${r.uid}" title="Modifica">&#9998;</button>
          <button class="btn btn-danger btn-sm" data-action="del-rotta" data-uid="${r.uid}" title="Rimuovi">&#10005;</button>
        </td>`;
      body.appendChild(tr);
    });
  }

  const kmTot = state.rotte.reduce((s, r) => s + Number(r.distanza || 0), 0);
  const costoTot = costoMensileRotte();
  const perditaAtesa = state.rotte.reduce((s, r) => s + perditaAtesaRotta(r), 0);

  document.getElementById("route-total-km").textContent = kmTot + " km";
  document.getElementById("route-total-cost").textContent = costoTot.toFixed(1).replace(/\.0$/, "") + " mo";
  document.getElementById("route-expected-loss").textContent = perditaAtesa > 0 ? "~" + perditaAtesa.toFixed(1).replace(/\.0$/, "") + " mo" : "0 mo";
  document.getElementById("route-warning").style.display = kmTot > 400 ? "block" : "none";
}

function compilaFormModifica(r) {
  document.getElementById("route-name").value = r.nome;
  document.getElementById("route-distance").value = r.distanza;
  document.getElementById("route-cargo-material").value = r.carico?.materiale || "";
  document.getElementById("route-cargo-qty").value = r.carico?.quantita || "";

  const prot = document.getElementById("route-protected");
  const defType = document.getElementById("route-defense-type");
  const selOut = document.getElementById("route-outpost");
  const extLv = document.getElementById("route-ext-level");

  if (r.avampostoUid) {
    prot.checked = true;
    defType.style.display = "inline-block";
    defType.value = "mio";
    selOut.style.display = "inline-block";
    popolaSelectAvamposti(selOut, r.uid);
    selOut.value = r.avampostoUid;
    extLv.style.display = "none";
  } else if (r.avampostoEsternoLivello) {
    prot.checked = true;
    defType.style.display = "inline-block";
    defType.value = "esterno";
    selOut.style.display = "none";
    extLv.style.display = "inline-block";
    extLv.value = r.avampostoEsternoLivello;
  } else {
    prot.checked = false;
    defType.style.display = "none";
    selOut.style.display = "none";
    extLv.style.display = "none";
  }

  const preview = document.getElementById("route-cost-preview");
  preview.textContent = costoRottaStr(r.distanza) + " mo/mese";

  document.getElementById("route-add-btn").textContent = "Salva";
  document.getElementById("route-add-btn").dataset.editUid = r.uid;

  const annullaBtn = document.getElementById("route-cancel-btn");
  if (annullaBtn) annullaBtn.style.display = "inline-block";

  document.getElementById("route-name").focus();
}

function resetForm() {
  document.getElementById("route-name").value = "";
  document.getElementById("route-distance").value = "";
  document.getElementById("route-cargo-material").value = "";
  document.getElementById("route-cargo-qty").value = "";
  document.getElementById("route-protected").checked = false;
  document.getElementById("route-defense-type").style.display = "none";
  document.getElementById("route-outpost").style.display = "none";
  document.getElementById("route-ext-level").style.display = "none";
  document.getElementById("route-cost-preview").textContent = "-";

  const addBtn = document.getElementById("route-add-btn");
  addBtn.textContent = "+ Aggiungi";
  delete addBtn.dataset.editUid;

  const annullaBtn = document.getElementById("route-cancel-btn");
  if (annullaBtn) annullaBtn.style.display = "none";
}

export function initRoutesEvents() {
  const routeOutpost = document.getElementById("route-outpost");
  const routeExtLevel = document.getElementById("route-ext-level");

  document.getElementById("route-add-btn").addEventListener("click", () => {
    const editUid = document.getElementById("route-add-btn").dataset.editUid;
    const nome = document.getElementById("route-name").value.trim();
    const distanza = Number(document.getElementById("route-distance").value);

    const protetta = document.getElementById("route-protected").checked;
    let avampostoUid = null;
    let avampostoEsternoLivello = null;

    if (protetta) {
      const tipo = document.getElementById("route-defense-type").value;
      if (tipo === "esterno") {
        avampostoEsternoLivello = Math.max(1, Math.min(6, Number(routeExtLevel.value) || 1));
      } else if (tipo === "mio") {
        avampostoUid = routeOutpost.value || null;
      }
    }

    const caricoMateriale = document.getElementById("route-cargo-material").value || null;
    const caricoQuantita = Number(document.getElementById("route-cargo-qty").value) || 0;
    const carico = (caricoMateriale && caricoQuantita > 0) ? { materiale: caricoMateriale, quantita: caricoQuantita } : null;

    const err = erroriValidazione(nome, distanza, avampostoUid, editUid || null);
    if (err.length > 0) { showToast(err.join("\n"), "warning"); return; }

    if (editUid) {
      const r = state.rotte.find(x => x.uid === editUid);
      if (r) {
        r.nome = nome;
        r.distanza = distanza;
        r.avampostoUid = avampostoUid;
        r.avampostoEsternoLivello = avampostoEsternoLivello;
        r.carico = carico;
      }
    } else {
      state.rotte.push({ uid: uid(), nome, distanza, avampostoUid, avampostoEsternoLivello, carico });
    }

    resetForm();
    renderRotte();
    saveState();
  });

  document.getElementById("route-cancel-btn").addEventListener("click", () => {
    resetForm();
  });

  document.getElementById("route-body").addEventListener("click", e => {
    const delBtn = e.target.closest("[data-action='del-rotta']");
    if (delBtn) {
      state.rotte = state.rotte.filter(r => r.uid !== delBtn.dataset.uid);
      renderRotte();
      saveState();
      return;
    }
    const editBtn = e.target.closest("[data-action='edit-rotta']");
    if (editBtn) {
      const r = state.rotte.find(x => x.uid === editBtn.dataset.uid);
      if (r) compilaFormModifica(r);
    }
  });

  document.getElementById("route-protected").addEventListener("change", e => {
    const on = e.target.checked;
    document.getElementById("route-defense-type").style.display = on ? "inline-block" : "none";
    document.getElementById("route-outpost").style.display = "none";
    document.getElementById("route-ext-level").style.display = "none";
    if (!on) document.getElementById("route-defense-type").value = "";
  });

  document.getElementById("route-defense-type").addEventListener("change", e => {
    const tipo = e.target.value;
    routeOutpost.style.display = (tipo === "mio") ? "inline-block" : "none";
    routeExtLevel.style.display = (tipo === "esterno") ? "inline-block" : "none";
    if (tipo === "mio") {
      const editUid = document.getElementById("route-add-btn").dataset.editUid || null;
      popolaSelectAvamposti(routeOutpost, editUid);
    }
  });

  document.getElementById("route-distance").addEventListener("input", e => {
    const dist = Number(e.target.value) || 0;
    const preview = document.getElementById("route-cost-preview");
    if (dist > 0) {
      preview.textContent = costoRottaStr(dist) + " mo/mese";
    } else {
      preview.textContent = "-";
    }
  });

  popolaSelectCaricoMateriali(document.getElementById("route-cargo-material"));
}
