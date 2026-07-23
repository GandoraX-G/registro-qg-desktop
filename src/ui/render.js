import { caricaConfig } from '../core/config.js';
import { state, currentTab, setCurrentTab, THEME_KEY, GUIDE_KEY, setRenderAll, setRenderDashboard, setRenderSottomeccaniche } from '../core/state.js';
import { saveState, loadState } from '../core/persistence.js';
import { exportBackup, importBackup } from '../core/backup.js';
import { showToast, initToast } from '../ui/toast.js';
import { copySummary } from '../engine/summary.js';
import { renderDashboard, initDashboardEvents } from './dashboard.js';
import { renderFinanze, initFinanceEvents } from './finance.js';
import { renderCatalogo, renderStrutturePossedute, renderSottomeccaniche, renderSatelliti, initStructureEvents } from './structures.js';
import { renderMagazzino, initWarehouseEvents } from './warehouse.js';
import { renderRotte, initRoutesEvents } from './routes.js';

/* ============================================================
   GLOBAL RENDER
   ============================================================ */
function renderAll() {
  renderTopbar();
  const tab = currentTab || 'panoramica';
  switch (tab) {
    case 'panoramica': renderDashboard(); break;
    case 'strutture': renderCatalogo(); renderStrutturePossedute(); renderSottomeccaniche(); renderSatelliti(); break;
    case 'magazzino': renderMagazzino(); break;
    case 'rotte': renderRotte(); break;
    case 'finanze': renderFinanze(); break;
  }
}

function renderTopbar() {
  const goldEl = document.getElementById('topbar-gold');
  const monthEl = document.getElementById('topbar-month');
  const seasonEl = document.getElementById('topbar-season');
  if (goldEl) goldEl.textContent = state.oro + ' mo';
  if (monthEl) monthEl.textContent = 'Mese ' + state.calendario.mese;
  if (seasonEl) seasonEl.textContent = state.calendario.stagione;
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function switchTab(tabId) {
  setCurrentTab(tabId);

  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });

  document.querySelectorAll('.content-panel').forEach(el => {
    el.classList.toggle('active', el.dataset.panel === tabId);
  });

  renderAll();
}

function initNavigation() {
  document.querySelectorAll('.sidebar-item[data-tab]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });
}

/* ============================================================
   THEME
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') document.documentElement.classList.add('dark');
  updateThemeButton();
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = document.documentElement.classList.contains('dark');
  btn.innerHTML = isDark ? '&#9728;&#65039;' : '&#127761;';
  btn.title = isDark ? 'Tema chiaro' : 'Tema scuro';
}

/* ============================================================
   GUIDE MODAL
   ============================================================ */
function initGuide() {
  const hidden = localStorage.getItem(GUIDE_KEY) === '1';
  const overlay = document.getElementById('guide-overlay');
  if (overlay) {
    overlay.style.display = hidden ? 'none' : 'flex';
    if (!hidden) overlay.classList.add('visible');
  }

  document.getElementById('guide-close')?.addEventListener('click', closeGuide);
  document.getElementById('guide-dismiss')?.addEventListener('click', closeGuide);
  document.getElementById('btn-guide')?.addEventListener('click', openGuide);
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeGuide(); });
}

function openGuide() {
  const overlay = document.getElementById('guide-overlay');
  if (overlay) { overlay.style.display = 'flex'; overlay.classList.add('visible'); }
}

function closeGuide() {
  const overlay = document.getElementById('guide-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.classList.remove('visible'); }
  localStorage.setItem(GUIDE_KEY, '1');
}

/* ============================================================
   IMPORT / EXPORT
   ============================================================ */
function initImportExport() {
  document.getElementById('btn-export')?.addEventListener('click', exportBackup);
  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('import-file')?.click();
  });
  document.getElementById('import-file')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importBackup(file);
    e.target.value = '';
  });
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (!confirm('Vuoi davvero azzerare tutto il registro del QG? L\'operazione non è reversibile. (Consiglio: esporta prima un backup)')) return;
    Object.assign(state, {
      nome: 'Il mio Quartier Generale', fondatore: '', cofondatore: '', classe: 'Nessuna', livello: 1,
      oro: 0, membri: [], strutture: [], materiali: {}, lavoratori: 0, rotte: [],
      magazzinoScontati: [], movimenti: [], riservaBancaria: 0, registroAltriQG: [],
      calendario: { mese: 1, stagione: 'Primavera' }, clima: 'Mite',
      token: { miniera: 0, pesca: 0, concime: 0 }, tokenConcimeDaSpendere: 0, tokenMinieraDaSpendere: 0, tokenPescaDaSpendere: 0, satelliti: [], resocontoUltimoMese: null
    });
    renderAll();
    saveState();
    showToast('Registro azzerato');
  });
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
    if (e.key === 'Escape') {
      closeGuide();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      switchTab('strutture');
      setTimeout(() => document.getElementById('struct-search')?.focus(), 100);
      return;
    }
    if (isInput) return;
    const map = { '1': 'panoramica', '2': 'strutture', '3': 'magazzino', '4': 'rotte', '5': 'finanze' };
    if (map[e.key]) { switchTab(map[e.key]); e.preventDefault(); }
  });
}

/* ============================================================
   COPY SUMMARY
   ============================================================ */
function initCopySummary() {
  document.getElementById('btn-copy-summary')?.addEventListener('click', copySummary);
}

/* ============================================================
   INIT
   ============================================================ */
async function initUI() {
  await caricaConfig();

  initTheme();
  initNavigation();
  initGuide();
  initCopySummary();
  initImportExport();
  initKeyboard();

  setRenderAll(renderAll);
  setRenderDashboard(renderDashboard);
  setRenderSottomeccaniche(renderSottomeccaniche);

  await loadState();

  initDashboardEvents();
  initStructureEvents();
  initWarehouseEvents();
  initRouteEvents();
  initFinanceEvents();
  initToast();

  switchTab(currentTab || 'panoramica');
}

initUI().catch(err => {
  console.error('Init failed:', err);
  document.getElementById('loading').innerHTML = '<p style="color:red;">Errore di inizializzazione. Ricarica la pagina.</p>';
});

export { renderAll, renderSottomeccaniche, initUI };
