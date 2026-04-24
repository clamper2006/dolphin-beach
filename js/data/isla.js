/* ================================================================
   data/isla.js — Playa Delfín v2.0.3
   Isla El Rey Management Model
   Zones:
     Main: 25 churuatas (IS-01 … IS-25)
   Total: 25 churuatas
   Transport: $5 per person (number field, not checkbox)
   ================================================================ */

class SistemaIsla {
  constructor() {
    this.settings  = Storage.loadSettings();
    this.churuatas = [];
    this._inicializar();
  }

  _inicializar() {
    this.churuatas = [];

    /* ---- Zone: Main (IS-01 … IS-25) ---- */
    for (let i = 1; i <= 25; i++) {
      this.churuatas.push(this._mk(`IS-${String(i).padStart(2,'0')}`, 'MAIN', i));
    }


  }

  _mk(id, zona, num) {
    return {
      id, zona, num,
      ocupada:         false,
      estado:          'DISPONIBLE',
      cliente: { nombreCompleto: '', cedula: '', telefono: '' },
      personas:        0,
      transporte:      false,
      metodoPago:      'SIN_PAGO',
      divisa:          'USD',
      montoTotal:      0,
      montoMovil:      0,
      montoUSD:        0,
      montoBs:         0,
      referenciaMovil: '',
      telefonoMovil:   '',
      banco:           'Banco de Venezuela',
      fechaAlquiler:   null,
      notas:           '',
      historial:       [],
      ultimaModificacion: new Date().toISOString()
    };
  }

  exportar() { return this.churuatas.map(c => ({...c})); }

  importar(data) {
    if (!Array.isArray(data)) return false;
    data.forEach(saved => {
      const found = this.churuatas.find(c => c.id === saved.id);
      if (found) {
        Object.assign(found, saved);
        if (found.personas === undefined || found.personas === null) {
          found.personas = found.transporte ? 1 : 0;
        }
      }
    });
    return true;
  }

  get(id)    { return this.churuatas.find(c => c.id === id); }
  getNum(n, zona) { return this.churuatas.find(c => c.num === n && c.zona === zona); }
  porZona(z) { return this.churuatas.filter(c => c.zona === z); }

  estadisticas() {
    const settings    = Storage.loadSettings();
    const total       = this.churuatas.length;
    const ocupadas    = this.churuatas.filter(c => c.ocupada).length;
    const precio      = settings.precioIsla       || 20;
    const transpCosto = settings.precioTransporte || 5;
    let ingresos = 0, transpTotal = 0;
    this.churuatas.forEach(c => {
      if (c.ocupada) {
        ingresos   += precio;
        transpTotal += (c.personas || 0) * transpCosto;
      }
    });
    return { total, ocupadas, disponibles: total - ocupadas, ingresos, transpTotal };
  }

  alquilar(id, datos) {
    const c = this.get(id);
    if (!c) return { success: false, error: 'Churuata no encontrada' };
    if (c.ocupada) return { success: false, error: 'Churuata ya está ocupada' };
    if (!datos.nombreCompleto?.trim()) return { success: false, error: 'El nombre completo es obligatorio' };

    const settings    = Storage.loadSettings();
    const precio      = settings.precioIsla       || 20;
    const tasa        = settings.tasaCambio        || 36.5;
    const transpCosto = settings.precioTransporte  || 5;
    const personas    = parseInt(datos.personas)   || 0;
    const transpUSD   = personas * transpCosto;

    let montoTotal = 0, montoMovil = 0, montoUSD = 0, montoBs = 0;

    if (datos.metodoPago === 'DIVISAS') {
      montoTotal = precio + transpUSD;
      montoUSD   = montoTotal;
    } else if (datos.metodoPago === 'PAGO_MOVIL') {
      montoMovil = (10 + transpUSD) * tasa;
      montoBs    = montoMovil;
      montoTotal = montoMovil;
    } else if (datos.metodoPago === 'MIXTO') {
      montoUSD   = parseFloat(datos.montoUSD) || 0;
      montoBs    = parseFloat(datos.montoBs)  || 0;
      montoTotal = montoUSD + (montoBs / tasa);
    }

    c.cliente            = { nombreCompleto: datos.nombreCompleto.trim(), cedula: datos.cedula || '', telefono: datos.telefono || '' };
    c.personas           = personas;
    c.transporte         = personas > 0;
    c.metodoPago         = datos.metodoPago  || 'DIVISAS';
    c.divisa             = datos.divisa       || 'USD';
    c.montoTotal         = montoTotal;
    c.montoMovil         = montoMovil;
    c.montoUSD           = montoUSD;
    c.montoBs            = montoBs;
    c.referenciaMovil    = datos.referenciaMovil || '';
    c.telefonoMovil      = datos.telefonoMovil   || '';
    c.banco              = datos.banco || 'Banco de Venezuela';
    c.ocupada            = true;
    c.estado             = 'OCUPADA';
    c.fechaAlquiler      = new Date().toISOString();
    c.notas              = datos.notas || '';
    c.ultimaModificacion = new Date().toISOString();
    c.historial.push({ accion: 'ALQUILER', fecha: c.fechaAlquiler, cliente: c.cliente.nombreCompleto });

    this._save();
    return { success: true, mensaje: `Churuata ${id} ocupada`, montoTotal };
  }

  /* ---- Edit occupied churuata ---- */
  editar(id, datos) {
    const c = this.get(id);
    if (!c) return { success: false, error: 'No encontrada' };
    if (!c.ocupada) return { success: false, error: 'No está ocupada' };
    if (!datos.nombreCompleto?.trim()) return { success: false, error: 'Nombre requerido' };

    const settings  = Storage.loadSettings();
    const precio    = settings.precioIsla       || 20;
    const tasa      = settings.tasaCambio        || 36.5;
    const transpC   = settings.precioTransporte || 5;
    const personas  = parseInt(datos.personas)  || 0;
    const transpUSD = personas * transpC;
    let montoTotal = 0, montoMovil = 0, montoUSD = 0, montoBs = 0;

    if (datos.metodoPago === 'DIVISAS') {
      montoTotal = precio + transpUSD; montoUSD = montoTotal;
    } else if (datos.metodoPago === 'PAGO_MOVIL') {
      montoMovil = (10 + transpUSD) * tasa; montoBs = montoMovil; montoTotal = montoMovil;
    } else if (datos.metodoPago === 'MIXTO') {
      montoUSD = parseFloat(datos.montoUSD) || 0; montoBs = parseFloat(datos.montoBs) || 0;
      montoTotal = montoUSD + (montoBs / tasa);
    }

    c.cliente           = { nombreCompleto: datos.nombreCompleto.trim(), cedula: datos.cedula || '', telefono: datos.telefono || '' };
    c.personas          = personas;
    c.transporte        = personas > 0;
    c.metodoPago        = datos.metodoPago  || c.metodoPago;
    c.montoTotal        = montoTotal;
    c.montoMovil        = montoMovil;
    c.montoUSD          = montoUSD;
    c.montoBs           = montoBs;
    c.referenciaMovil   = datos.referenciaMovil || '';
    c.telefonoMovil     = datos.telefonoMovil   || '';
    c.banco             = datos.banco           || c.banco;
    c.notas             = datos.notas           || '';
    c.ultimaModificacion = new Date().toISOString();
    c.historial.push({ accion: 'EDICION', fecha: c.ultimaModificacion, cliente: c.cliente.nombreCompleto });

    this._save();
    return { success: true };
  }

  liberar(id) {
    const c = this.get(id);
    if (!c) return { success: false, error: 'No encontrada' };
    if (!c.ocupada) return { success: false, error: 'Ya disponible' };
    const nombre = c.cliente.nombreCompleto;
    c.historial.push({ accion: 'LIBERACION', fecha: new Date().toISOString(), cliente: nombre });
    Object.assign(c, {
      ocupada: false, estado: 'DISPONIBLE',
      cliente: { nombreCompleto:'', cedula:'', telefono:'' },
      personas: 0, transporte: false, notas: '',
      metodoPago: 'SIN_PAGO', montoTotal: 0, montoMovil: 0,
      montoUSD: 0, montoBs: 0, referenciaMovil: '',
      ultimaModificacion: new Date().toISOString()
    });
    this._save();
    return { success: true, mensaje: `Churuata ${id} liberada. Cliente: ${nombre}` };
  }

  _save() { Storage.saveIsla(this.exportar()); }

  reload() {
    const saved = Storage.loadIsla();
    if (saved) this.importar(saved);
  }
}
