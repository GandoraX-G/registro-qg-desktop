/* ============================================================
   ADAPTIVE LAYOUT ENGINE
   Rileva dispositivo, schermo e adatta ogni elemento automaticamente.
   ============================================================ */

const BREAKPOINTS = {
  mobileSmall: 360,
  mobile: 480,
  tablet: 768,
  desktop: 960,
  desktopWide: 1200,
};

let currentProfile = null;
let listeners = [];

function getScreenInfo() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isPortrait = h > w;

  let profile = 'desktopWide';
  if (w <= BREAKPOINTS.mobileSmall) profile = 'mobileSmall';
  else if (w <= BREAKPOINTS.mobile) profile = 'mobile';
  else if (w <= BREAKPOINTS.tablet) profile = 'tablet';
  else if (w <= BREAKPOINTS.desktop) profile = 'desktop';

  return { w, h, dpr, isTouch, isPortrait, profile };
}

function detectDevice() {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const hasNotch = CSS.supports('padding-top', 'env(safe-area-inset-top)') && isTouch;

  return { isIOS, isAndroid, isSafari, isChrome, isStandalone, hasNotch, isMobile: isIOS || isAndroid };
}

function applyProfile() {
  const screen = getScreenInfo();
  const device = detectDevice();
  const root = document.documentElement;

  root.classList.remove('profile-mobileSmall', 'profile-mobile', 'profile-tablet', 'profile-desktop', 'profile-desktopWide');
  root.classList.add(`profile-${screen.profile}`);

  root.classList.toggle('is-touch', screen.isTouch);
  root.classList.toggle('is-mobile', device.isMobile);
  root.classList.toggle('is-ios', device.isIOS);
  root.classList.toggle('is-android', device.isAndroid);
  root.classList.toggle('is-portrait', screen.isPortrait);
  root.classList.toggle('is-landscape', !screen.isPortrait);
  root.classList.toggle('has-notch', device.hasNotch);
  root.classList.toggle('is-pwa', device.isStandalone);

  if (screen.dpr >= 3) root.classList.add('is-retina');
  else root.classList.remove('is-retina');

  const profile = { ...screen, ...device };
  if (currentProfile?.profile !== profile.profile || currentProfile?.isPortrait !== profile.isPortrait) {
    currentProfile = profile;
    listeners.forEach(fn => fn(profile));
  }
  currentProfile = profile;
  return profile;
}

function onProfileChange(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function isMobile() {
  return currentProfile?.isMobile || window.innerWidth <= BREAKPOINTS.desktop;
}

function isTablet() {
  return currentProfile?.profile === 'tablet';
}

function isDesktop() {
  return (currentProfile?.profile === 'desktop' || currentProfile?.profile === 'desktopWide') && !currentProfile?.isMobile;
}

function adaptTables(container) {
  if (!container) container = document;
  container.querySelectorAll('table').forEach(table => {
    const parent = table.parentElement;
    if (!parent) return;
    const isCard = parent.classList.contains('card');

    if (isMobile()) {
      table.style.display = 'block';
      table.style.overflowX = 'auto';
      table.style.webkitOverflowScrolling = 'touch';
      table.style.border = '1px solid var(--parchment-edge)';
      table.style.borderRadius = 'var(--radius-sm)';

      const thead = table.querySelector('thead');
      if (thead) thead.style.display = 'table-header-group';

      const tbody = table.querySelector('tbody');
      if (tbody) tbody.style.display = 'table-row-group';

      table.querySelectorAll('tr').forEach(tr => {
        tr.style.display = 'flex';
      });

      table.querySelectorAll('th, td').forEach(cell => {
        cell.style.flex = '0 0 auto';
        cell.style.whiteSpace = 'nowrap';
        cell.style.padding = '12px 14px';
        cell.style.fontSize = '14px';
      });

      table.querySelectorAll('th:first-child, td:first-child').forEach(cell => {
        cell.style.position = 'sticky';
        cell.style.left = '0';
        cell.style.zIndex = '1';
        cell.style.background = cell.tagName === 'TH' ? 'var(--parchment-deep)' : 'var(--parchment)';
        cell.style.borderRight = '2px solid var(--parchment-edge)';
      });
    } else {
      table.style.display = '';
      table.style.overflowX = '';
      table.style.webkitOverflowScrolling = '';
      table.style.border = '';
      table.style.borderRadius = '';

      const thead = table.querySelector('thead');
      if (thead) thead.style.display = '';

      const tbody = table.querySelector('tbody');
      if (tbody) tbody.style.display = '';

      table.querySelectorAll('tr').forEach(tr => {
        tr.style.display = '';
      });

      table.querySelectorAll('th, td').forEach(cell => {
        cell.style.flex = '';
        cell.style.whiteSpace = '';
        cell.style.padding = '';
        cell.style.fontSize = '';
        cell.style.position = '';
        cell.style.left = '';
        cell.style.zIndex = '';
        cell.style.background = '';
        cell.style.borderRight = '';
      });
    }
  });
}

function adaptModals() {
  document.querySelectorAll('.modal-bg').forEach(bg => {
    if (isMobile()) {
      bg.style.padding = '0';
      bg.style.alignItems = 'flex-end';
      bg.style.justifyContent = 'stretch';

      const modal = bg.querySelector('.modal');
      if (modal) {
        modal.style.width = '100%';
        modal.style.maxWidth = '100%';
        modal.style.borderRadius = '20px 20px 0 0';
        modal.style.border = 'none';
        modal.style.borderTop = '3px solid var(--brass)';
        modal.style.animation = 'slideUp .3s cubic-bezier(.2,.8,.2,1)';
        modal.style.overscrollBehavior = 'contain';
      }
    } else {
      bg.style.padding = '';
      bg.style.alignItems = '';
      bg.style.justifyContent = '';

      const modal = bg.querySelector('.modal');
      if (modal) {
        modal.style.width = '';
        modal.style.maxWidth = '';
        modal.style.borderRadius = '';
        modal.style.border = '';
        modal.style.borderTop = '';
        modal.style.animation = '';
        modal.style.overscrollBehavior = '';
      }
    }
  });
}

function adaptSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  if (isMobile()) {
    sidebar.style.position = 'fixed';
    sidebar.style.top = '0';
    sidebar.style.bottom = '0';
    sidebar.style.width = '300px';
    sidebar.style.zIndex = '100';
    sidebar.style.transition = 'left .3s cubic-bezier(.32,.72,0,1)';
    sidebar.style.willChange = 'left';

    if (!sidebar.classList.contains('open')) {
      sidebar.style.left = '-300px';
      sidebar.style.boxShadow = 'none';
    } else {
      sidebar.style.left = '0';
      sidebar.style.boxShadow = '12px 0 48px rgba(0,0,0,.65)';
    }
  } else {
    sidebar.style.position = '';
    sidebar.style.top = '';
    sidebar.style.bottom = '';
    sidebar.style.width = '';
    sidebar.style.zIndex = '';
    sidebar.style.transition = '';
    sidebar.style.willChange = '';
    sidebar.style.left = '';
    sidebar.style.boxShadow = '';
  }
}

function adaptCards() {
  document.querySelectorAll('.structure-catalog').forEach(catalog => {
    if (isMobile()) {
      if (currentProfile?.profile === 'mobileSmall') {
        catalog.style.gridTemplateColumns = '1fr';
      } else {
        catalog.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
      }
    } else {
      catalog.style.gridTemplateColumns = '';
    }
  });

  document.querySelectorAll('.grid2').forEach(grid => {
    if (isMobile()) {
      grid.style.gridTemplateColumns = '1fr';
    } else {
      grid.style.gridTemplateColumns = '';
    }
  });
}

function adaptTouchTargets() {
  if (!isMobile()) return;

  document.querySelectorAll('button.btn:not(.btn-sm)').forEach(btn => {
    if (!btn.style.minHeight) btn.style.minHeight = '48px';
  });

  document.querySelectorAll('input, select, textarea').forEach(input => {
    if (!input.style.minHeight) input.style.minHeight = '48px';
    if (input.style.fontSize !== '16px') input.style.fontSize = '16px';
  });
}

function adaptAll() {
  const profile = applyProfile();
  adaptTables();
  adaptModals();
  adaptSidebar();
  adaptCards();
  adaptTouchTargets();
  return profile;
}

let resizeTimer = null;
function handleResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    adaptAll();
  }, 100);
}

function initAdaptive() {
  applyProfile();
  adaptAll();

  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(adaptAll, 200);
  });

  const observer = new MutationObserver(() => {
    adaptTables();
    adaptTouchTargets();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export {
  initAdaptive,
  adaptAll,
  adaptTables,
  adaptModals,
  adaptSidebar,
  adaptCards,
  adaptTouchTargets,
  onProfileChange,
  isMobile,
  isTablet,
  isDesktop,
  getScreenInfo,
  detectDevice,
};
