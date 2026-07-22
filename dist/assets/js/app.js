import { caricaConfig, state, saveState, exportBackup, importBackup, loadState, TAURI_DISPONIBILE, THEME_KEY, GUIDE_KEY, storageOk, setStorageCallbacks } from './storage.js';
import { renderDashboard, initDashboardEvents } from './dashboard.js';
import { renderCatalogo, renderStrutturePossedute, renderSottomeccaniche, initStructureEvents, setRenderAll as structSetRenderAll, setRenderDashboard as structSetRenderDashboard } from './structures.js';
import { renderMagazzino, initWarehouseEvents, setWarehouseCallbacks } from './warehouse.js';
import { renderRotte, initRouteEvents } from './routes.js';
import { renderFinanze, initFinanceEvents, setFinanceRenderCallbacks } from './finance.js';
import { showToast, initToast } from './modal.js';
import { setRenderCallbacks as militarySetRenderCallbacks } from './military.js';

/* ============================================================
   GLOBAL RENDER
   ============================================================ */
function renderAll() {
  renderTopbar();
  const tab = state._currentTab || 'panoramica';
  switch (tab) {
    case 'panoramica': renderDashboard(); break;
    case 'strutture': renderCatalogo(); renderStrutturePossedute(); renderSottomeccaniche(); break;
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
  state._currentTab = tabId;

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
  if (overlay) overlay.style.display = hidden ? 'none' : 'flex';

  document.getElementById('guide-close')?.addEventListener('click', closeGuide);
  document.getElementById('guide-dismiss')?.addEventListener('click', closeGuide);
}

function closeGuide() {
  const overlay = document.getElementById('guide-overlay');
  if (overlay) overlay.style.display = 'none';
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
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    const map = { '1': 'panoramica', '2': 'strutture', '3': 'magazzino', '4': 'rotte', '5': 'finanze' };
    if (map[e.key]) { switchTab(map[e.key]); e.preventDefault(); }
  });
}

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  await caricaConfig();

  initTheme();
  initNavigation();
  initGuide();
  initImportExport();
  initKeyboard();

  structSetRenderAll(renderAll);
  structSetRenderDashboard(renderDashboard);
  militarySetRenderCallbacks(renderAll, renderSottomeccaniche);
  setFinanceRenderCallbacks(renderAll);
  setWarehouseCallbacks({ renderAll, renderTopbar, renderFinanze });

  setStorageCallbacks(renderAll, showToast);

  await loadState();

  initDashboardEvents();
  initStructureEvents();
  initWarehouseEvents();
  initRouteEvents();
  initFinanceEvents();
  initToast();

  switchTab(state._currentTab || 'panoramica');
}

init().catch(err => {
  console.error('Init failed:', err);
  document.getElementById('loading').innerHTML = '<p style="color:red;">Errore di inizializzazione. Ricarica la pagina.</p>';
});
