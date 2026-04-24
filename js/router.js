/* ================================================================
   router.js — Playa Delfín v2.0.1
   SPA Page Router with role-based access control
   ================================================================ */

const Router = (() => {
  let _current  = null;
  let _onChange = null;

  const PAGES = ['dashboard', 'churuatas-playa', 'isla-el-rey', 'registro', 'admin', 'acerca-de'];

  function init(onChangeCb) {
    _onChange = onChangeCb;
  }

  function navigate(pageId) {
    // Security check
    if (!Auth.isLoggedIn()) {
      _showLogin();
      return;
    }

    if (!Auth.canAccess(pageId)) {
      Toast.warning('No tienes permiso para acceder a esta sección');
      return;
    }

    // Hide all pages
    PAGES.forEach(p => {
      const el = document.getElementById(`page-${p}`);
      if (el) el.style.display = 'none';
    });

    // Show target
    const target = document.getElementById(`page-${pageId}`);
    if (!target) return;
    target.style.display = 'block';
    _current = pageId;

    // Update nav
    _updateNav(pageId);

    // Callback
    if (_onChange) _onChange(pageId);
  }

  function _updateNav(active) {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === active);
    });
  }

  function _showLogin() {
    document.getElementById('login-view')?.style && (document.getElementById('login-view').style.display = 'flex');
    document.getElementById('app-view')?.style   && (document.getElementById('app-view').style.display   = 'none');
  }

  function current() { return _current; }

  function getVisibleNavItems() {
    const session = Auth.getSession();
    if (!session) return [];
    return (Auth.PERMISOS[session.rol] || []);
  }

  return { init, navigate, current, getVisibleNavItems, PAGES };
})();
