/* ================================================================
   pages/admin.js — Playa Delfín v2.0.1
   Administration Panel Controller
   ================================================================ */

const AdminPage = (() => {
  let _editingUserId = null;

  function init() {
    _setupTabs();
    _renderUsuarios();
    _loadSettings();
    _setupEventos();
  }

  // ---- TABS ----
  function _setupTabs() {
    document.querySelectorAll('#page-admin .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#page-admin .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#page-admin .tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.style.display = 'block';
      });
    });
  }

  // ---- USUARIOS ----
  function _renderUsuarios() {
    const tbody   = document.getElementById('tbody-usuarios');
    if (!tbody) return;
    const users   = Auth.getUsers();
    const session = Auth.getSession();

    if (users.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6"><i class="fas fa-users"></i> No hay usuarios</td></tr>`;
      return;
    }

    const ROLE_COLORS = {
      ADMIN:          'danger',
      REGISTRADOR:    'primary',
      OPERADOR_PLAYA: 'success',
      OPERADOR_ISLA:  'purple'
    };

    tbody.innerHTML = users.map(u => `
      <tr>
        <td><code>${u.username}</code></td>
        <td>${u.nombre}</td>
        <td><span class="badge badge-${ROLE_COLORS[u.rol] || 'primary'}">${Auth.getRolLabel(u.rol)}</span></td>
        <td>
          ${u.activo !== false
            ? '<span class="badge badge-success"><i class="fas fa-check"></i> Activo</span>'
            : '<span class="badge badge-danger"><i class="fas fa-times"></i> Inactivo</span>'}
        </td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-outline" onclick="AdminPage.editarUsuario(${u.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            ${u.id !== session?.id ? `
              <button class="btn btn-sm btn-icon-danger" onclick="AdminPage.eliminarUsuario(${u.id})" title="Eliminar">
                <i class="fas fa-trash-alt"></i>
              </button>
            ` : `<span class="badge" style="background:var(--border)">Tú</span>`}
          </div>
        </td>
      </tr>
    `).join('');
  }

  function editarUsuario(id) {
    const user = Auth.getUsers().find(u => u.id == id);
    if (!user) return;
    _editingUserId = id;
    document.getElementById('modal-usr-titulo').innerHTML = `<i class="fas fa-user-edit"></i> Editar Usuario`;
    document.getElementById('usr-nombre').value   = user.nombre;
    document.getElementById('usr-username').value = user.username;
    document.getElementById('usr-password').value = '';
    document.getElementById('usr-password').placeholder = 'Dejar vacío para mantener';
    document.getElementById('usr-rol').value      = user.rol;
    document.getElementById('usr-id').value       = id;
    _abrirModal('modal-usuario');
  }

  function eliminarUsuario(id) {
    if (!confirm('¿Eliminar este usuario?')) return;
    const res = Auth.deleteUser(id);
    if (res.success) { Toast.success('Usuario eliminado'); _renderUsuarios(); }
    else Toast.error(res.error);
  }

  function _guardarUsuario() {
    const id       = document.getElementById('usr-id').value;
    const nombre   = document.getElementById('usr-nombre').value.trim();
    const username = document.getElementById('usr-username').value.trim();
    const password = document.getElementById('usr-password').value;
    const rol      = document.getElementById('usr-rol').value;

    if (!nombre || !username || !rol) { Toast.error('Completa todos los campos obligatorios'); return; }

    if (id) {
      const data = { nombre, username, rol };
      if (password) data.password = password;
      const res = Auth.updateUser(id, data);
      if (res.success) { Toast.success('Usuario actualizado'); _cerrarModal('modal-usuario'); _renderUsuarios(); _editingUserId = null; }
      else Toast.error(res.error);
    } else {
      if (!password) { Toast.error('La contraseña es obligatoria'); return; }
      const res = Auth.createUser({ nombre, username, password, rol });
      if (res.success) { Toast.success('Usuario creado'); _cerrarModal('modal-usuario'); _renderUsuarios(); }
      else Toast.error(res.error);
    }
  }

  // ---- SETTINGS ----
  function _loadSettings() {
    const s = Storage.loadSettings();
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('cfg-precio-vip',     s.precioVIP      || 15);
    setVal('cfg-precio-azul',    s.precioAzul     || 10);
    setVal('cfg-precio-silla',   s.precioSilla    || 2);
    setVal('cfg-precio-premium', s.precioPremium  || 40);
    setVal('cfg-precio-isla',    s.precioIsla     || 20);
    setVal('cfg-precio-transp',  s.precioTransporte || 5);
    setVal('cfg-tasa-cambio',    s.tasaCambio     || 36.5);
  }

  function _guardarConfig() {
    const s = Storage.loadSettings();
    const getNum = (id, def) => parseFloat(document.getElementById(id)?.value) || def;
    s.precioVIP        = getNum('cfg-precio-vip',    15);
    s.precioAzul       = getNum('cfg-precio-azul',   10);
    s.precioSilla      = getNum('cfg-precio-silla',  2);
    s.precioIsla       = getNum('cfg-precio-isla',   20);
    s.precioTransporte = getNum('cfg-precio-transp', 5);
    s.tasaCambio       = getNum('cfg-tasa-cambio',   36.5);
    s.precioPremium    = getNum('cfg-precio-premium', 40);
    Storage.saveSettings(s);
    Toast.success('Configuración guardada');
  }

  // ---- DATA ----
  function _exportar() {
    const json  = Storage.exportAll();
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `playa-delfin-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Datos exportados correctamente');
  }

  function _importar(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const res = Storage.importAll(e.target.result);
      if (res.success) Toast.success('Datos importados. Recarga la página.');
      else Toast.error('Error al importar: ' + res.error);
    };
    reader.readAsText(file);
  }

  function _limpiarSistema() {
    if (!confirm('⚠️ Esto reiniciará TODAS las churuatas a disponible. ¿Confirmar?')) return;
    if (app.sistema)     { app.sistema._inicializar();    Storage.saveChuruatas(app.sistema.exportar()); }
    if (app.sistemaIsla) { app.sistemaIsla._inicializar(); Storage.saveIsla(app.sistemaIsla.exportar()); }
    Toast.success('Sistema reiniciado correctamente');
    app.updateHeaderStats();
  }

  // ---- HELPERS ----
  function _abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
  }

  function _cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
  }

  // ---- EVENTS ----
  function _setupEventos() {
    document.getElementById('btn-nuevo-usuario')?.addEventListener('click', () => {
      _editingUserId = null;
      document.getElementById('modal-usr-titulo').innerHTML = `<i class="fas fa-user-plus"></i> Nuevo Usuario`;
      ['usr-nombre','usr-username','usr-password','usr-id'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      document.getElementById('usr-password').placeholder = 'Contraseña';
      _abrirModal('modal-usuario');
    });

    document.getElementById('btn-guardar-usuario')?.addEventListener('click', _guardarUsuario);
    document.getElementById('btn-cerrar-modal-usr')?.addEventListener('click', () => _cerrarModal('modal-usuario'));
    document.getElementById('modal-usuario')?.addEventListener('click', e => {
      if (e.target === document.getElementById('modal-usuario')) _cerrarModal('modal-usuario');
    });

    document.getElementById('btn-guardar-config')?.addEventListener('click', _guardarConfig);
    document.getElementById('btn-exportar')?.addEventListener('click', _exportar);
    document.getElementById('input-importar')?.addEventListener('change', e => _importar(e.target.files[0]));
    document.getElementById('btn-limpiar')?.addEventListener('click', _limpiarSistema);
  }

  return { init, editarUsuario, eliminarUsuario };
})();
