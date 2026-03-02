/* ================================================================
   storage.js — Dolphin Beach Storage Manager
   ================================================================ */

const Storage = (() => {
  const KEYS = {
    CHURUATAS: 'db_churuatas_v2',
    ISLA:      'db_isla_v2',
    REGISTRO:  'db_registro_v2',
    SETTINGS:  'db_settings_v2',
    BACKUP:    'db_backup_v2'
  };

  function _save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
      return true;
    } catch(e) { console.error('Storage save error:', e); return false; }
  }

  function _load(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data !== undefined ? parsed.data : parsed;
    } catch(e) { return null; }
  }

  // -- Churuatas Playa --
  function saveChuruatas(churuatas) { return _save(KEYS.CHURUATAS, churuatas); }
  function loadChuruatas()          { return _load(KEYS.CHURUATAS); }

  // -- Isla El Rey --
  function saveIsla(churuatas)      { return _save(KEYS.ISLA, churuatas); }
  function loadIsla()               { return _load(KEYS.ISLA); }

  // -- Registro Alcabala --
  function saveRegistros(registros) { return _save(KEYS.REGISTRO, registros); }
  function loadRegistros()          { return _load(KEYS.REGISTRO) || []; }

  // -- Settings --
  const DEFAULT_SETTINGS = {
    precioAzul: 10,
    precioRoja: 15,
    precioPremium: 40,
    precioSilla: 5,
    precioIsla: 20,
    precioTransporte: 5,
    tasaCambio: 36.5,
    darkMode: false
  };
  function saveSettings(s)  { return _save(KEYS.SETTINGS, s); }
  function loadSettings()   { return Object.assign({}, DEFAULT_SETTINGS, _load(KEYS.SETTINGS) || {}); }

  // -- Full Export/Import --
  function exportAll() {
    return JSON.stringify({
      churuatas: _load(KEYS.CHURUATAS),
      isla:      _load(KEYS.ISLA),
      registros: _load(KEYS.REGISTRO),
      settings:  _load(KEYS.SETTINGS),
      exportedAt: new Date().toISOString(),
      version: '2.0'
    }, null, 2);
  }

  function importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.churuatas) saveChuruatas(data.churuatas);
      if (data.isla)      saveIsla(data.isla);
      if (data.registros) saveRegistros(data.registros);
      if (data.settings)  saveSettings(data.settings);
      return { success: true };
    } catch(e) {
      return { success: false, error: 'Archivo inválido: ' + e.message };
    }
  }

  // -- Backup --
  function backup() {
    const data = exportAll();
    _save(KEYS.BACKUP, data);
    return data;
  }

  return {
    saveChuruatas, loadChuruatas,
    saveIsla,      loadIsla,
    saveRegistros, loadRegistros,
    saveSettings,  loadSettings,
    exportAll, importAll, backup,
    DEFAULT_SETTINGS
  };
})();
