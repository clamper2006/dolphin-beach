/* ================================================================
   pages/isla.js — Playa Delfín v2.0.3
   Isla El Rey Page Controller
   Zones: MAIN (25)
   Payment: USD | PAGO_MOVIL | MIXTO
   Transport: personas count ($5/person)
   ================================================================ */

const IslaPage = (() => {
  let _sistema   = null;
  let _selId     = null;
  let _liberarId = null;

  function init(sistema) {
    _sistema = sistema;
    _renderGrid();
    _setupEventos();
    _renderStats();
  }

  function refresh() {
    _renderGrid();
    _renderStats();
    if (_selId) _mostrarDetalle(_selId);
  }

  /* ---- STATS ---- */
  function _renderStats() {
    const s = _sistema.estadisticas();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('isla-total',       s.total);
    set('isla-ocupadas',    s.ocupadas);
    set('isla-disponibles', s.disponibles);
    set('isla-ingresos',    `$${s.ingresos}`);
  }

  /* ---- GRID ---- */
  function _renderGrid() {
    const container = document.getElementById('mapa-isla');
    if (!container) return;

    const zonas = [
      { key: 'MAIN',  label: 'Isla Principal',    icon: 'fa-water',        cols: 5 }
    ];

    container.innerHTML = zonas.map(z => {
      const churs   = _sistema.porZona(z.key);
      const ocup    = churs.filter(c => c.ocupada).length;
      const libres  = churs.length - ocup;

      return `
        <div class="isla-zona-section zona-${z.key.toLowerCase()}">
          <div class="zona-header">
            <div class="zona-title">
              <i class="fas ${z.icon}"></i>
              <span>${z.label}</span>
              <span class="badge" style="font-size:.7rem">${churs.length}</span>
            </div>
            <div class="zona-counts">
              <span class="count-ocp"><i class="fas fa-circle"></i> ${ocup}</span>
              <span class="count-lib"><i class="far fa-circle"></i> ${libres}</span>
            </div>
          </div>
          <div class="isla-grid" style="--grid-cols:${z.cols}">
            ${churs.map(c => _renderItem(c, z.key)).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.isla-item').forEach(el => {
      el.addEventListener('click', () => _seleccionar(el.dataset.id));
    });
  }

  function _renderItem(c, zona) {
    const cls  = c.ocupada ? 'ocupada' : `disponible disponible-${zona.toLowerCase()}`;
    const sel  = c.id === _selId ? 'selected' : '';
    const icon = c.ocupada ? 'fa-user' : (zona === 'ARBOL' ? 'fa-tree' : zona === 'VERDE' ? 'fa-leaf' : 'fa-umbrella-beach');
    return `
      <div class="isla-item ${cls} ${sel}" data-id="${c.id}"
           title="${c.id}${c.ocupada ? ' — ' + c.cliente.nombreCompleto : ''}">
        <i class="fas ${icon} isla-icon"></i>
        <span class="isla-num">${c.num}</span>
        ${c.ocupada && c.personas > 0 ? `<span class="isla-transp-badge" title="${c.personas} pers."><i class="fas fa-ship"></i>${c.personas}</span>` : ''}
      </div>
    `;
  }

  /* ---- SELECTION & DETAIL ---- */
  function _seleccionar(id) {
    _selId = id;
    _renderGrid();
    _mostrarDetalle(id);
    const panel = document.getElementById('panel-isla-detalle');
    if (panel) {
      panel.style.display = 'block';
      setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  }

  function _mostrarDetalle(id) {
    const c = _sistema.get(id);
    if (!c) return;
    const panel   = document.getElementById('panel-isla-detalle');
    const titulo  = document.getElementById('isla-detalle-titulo');
    const content = document.getElementById('isla-detalle-content');
    const footer  = document.getElementById('isla-detalle-footer');
    if (!panel) return;

    const settings = Storage.loadSettings();
    const precio   = settings.precioIsla       || 20;
    const transp   = settings.precioTransporte || 5;
    const tasa     = settings.tasaCambio        || 36.5;

    titulo.innerHTML = `
      <i class="fas fa-water"></i> ${c.id}
      <span class="badge ${c.ocupada ? 'badge-danger' : 'badge-success'}">${c.ocupada ? 'Ocupada' : 'Disponible'}</span>
    `;

    let body = `
      <div class="detalle-info">
        <div class="info-row"><span class="info-label">Churuata</span><span class="info-val fw-600">${c.id}</span></div>
        <div class="info-row"><span class="info-label">Zona</span><span class="info-val">${_zonaLabel(c.zona)}</span></div>
        <div class="info-row"><span class="info-label">Precio base</span><span class="info-val fw-600">$${precio} USD</span></div>
        <div class="info-row"><span class="info-label">Transporte</span><span class="info-val">$${transp}/persona</span></div>
      </div>`;

    if (c.ocupada) {
      const fechaHora = c.fechaAlquiler
        ? new Date(c.fechaAlquiler).toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit' }) : '—';
      let montoLabel;
      if (c.metodoPago === 'PAGO_MOVIL') {
        montoLabel = `Bs ${c.montoTotal?.toFixed(2)}`;
      } else if (c.metodoPago === 'MIXTO') {
        montoLabel = `USD ${c.montoUSD?.toFixed(2)} + Bs ${c.montoBs?.toFixed(2)}`;
      } else {
        montoLabel = `USD ${c.montoTotal?.toFixed(2)}`;
      }

      const notasHTML = c.notas
        ? `<div class="info-row" style="grid-column:1/-1">
             <span class="info-label">Notas</span>
             <span class="info-val nota-highlight">${c.notas}</span>
           </div>` : '';

      body += `
        <hr class="divider">
        <div class="detalle-info">
          <div class="info-row"><span class="info-label">Cliente</span><span class="info-val fw-600">${c.cliente.nombreCompleto || '—'}</span></div>
          <div class="info-row"><span class="info-label">Cédula</span><span class="info-val">${c.cliente.cedula || '—'}</span></div>
          <div class="info-row"><span class="info-label">Teléfono</span><span class="info-val">${c.cliente.telefono || '—'}</span></div>
          <div class="info-row"><span class="info-label">Hora</span><span class="info-val">${fechaHora}</span></div>
          <div class="info-row"><span class="info-label">Personas</span>
            <span class="info-val">${c.personas > 0 ? `<span class="badge badge-primary">${c.personas} persona${c.personas !== 1 ? 's' : ''}</span>` : '0'}</span>
          </div>
          <div class="info-row"><span class="info-label">Pago</span><span class="info-val">${_labelMetodo(c.metodoPago)}</span></div>
          <div class="info-row"><span class="info-label">Total</span><span class="info-val fw-600 text-primary">${montoLabel}</span></div>
          ${notasHTML}
        </div>`;
    }

    content.innerHTML = body;

    // Footer
    const session = Auth.getSession();
    const canEdit = session?.rol === 'ADMIN' || session?.rol === 'OPERADOR_ISLA';
    if (!canEdit) {
      footer.innerHTML = `<span class="text-muted text-sm"><i class="fas fa-eye"></i> Solo lectura</span>`;
      return;
    }
    if (c.ocupada) {
      footer.innerHTML = `
        <button class="btn btn-outline btn-sm" id="btn-isla-editar"><i class="fas fa-edit"></i> Editar</button>
        <button class="btn btn-danger btn-sm" id="btn-isla-liberar"><i class="fas fa-door-open"></i> Liberar</button>
        <button class="btn btn-outline btn-sm" id="btn-isla-pdf"><i class="fas fa-file-pdf"></i> PDF</button>`;
      document.getElementById('btn-isla-editar')?.addEventListener('click',  () => _abrirEditar(id));
      document.getElementById('btn-isla-liberar')?.addEventListener('click', () => _confirmarLiberar(id));
      document.getElementById('btn-isla-pdf')?.addEventListener('click',     () => _generarPDF(c));
    } else {
      footer.innerHTML = `
        <button class="btn btn-primary" id="btn-isla-ocupar"><i class="fas fa-sign-in-alt"></i> Ocupar</button>`;
      document.getElementById('btn-isla-ocupar')?.addEventListener('click', () => _abrirFormOcupar(id));
    }
  }

  /* ---- LABEL HELPERS ---- */
  function _zonaLabel(z) {
    return { MAIN: 'Isla Principal', ARBOL: 'El Árbol', VERDE: 'Área Verde' }[z] || z;
  }
  function _labelMetodo(m) {
    return { PAGO_MOVIL: 'Pago Móvil', DIVISAS: 'USD', MIXTO: 'Mixto (USD + Bs)' }[m] || m;
  }

  /* ---- EDIT OCCUPIED ISLA ---- */
  function _abrirEditar(id) {
    const modal = document.getElementById('modal-isla-ocupar');
    if (!modal) return;
    const c = _sistema.get(id);
    if (!c || !c.ocupada) return;
    document.getElementById('isla-ocp-id').value = id;
    document.getElementById('modal-isla-titulo').textContent = `Editar ${id}`;
    document.getElementById('isla-ocp-modo').value = 'editar';

    document.getElementById('isla-ocp-nombre').value   = c.cliente.nombreCompleto || '';
    document.getElementById('isla-ocp-cedula').value   = c.cliente.cedula         || '';
    document.getElementById('isla-ocp-telefono').value = c.cliente.telefono       || '';
    document.getElementById('isla-ocp-notas').value    = c.notas                  || '';
    document.getElementById('isla-ocp-personas').value = c.personas               || 0;
    document.getElementById('isla-ocp-ref-movil').value = c.referenciaMovil       || '';
    document.getElementById('isla-ocp-tel-movil').value = c.telefonoMovil         || '';

    const metMap = { DIVISAS:'USD', PAGO_MOVIL:'PAGO_MOVIL', MIXTO:'MIXTO' };
    const metEl = document.getElementById('isla-ocp-metodo');
    if (metEl) { metEl.value = metMap[c.metodoPago] || 'USD'; _toggleIslaMetodo(metEl.value); }
    if (c.metodoPago === 'MIXTO') {
      document.getElementById('isla-ocp-monto-usd').value = c.montoUSD || '';
      document.getElementById('isla-ocp-monto-bs').value  = c.montoBs  || '';
    }
    modal.style.display = 'flex';
    document.getElementById('isla-ocp-nombre')?.focus();
  }

  /* ---- OPEN FORM ---- */
  function _abrirFormOcupar(id) {
    const modal = document.getElementById('modal-isla-ocupar');
    if (!modal) return;
    document.getElementById('isla-ocp-id').value = id;
    document.getElementById('modal-isla-titulo').textContent = `Ocupar ${id}`;
    document.getElementById('isla-ocp-modo').value = 'ocupar';

    ['isla-ocp-nombre','isla-ocp-cedula','isla-ocp-telefono','isla-ocp-notas',
     'isla-ocp-ref-movil','isla-ocp-tel-movil','isla-ocp-monto-usd','isla-ocp-monto-bs'].forEach(fid => {
      const el = document.getElementById(fid);
      if (el) el.value = '';
    });

    const personasEl = document.getElementById('isla-ocp-personas');
    if (personasEl) personasEl.value = 0;

    const metEl = document.getElementById('isla-ocp-metodo');
    if (metEl) { metEl.value = 'USD'; _toggleIslaMetodo('USD'); }

    modal.style.display = 'flex';
    document.getElementById('isla-ocp-nombre')?.focus();
  }

  /* ---- PAYMENT TOGGLE ---- */
  function _toggleIslaMetodo(metodo) {
    const movilRow  = document.getElementById('isla-ocp-movil-row');
    const mixtoRow  = document.getElementById('isla-ocp-mixto-row');

    if (movilRow) movilRow.style.display = (metodo === 'PAGO_MOVIL' || metodo === 'MIXTO') ? '' : 'none';
    if (mixtoRow) mixtoRow.style.display = (metodo === 'MIXTO') ? '' : 'none';

    const settings  = Storage.loadSettings();
    const precio    = settings.precioIsla       || 20;
    const transpC   = settings.precioTransporte || 5;
    const tasa      = settings.tasaCambio        || 36.5;
    const personas  = parseInt(document.getElementById('isla-ocp-personas')?.value) || 0;
    const transpUSD = personas * transpC;
    const resumen   = document.getElementById('isla-ocp-resumen');
    if (!resumen) return;

    if (metodo === 'USD') {
      const total = precio + transpUSD;
      resumen.innerHTML = `
        <div class="resumen-box">
          <span>Churuata:</span><strong>USD ${precio.toFixed(2)}</strong>
          ${personas > 0 ? `<span>Transporte (${personas} × $${transpC}):</span><strong>USD ${transpUSD.toFixed(2)}</strong>` : ''}
          <span class="total-row">Total:</span><strong class="total-val">USD ${total.toFixed(2)}</strong>
        </div>`;
    } else if (metodo === 'PAGO_MOVIL') {
      const total = (10 + transpUSD) * tasa;
      resumen.innerHTML = `
        <div class="resumen-box">
          <span>Base ($10 × Bs ${tasa}):</span><strong>Bs ${(10 * tasa).toFixed(2)}</strong>
          ${personas > 0 ? `<span>Transporte (${personas} × $${transpC} × Bs ${tasa}):</span><strong>Bs ${(transpUSD * tasa).toFixed(2)}</strong>` : ''}
          <span class="total-row">Total:</span><strong class="total-val">Bs ${total.toFixed(2)}</strong>
        </div>`;
    } else if (metodo === 'MIXTO') {
      const totalRef = precio + transpUSD;
      resumen.innerHTML = `
        <div class="resumen-box">
          <span>Referencia total:</span><strong>USD ${totalRef.toFixed(2)}</strong>
          <span style="grid-column:1/-1;font-size:.8rem;color:var(--text-muted)">Distribuye entre USD y Bs abajo</span>
        </div>`;
    }
  }

  /* ---- EXECUTE OCUPAR ---- */
  function _ejecutarOcupar() {
    const modo = document.getElementById('isla-ocp-modo')?.value || 'ocupar';
    const id             = document.getElementById('isla-ocp-id')?.value;
    const nombreCompleto = document.getElementById('isla-ocp-nombre')?.value?.trim();
    const cedula         = document.getElementById('isla-ocp-cedula')?.value?.trim();
    const telefono       = document.getElementById('isla-ocp-telefono')?.value?.trim();
    const metodo         = document.getElementById('isla-ocp-metodo')?.value;
    const personas       = parseInt(document.getElementById('isla-ocp-personas')?.value) || 0;
    const refMovil       = document.getElementById('isla-ocp-ref-movil')?.value?.trim();
    const telMovil       = document.getElementById('isla-ocp-tel-movil')?.value?.trim();
    const banco          = document.getElementById('isla-ocp-banco')?.value?.trim();
    const notas          = document.getElementById('isla-ocp-notas')?.value?.trim();
    const montoUSD       = document.getElementById('isla-ocp-monto-usd')?.value?.trim();
    const montoBs        = document.getElementById('isla-ocp-monto-bs')?.value?.trim();

    // Validations
    if (!nombreCompleto) { Toast.error('El nombre completo es obligatorio'); return; }
    const nameReg = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/;
    if (!nameReg.test(nombreCompleto)) { Toast.error('Solo letras y espacios en el nombre'); return; }
    if (!cedula) { Toast.error('La cédula es obligatoria'); return; }

    if (metodo === 'PAGO_MOVIL' || metodo === 'MIXTO') {
      if (!refMovil) { Toast.error('La referencia de pago móvil es obligatoria'); return; }
      if (!/^\d{4}$/.test(refMovil)) { Toast.error('La referencia debe tener exactamente 4 dígitos'); return; }
    }
    if (metodo === 'MIXTO') {
      const usd = parseFloat(montoUSD) || 0;
      const bs  = parseFloat(montoBs)  || 0;
      if (usd <= 0 && bs <= 0) { Toast.error('Ingresa al menos un monto en pago Mixto'); return; }
    }

    const payload = {
      nombreCompleto, cedula, telefono,
      metodoPago: metodo === 'USD' ? 'DIVISAS' : metodo,
      divisa: 'USD', personas,
      referenciaMovil: refMovil, telefonoMovil: telMovil, banco, notas,
      montoUSD: parseFloat(montoUSD) || 0,
      montoBs:  parseFloat(montoBs)  || 0
    };

    const res = modo === 'editar' ? _sistema.editar(id, payload) : _sistema.alquilar(id, payload);

    if (res.success) {
      Toast.success(modo === 'editar' ? `${id} actualizada` : `${id} ocupada correctamente`);
      _cerrarModal('modal-isla-ocupar');
      refresh();
      if (typeof app !== 'undefined') app.updateHeaderStats();
      _selId = id;
      _mostrarDetalle(id);
    } else { Toast.error(res.error); }
  }

  /* ---- LIBERAR ---- */
  function _confirmarLiberar(id) {
    _liberarId = id;
    const modal = document.getElementById('modal-isla-liberar');
    if (modal) modal.style.display = 'flex';
  }

  function _ejecutarLiberar() {
    if (!_liberarId) return;
    const res = _sistema.liberar(_liberarId);
    if (res.success) {
      Toast.success('Churuata liberada');
      _selId = null; _liberarId = null;
      _cerrarModal('modal-isla-liberar');
      const panel = document.getElementById('panel-isla-detalle');
      if (panel) panel.style.display = 'none';
      refresh();
      if (typeof app !== 'undefined') app.updateHeaderStats();
    } else { Toast.error(res.error); }
  }

  /* ---- PDF ---- */
  function _generarPDF(c) {
    if (typeof window.jspdf === 'undefined') { Toast.warning('PDF no disponible'); return; }
    try {
      const { jsPDF } = window.jspdf;
      const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const cx    = pageW / 2;
      const mL    = 25;

      doc.setFillColor(0, 119, 182);
      doc.rect(0, 0, pageW, 38, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('Playa Delfín', cx, 15, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprobante Isla El Rey', cx, 24, { align: 'center' });
      doc.setFontSize(9);
      doc.text('v2.0.1', cx, 31, { align: 'center' });

      doc.setFillColor(240, 248, 255);
      doc.roundedRect(mL, 45, pageW - 50, 28, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(0, 119, 182);
      doc.text(`${c.id} — ${_zonaLabel(c.zona)}`, cx, 57, { align: 'center' });
      const fechaHora = c.fechaAlquiler ? new Date(c.fechaAlquiler).toLocaleString('es-VE') : '—';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Entrada: ${fechaHora}`, cx, 65, { align: 'center' });

      let montoLabel;
      if (c.metodoPago === 'PAGO_MOVIL') {
        montoLabel = `Bs ${c.montoTotal?.toFixed(2)}`;
      } else if (c.metodoPago === 'MIXTO') {
        montoLabel = `USD ${c.montoUSD?.toFixed(2)} + Bs ${c.montoBs?.toFixed(2)}`;
      } else {
        montoLabel = `USD ${c.montoTotal?.toFixed(2)}`;
      }

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(mL, 80, pageW - 50, 70, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 119, 182);
      doc.text('Datos del Cliente', cx, 92, { align: 'center' });

      const rows = [
        ['Nombre:',    c.cliente.nombreCompleto || '—'],
        ['Cédula:',    c.cliente.cedula || '—'],
        ['Teléfono:',  c.cliente.telefono || '—'],
        ['Personas:',  String(c.personas || 0)],
        ['Pago:',      _labelMetodo(c.metodoPago)],
        ['Total:',     montoLabel]
      ];
      let yR = 102;
      doc.setFontSize(10);
      rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(label, mL + 5, yR);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(String(value), mL + 45, yR);
        yR += 9;
      });

      if (c.notas) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Notas: ${c.notas}`, cx, yR + 5, { align: 'center', maxWidth: pageW - 50 });
      }

      const footerY = pageH - 15;
      doc.setFillColor(0, 119, 182);
      doc.rect(0, footerY - 5, pageW, 20, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('Playa Delfín — Sistema de Gestión Operativa v2.0.1', cx, footerY + 2, { align: 'center' });

      doc.save(`isla-${c.id}-${new Date().toISOString().split('T')[0]}.pdf`);
      Toast.success('PDF generado');
    } catch(e) {
      console.error('PDF error:', e);
      Toast.error('Error al generar el PDF');
    }
  }

  function _cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
  }

  /* ---- EVENTS ---- */
  function _setupEventos() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => _cerrarModal(btn.dataset.closeModal));
    });
    ['modal-isla-ocupar','modal-isla-liberar'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) modal.addEventListener('click', e => { if (e.target === modal) _cerrarModal(id); });
    });

    document.getElementById('btn-isla-confirmar-ocupar')?.addEventListener('click', _ejecutarOcupar);
    document.getElementById('btn-isla-confirmar-liberar')?.addEventListener('click', _ejecutarLiberar);

    document.getElementById('isla-ocp-metodo')?.addEventListener('change', function() {
      _toggleIslaMetodo(this.value);
    });
    document.getElementById('isla-ocp-personas')?.addEventListener('input', function() {
      const met = document.getElementById('isla-ocp-metodo')?.value || 'USD';
      _toggleIslaMetodo(met);
    });
    document.getElementById('isla-ocp-nombre')?.addEventListener('input', function() {
      const cleaned = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
      if (this.value !== cleaned) this.value = cleaned;
    });
    // Reference: exactly 4 digits
    document.getElementById('isla-ocp-ref-movil')?.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  return { init, refresh };
})();
