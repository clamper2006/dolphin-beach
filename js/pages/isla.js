/* ================================================================
   pages/isla.js — Isla El Rey Page Controller
   ================================================================ */

const IslaPage = (() => {
  let _sistema = null;
  let _selId   = null;
  let _liberarId = null;

  function init(sistema) {
    _sistema = sistema;
    _renderGrid();
    _setupEventos();
    _setupAcciones();
    _renderStats();
  }

  function refresh() {
    _renderGrid();
    _renderStats();
    if (_selId) _mostrarDetalle(_selId);
  }

  function _renderStats() {
    const s = _sistema.estadisticas();
    document.getElementById('isla-total')?.setAttribute && (document.getElementById('isla-total').textContent       = s.total);
    const t = document.getElementById('isla-total');
    const o = document.getElementById('isla-ocupadas');
    const d = document.getElementById('isla-disponibles');
    const i = document.getElementById('isla-ingresos');
    if (t) t.textContent = s.total;
    if (o) o.textContent = s.ocupadas;
    if (d) d.textContent = s.disponibles;
    if (i) i.textContent = `$${s.ingresos}`;
  }

  function _renderGrid() {
    const container = document.getElementById('mapa-isla');
    if (!container) return;
    const grid = document.createElement('div');
    grid.className = 'isla-grid';
    grid.innerHTML = _sistema.churuatas.map(c => {
      const cls = c.ocupada ? 'ocupada' : 'disponible';
      const sel = c.id === _selId ? 'selected' : '';
      const icon = c.ocupada ? 'fa-user' : 'fa-umbrella-beach';
      return `
        <div class="isla-item ${cls} ${sel}" data-id="${c.id}" title="${c.id}${c.ocupada ? ' — ' + c.cliente.nombre : ''}">
          <i class="fas ${icon} isla-icon"></i>
          <span class="isla-num">${c.num}</span>
        </div>
      `;
    }).join('');
    container.innerHTML = '';
    container.appendChild(grid);
    grid.querySelectorAll('.isla-item').forEach(el => {
      el.addEventListener('click', () => _seleccionar(el.dataset.id));
    });
  }

  function _seleccionar(id) {
    _selId = id;
    _renderGrid();
    _mostrarDetalle(id);
    const panel = document.getElementById('panel-isla-detalle');
    if (panel) { panel.style.display = 'block'; panel.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
  }

  function _mostrarDetalle(id) {
    const c = _sistema.get(id);
    if (!c) return;
    const panel   = document.getElementById('panel-isla-detalle');
    const titulo  = document.getElementById('isla-detalle-titulo');
    const content = document.getElementById('isla-detalle-content');
    const footer  = document.getElementById('isla-detalle-footer');
    if (!panel) return;
    panel.style.display = 'block';
    titulo.innerHTML = `<i class="fas fa-island-tropical"></i> Churuata Isla ${c.num} (${c.id})`;

    const settings = Storage.loadSettings();
    const precio   = settings.precioIsla       || 20;
    const transp   = settings.precioTransporte  || 5;

    const estadoBadge = c.ocupada
      ? `<span class="badge badge-danger"><i class="fas fa-circle"></i> Ocupada</span>`
      : `<span class="badge badge-success"><i class="fas fa-circle"></i> Disponible</span>`;

    let body = `
      <div class="detalle-grid">
        <div class="detalle-item">
          <span class="detalle-label">Estado</span>
          <span class="detalle-value">${estadoBadge}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Precio</span>
          <span class="detalle-value fw-600">$${precio} USD</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Transporte</span>
          <span class="detalle-value">$${transp} USD / persona</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Transporte pagado</span>
          <span class="detalle-value">${c.transporte ? '<span class="badge badge-success">Sí</span>' : '<span class="badge">No</span>'}</span>
        </div>
      </div>
    `;

    if (c.ocupada) {
      body += `
        <hr style="margin: 1rem 0; border:none; border-top: 1px solid var(--border)">
        <div class="detalle-grid">
          <div class="detalle-item">
            <span class="detalle-label">Cliente</span>
            <span class="detalle-value fw-600">${c.cliente.nombre}</span>
          </div>
          <div class="detalle-item">
            <span class="detalle-label">Cédula</span>
            <span class="detalle-value">${c.cliente.cedula || '—'}</span>
          </div>
          <div class="detalle-item">
            <span class="detalle-label">Teléfono</span>
            <span class="detalle-value">${c.cliente.telefono || '—'}</span>
          </div>
          <div class="detalle-item">
            <span class="detalle-label">Hora entrada</span>
            <span class="detalle-value">${c.fechaAlquiler ? new Date(c.fechaAlquiler).toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}) : '—'}</span>
          </div>
          ${c.notas ? `<div class="detalle-item" style="grid-column:1/-1">
            <span class="detalle-label">Notas</span>
            <span class="detalle-value">${c.notas}</span>
          </div>` : ''}
        </div>
      `;
    }

    content.innerHTML = body;

    // Footer buttons by role
    const session = Auth.getSession();
    const canEdit = session?.rol === 'ADMIN' || session?.rol === 'OPERADOR_ISLA';

    if (!canEdit) {
      footer.innerHTML = `<span class="text-muted" style="font-size:.8rem"><i class="fas fa-eye"></i> Solo lectura</span>`;
      return;
    }

    if (c.ocupada) {
      footer.innerHTML = `
        <button class="btn btn-danger btn-sm" id="btn-isla-liberar"><i class="fas fa-door-open"></i> Liberar</button>
      `;
      document.getElementById('btn-isla-liberar')?.addEventListener('click', () => _abrirLiberar(c.id));
    } else {
      footer.innerHTML = `
        <button class="btn btn-primary btn-sm" id="btn-isla-alquilar"><i class="fas fa-plus-circle"></i> Registrar Ocupación</button>
      `;
      document.getElementById('btn-isla-alquilar')?.addEventListener('click', () => _abrirAlquilar(c.id));
    }
  }

  function _abrirAlquilar(id) {
    const settings = Storage.loadSettings();
    const precio   = settings.precioIsla       || 20;
    const transp   = settings.precioTransporte  || 5;
    const modal    = document.getElementById('modal-alquilar');
    document.getElementById('modal-alquilar-titulo').innerHTML = `<i class="fas fa-island-tropical"></i> Isla ${id} — $${precio} USD`;
    document.getElementById('form-alquilar-body').innerHTML = `
      <div class="info-banner" style="margin-bottom:1rem">
        <i class="fas fa-info-circle"></i>
        <div>Churuata: <strong>$${precio} USD</strong> &nbsp;|&nbsp; Transporte: <strong>$${transp} USD</strong> (viajes ilimitados)</div>
      </div>
      <div class="form-group">
        <label>Nombre del cliente *</label>
        <input type="text" id="is-nombre" placeholder="Nombre completo">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Cédula / Documento</label>
          <input type="text" id="is-cedula" placeholder="N° de documento">
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="tel" id="is-telefono" placeholder="Opcional">
        </div>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer">
          <input type="checkbox" id="is-transporte" style="width:auto"> 
          Incluir transporte ($${transp} USD — viajes ilimitados del día)
        </label>
      </div>
      <div class="form-group">
        <label>Notas</label>
        <input type="text" id="is-notas" placeholder="Observaciones opcionales">
      </div>
      <div class="modal-foot" style="padding: 1rem 0 0; border-top: 1px solid var(--border); margin-top: 1rem;">
        <button class="btn btn-outline" onclick="app.closeModal('modal-alquilar')">Cancelar</button>
        <button class="btn btn-primary" id="btn-is-confirmar"><i class="fas fa-check"></i> Confirmar</button>
      </div>
    `;

    document.getElementById('btn-is-confirmar')?.addEventListener('click', () => {
      const cliente = {
        nombre:   document.getElementById('is-nombre')?.value,
        cedula:   document.getElementById('is-cedula')?.value,
        telefono: document.getElementById('is-telefono')?.value,
        notas:    document.getElementById('is-notas')?.value
      };
      const transporte = document.getElementById('is-transporte')?.checked;
      const res = _sistema.alquilar(id, cliente, transporte);
      if (res.success) {
        Storage.saveIsla(_sistema.exportar());
        app.closeModal('modal-alquilar');
        Toast.success(res.mensaje);
        refresh();
        app.updateHeaderStats();
      } else {
        Toast.error(res.error);
      }
    });

    app.openModal('modal-alquilar');
    document.getElementById('is-nombre')?.focus();
  }

  function _abrirLiberar(id) {
    const c = _sistema.get(id);
    if (!c) return;
    _liberarId = id;
    document.getElementById('modal-liberar-body').innerHTML = `
      <p>¿Liberar churuata Isla <strong>${id}</strong>?</p>
      <p class="mt-2 text-muted">Cliente: <strong>${c.cliente.nombre}</strong></p>
    `;
    app.openModal('modal-liberar');
  }

  function _setupEventos() {
    document.getElementById('btn-cerrar-isla-detalle')?.addEventListener('click', () => {
      document.getElementById('panel-isla-detalle').style.display = 'none';
      _selId = null;
      _renderGrid();
    });

    // Reusar modal-liberar
    const btnLiberar = document.getElementById('btn-confirmar-liberar');
    if (btnLiberar && !btnLiberar._islaListenerAdded) {
      const originalClick = btnLiberar.onclick;
      btnLiberar._islaListenerAdded = true;
      // El listener de playa.js maneja esto, pero necesitamos detectar de qué sistema viene
    }
  }

  function confirmarLiberar() {
    if (!_liberarId) return false;
    const res = _sistema.liberar(_liberarId);
    if (res.success) {
      Storage.saveIsla(_sistema.exportar());
      Toast.success(res.mensaje);
      document.getElementById('panel-isla-detalle').style.display = 'none';
      _selId = null;
      _liberarId = null;
      refresh();
      app.updateHeaderStats();
      return true;
    } else {
      Toast.error(res.error);
      return false;
    }
  }

  function _setupAcciones() {
    const container = document.getElementById('isla-header-actions');
    if (!container) return;
    const session = Auth.getSession();
    if (session?.rol !== 'ADMIN' && session?.rol !== 'OPERADOR_ISLA') {
      container.innerHTML = `<span class="badge badge-primary"><i class="fas fa-eye"></i> Solo lectura</span>`;
      return;
    }
    container.innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-guardar-isla"><i class="fas fa-save"></i> Guardar</button>
    `;
    document.getElementById('btn-guardar-isla')?.addEventListener('click', () => {
      Storage.saveIsla(_sistema.exportar());
      Toast.success('Datos de Isla El Rey guardados');
    });
  }

  return { init, refresh, confirmarLiberar };
})();
