/* ================================================================
   storage.js — Playa Delfín v2.0.1
   LocalStorage persistence layer
   ================================================================ */

const Storage = (() => {
  const KEYS = {
    REGISTROS: 'pd_registros',
    CHURUATAS: 'pd_churuatas',
    ISLA:      'pd_isla',
    SETTINGS:  'pd_settings'
  };

  const DEFAULT_SETTINGS = {
    precioVIP:      15,   // VIP (roja) price USD
    precioAzul:     10,   // Azul price USD
    precioSilla:    2,    // Chair price USD (updated from $5 to $2)
    precioIsla:     20,   // Isla price USD
    precioTransporte: 5,  // Transport per person USD
    tasaCambio:     36.5, // Bs per USD
    precioOrilla:   10,   // Orilla de mar price USD
    precioPremium:  40,   // Premium churuata price USD
    monedaLocal:    'Bs'
  };

  function _safeGet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function _safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch(e) { return false; }
  }

  // --- Registros ---
  function loadRegistros() {
    return _safeGet(KEYS.REGISTROS) || [];
  }

  function saveRegistros(registros) {
    return _safeSet(KEYS.REGISTROS, registros);
  }

  // --- Churuatas Playa ---
  function loadChuruatas() {
    return _safeGet(KEYS.CHURUATAS);
  }

  function saveChuruatas(data) {
    return _safeSet(KEYS.CHURUATAS, data);
  }

  // --- Isla El Rey ---
  function loadIsla() {
    return _safeGet(KEYS.ISLA);
  }

  function saveIsla(data) {
    return _safeSet(KEYS.ISLA, data);
  }

  // --- Settings ---
  function loadSettings() {
    const saved = _safeGet(KEYS.SETTINGS);
    return Object.assign({}, DEFAULT_SETTINGS, saved || {});
  }

  function saveSettings(data) {
    return _safeSet(KEYS.SETTINGS, data);
  }

  // --- Export / Import ---
  function exportAll() {
    const data = {
      version:   '2.0.2',
      app:       'Playa Delfín',
      exportedAt: new Date().toISOString(),
      registros:  loadRegistros(),
      churuatas:  loadChuruatas(),
      isla:       loadIsla(),
      settings:   loadSettings()
    };
    return JSON.stringify(data, null, 2);
  }

  function importAll(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !data.app) return { success: false, error: 'Formato de archivo inválido' };
      if (data.registros)  saveRegistros(data.registros);
      if (data.churuatas)  saveChuruatas(data.churuatas);
      if (data.isla)       saveIsla(data.isla);
      if (data.settings)   saveSettings(data.settings);
      return { success: true };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }

  return {
    loadRegistros, saveRegistros,
    loadChuruatas, saveChuruatas,
    loadIsla,      saveIsla,
    loadSettings,  saveSettings,
    exportAll,     importAll,
    DEFAULT_SETTINGS
  };
})();
