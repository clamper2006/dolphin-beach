/* ================================================================
   data/churuatas.js — Dolphin Beach Churuatas Model
   ================================================================ */

class SistemaChuruatas {
  constructor(settings) {
    this.settings = settings || Storage.loadSettings();
    this.churuatas = [];
    this.historial = [];
    this._inicializar();
  }

  _inicializar() {
    // Clear arrays before repopulating to prevent duplication on reset
    this.churuatas = [];
    this.historial = [];
    // Islote: 2 rojas + 25 azules
    for (let i = 1; i <= 2;  i++) this.churuatas.push(this._mk(`RO-${_pad(i)}`, 'ROJO',    'Islote'));
    for (let i = 1; i <= 25; i++) this.churuatas.push(this._mk(`AZ-${_pad(i)}`, 'AZUL',    'Islote'));
    // Orilla Playa: 40 azules
    for (let i = 1; i <= 40; i++) this.churuatas.push(this._mk(`OP-${_pad(i)}`, 'AZUL',    'Orilla Playa'));
    // Área Verde: 10 + 1 extra
    for (let i = 1; i <= 10; i++) this.churuatas.push(this._mk(`AV-${_pad(i)}`, 'AZUL',    'Área Verde'));
    this.churuatas.push(this._mk('AV-EXTRA', 'AZUL', 'Área Verde'));
    // Premium
    this.churuatas.push(this._mk('SECOMBNAR', 'PREMIUM', 'Premium'));
    this.churuatas.push(this._mk('COMBNAR1',  'PREMIUM', 'Premium'));
    this.churuatas.push(this._mk('COMBNAR2',  'PREMIUM', 'Premium'));
  }

  _mk(id, tipo, seccion) {
    return {
      id, tipo, seccion,
      ocupada: false,
      estado: 'DISPONIBLE',
      cliente: { nombre: '', apellido: '', telefono: '', email: '' },
      sillasAlquiladas: 0,
      tipoPago: 'SIN_PAGO',
      pagoMovil:  { monto: 0, referencia: '', telefono: '', banco: 'Banco de Venezuela', fecha: '' },
      pagoDivisa: { monto: 0, tipoDivisa: 'USD', tasaCambio: 36.5, montoEquivalente: 0 },
      fechaAlquiler: null,
      fechaLiberacion: null,
      notas: '',
      historial: [],
      creadoEn: new Date().toISOString(),
      ultimaModificacion: new Date().toISOString()
    };
  }

  // -- Serialization --
  exportar() {
    return { churuatas: this.churuatas.map(c => ({...c})), historial: this.historial };
  }

  importar(data) {
    if (!data || !data.churuatas) return false;
    this.churuatas = data.churuatas.map(c => {
      const base = this._mk(c.id, c.tipo, c.seccion);
      return Object.assign(base, c);
    });
    this.historial = data.historial || [];
    return true;
  }

  // -- Queries --
  get(id)                      { return this.churuatas.find(c => c.id === id); }
  porSeccion(s)                { return this.churuatas.filter(c => c.seccion === s); }
  porEstado(ocupada)           { return this.churuatas.filter(c => c.ocupada === ocupada); }

  secciones() {
    return ['Islote', 'Orilla Playa', 'Área Verde', 'Premium'];
  }

  estadisticas() {
    const total    = this.churuatas.length;
    const ocupadas = this.churuatas.filter(c => c.ocupada).length;
    let ingresosEst = 0;
    this.churuatas.forEach(c => {
      if (c.ocupada) ingresosEst += this._precio(c);
    });
    const stats = {};
    this.secciones().forEach(s => {
      const sc = this.porSeccion(s);
      const oc = sc.filter(c => c.ocupada).length;
      stats[s] = { total: sc.length, ocupadas: oc, disponibles: sc.length - oc };
    });
    return { total, ocupadas, disponibles: total - ocupadas, ingresosEst, secciones: stats };
  }

  _precio(c) {
    if (c.tipo === 'PREMIUM') return this.settings.precioPremium || 40;
    if (c.tipo === 'ROJO')    return this.settings.precioRoja    || 15;
    return                           this.settings.precioAzul    || 10;
  }

  // -- Alquiler --
  alquilar(id, clienteData, sillas, pagoInfo) {
    const c = this.get(id);
    if (!c) return err('Churuata no encontrada');
    if (c.ocupada) return err('Churuata ya está ocupada');

    if (!clienteData.nombre?.trim()) return err('El nombre es obligatorio');
    if (!clienteData.apellido?.trim()) return err('El apellido es obligatorio');

    c.cliente = {
      nombre:   clienteData.nombre.trim(),
      apellido: clienteData.apellido.trim(),
      telefono: clienteData.telefono || '',
      email:    clienteData.email    || ''
    };
    c.sillasAlquiladas = parseInt(sillas) || 0;
    c.tipoPago = pagoInfo.tipo || 'SIN_PAGO';

    if (c.tipoPago === 'PAGO_MOVIL' || c.tipoPago === 'MIXTO') {
      c.pagoMovil = {
        monto:      parseFloat(pagoInfo.pagoMovil?.monto)     || 0,
        referencia: pagoInfo.pagoMovil?.referencia             || '',
        telefono:   pagoInfo.pagoMovil?.telefono               || '',
        banco:      pagoInfo.pagoMovil?.banco || 'Banco de Venezuela',
        fecha:      new Date().toISOString()
      };
    }
    if (c.tipoPago === 'DIVISA' || c.tipoPago === 'MIXTO') {
      const tasa  = parseFloat(pagoInfo.pagoDivisa?.tasaCambio) || this.settings.tasaCambio;
      const monto = parseFloat(pagoInfo.pagoDivisa?.monto)      || 0;
      c.pagoDivisa = {
        monto, tipoDivisa: pagoInfo.pagoDivisa?.tipoDivisa || 'USD',
        tasaCambio: tasa, montoEquivalente: monto * tasa
      };
    }

    c.notas         = pagoInfo.notas || '';
    c.ocupada       = true;
    c.estado        = 'OCUPADA';
    c.fechaAlquiler = new Date().toISOString();
    c.fechaLiberacion = null;
    c.ultimaModificacion = new Date().toISOString();
    c.historial.push({ accion: 'ALQUILER', fecha: c.fechaAlquiler, cliente: `${c.cliente.nombre} ${c.cliente.apellido}` });
    this.historial.push({ accion:'ALQUILER', churuataId: id, fecha: c.fechaAlquiler, cliente: `${c.cliente.nombre} ${c.cliente.apellido}` });
    return ok(`Churuata ${id} alquilada a ${c.cliente.nombre} ${c.cliente.apellido}`);
  }

  editar(id, clienteData, sillas, pagoInfo) {
    const c = this.get(id);
    if (!c) return err('Churuata no encontrada');
    if (!c.ocupada) return err('La churuata no está ocupada');

    if (clienteData) {
      if (clienteData.nombre?.trim())   c.cliente.nombre   = clienteData.nombre.trim();
      if (clienteData.apellido?.trim()) c.cliente.apellido = clienteData.apellido.trim();
      if (clienteData.telefono !== undefined) c.cliente.telefono = clienteData.telefono;
      if (clienteData.email    !== undefined) c.cliente.email    = clienteData.email;
    }
    if (sillas !== undefined) c.sillasAlquiladas = parseInt(sillas) || 0;
    if (pagoInfo?.tipo) {
      c.tipoPago = pagoInfo.tipo;
      if (pagoInfo.pagoMovil)  Object.assign(c.pagoMovil,  pagoInfo.pagoMovil);
      if (pagoInfo.pagoDivisa) Object.assign(c.pagoDivisa, pagoInfo.pagoDivisa);
    }
    if (pagoInfo?.notas !== undefined) c.notas = pagoInfo.notas;
    c.ultimaModificacion = new Date().toISOString();
    c.historial.push({ accion: 'EDICION', fecha: c.ultimaModificacion });
    return ok(`Churuata ${id} actualizada`);
  }

  liberar(id) {
    const c = this.get(id);
    if (!c) return err('Churuata no encontrada');
    if (!c.ocupada) return err('La churuata ya está disponible');
    const cliente = `${c.cliente.nombre} ${c.cliente.apellido}`;
    c.historial.push({ accion: 'LIBERACION', fecha: new Date().toISOString(), cliente });
    this.historial.push({ accion: 'LIBERACION', churuataId: id, fecha: new Date().toISOString(), cliente });
    Object.assign(c, {
      ocupada: false, estado: 'DISPONIBLE',
      cliente: { nombre:'', apellido:'', telefono:'', email:'' },
      sillasAlquiladas: 0, tipoPago: 'SIN_PAGO',
      pagoMovil:  { monto:0, referencia:'', telefono:'', banco:'Banco de Venezuela', fecha:'' },
      pagoDivisa: { monto:0, tipoDivisa:'USD', tasaCambio:36.5, montoEquivalente:0 },
      notas: '', fechaLiberacion: new Date().toISOString(),
      ultimaModificacion: new Date().toISOString()
    });
    return ok(`Churuata ${id} liberada. Cliente: ${cliente}`);
  }

  intercambiar(idA, idB) {
    const a = this.get(idA), b = this.get(idB);
    if (!a || !b) return err('Una churuata no existe');
    if (idA === idB) return err('Misma churuata');
    if (!a.ocupada && !b.ocupada) return err('Ambas están disponibles');

    const campos = ['cliente','sillasAlquiladas','tipoPago','pagoMovil','pagoDivisa','fechaAlquiler','notas'];
    if (a.ocupada && b.ocupada) {
      campos.forEach(k => {
        const tmp = JSON.parse(JSON.stringify(a[k]));
        a[k] = JSON.parse(JSON.stringify(b[k]));
        b[k] = tmp;
      });
    } else if (a.ocupada) {
      campos.forEach(k => { b[k] = JSON.parse(JSON.stringify(a[k])); });
      b.ocupada = true; b.estado = 'OCUPADA'; b.fechaAlquiler = a.fechaAlquiler;
      this.liberar(idA);
      return ok(`Cliente movido de ${idA} a ${idB}`);
    } else {
      campos.forEach(k => { a[k] = JSON.parse(JSON.stringify(b[k])); });
      a.ocupada = true; a.estado = 'OCUPADA'; a.fechaAlquiler = b.fechaAlquiler;
      this.liberar(idB);
      return ok(`Cliente movido de ${idB} a ${idA}`);
    }
    [a,b].forEach(c => { c.ultimaModificacion = new Date().toISOString(); });
    return ok(`Intercambio exitoso entre ${idA} y ${idB}`);
  }
}

function _pad(n) { return String(n).padStart(2, '0'); }
function ok(msg) { return { success: true, mensaje: msg }; }
function err(msg){ return { success: false, error: msg }; }
