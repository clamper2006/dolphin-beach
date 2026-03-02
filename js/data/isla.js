/* ================================================================
   data/isla.js — Isla El Rey Management
   ================================================================ */

class SistemaIsla {
  constructor(settings) {
    this.settings = settings || Storage.loadSettings();
    this.churuatas = [];
    this._inicializar();
  }

  _inicializar() {
    // Clear array before repopulating to prevent duplication on reset
    this.churuatas = [];
    for (let i = 1; i <= 25; i++) {
      this.churuatas.push({
        id: `IS-${String(i).padStart(2,'0')}`,
        num: i,
        ocupada: false,
        estado: 'DISPONIBLE',
        cliente: { nombre: '', cedula: '', telefono: '' },
        transporte: false,  // si pagó transporte hoy
        fechaAlquiler: null,
        fechaLiberacion: null,
        notas: '',
        historial: [],
        ultimaModificacion: new Date().toISOString()
      });
    }
  }

  exportar() { return this.churuatas.map(c => ({...c})); }

  importar(data) {
    if (!Array.isArray(data)) return false;
    // Preserve structure, only update existing IDs
    data.forEach(saved => {
      const found = this.churuatas.find(c => c.id === saved.id);
      if (found) Object.assign(found, saved);
    });
    return true;
  }

  get(id)  { return this.churuatas.find(c => c.id === id); }
  getNum(n){ return this.churuatas.find(c => c.num === n); }

  estadisticas() {
    const total    = this.churuatas.length;
    const ocupadas = this.churuatas.filter(c => c.ocupada).length;
    const precio   = this.settings.precioIsla        || 20;
    const transp   = this.settings.precioTransporte   || 5;
    let ingresos   = 0;
    let transpTotal= 0;
    this.churuatas.forEach(c => {
      if (c.ocupada)    ingresos    += precio;
      if (c.transporte) transpTotal += transp;
    });
    return { total, ocupadas, disponibles: total - ocupadas, ingresos, transpTotal };
  }

  alquilar(id, clienteData, transporte = false) {
    const c = this.get(id);
    if (!c) return { success: false, error: 'Churuata no encontrada' };
    if (c.ocupada) return { success: false, error: 'Churuata ya está ocupada' };
    if (!clienteData.nombre?.trim()) return { success: false, error: 'El nombre es obligatorio' };

    c.cliente = {
      nombre:   clienteData.nombre.trim(),
      cedula:   clienteData.cedula    || '',
      telefono: clienteData.telefono  || ''
    };
    c.transporte     = !!transporte;
    c.ocupada        = true;
    c.estado         = 'OCUPADA';
    c.fechaAlquiler  = new Date().toISOString();
    c.fechaLiberacion = null;
    c.notas          = clienteData.notas || '';
    c.ultimaModificacion = new Date().toISOString();
    c.historial.push({ accion: 'ALQUILER', fecha: c.fechaAlquiler, cliente: c.cliente.nombre });
    return { success: true, mensaje: `Churuata Isla ${id} ocupada por ${c.cliente.nombre}` };
  }

  liberar(id) {
    const c = this.get(id);
    if (!c) return { success: false, error: 'No encontrada' };
    if (!c.ocupada) return { success: false, error: 'Ya disponible' };
    const nombre = c.cliente.nombre;
    c.historial.push({ accion: 'LIBERACION', fecha: new Date().toISOString(), cliente: nombre });
    Object.assign(c, {
      ocupada: false, estado: 'DISPONIBLE',
      cliente: { nombre:'', cedula:'', telefono:'' },
      transporte: false, notas: '',
      fechaLiberacion: new Date().toISOString(),
      ultimaModificacion: new Date().toISOString()
    });
    return { success: true, mensaje: `Churuata Isla ${id} liberada. Cliente: ${nombre}` };
  }
}
