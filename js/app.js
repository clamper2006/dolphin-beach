/* ================================================================
   app.js — Dolphin Beach Main Application Controller
   ================================================================ */

const app = (() => {
  let _sistema     = null;
  let _sistemaIsla = null;
  let _settings    = null;
  let _confirmCallback = null;
  let _liberarContext  = 'playa'; // 'playa' or 'isla'

  // Public references for pages
  const publicAPI = {
    get sistema()     { return _sistema; },
    get sistemaIsla() { return _sistemaIsla; },
    get settings()    { return _settings; },
    get router()      { return Router; },

    openModal,
    closeModal,
    confirm: _confirm,
    updateHeaderStats,
    updateDashboard
  };

  // ---------- BOOT ----------
  function _boot() {
    if (Auth.isLoggedIn()) {
      _initApp();
    } else {
      _showLoginView();
    }
  }

  function _showLoginView() {
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('app-view').style.display   = 'none';
    _setupLoginEvents();
  }

  function _initApp() {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('app-view').style.display   = 'block';

    // Load settings
    _settings = Storage.loadSettings();

    // Init data models
    _sistema     = new SistemaChuruatas(_settings);
    _sistemaIsla = new SistemaIsla(_settings);

    // Restore saved state
    const savedCh = Storage.loadChuruatas();
    if (savedCh) _sistema.importar(savedCh);
    const savedIs = Storage.loadIsla();
    if (savedIs)  _sistemaIsla.importar(savedIs);

    // Setup UI
    _setupUserBadge();
    _setupNavigation();
    _setupSidebar();
    _setupDarkMode();
    _setupModalCloseHandlers();
    _setupGlobalConfirmModal();
    _setupLiberarModal();

    // Navigate to landing page for this role
    Router.navigateTo(Auth.getLandingPage());

    // Auto-save every 2 min
    setInterval(() => {
      Storage.saveChuruatas(_sistema.exportar());
      Storage.saveIsla(_sistemaIsla.exportar());
    }, 120000);

    console.log('✅ Dolphin Beach v2 inicializado');
  }

  // ---------- LOGIN ----------
  function _setupLoginEvents() {
    const form       = document.getElementById('login-form');
    const togglePass = document.getElementById('toggle-pass');
    const passInput  = document.getElementById('login-pass');

    form?.addEventListener('submit', e => {
      e.preventDefault();
      const username = document.getElementById('login-user').value;
      const password = document.getElementById('login-pass').value;
      const btn      = document.getElementById('btn-login');

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

      setTimeout(() => {
        const res = Auth.login(username, password);
        if (res.success) {
          _initApp();
        } else {
          const errEl = document.getElementById('login-error');
          errEl.textContent = res.error;
          errEl.style.display = 'block';
          passInput.value = '';
          passInput.focus();
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
      }, 400);
    });

    togglePass?.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      togglePass.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
    });
  }

  // ---------- USER BADGE & LOGOUT ----------
  function _setupUserBadge() {
    const session = Auth.getSession();
    if (!session) return;

    document.getElementById('user-name-badge')?.textContent  !== undefined &&
      (document.getElementById('user-name-badge').textContent = session.nombre.split(' ')[0]);
    const roleChip = document.getElementById('role-chip');
    if (roleChip) roleChip.textContent = Auth.getRolLabel(session.rol);

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      _confirm('¿Cerrar sesión?', 'Salir', () => {
        Auth.logout();
        location.reload();
      });
    });
  }

  // ---------- NAVIGATION ----------
  function _setupNavigation() {
    const session = Auth.getSession();
    if (!session) return;

    // Show/hide nav items by role
    document.querySelectorAll('.nav-item[data-roles]').forEach(item => {
      const roles = item.dataset.roles.split(',');
      if (roles.includes(session.rol)) {
        item.style.display = 'flex';
        item.addEventListener('click', () => Router.navigateTo(item.dataset.page));
      } else {
        item.style.display = 'none';
      }
    });
  }

  // ---------- SIDEBAR ----------
  function _setupSidebar() {
    const toggle   = document.getElementById('sidebar-toggle');
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.createElement('div');
    overlay.id     = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    const openSidebar  = () => { sidebar?.classList.add('open'); overlay.classList.add('active'); };
    const closeSidebar = () => { sidebar?.classList.remove('open'); overlay.classList.remove('active'); };

    toggle?.addEventListener('click', () => sidebar?.classList.contains('open') ? closeSidebar() : openSidebar());
    overlay.addEventListener('click', closeSidebar);
  }

  // ---------- DARK MODE ----------
  function _setupDarkMode() {
    const btn = document.getElementById('btn-dark-mode');
    const isDark = Storage.loadSettings().darkMode || false;
    if (isDark) document.body.classList.add('dark');
    _updateDarkIcon(isDark);

    btn?.addEventListener('click', () => {
      const dark = document.body.classList.toggle('dark');
      const s = Storage.loadSettings();
      s.darkMode = dark;
      Storage.saveSettings(s);
      _updateDarkIcon(dark);
    });
  }

  function _updateDarkIcon(isDark) {
    const btn = document.getElementById('btn-dark-mode');
    if (!btn) return;
    btn.querySelector('i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    btn.title = isDark ? 'Modo claro' : 'Modo oscuro';
  }

  // ---------- MODALS ----------
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
  }

  function _setupModalCloseHandlers() {
    // Close on overlay click or close button
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });

    document.querySelectorAll('.modal-close[data-modal], [data-modal].btn-outline:not(.btn-primary)').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
  }

  // ---------- LIBERAR MODAL (shared between playa & isla) ----------
  function _setupLiberarModal() {
    const btn = document.getElementById('btn-confirmar-liberar');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const current = Router.getCurrent();
      let handled = false;
      if (current === 'isla-el-rey') {
        handled = IslaPage.confirmarLiberar();
      } else {
        handled = PlayaPage.confirmarLiberar();
      }
      if (handled) closeModal('modal-liberar');
    });
  }

  // ---------- CONFIRM DIALOG ----------
  function _confirm(message, title, callback) {
    _confirmCallback = callback;
    document.getElementById('modal-confirm-title').innerHTML = `<i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i> ${title || 'Confirmar'}`;
    document.getElementById('modal-confirm-msg').textContent = message;
    openModal('modal-confirm');
  }

  function _setupGlobalConfirmModal() {
    document.getElementById('btn-confirm-cancel')?.addEventListener('click', () => {
      closeModal('modal-confirm');
      _confirmCallback = null;
    });
    document.getElementById('btn-confirm-ok')?.addEventListener('click', () => {
      closeModal('modal-confirm');
      if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
    });
  }

  // ---------- HEADER STATS ----------
  function updateHeaderStats() {
    if (!_sistema || !_sistemaIsla) return;
    const s  = _sistema.estadisticas();
    const si = _sistemaIsla.estadisticas();

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('h-total',       s.total);
    set('h-ocupadas',    s.ocupadas);
    set('h-disponibles', s.disponibles);
    set('h-ingresos',    `$${s.ingresosEst + si.ingresos}`);
  }

  // ---------- DASHBOARD ----------
  function updateDashboard() {
    if (!_sistema || !_sistemaIsla) return;
    const s  = _sistema.estadisticas();
    const si = _sistemaIsla.estadisticas();

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('kpi-total',       s.total);
    set('kpi-ocupadas',    s.ocupadas);
    set('kpi-disponibles', s.disponibles);
    set('kpi-ingresos',    `$${s.ingresosEst}`);
    set('kpi-isla',        `${si.ocupadas}/${si.total}`);

    // Registros hoy
    const hoy      = new Date().toISOString().split('T')[0];
    const registros = Storage.loadRegistros();
    const hoyCount = registros.filter(r => r.fecha === hoy).length;
    set('kpi-registros', hoyCount);

    // Occupation bars
    const secs = s.secciones || {};
    const setBars = (prefix, secObj, total) => {
      const occ = secObj?.ocupadas || 0;
      const tot = secObj?.total    || total;
      const pct = tot > 0 ? Math.round((occ / tot) * 100) : 0;
      set(`${prefix}-pct`, `${pct}%`);
      set(`${prefix}-txt`, `${occ} / ${tot}`);
      const bar = document.getElementById(`${prefix}-bar`);
      if (bar) bar.style.width = `${pct}%`;
    };

    setBars('occ-islote',  secs['Islote'],       27);
    setBars('occ-playa',   secs['Orilla Playa'], 40);
    setBars('occ-verde',   secs['Área Verde'],   11);
    setBars('occ-premium', secs['Premium'],       3);
    setBars('occ-isla',    si,                   25);

    updateHeaderStats();
  }

  // ---------- INIT ----------
  document.addEventListener('DOMContentLoaded', _boot);

  return publicAPI;
})();
