import { caricaConfig } from './core/config.js';
import { state, currentTab, setCurrentTab, GUIDE_KEY, setRenderAll, setRenderDashboard, setRenderSottomeccaniche } from './core/state.js';
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
import { initAdaptive, adaptAll, adaptTables } from './ui/adaptive.js';

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
  adaptAll();
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
   GESTURES (mobile swipe)
   ============================================================ */
const TAB_ORDER = ['panoramica', 'strutture', 'magazzino', 'rotte', 'finanze', 'preventivo'];

function initGestures() {
  if (window.innerWidth > 960) return;

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileOverlay');
  const main = document.querySelector('.main');
  const swipeHint = document.getElementById('swipeHint');
  if (!sidebar || !main) return;

  let startX = 0, startY = 0, tracking = false, direction = null;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay?.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay?.classList.remove('show');
    document.body.style.overflow = '';
  }

  document.addEventListener('touchstart', e => {
    if (sidebar.classList.contains('open')) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
    direction = null;
    if (startX < 30) swipeHint?.classList.add('show');
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!tracking) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (!direction) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        direction = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
    }

    if (direction === 'h' && startX < 30 && dx > 0) {
      e.preventDefault();
      const progress = Math.min(dx / 250, 1);
      sidebar.style.transform = `translateX(${-280 + 280 * progress}px)`;
      sidebar.style.transition = 'none';
    }
  }, { passive: false });

  document.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;
    swipeHint?.classList.remove('show');

    sidebar.style.transform = '';
    sidebar.style.transition = '';

    if (direction === 'h' && startX < 30) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      if (dx > 80) openSidebar();
    }
  }, { passive: true });

  // Swipe left on open sidebar → close
  let sidebarStartX = 0;
  sidebar.addEventListener('touchstart', e => {
    if (!sidebar.classList.contains('open')) return;
    sidebarStartX = e.touches[0].clientX;
  }, { passive: true });

  sidebar.addEventListener('touchend', e => {
    if (!sidebar.classList.contains('open')) return;
    const dx = e.changedTouches[0].clientX - sidebarStartX;
    if (dx < -60) closeSidebar();
  }, { passive: true });

  // Swipe left/right on main → switch tabs
  let mainStartX = 0, mainStartY = 0, mainDir = null;
  main.addEventListener('touchstart', e => {
    mainStartX = e.touches[0].clientX;
    mainStartY = e.touches[0].clientY;
    mainDir = null;
  }, { passive: true });

  main.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - mainStartX;
    const dy = e.touches[0].clientY - mainStartY;
    if (!mainDir && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      mainDir = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'h' : 'v';
    }
  }, { passive: true });

  main.addEventListener('touchend', e => {
    if (mainDir !== 'h') return;
    const dx = e.changedTouches[0].clientX - mainStartX;
    const currentIdx = TAB_ORDER.indexOf(currentTab);
    if (Math.abs(dx) > 60 && currentIdx >= 0) {
      if (dx < 0 && currentIdx < TAB_ORDER.length - 1) {
        switchTab(TAB_ORDER[currentIdx + 1]);
      } else if (dx > 0 && currentIdx > 0) {
        switchTab(TAB_ORDER[currentIdx - 1]);
      }
    }
  }, { passive: true });
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

  initNavigation();
  initSidebar();
  initGuide();
  initImportExport();
  initKeyboard();
  initGestures();
  initAdaptive();

  initDashboardEvents();
  initStructureEvents();
  initWarehouseEvents();
  initRoutesEvents();
  initFinanceEvents();
  initPreventivoEvents();
  loadSavedPreventivo();

  document.getElementById('copySummaryBtn')?.addEventListener('click', copySummary);

  switchTab(currentTab || 'panoramica');

  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  adaptAll();

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
