/* ================================================================
   pages/playa.js — Churuatas Playa Page
   ================================================================ */

const PlayaPage = (() => {
  let _sistema = null;
  let _selId   = null;
  let _liberarId = null;
  let _intercambioId = null;

  function init(sistema) {
    _sistema = sistema;
    _renderMapa();
    _setupEventos();
    _setupAcciones();
  }

  function refresh() {
    if (!_sistema) return;
    _renderMapa();
    if (_selId) _mostrarDetalle(_selId);
  }

  // ---------- MAPA ----------
  function _renderMapa() {
    const container = document.getElementById('mapa-churuatas');
    if (!container) return;

    const secciones = [
      { key: 'Islote',       label: 'Islote',       icono: 'fas fa-water',           total: 27 },
      { key: 'Orilla Playa', label: 'Orilla Playa', icono: 'fas fa-umbrella-beach',  total: 40 },
      { key: 'Área Verde',   label: 'Área Verde',   icono: 'fas fa-leaf',            total: 11 },
      { key: 'Premium',      label: 'Premium',       icono: 'fas fa-crown',           total: 3  }
    ];

    const stats = _sistema.estadisticas();
    container.innerHTML = secciones.map(s => {
      const churuatas = _sistema.porSeccion(s.key);
      const ocup = churuatas.filter(c => c.ocupada).length;
      return `
        <div class="mapa-seccion">
          <div class="mapa-seccion-header">
            <h4><i class="${s.icono}"></i> ${s.label}</h4>
            <div class="seccion-stats">
              <span><strong>${ocup}</strong> ocupadas</span>
              <span><strong>${churuatas.length - ocup}</strong> libres</span>
            </div>
          </div>
          <div class="mapa-seccion-grid">
            ${churuatas.map(c => _renderChuruataItem(c)).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Re-bind click events
    container.querySelectorAll('.churuata-item').forEach(el => {
      el.addEventListener('click', () => _seleccionarChuruata(el.dataset.id));
    });
  }

  function _renderChuruataItem(c) {
    let cls, icon;
    if (!c.ocupada) {
      cls  = 'disponible';
      icon = 'fa-check';
    } else if (c.tipo === 'ROJO') {
      cls  = 'ocupada-roja';
      icon = 'fa-crown';
    } else if (c.tipo === 'PREMIUM') {
      cls  = 'ocupada-premium';
      icon = 'fa-star';
    } else {
      cls  = 'ocupada-azul';
      icon = 'fa-user';
    }
    const sel = c.id === _selId ? 'selected' : '';
    return `
      <div class="churuata-item ${cls} ${sel}" data-id="${c.id}" title="${c.id}${c.ocupada ? ' — ' + c.cliente.nombre + ' ' + c.cliente.apellido : ''}">
        <i class="fas ${icon} churuata-icon"></i>
        <span class="churuata-id">${c.id}</span>
      </div>
    `;
  }

  // ---------- SELECCIÓN ----------
  function _seleccionarChuruata(id) {
    _selId = id;
    // re-render para actualizar clase selected
    _renderMapa();
    _mostrarDetalle(id);
    // scroll al panel
    const panel = document.getElementById('panel-detalle');
    if (panel) { panel.style.display = 'block'; panel.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
  }

  function _mostrarDetalle(id) {
    const c = _sistema.get(id);
    if (!c) return;
    const panel   = document.getElementById('panel-detalle');
    const titulo  = document.getElementById('detalle-titulo');
    const content = document.getElementById('detalle-content');
    const footer  = document.getElementById('detalle-footer');
    if (!panel) return;

    panel.style.display = 'block';
    titulo.innerHTML = `<i class="fas fa-umbrella-beach"></i> ${c.id} — ${c.seccion}`;

    const estadoBadge = c.ocupada
      ? `<span class="badge badge-danger"><i class="fas fa-circle"></i> Ocupada</span>`
      : `<span class="badge badge-success"><i class="fas fa-circle"></i> Disponible</span>`;

    const tipoBadge = {
      AZUL:    '<span class="badge badge-primary">Azul $10</span>',
      ROJO:    '<span class="badge badge-warning">Roja $15</span>',
      PREMIUM: '<span class="badge" style="background:#fff3cd;color:#856404;">Premium $40</span>'
    }[c.tipo] || '';

    let body = `
      <div class="detalle-grid">
        <div class="detalle-item">
          <span class="detalle-label">Estado</span>
          <span class="detalle-value">${estadoBadge}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Tipo</span>
          <span class="detalle-value">${tipoBadge}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Sección</span>
          <span class="detalle-value">${c.seccion}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Sillas</span>
          <span class="detalle-value">${c.sillasAlquiladas || 0}</span>
        </div>
      </div>
    `;

    if (c.ocupada) {
      body += `
        <hr style="margin: 1rem 0; border:none; border-top: 1px solid var(--border)">
        <div class="detalle-grid">
          <div class="detalle-item">
            <span class="detalle-label">Nombre</span>
            <span class="detalle-value fw-600">${c.cliente.nombre} ${c.cliente.apellido}</span>
          </div>
          <div class="detalle-item">
            <span class="detalle-label">Teléfono</span>
            <span class="detalle-value">${c.cliente.telefono || '—'}</span>
          </div>
          <div class="detalle-item">
            <span class="detalle-label">Tipo Pago</span>
            <span class="detalle-value">${_labelPago(c.tipoPago)}</span>
          </div>
          <div class="detalle-item">
            <span class="detalle-label">Hora Entrada</span>
            <span class="detalle-value">${c.fechaAlquiler ? _hora(c.fechaAlquiler) : '—'}</span>
          </div>
          ${c.notas ? `<div class="detalle-item" style="grid-column:1/-1">
            <span class="detalle-label">Notas</span>
            <span class="detalle-value">${c.notas}</span>
          </div>` : ''}
        </div>
      `;
    }

    content.innerHTML = body;

    // Footer buttons based on role
    const session = Auth.getSession();
    const isAdmin = session?.rol === 'ADMIN';
    const isViewOnly = session?.rol === 'OPERADOR_PLAYA';

    if (isViewOnly) {
      footer.innerHTML = `<span class="text-muted" style="font-size:.8rem"><i class="fas fa-eye"></i> Solo lectura</span>`;
    } else if (c.ocupada) {
      footer.innerHTML = `
        <button class="btn btn-danger btn-sm" id="btn-det-liberar"><i class="fas fa-door-open"></i> Liberar</button>
        <button class="btn btn-outline btn-sm" id="btn-det-editar"><i class="fas fa-edit"></i> Editar</button>
        <button class="btn btn-secondary btn-sm" id="btn-det-intercambio"><i class="fas fa-exchange-alt"></i> Mover</button>
      `;
      document.getElementById('btn-det-liberar')?.addEventListener('click', () => _abrirLiberar(c.id));
      document.getElementById('btn-det-editar')?.addEventListener('click',  () => _abrirEditar(c.id));
      document.getElementById('btn-det-intercambio')?.addEventListener('click', () => _abrirIntercambio(c.id));
    } else {
      footer.innerHTML = `
        <button class="btn btn-primary btn-sm" id="btn-det-alquilar"><i class="fas fa-plus-circle"></i> Alquilar</button>
      `;
      document.getElementById('btn-det-alquilar')?.addEventListener('click', () => _abrirAlquilar(c.id));
    }
  }

  function _labelPago(tipo) {
    return { SIN_PAGO:'Sin pago registrado', PAGO_MOVIL:'Pago Móvil', DIVISA:'Divisa (USD/EUR)', MIXTO:'Mixto' }[tipo] || tipo;
  }
  function _hora(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit' });
  }

  // ---------- ACCIONES HEADER ----------
  function _setupAcciones() {
    const container = document.getElementById('playa-header-actions');
    if (!container) return;
    const session = Auth.getSession();
    if (session?.rol === 'OPERADOR_PLAYA') {
      container.innerHTML = `<span class="badge badge-primary"><i class="fas fa-eye"></i> Solo lectura</span>`;
      return;
    }
    container.innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-guardar-playa"><i class="fas fa-save"></i> Guardar</button>
    `;
    document.getElementById('btn-guardar-playa')?.addEventListener('click', () => {
      Storage.saveChuruatas(_sistema.exportar());
      Toast.success('Datos guardados correctamente');
    });
  }

  // ---------- MODAL ALQUILAR ----------
  function _abrirAlquilar(id) {
    const c = _sistema.get(id);
    if (!c) return;
    const precio = { AZUL:10, ROJO:15, PREMIUM:40 }[c.tipo] || 10;
    const modal = document.getElementById('modal-alquilar');
    document.getElementById('modal-alquilar-titulo').innerHTML = `<i class="fas fa-plus-circle"></i> Alquilar ${id} — $${precio}`;
    document.getElementById('form-alquilar-body').innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label>Nombre *</label>
          <input type="text" id="aq-nombre" placeholder="Nombre">
        </div>
        <div class="form-group">
          <label>Apellido *</label>
          <input type="text" id="aq-apellido" placeholder="Apellido">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Teléfono</label>
          <input type="tel" id="aq-telefono" placeholder="Opcional">
        </div>
        <div class="form-group">
          <label>Sillas (+ $5 c/u)</label>
          <input type="number" id="aq-sillas" min="0" max="20" value="0">
        </div>
      </div>
      <div class="pago-section">
        <div class="form-group">
          <label>Tipo de Pago</label>
          <select id="aq-tipo-pago">
            <option value="SIN_PAGO">Sin pago registrado</option>
            <option value="PAGO_MOVIL">Pago Móvil</option>
            <option value="DIVISA">Divisa (USD/EUR)</option>
            <option value="MIXTO">Mixto</option>
          </select>
        </div>
        <div class="pago-fields" id="pago-movil-fields">
          <div class="form-row">
            <div class="form-group">
              <label>Monto Bs</label>
              <input type="number" id="aq-pm-monto" min="0" step="0.01" value="0">
            </div>
            <div class="form-group">
              <label>Ref. (4 dígitos)</label>
              <input type="text" id="aq-pm-ref" maxlength="4" placeholder="1234">
            </div>
          </div>
          <div class="form-group">
            <label>Banco</label>
            <select id="aq-pm-banco">
              <option>Banco de Venezuela</option>
              <option>Banesco</option>
              <option>Mercantil</option>
              <option>BBVA Provincial</option>
              <option>Bancaribe</option>
              <option>Otro</option>
            </select>
          </div>
        </div>
        <div class="pago-fields" id="pago-divisa-fields">
          <div class="form-row">
            <div class="form-group">
              <label>Monto USD/EUR</label>
              <input type="number" id="aq-div-monto" min="0" step="0.01" value="0">
            </div>
            <div class="form-group">
              <label>Divisa</label>
              <select id="aq-div-tipo">
                <option>USD</option>
                <option>EUR</option>
                <option>COP</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Tasa de Cambio</label>
            <input type="number" id="aq-div-tasa" min="0" step="0.1" value="${_sistema.settings.tasaCambio || 36.5}">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>Notas</label>
        <input type="text" id="aq-notas" placeholder="Observaciones opcionales">
      </div>
      <div class="modal-foot" style="padding: 1rem 0 0; border-top: 1px solid var(--border); margin-top: 1rem;">
        <button class="btn btn-outline" onclick="app.closeModal('modal-alquilar')">Cancelar</button>
        <button class="btn btn-primary" id="btn-confirmar-alquilar"><i class="fas fa-check"></i> Confirmar Alquiler</button>
      </div>
    `;

    // Show/hide pago fields
    const tipoPago = document.getElementById('aq-tipo-pago');
    tipoPago?.addEventListener('change', () => {
      const v = tipoPago.value;
      document.getElementById('pago-movil-fields').classList.toggle('visible', v === 'PAGO_MOVIL' || v === 'MIXTO');
      document.getElementById('pago-divisa-fields').classList.toggle('visible', v === 'DIVISA' || v === 'MIXTO');
    });

    document.getElementById('btn-confirmar-alquilar')?.addEventListener('click', () => {
      const cliente  = {
        nombre:   document.getElementById('aq-nombre')?.value,
        apellido: document.getElementById('aq-apellido')?.value,
        telefono: document.getElementById('aq-telefono')?.value
      };
      const sillas   = document.getElementById('aq-sillas')?.value;
      const tipo     = document.getElementById('aq-tipo-pago')?.value;
      const pagoInfo = {
        tipo,
        notas: document.getElementById('aq-notas')?.value,
        pagoMovil: {
          monto:     document.getElementById('aq-pm-monto')?.value,
          referencia:document.getElementById('aq-pm-ref')?.value,
          banco:     document.getElementById('aq-pm-banco')?.value
        },
        pagoDivisa: {
          monto:     document.getElementById('aq-div-monto')?.value,
          tipoDivisa:document.getElementById('aq-div-tipo')?.value,
          tasaCambio:document.getElementById('aq-div-tasa')?.value
        }
      };
      const res = _sistema.alquilar(id, cliente, sillas, pagoInfo);
      if (res.success) {
        Storage.saveChuruatas(_sistema.exportar());
        app.closeModal('modal-alquilar');
        Toast.success(res.mensaje);
        refresh();
        app.updateHeaderStats();
      } else {
        Toast.error(res.error);
      }
    });

    app.openModal('modal-alquilar');
    document.getElementById('aq-nombre')?.focus();
  }

  // ---------- MODAL EDITAR ----------
  function _abrirEditar(id) {
    const c = _sistema.get(id);
    if (!c || !c.ocupada) return;
    const modal = document.getElementById('modal-alquilar');
    document.getElementById('modal-alquilar-titulo').innerHTML = `<i class="fas fa-edit"></i> Editar ${id}`;
    document.getElementById('form-alquilar-body').innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label>Nombre *</label>
          <input type="text" id="aq-nombre" value="${c.cliente.nombre}">
        </div>
        <div class="form-group">
          <label>Apellido *</label>
          <input type="text" id="aq-apellido" value="${c.cliente.apellido}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Teléfono</label>
          <input type="tel" id="aq-telefono" value="${c.cliente.telefono || ''}">
        </div>
        <div class="form-group">
          <label>Sillas</label>
          <input type="number" id="aq-sillas" min="0" max="20" value="${c.sillasAlquiladas}">
        </div>
      </div>
      <div class="form-group">
        <label>Notas</label>
        <input type="text" id="aq-notas" value="${c.notas || ''}">
      </div>
      <div class="modal-foot" style="padding: 1rem 0 0; border-top: 1px solid var(--border); margin-top: 1rem;">
        <button class="btn btn-outline" onclick="app.closeModal('modal-alquilar')">Cancelar</button>
        <button class="btn btn-primary" id="btn-confirmar-alquilar"><i class="fas fa-save"></i> Guardar Cambios</button>
      </div>
    `;
    document.getElementById('btn-confirmar-alquilar')?.addEventListener('click', () => {
      const cliente = {
        nombre:   document.getElementById('aq-nombre')?.value,
        apellido: document.getElementById('aq-apellido')?.value,
        telefono: document.getElementById('aq-telefono')?.value
      };
      const sillas   = document.getElementById('aq-sillas')?.value;
      const pagoInfo = { notas: document.getElementById('aq-notas')?.value };
      const res = _sistema.editar(id, cliente, sillas, pagoInfo);
      if (res.success) {
        Storage.saveChuruatas(_sistema.exportar());
        app.closeModal('modal-alquilar');
        Toast.success(res.mensaje);
        refresh();
      } else {
        Toast.error(res.error);
      }
    });
    app.openModal('modal-alquilar');
  }

  // ---------- MODAL LIBERAR ----------
  function _abrirLiberar(id) {
    const c = _sistema.get(id);
    if (!c) return;
    _liberarId = id;
    document.getElementById('modal-liberar-body').innerHTML = `
      <p>¿Confirmas liberar la churuata <strong>${id}</strong>?</p>
      <p class="mt-2 text-muted">Cliente: <strong>${c.cliente.nombre} ${c.cliente.apellido}</strong></p>
    `;
    app.openModal('modal-liberar');
  }

  // ---------- MODAL INTERCAMBIO ----------
  function _abrirIntercambio(id) {
    _intercambioId = id;
    const c = _sistema.get(id);
    const opciones = _sistema.churuatas
      .filter(ch => ch.id !== id)
      .map(ch => `<option value="${ch.id}">${ch.id} — ${ch.seccion} — ${ch.ocupada ? ch.cliente.nombre + ' ' + ch.cliente.apellido : 'Disponible'}</option>`)
      .join('');
    document.getElementById('modal-intercambio-body').innerHTML = `
      <p class="mb-3">Mover/intercambiar <strong>${id}</strong> ${c.ocupada ? `(${c.cliente.nombre} ${c.cliente.apellido})` : ''} con:</p>
      <div class="form-group">
        <label>Churuata destino</label>
        <select id="intercambio-destino">${opciones}</select>
      </div>
    `;
    app.openModal('modal-intercambio');
  }

  // ---------- SETUP EVENTOS GLOBALES ----------
  function _setupEventos() {
    // Cerrar panel
    document.getElementById('btn-cerrar-detalle')?.addEventListener('click', () => {
      document.getElementById('panel-detalle').style.display = 'none';
      _selId = null;
      _renderMapa();
    });

    // btn-confirmar-liberar is handled by app.js which calls confirmarLiberar()

    // Confirmar intercambio
    document.getElementById('btn-confirmar-intercambio')?.addEventListener('click', () => {
      const destino = document.getElementById('intercambio-destino')?.value;
      if (!_intercambioId || !destino) return;
      const res = _sistema.intercambiar(_intercambioId, destino);
      if (res.success) {
        Storage.saveChuruatas(_sistema.exportar());
        app.closeModal('modal-intercambio');
        Toast.success(res.mensaje);
        document.getElementById('panel-detalle').style.display = 'none';
        _selId = null;
        refresh();
        app.updateHeaderStats();
      } else {
        Toast.error(res.error);
      }
    });
  }

  function confirmarLiberar() {
    if (!_liberarId) return false;
    const res = _sistema.liberar(_liberarId);
    if (res.success) {
      Storage.saveChuruatas(_sistema.exportar());
      Toast.success(res.mensaje);
      document.getElementById('panel-detalle').style.display = 'none';
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

  return { init, refresh, confirmarLiberar };
})();
