import { state } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { CATALOGO, PUNTI_QG_MAX, CATEGORIE } from '../core/config.js';
import { calcolaLivelloQGDaMembri } from '../core/validation.js';
import { puntiSpesiTotali, personaleRichiesto, puntiCosto, contaStruttureCategoria } from '../engine/qg.js';
import { registraMovimento } from '../engine/finance.js';
import { fmtMo, escapeHtml } from '../utils/format.js';
import { showToast } from '../ui/toast.js';

let classeSbloccataManualmente = false;

export function renderDashboard() {
  state.livello = calcolaLivelloQGDaMembri();

  document.getElementById('dash-month').textContent = state.calendario.mese;
  document.getElementById('dash-season').textContent = state.calendario.stagione;

  document.getElementById('qg-name-display').textContent = state.nome || 'Il mio Quartier Generale';
  const classeLabel = state.classe === 'Nessuna' ? 'Senza Classe' : 'Classe ' + state.classe;
  document.getElementById('qg-class-display').textContent = `${classeLabel} · Livello ${state.livello}`;

  document.getElementById('dash-in-nome').value = state.nome;
  document.getElementById('dash-in-fondatore').value = state.fondatore;
  document.getElementById('dash-in-cofondatore').value = state.cofondatore;
  document.getElementById('dash-in-classe').value = state.classe;
  const classeAssegnata = state.classe !== 'Nessuna';
  document.getElementById('dash-in-classe').disabled = classeAssegnata && !classeSbloccataManualmente;
  document.getElementById('dash-btn-sblocca-classe').style.display = classeAssegnata && !classeSbloccataManualmente ? 'inline-flex' : 'none';
  document.getElementById('dash-in-livello').value = state.livello;
  document.getElementById('dash-in-oro').value = state.oro;

  const spesi = puntiSpesiTotali();
  const pct = Math.min(100, (spesi / PUNTI_QG_MAX) * 100);
  document.getElementById('dash-points-bar').style.width = pct + '%';
  document.getElementById('dash-points-label').textContent = `${spesi} / ${PUNTI_QG_MAX}`;

  const mBody = document.getElementById('dash-members-body');
  mBody.innerHTML = '';
  if (state.membri.length === 0) {
    mBody.innerHTML = '<tr><td colspan="3" class="empty">Nessun avventuriero ha ancora giurato fedeltà al Quartier General. Aggiungi qui sotto i personaggi membri.</td></tr>';
  } else {
    state.membri.forEach((m, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(m.nome)}</td><td class="mono">${m.livello}</td>
        <td><button class="btn btn-danger btn-sm" data-i="${i}" data-action="del-membro">Rimuovi</button></td>`;
      mBody.appendChild(tr);
    });
  }

  const oBody = document.getElementById('dash-overview-body');
  oBody.innerHTML = '';
  const ovRow1 = document.createElement('tr');
  ovRow1.innerHTML = `<td>Nome</td><td class="mono">${escapeHtml(state.nome || '(senza nome)')}</td>`;
  oBody.appendChild(ovRow1);
  const ovRow2 = document.createElement('tr');
  ovRow2.innerHTML = `<td>Fondatore</td><td class="mono">${escapeHtml(state.fondatore || '—')}</td>`;
  oBody.appendChild(ovRow2);
  const ovRow3 = document.createElement('tr');
  ovRow3.innerHTML = `<td>Co-fondatore</td><td class="mono">${escapeHtml(state.cofondatore || '—')}</td>`;
  oBody.appendChild(ovRow3);
  const ovRow4 = document.createElement('tr');
  ovRow4.innerHTML = `<td>Classe</td><td class="mono">${classeLabel}</td>`;
  oBody.appendChild(ovRow4);
  const ovRow5 = document.createElement('tr');
  ovRow5.innerHTML = `<td>Livello</td><td class="mono">${state.livello}</td>`;
  oBody.appendChild(ovRow5);

  const rBody = document.getElementById('dash-summary-body');
  rBody.innerHTML = '';
  CATEGORIE.forEach(cat => {
    const n = contaStruttureCategoria(cat);
    const struttureCat = state.strutture.filter(s => {
      const c = CATALOGO.find(x => x.id === s.catId);
      return c && c.categoria === cat;
    });
    const punti = struttureCat.reduce((sum, s) => {
      const c = CATALOGO.find(x => x.id === s.catId);
      return sum + puntiCosto(c) * s.livello;
    }, 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="tag tag-${cat.toLowerCase()}">${cat}</span></td><td class="mono">${n}</td><td class="mono">${punti}</td>`;
    rBody.appendChild(tr);
  });

  const actBody = document.getElementById('dash-activities-body');
  actBody.innerHTML = '';
  const recenti = (state.movimenti || []).slice(0, 10);
  if (recenti.length === 0) {
    actBody.innerHTML = '<tr><td colspan="4" class="empty">Nessun movimento registrato.</td></tr>';
  } else {
    recenti.forEach(m => {
      const tr = document.createElement('tr');
      const cls = m.importo >= 0 ? 'amount-pos' : 'amount-neg';
      const segno = m.importo >= 0 ? '+' : '';
      tr.innerHTML = `<td class="mono">${escapeHtml(m.data)}</td><td>${escapeHtml(m.label)}</td><td class="mono ${cls}">${segno}${fmtMo(m.importo)} mo</td><td class="mono">${fmtMo(m.saldoDopo)} mo</td>`;
      actBody.appendChild(tr);
    });
  }
}

export function initDashboardEvents() {
  document.getElementById('dash-in-nome').addEventListener('input', e => {
    state.nome = e.target.value;
    document.getElementById('qg-name-display').textContent = state.nome || 'Il mio Quartier Generale';
    saveState();
  });
  document.getElementById('dash-in-fondatore').addEventListener('input', e => {
    state.fondatore = e.target.value;
    saveState();
  });
  document.getElementById('dash-in-cofondatore').addEventListener('input', e => {
    state.cofondatore = e.target.value;
    saveState();
  });
  document.getElementById('dash-btn-sblocca-classe').addEventListener('click', () => {
    if (!confirm("Cambiare manualmente la classe di un QG già assegnato è un'operazione eccezionale (di norma riservata allo Staff per correggere un errore). Vuoi sbloccare il menu per questa modifica?")) return;
    classeSbloccataManualmente = true;
    renderDashboard();
  });
  document.getElementById('dash-in-classe').addEventListener('change', e => {
    state.classe = e.target.value;
    classeSbloccataManualmente = false;
    renderDashboard();
    saveState();
  });
  document.getElementById('dash-in-oro').addEventListener('change', e => {
    const nuovo = Number(e.target.value) || 0;
    const delta = nuovo - state.oro;
    if (delta !== 0) registraMovimento('Correzione manuale saldo', delta);
    renderDashboard();
    saveState();
  });
  document.getElementById('dash-btn-movimento').addEventListener('click', () => {
    const val = Number(document.getElementById('dash-in-movimento').value) || 0;
    if (val === 0) { showToast('Inserisci un importo diverso da zero'); return; }
    registraMovimento(val >= 0 ? 'Movimento rapido (entrata)' : 'Movimento rapido (uscita)', val);
    document.getElementById('dash-in-movimento').value = '';
    renderDashboard();
    saveState();
    showToast(val >= 0 ? `+${val} mo aggiunte alla tesoreria` : `${val} mo rimosse dalla tesoreria`);
  });
  document.getElementById('dash-btn-add-member').addEventListener('click', () => {
    const nome = document.getElementById('dash-in-member-name').value.trim();
    const lv = Number(document.getElementById('dash-in-member-level').value);
    if (!nome || !lv) { showToast('Inserisci nome e livello del personaggio'); return; }
    state.membri.push({ nome, livello: lv });
    document.getElementById('dash-in-member-name').value = '';
    document.getElementById('dash-in-member-level').value = '';
    renderDashboard();
    saveState();
  });
  document.getElementById('dash-members-body').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="del-membro"]');
    if (!btn) return;
    state.membri.splice(Number(btn.dataset.i), 1);
    renderDashboard();
    saveState();
  });
}
