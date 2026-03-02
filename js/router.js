/* ================================================================
   router.js — Dolphin Beach SPA Router with Role Protection
   ================================================================ */

const Router = (() => {
  let _current = null;
  let _initialized = {};

  const PAGES = ['dashboard', 'churuatas-playa', 'isla-el-rey', 'registro', 'admin', 'acerca-de'];

  function navigateTo(page) {
    if (!Auth.isLoggedIn()) { _showLogin(); return; }
    if (!Auth.canAccess(page)) {
      Toast.warning('No tienes permiso para acceder a esta sección');
      return;
    }

    // Hide all pages
    PAGES.forEach(p => {
      const el = document.getElementById(`page-${p}`);
      if (el) el.style.display = 'none';
    });

    // Show target
    const pageEl = document.getElementById(`page-${page}`);
    if (!pageEl) { console.warn('Page not found:', page); return; }
    pageEl.style.display = 'block';

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });

    // Page lifecycle - initialize once, refresh on revisit
    if (!_initialized[page]) {
      _initPage(page);
      _initialized[page] = true;
    } else {
      _refreshPage(page);
    }

    _current = page;

    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-overlay')?.classList.remove('active');
    }
  }

  function _initPage(page) {
    switch(page) {
      case 'dashboard':
        app.updateDashboard();
        break;
      case 'churuatas-playa':
        PlayaPage.init(app.sistema);
        break;
      case 'isla-el-rey':
        IslaPage.init(app.sistemaIsla);
        break;
      case 'registro':
        RegistroPage.init();
        break;
      case 'admin':
        AdminPage.init();
        break;
      case 'acerca-de':
        // Static, no init needed
        break;
    }
  }

  function _refreshPage(page) {
    switch(page) {
      case 'dashboard':
        app.updateDashboard();
        break;
      case 'churuatas-playa':
        PlayaPage.refresh();
        break;
      case 'isla-el-rey':
        IslaPage.refresh();
        break;
      case 'registro':
        RegistroPage.init(); // re-init for fresh data
        break;
      case 'admin':
        AdminPage.init();
        break;
    }
  }

  function _showLogin() {
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('app-view').style.display   = 'none';
  }

  function getCurrent() { return _current; }

  return { navigateTo, getCurrent };
})();
