/* ================================================================
   app.js — Playa Delfín v2.0.1
   Main Application Orchestrator
   ================================================================ */

let _sistema     = null;
let _sistemaIsla = null;

const app = {
  get sistema()     { return _sistema; },
  get sistemaIsla() { return _sistemaIsla; },

  init() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(e => console.warn('SW:', e));
    }

    // Init data models
    _sistema     = new SistemaChuruatas();
    _sistemaIsla = new SistemaIsla();

    // Load persisted state
    const savedPlaya = Storage.loadChuruatas();
    if (savedPlaya) _sistema.importar(savedPlaya);

    const savedIsla = Storage.loadIsla();
    if (savedIsla) _sistemaIsla.importar(savedIsla);

    // Setup router
    Router.init(app._onPageChange.bind(app));

    // Check session
    if (Auth.isLoggedIn()) {
      app._showApp();
    } else {
      app._showLogin();
    }

    // Login form
    document.getElementById('login-form')?.addEventListener('submit', e => {
      e.preventDefault();
      app._doLogin();
    });

    document.getElementById('toggle-pass')?.addEventListener('click', () => {
      const inp = document.getElementById('login-pass');
      const ico = document.querySelector('#toggle-pass i');
      if (inp.type === 'password') { inp.type = 'text'; ico.className = 'fas fa-eye-slash'; }
      else                         { inp.type = 'password'; ico.className = 'fas fa-eye'; }
    });

    document.getElementById('sidebar-toggle')?.addEventListener('click', app._toggleSidebar);
    document.getElementById('sidebar-overlay')?.addEventListener('click', app._closeSidebar);
    document.getElementById('btn-logout')?.addEventListener('click', app._doLogout);
  },

  _doLogin() {
    const user    = document.getElementById('login-user')?.value?.trim();
    const pass    = document.getElementById('login-pass')?.value;
    const errEl   = document.getElementById('login-error');
    const btnEl   = document.getElementById('btn-login');
    const errSpan = errEl?.querySelector('span');

    if (!user || !pass) {
      if (errSpan) errSpan.textContent = 'Completa todos los campos';
      if (errEl)   errEl.style.display = 'flex';
      return;
    }

    btnEl.disabled  = true;
    btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
    if (errEl) errEl.style.display = 'none';

    setTimeout(() => {
      const res = Auth.login(user, pass);
      btnEl.disabled  = false;
      btnEl.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';

      if (res.success) {
        app._showApp();
      } else {
        if (errSpan) errSpan.textContent = res.error;
        if (errEl)   errEl.style.display = 'flex';
      }
    }, 380);
  },

  _doLogout() {
    Auth.logout();
    app._showLogin();
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
  },

  _showLogin() {
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('app-view').style.display   = 'none';
  },

  _showApp() {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('app-view').style.display   = 'flex';
    app._renderNav();
    app._renderUserInfo();
    app.updateHeaderStats();
    Router.navigate(Auth.getLandingPage());
  },

  _renderNav() {
    const session = Auth.getSession();
    const navList = document.getElementById('nav-list');
    if (!navList || !session) return;

    const NAV_ITEMS = [
      { page: 'dashboard',       icon: 'fa-chart-line',     label: 'Dashboard',          roles: ['ADMIN'] },
      { page: 'registro',        icon: 'fa-user-check',     label: 'Registrador',        roles: ['ADMIN','REGISTRADOR'] },
      { page: 'churuatas-playa', icon: 'fa-umbrella-beach', label: 'Churuatas Playa',    roles: ['ADMIN','OPERADOR_PLAYA'] },
      { page: 'isla-el-rey',     icon: 'fa-water',          label: 'Isla El Rey',        roles: ['ADMIN','OPERADOR_ISLA'] },
      { page: 'admin',           icon: 'fa-cog',            label: 'Administración',     roles: ['ADMIN'] },
      { page: 'acerca-de',       icon: 'fa-info-circle',    label: 'Acerca de',          roles: ['ADMIN','REGISTRADOR','OPERADOR_PLAYA','OPERADOR_ISLA'] }
    ];

    navList.innerHTML = NAV_ITEMS
      .filter(item => item.roles.includes(session.rol))
      .map(item => `
        <li class="nav-item" data-page="${item.page}">
          <button class="nav-btn" data-page="${item.page}">
            <i class="fas ${item.icon} nav-icon"></i>
            <span class="nav-label">${item.label}</span>
            ${item.page === 'registro' ? '<span class="nav-badge" id="badge-registro"></span>' : ''}
          </button>
        </li>
      `).join('');

    navList.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        Router.navigate(btn.dataset.page);
        app._closeSidebar();
      });
    });
  },

  _renderUserInfo() {
    const session = Auth.getSession();
    if (!session) return;
    const el = document.getElementById('user-info');
    if (el) el.innerHTML = `
      <div class="user-avatar"><i class="fas fa-user"></i></div>
      <div class="user-details">
        <span class="user-name">${session.nombre}</span>
        <span class="user-role">${Auth.getRolLabel(session.rol)}</span>
      </div>
    `;
  },

  updateHeaderStats() {
    if (!_sistema || !_sistemaIsla) return;
    const sp    = _sistema.estadisticas();
    const si    = _sistemaIsla.estadisticas();
    const total = sp.total + si.total;
    const ocup  = sp.ocupadas + si.ocupadas;
    const disp  = total - ocup;
    const set   = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('h-total',       total);
    set('h-ocupadas',    ocup);
    set('h-disponibles', disp);
  },

  updateDashboard() {
    if (!_sistema || !_sistemaIsla) return;
    const sp  = _sistema.estadisticas();
    const si  = _sistemaIsla.estadisticas();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('dash-playa-total',    sp.total);
    set('dash-playa-ocup',     sp.ocupadas);
    set('dash-playa-disp',     sp.disponibles);
    set('dash-playa-ingresos', `$${sp.ingresos}`);
    set('dash-isla-total',     si.total);
    set('dash-isla-ocup',      si.ocupadas);
    set('dash-isla-disp',      si.disponibles);
    set('dash-isla-ingresos',  `$${si.ingresos}`);

    const ocupList = document.getElementById('dash-ocupadas-list');
    if (ocupList) {
      const ocup = _sistema.ocupadas();
      if (ocup.length === 0) {
        ocupList.innerHTML = `<div class="empty-state"><i class="fas fa-umbrella-beach"></i><p>Todas las churuatas disponibles</p></div>`;
      } else {
        ocupList.innerHTML = ocup.map(c => `
          <div class="dash-ocp-item">
            <span class="dash-ocp-id ${c.tipo === 'VIP' ? 'vip' : 'azul'}">${c.id}</span>
            <span class="dash-ocp-nombre">${c.cliente.nombreCompleto || '—'}</span>
            <span class="dash-ocp-hora">${c.fechaAlquiler ? new Date(c.fechaAlquiler).toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}) : '—'}</span>
          </div>
        `).join('');
      }
    }
  },

  _onPageChange(pageId) {
    switch(pageId) {
      case 'dashboard':       app.updateDashboard();            break;
      case 'churuatas-playa': PlayaPage.init(_sistema);         break;
      case 'isla-el-rey':     IslaPage.init(_sistemaIsla);      break;
      case 'registro':        RegistroPage.init();              break;
      case 'admin':           AdminPage.init();                 break;
    }
    app.updateHeaderStats();
  },

  _toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-overlay')?.classList.toggle('visible');
  },

  _closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
