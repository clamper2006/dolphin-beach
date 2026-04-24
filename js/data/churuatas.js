/* ================================================================
   data/churuatas.js — Playa Delfín v2.0.3
   Churuatas Playa Model — All zones
   Zones:
     Islote — Frente al mar:  2  VIP  red  — VIP-01..02
     Islote — Zona media:    15  AZUL       — MZ-01..15  (5×3)
     Islote — Zona trasera:  10  AZUL       — BZ-01..10  (5×2)
     Orilla de mar:          42  AZUL+1VIP  — OM-01..42  (OM-01 VIP $15)
     Area Verde:             13  AZUL       — AV-01..13
     Area Arbol:              4  AZUL       — AA-01..04
     Premium:                 3  PREMIUM    — SECOMBNAR, COMEDRA, COMBNAR ($40)
   Total: 89 churuatas
   ================================================================ */

function _pad(n, len = 2) { return String(n).padStart(len, '0'); }

class SistemaChuruatas {
  constructor() {
    this.churuatas = [];
    this.historial = [];
    this._inicializar();
  }

  _inicializar() {
    this.churuatas = [];
    this.historial = [];

    // Islote — Frente al mar: 2 VIP (red)
    for (let i = 1; i <= 2; i++) {
      this.churuatas.push(this._mk(`VIP-${_pad(i)}`, 'VIP', 'Frente al mar', i, 1));
    }

    // Islote — Zona media: 5 rows × 3 cols (15 azul)
    let n = 1;
    for (let row = 1; row <= 5; row++) {
      for (let col = 1; col <= 3; col++) {
        this.churuatas.push(this._mk(`MZ-${_pad(n)}`, 'AZUL', 'Zona media', col, row));
        n++;
      }
    }

    // Islote — Zona trasera: 5 rows × 2 cols (10 azul)
    let b = 1;
    for (let row = 1; row <= 5; row++) {
      for (let col = 1; col <= 2; col++) {
        this.churuatas.push(this._mk(`BZ-${_pad(b)}`, 'AZUL', 'Zona trasera', col, row));
        b++;
      }
    }

    // Orilla de mar — 42 churuatas (OM-01 = VIP $15, OM-02..42 = AZUL)
    let o = 1;
    for (let row = 1; row <= 7; row++) {
      for (let col = 1; col <= 6; col++) {
        const tipo = (o === 1) ? 'VIP' : 'AZUL';
        const c = this._mk(`OM-${_pad(o)}`, tipo, 'Orilla de mar', col, row);
        if (o === 1) c.precioBase = 15;
        this.churuatas.push(c);
        o++;
      }
    }

    // Área Verde — 13 azul
    for (let i = 1; i <= 13; i++) {
      this.churuatas.push(this._mk(`AV-${_pad(i)}`, 'AZUL', 'Area Verde', ((i - 1) % 4) + 1, Math.ceil(i / 4)));
    }

    // Área de Árbol — 4 azul
    for (let i = 1; i <= 4; i++) {
      this.churuatas.push(this._mk(`AA-${_pad(i)}`, 'AZUL', 'Area Arbol', i, 1));
    }

    // Premium — 3 named huts at $40
    const premiumNames = ['SECOMBNAR', 'COMEDRA', 'COMBNAR'];
    premiumNames.forEach((name, i) => {
      const c = this._mk(name, 'PREMIUM', 'Premium', i + 1, 1);
      c.precioBase = 40;
      this.churuatas.push(c);
    });
  }

  _mk(id, tipo, zona, col, fila) {
    return {
      id, tipo, zona, col, fila,
      precioBase:       null,          // null = use settings, number = override
      ocupada:          false,
      estado:           'DISPONIBLE',
      cliente:          { nombreCompleto: '', cedula: '', telefono: '' },
      sillasAlquiladas: 0,
      metodoPago:       'SIN_PAGO',
      divisa:           'USD',
      montoTotal:       0,
      montoMovil:       0,
      montoUSD:         0,
      montoBs:          0,
      referenciaMovil:  '',
      telefonoMovil:    '',
      banco:            'Banco de Venezuela',
      fechaAlquiler:    null,
      notas:            '',
      historial:        [],
      creadoEn:         new Date().toISOString(),
      ultimaModificacion: new Date().toISOString()
    };
  }

  /* ---- Price helper ---- */
  getPrecio(c) {
    if (c.precioBase !== null && c.precioBase !== undefined) return c.precioBase;
    const s = Storage.loadSettings();
    if (c.tipo === 'VIP')     return s.precioVIP  || 15;
    if (c.tipo === 'PREMIUM') return s.precioPremium || 40;
    return s.precioAzul || 10;
  }

  /* ---- Queries ---- */
  get(id)       { return this.churuatas.find(c => c.id === id); }
  porZona(zona) { return this.churuatas.filter(c => c.zona === zona); }
  disponibles() { return this.churuatas.filter(c => !c.ocupada); }
  ocupadas()    { return this.churuatas.filter(c =>  c.ocupada); }

  estadisticas() {
    const ocp  = this.churuatas.filter(c => c.ocupada);
    const ingr = ocp.reduce((acc, c) => acc + (c.montoTotal || 0), 0);
    return {
      total:       this.churuatas.length,
      ocupadas:    ocp.length,
      disponibles: this.churuatas.length - ocp.length,
      ingresos:    ingr.toFixed(2)
    };
  }

  /* ---- Occupancy ---- */
  ocupar(id, datos) {
    const c = this.get(id);
    if (!c) return { success: false, error: 'Churuata no encontrada' };

    const settings = Storage.loadSettings();
    const precio   = this.getPrecio(c);
    const pSilla   = settings.precioSilla || 2;
    const tasa     = settings.tasaCambio  || 36.5;
    const sillas   = parseInt(datos.sillas) || 0;

    let montoTotal = 0, montoMovil = 0, montoUSD = 0, montoBs = 0;

    if (datos.metodoPago === 'DIVISAS') {
      montoTotal = precio + (sillas * pSilla);
      montoUSD   = montoTotal;
    } else if (datos.metodoPago === 'PAGO_MOVIL') {
      const baseUSD  = 10;
      const sillasBs = sillas * pSilla * tasa;
      montoMovil     = (baseUSD * tasa) + sillasBs;
      montoBs        = montoMovil;
      montoTotal     = montoMovil;
    } else if (datos.metodoPago === 'MIXTO') {
      montoUSD   = parseFloat(datos.montoUSD) || 0;
      montoBs    = parseFloat(datos.montoBs)  || 0;
      montoTotal = montoUSD + (montoBs / tasa);
    }

    c.ocupada           = true;
    c.estado            = 'OCUPADA';
    c.cliente           = { nombreCompleto: datos.nombreCompleto || '', cedula: datos.cedula || '', telefono: datos.telefono || '' };
    c.sillasAlquiladas  = sillas;
    c.metodoPago        = datos.metodoPago || 'DIVISAS';
    c.divisa            = datos.divisa      || 'USD';
    c.montoTotal        = montoTotal;
    c.montoMovil        = montoMovil;
    c.montoUSD          = montoUSD;
    c.montoBs           = montoBs;
    c.referenciaMovil   = datos.referenciaMovil || '';
    c.telefonoMovil     = datos.telefonoMovil   || '';
    c.banco             = datos.banco           || 'Banco de Venezuela';
    c.notas             = datos.notas           || '';
    c.fechaAlquiler     = new Date().toISOString();
    c.ultimaModificacion = new Date().toISOString();
    c.historial.push({ tipo: 'ENTRADA', fecha: c.fechaAlquiler, operator: datos.operador || 'Sistema' });

    this._save();
    return { success: true, churuata: c, montoTotal, montoMovil };
  }

  /* ---- Edit occupied churuata ---- */
  editar(id, datos) {
    const c = this.get(id);
    if (!c) return { success: false, error: 'Churuata no encontrada' };
    if (!c.ocupada) return { success: false, error: 'La churuata no está ocupada' };
    if (!datos.nombreCompleto?.trim()) return { success: false, error: 'Nombre requerido' };

    const settings = Storage.loadSettings();
    const precio   = this.getPrecio(c);
    const pSilla   = settings.precioSilla || 2;
    const tasa     = settings.tasaCambio  || 36.5;
    const sillas   = parseInt(datos.sillas) || 0;

    let montoTotal = 0, montoMovil = 0, montoUSD = 0, montoBs = 0;
    if (datos.metodoPago === 'DIVISAS') {
      montoTotal = precio + (sillas * pSilla); montoUSD = montoTotal;
    } else if (datos.metodoPago === 'PAGO_MOVIL') {
      montoMovil = (10 * tasa) + (sillas * pSilla * tasa); montoBs = montoMovil; montoTotal = montoMovil;
    } else if (datos.metodoPago === 'MIXTO') {
      montoUSD = parseFloat(datos.montoUSD) || 0; montoBs = parseFloat(datos.montoBs) || 0;
      montoTotal = montoUSD + (montoBs / tasa);
    }

    c.cliente           = { nombreCompleto: datos.nombreCompleto.trim(), cedula: datos.cedula || '', telefono: datos.telefono || '' };
    c.sillasAlquiladas  = sillas;
    c.metodoPago        = datos.metodoPago || c.metodoPago;
    c.montoTotal        = montoTotal;
    c.montoMovil        = montoMovil;
    c.montoUSD          = montoUSD;
    c.montoBs           = montoBs;
    c.referenciaMovil   = datos.referenciaMovil || '';
    c.telefonoMovil     = datos.telefonoMovil   || '';
    c.banco             = datos.banco           || c.banco;
    c.notas             = datos.notas           || '';
    c.ultimaModificacion = new Date().toISOString();
    c.historial.push({ tipo: 'EDICION', fecha: c.ultimaModificacion, operator: datos.operador || 'Sistema' });

    this._save();
    return { success: true };
  }

  liberar(id, nota = '') {
    const c = this.get(id);
    if (!c) return { success: false, error: 'No encontrada' };
    if (!c.ocupada) return { success: false, error: 'Ya está disponible' };
    c.historial.push({ tipo: 'SALIDA', fecha: new Date().toISOString(), cliente: c.cliente.nombreCompleto, notas: nota });
    c.ocupada = false; c.estado = 'DISPONIBLE';
    c.cliente = { nombreCompleto: '', cedula: '', telefono: '' };
    c.sillasAlquiladas = 0; c.metodoPago = 'SIN_PAGO'; c.divisa = 'USD';
    c.montoTotal = 0; c.montoMovil = 0; c.montoUSD = 0; c.montoBs = 0;
    c.referenciaMovil = ''; c.telefonoMovil = ''; c.notas = ''; c.fechaAlquiler = null;
    c.ultimaModificacion = new Date().toISOString();
    this._save();
    return { success: true };
  }

  /* ---- Persistence ---- */
  exportar() { return { churuatas: this.churuatas.map(c => ({...c})), historial: this.historial }; }

  importar(data) {
    if (!data || !data.churuatas) return false;
    data.churuatas.forEach(saved => {
      const found = this.churuatas.find(c => c.id === saved.id);
      if (found) {
        Object.assign(found, saved);
      } else {
        // Legacy churuata from old saves — restore it
        const c = this._mk(saved.id, saved.tipo || 'AZUL', saved.zona || 'Zona media', saved.col || 1, saved.fila || 1);
        this.churuatas.push(Object.assign(c, saved));
      }
    });
    this.historial = data.historial || [];
    return true;
  }

  _save() { Storage.saveChuruatas(this.exportar()); }

  reload() {
    const saved = Storage.loadChuruatas();
    if (saved) this.importar(saved);
  }
}
