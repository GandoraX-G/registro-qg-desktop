import { caricaConfig } from './core/config.js';
import { state, currentTab, setCurrentTab, THEME_KEY, GUIDE_KEY, setRenderAll, setRenderDashboard, setRenderSottomeccaniche } from './core/state.js';
import { saveState, loadState } from './core/persistence.js';
import { exportBackup, importBackup } from './core/backup.js';
import { showToast } from './ui/toast.js';
import { copySummary } from './engine/summary.js';
import { renderDashboard, initDashboardEvents } from './ui/dashboard.js';
import { renderFinanze, initFinanceEvents } from './ui/finance.js';
import { renderCatalogo, renderStrutturePossedute, renderSottomeccaniche, renderSatelliti, initStructureEvents } from './ui/structures.js';
import { renderMagazzino, initWarehouseEvents, setWarehouseCallbacks } from './ui/warehouse.js';
import { renderRotte, initRoutesEvents } from './ui/routes.js';
import { renderPreventivo, renderCatalogoPreventivo, initPreventivoEvents, loadSavedPreventivo } from './ui/preventivo.js';

/* ============================================================
   GLOBAL RENDER
   ============================================================ */
function renderAll() {
  const tab = currentTab || 'panoramica';
  switch (tab) {
    case 'panoramica': renderDashboard(); break;
    case 'strutture': renderCatalogo(); renderStrutturePossedute(); renderSottomeccaniche(); renderSatelliti(); break;
    case 'magazzino': renderMagazzino(); break;
    case 'rotte': renderRotte(); break;
    case 'finanze': renderFinanze(); break;
    case 'preventivo': renderCatalogoPreventivo(); renderPreventivo(); break;
  }
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function switchTab(tabId) {
  setCurrentTab(tabId);
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });
  ['panoramica', 'strutture', 'magazzino', 'rotte', 'finanze', 'preventivo'].forEach(t => {
    const panel = document.getElementById('tab-' + t);
    if (panel) panel.style.display = (t === tabId) ? 'block' : 'none';
  });
  renderAll();
}

function initNavigation() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });
}

/* ============================================================
   THEME
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  updateThemeButton();
}

function updateThemeButton() {
  const sw = document.getElementById('ttSwitch');
  const label = document.getElementById('themeLabel');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (sw) sw.classList.toggle('on', isDark);
  if (label) label.textContent = isDark ? 'Tema Scuro' : 'Tema Chiaro';
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');
  updateThemeButton();
}

/* ============================================================
   GUIDE MODAL
   ============================================================ */
function initGuide() {
  const guideDontShow = document.getElementById('guideDontShow');

  function closeGuide() {
    document.getElementById('guideModalBg').style.display = 'none';
    if (guideDontShow?.checked) {
      localStorage.setItem(GUIDE_KEY, '1');
    }
  }

  document.getElementById('guideBtn')?.addEventListener('click', () => {
    document.getElementById('guideModalBg').style.display = 'flex';
    if (guideDontShow) guideDontShow.checked = false;
  });
  document.getElementById('guideCloseX')?.addEventListener('click', closeGuide);
  document.getElementById('guideCloseBtn')?.addEventListener('click', closeGuide);
  document.getElementById('guideModalBg')?.addEventListener('click', e => {
    if (e.target.id === 'guideModalBg') e.target.style.display = 'none';
  });
}

/* ============================================================
   IMPORT / EXPORT
   ============================================================ */
function initImportExport() {
  document.getElementById('exportBtn')?.addEventListener('click', exportBackup);
  document.getElementById('importBtn')?.addEventListener('click', () => importBackup());
  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if (!confirm('Vuoi davvero azzerare tutto il registro del QG? L\'operazione non è reversibile. (Consiglio: esporta prima un backup)')) return;
    Object.assign(state, {
      nome: 'Il mio Quartier Generale', fondatore: '', cofondatore: '', classe: 'Nessuna', livello: 1,
      oro: 0, membri: [], strutture: [], materiali: {}, lavoratori: 0, rotte: [],
      magazzinoScontati: [], movimenti: [], riservaBancaria: 0, registroAltriQG: [],
      calendario: { mese: 1, stagione: 'Primavera' }, clima: 'Mite',
      token: { miniera: 0, pesca: 0, concime: 0 }, tokenConcimeDaSpendere: 0, tokenMinieraDaSpendere: 0, tokenPescaDaSpendere: 0, satelliti: [], resocontoUltimoMese: null, speseExtra: []
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
    if (isInput) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      switchTab('strutture');
      setTimeout(() => document.getElementById('struct-search')?.focus(), 100);
      return;
    }
    const map = { '1': 'panoramica', '2': 'strutture', '3': 'magazzino', '4': 'rotte', '5': 'finanze', '6': 'preventivo' };
    if (map[e.key]) { switchTab(map[e.key]); e.preventDefault(); }
  });
}

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  await caricaConfig();

  setRenderAll(renderAll);
  setRenderDashboard(renderDashboard);
  setRenderSottomeccaniche(renderSottomeccaniche);
  setWarehouseCallbacks({ renderFinanze });

  await loadState();

  initTheme();
  initNavigation();
  initSidebar();
  initGuide();
  initImportExport();
  initKeyboard();

  initDashboardEvents();
  initStructureEvents();
  initWarehouseEvents();
  initRoutesEvents();
  initFinanceEvents();
  initPreventivoEvents();
  loadSavedPreventivo();

  document.getElementById('ttSwitch')?.addEventListener('click', toggleTheme);
  document.getElementById('copySummaryBtn')?.addEventListener('click', copySummary);

  switchTab(currentTab || 'panoramica');

  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = 'grid';

  if (!localStorage.getItem(GUIDE_KEY)) {
    setTimeout(() => {
      document.getElementById('guideModalBg').style.display = 'flex';
    }, 500);
  }
}

/* ============================================================
   SIDEBAR TOGGLE + MOBILE
   ============================================================ */
let sidebarManuallyToggled = false;

function initSidebar() {
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.querySelector('.app')?.classList.toggle('sidebar-collapsed');
    sidebarManuallyToggled = true;
  });

  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileOverlay');

  function openMobileSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', () => {
    if (sidebar?.classList.contains('open')) closeMobileSidebar();
    else openMobileSidebar();
  });
  overlay?.addEventListener('click', closeMobileSidebar);

  document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
    el.addEventListener('click', () => {
      if (window.innerWidth <= 960) closeMobileSidebar();
    });
  });

  const mql = window.matchMedia('(max-width:1200px)');
  const autoCollapse = (e) => {
    if (sidebarManuallyToggled) return;
    const app = document.querySelector('.app');
    if (!app) return;
    if (e.matches) app.classList.add('sidebar-collapsed');
    else app.classList.remove('sidebar-collapsed');
  };
  autoCollapse(mql);
  mql.addEventListener('change', autoCollapse);
}

init().catch(err => {
  console.error('Init failed:', err);
  document.getElementById('loading').innerHTML = '<p style="color:red;">Errore di inizializzazione. Ricarica la pagina.</p>';
});
