/* ================================================================
   auth.js — Dolphin Beach Authentication & Role Management
   ================================================================ */

const Auth = (() => {
  const STORAGE_KEY = 'db_auth_users';
  const SESSION_KEY = 'db_session';

  const DEFAULT_USERS = [
    { id: 1, username: 'admin',        password: 'admin123', nombre: 'Administrador',      rol: 'ADMIN',          activo: true },
    { id: 2, username: 'registrador',  password: 'reg123',   nombre: 'Carlos Registrador', rol: 'REGISTRADOR',    activo: true },
    { id: 3, username: 'op_playa',     password: 'playa123', nombre: 'Juan Operador Playa',rol: 'OPERADOR_PLAYA', activo: true },
    { id: 4, username: 'op_isla',      password: 'isla123',  nombre: 'María Operadora Isla',rol: 'OPERADOR_ISLA', activo: true }
  ];

  // Páginas permitidas por rol
  const PERMISOS = {
    ADMIN:          ['dashboard', 'churuatas-playa', 'isla-el-rey', 'registro', 'admin', 'acerca-de'],
    REGISTRADOR:    ['registro', 'acerca-de'],
    OPERADOR_PLAYA: ['churuatas-playa', 'acerca-de'],
    OPERADOR_ISLA:  ['isla-el-rey', 'acerca-de']
  };

  const ROLES_LABEL = {
    ADMIN:          'Administrador',
    REGISTRADOR:    'Registrador',
    OPERADOR_PLAYA: 'Op. Playa',
    OPERADOR_ISLA:  'Op. Isla'
  };

  // Página de inicio por rol
  const LANDING_PAGE = {
    ADMIN:          'dashboard',
    REGISTRADOR:    'registro',
    OPERADOR_PLAYA: 'churuatas-playa',
    OPERADOR_ISLA:  'isla-el-rey'
  };

  function _loadUsers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const users = JSON.parse(raw);
        if (Array.isArray(users) && users.length > 0) return users;
      }
    } catch(e) {}
    _saveUsers(DEFAULT_USERS);
    return JSON.parse(JSON.stringify(DEFAULT_USERS));
  }

  function _saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  function login(username, password) {
    const users = _loadUsers();
    const user = users.find(u =>
      u.username.toLowerCase() === username.toLowerCase().trim() &&
      u.password === password &&
      u.activo !== false
    );
    if (!user) return { success: false, error: 'Usuario o contraseña incorrectos' };
    const session = {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol,
      loginAt: new Date().toISOString()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, user: session };
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function isLoggedIn() {
    return getSession() !== null;
  }

  function canAccess(page) {
    const session = getSession();
    if (!session) return false;
    const permisos = PERMISOS[session.rol] || [];
    return permisos.includes(page);
  }

  function getLandingPage() {
    const session = getSession();
    if (!session) return 'login';
    return LANDING_PAGE[session.rol] || 'dashboard';
  }

  function getRolLabel(rol) {
    return ROLES_LABEL[rol] || rol;
  }

  // User management (ADMIN only)
  function getUsers() { return _loadUsers(); }

  function createUser(data) {
    const users = _loadUsers();
    if (!data.username || !data.password || !data.nombre || !data.rol) {
      return { success: false, error: 'Todos los campos son obligatorios' };
    }
    if (users.find(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      return { success: false, error: 'El usuario ya existe' };
    }
    if (!PERMISOS[data.rol]) {
      return { success: false, error: 'Rol inválido' };
    }
    const newUser = {
      id: Date.now(),
      username: data.username.trim(),
      password: data.password,
      nombre: data.nombre.trim(),
      rol: data.rol,
      activo: true
    };
    users.push(newUser);
    _saveUsers(users);
    return { success: true, user: newUser };
  }

  function updateUser(id, data) {
    const users = _loadUsers();
    const idx = users.findIndex(u => u.id == id);
    if (idx === -1) return { success: false, error: 'Usuario no encontrado' };
    if (data.username && data.username !== users[idx].username) {
      if (users.find(u => u.username.toLowerCase() === data.username.toLowerCase() && u.id != id)) {
        return { success: false, error: 'Ese nombre de usuario ya está en uso' };
      }
      users[idx].username = data.username.trim();
    }
    if (data.nombre)   users[idx].nombre   = data.nombre.trim();
    if (data.rol)      users[idx].rol      = data.rol;
    if (data.password) users[idx].password  = data.password;
    if (data.activo !== undefined) users[idx].activo = data.activo;
    _saveUsers(users);
    return { success: true };
  }

  function deleteUser(id) {
    const session = getSession();
    if (session && session.id == id) return { success: false, error: 'No puedes eliminar tu propia cuenta' };
    const users = _loadUsers().filter(u => u.id != id);
    _saveUsers(users);
    return { success: true };
  }

  return {
    login, logout, getSession, isLoggedIn, canAccess,
    getLandingPage, getRolLabel, PERMISOS,
    getUsers, createUser, updateUser, deleteUser
  };
})();
