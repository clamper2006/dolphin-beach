/* ================================================================
   pages/playa.js — Playa Delfín v2.0.3
   Zonas: Islote (27) | Orilla de Mar (42) | Área Verde (13) | Área de Árbol (4) | Premium (3)
   ================================================================ */

const PlayaPage = (() => {
  let _sistema   = null;
  let _selId     = null;
  let _liberarId = null;

  function init(sistema) {
    _sistema = sistema;
    _renderMapa();
    _setupEventos();
    _renderStats();
  }

  function refresh() {
    if (!_sistema) return;
    _renderMapa();
    _renderStats();
    if (_selId) _mostrarDetalle(_selId);
  }

  /* ---- STATS ---- */
  function _renderStats() {
    const s = _sistema.estadisticas();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('playa-total',       s.total);
    set('playa-ocupadas',    s.ocupadas);
    set('playa-disponibles', s.disponibles);
    set('playa-ingresos',    `$${s.ingresos}`);
  }

  /* ---- ZONE DEFINITIONS ---- */
  const ZONAS = [
    {
      key:     'ISLOTE_COMPOUND',
      label:   'Islote',
      icon:    'fa-water',
      tip:     'Churuatas frente al mar',
      subzonas: [
        { key: 'Frente al mar', cols: 2 },
        { key: 'Zona media',    cols: 3 },
        { key: 'Zona trasera',  cols: 2 }
      ]
    },
    {
      key:  'Orilla de mar',
      label:'Orilla de Playa',
      icon: 'fa-umbrella-beach',
      cols: 6
    },
    {
      key:  'Area Verde',
      label:'Área Verde',
      icon: 'fa-leaf',
      cols: 4
    },
    {
      key:  'Area Arbol',
      label:'Área de Árbol',
      icon: 'fa-tree',
      cols: 4
    },
    {
      key:  'Premium',
      label:'Premium',
      icon: 'fa-crown',
      cols: 3,
      tip:  '$40 USD por churuata'
    }
  ];

  /* ---- MAP RENDER ---- */
  function _renderMapa() {
    const container = document.getElementById('mapa-churuatas');
    if (!container) return;

    container.innerHTML = ZONAS.map(z => {
      const isPremium = z.key === 'Premium';

      // Compound zone: renders multiple sub-grids inside one section
      if (z.subzonas) {
        const allChurs = z.subzonas.flatMap(sz => _sistema.porZona(sz.key));
        if (!allChurs.length) return '';
        const ocupadas = allChurs.filter(c => c.ocupada).length;
        const libres   = allChurs.length - ocupadas;

        const gridsHTML = z.subzonas.map(sz => {
          const churs = _sistema.porZona(sz.key);
          if (!churs.length) return '';
          return `<div class="churuata-grid" style="--grid-cols:${sz.cols}">
            ${churs.map(c => _renderChuruata(c)).join('')}
          </div>`;
        }).join('');

        return `
          <div class="zona-section">
            <div class="zona-header">
              <div class="zona-title">
                <i class="fas ${z.icon}"></i>
                <span>${z.label}</span>
                <span class="badge" style="font-size:.68rem;background:rgba(0,0,0,.08);color:inherit">${allChurs.length}</span>
              </div>
              <div class="zona-counts">
                <span class="count-ocp"><i class="fas fa-circle"></i> ${ocupadas}</span>
                <span class="count-lib"><i class="far fa-circle"></i> ${libres}</span>
              </div>
            </div>
            ${gridsHTML}
          </div>`;
      }

      // Regular / virtual zone
      let churuatas;
      if (z.virtual) {
        churuatas = z.virtual.flatMap(k => _sistema.porZona(k));
      } else {
        churuatas = _sistema.porZona(z.key);
      }
      if (!churuatas.length) return '';

      const ocupadas = churuatas.filter(c => c.ocupada).length;
      const libres   = churuatas.length - ocupadas;

      return `
        <div class="zona-section ${isPremium ? 'zona-premium-section' : ''}">
          <div class="zona-header ${isPremium ? 'zona-premium-header' : ''}">
            <div class="zona-title">
              <i class="fas ${z.icon}"></i>
              <span>${z.label}</span>
              ${isPremium ? '<span class="badge-premium">$40</span>' : ''}
              <span class="badge" style="font-size:.68rem;background:rgba(0,0,0,.08);color:inherit">${churuatas.length}</span>
            </div>
            <div class="zona-counts">
              <span class="count-ocp"><i class="fas fa-circle"></i> ${ocupadas}</span>
              <span class="count-lib"><i class="far fa-circle"></i> ${libres}</span>
            </div>
          </div>
          <div class="churuata-grid" style="--grid-cols:${z.cols}">
            ${churuatas.map(c => _renderChuruata(c)).join('')}
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.churuata-cell').forEach(el => {
      el.addEventListener('click', () => _seleccionarChuruata(el.dataset.id));
    });
  }

  function _renderChuruata(c) {
    const sel  = c.id === _selId ? 'selected' : '';
    let cls, icon, label;
    if (!c.ocupada) {
      if (c.tipo === 'VIP')     { cls = 'disponible-vip';     icon = 'fa-umbrella-beach'; }
      else if (c.tipo === 'PREMIUM') { cls = 'disponible-premium'; icon = 'fa-crown'; }
      else                      { cls = 'disponible';          icon = 'fa-umbrella-beach'; }
      label = 'Libre';
    } else {
      if (c.tipo === 'VIP')     { cls = 'ocupada-vip';     icon = 'fa-crown'; }
      else if (c.tipo === 'PREMIUM') { cls = 'ocupada-premium'; icon = 'fa-crown'; }
      else                      { cls = 'ocupada';          icon = 'fa-user'; }
      label = c.cliente.nombreCompleto ? c.cliente.nombreCompleto.split(' ')[0] : 'Ocupada';
    }
    return `
      <div class="churuata-cell ${cls} ${sel}" data-id="${c.id}"
           title="${c.id}${c.ocupada ? ' — ' + c.cliente.nombreCompleto : ' — Disponible'}">
        <i class="fas ${icon} chur-icon"></i>
        <span class="chur-id">${c.id}</span>
        ${c.ocupada && c.notas ? `<span class="chur-nota" title="${c.notas}"><i class="fas fa-sticky-note"></i></span>` : ''}
        <span class="chur-label">${label}</span>
      </div>`;
  }

  /* ---- SELECTION & DETAIL ---- */
  function _seleccionarChuruata(id) {
    _selId = id;
    _renderMapa();
    _mostrarDetalle(id);
    const panel = document.getElementById('panel-detalle');
    if (panel) {
      panel.style.display = 'block';
      setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  }

  function _mostrarDetalle(id) {
    const c = _sistema.get(id);
    if (!c) return;
    const panel   = document.getElementById('panel-detalle');
    const titulo  = document.getElementById('detalle-titulo');
    const content = document.getElementById('detalle-content');
    const footer  = document.getElementById('detalle-footer');
    if (!panel) return;

    const precio = _sistema.getPrecio(c);
    const s      = Storage.loadSettings();
    const pSilla = s.precioSilla || 2;

    const tipoBadge = c.tipo === 'VIP' ? 'badge-vip' : c.tipo === 'PREMIUM' ? 'badge-premium-tag' : 'badge-azul';

    titulo.innerHTML = `
      <span class="badge ${tipoBadge}">${c.tipo}</span>
      ${c.id}
      <span class="badge ${c.ocupada ? 'badge-danger' : 'badge-success'}">${c.ocupada ? 'Ocupada' : 'Disponible'}</span>`;

    if (!c.ocupada) {
      content.innerHTML = `
        <div class="detalle-info">
          <div class="info-row"><span class="info-label">Zona</span><span class="info-val">${_zonaLabel(c.zona)}</span></div>
          <div class="info-row"><span class="info-label">Precio base</span><span class="info-val fw-600">$${precio} USD</span></div>
          <div class="info-row"><span class="info-label">Precio silla</span><span class="info-val">$${pSilla} USD/c.u.</span></div>
        </div>
        <p class="text-muted" style="margin-top:.5rem;font-size:.85rem">Disponible para ocupar</p>`;
    } else {
      const hora = c.fechaAlquiler
        ? new Date(c.fechaAlquiler).toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit' }) : '—';
      let montoLabel;
      if (c.metodoPago === 'PAGO_MOVIL')    montoLabel = `Bs ${c.montoTotal?.toFixed(2)}`;
      else if (c.metodoPago === 'MIXTO')    montoLabel = `USD ${c.montoUSD?.toFixed(2)} + Bs ${c.montoBs?.toFixed(2)}`;
      else                                  montoLabel = `USD ${c.montoTotal?.toFixed(2)}`;

      const notasHTML = c.notas
        ? `<div class="info-row" style="grid-column:1/-1"><span class="info-label">Notas</span><span class="info-val nota-highlight">${c.notas}</span></div>`
        : '';

      content.innerHTML = `
        <div class="detalle-info">
          <div class="info-row"><span class="info-label">Cliente</span><span class="info-val fw-600">${c.cliente.nombreCompleto || '—'}</span></div>
          <div class="info-row"><span class="info-label">Cédula</span><span class="info-val">${c.cliente.cedula || '—'}</span></div>
          <div class="info-row"><span class="info-label">Teléfono</span><span class="info-val">${c.cliente.telefono || '—'}</span></div>
          <div class="info-row"><span class="info-label">Hora entrada</span><span class="info-val">${hora}</span></div>
          <div class="info-row"><span class="info-label">Sillas</span><span class="info-val">${c.sillasAlquiladas}</span></div>
          <div class="info-row"><span class="info-label">Pago</span><span class="info-val">${_labelMetodo(c.metodoPago)}</span></div>
          <div class="info-row"><span class="info-label">Total</span><span class="info-val fw-600 text-primary">${montoLabel}</span></div>
          ${notasHTML}
        </div>`;
    }

    // Footer
    const session = Auth.getSession();
    const canEdit = session?.rol === 'ADMIN' || session?.rol === 'OPERADOR_PLAYA';
    if (!canEdit) {
      footer.innerHTML = `<span class="text-muted text-sm"><i class="fas fa-eye"></i> Solo lectura</span>`;
      return;
    }
    if (c.ocupada) {
      footer.innerHTML = `
        <button class="btn btn-outline btn-sm" id="btn-playa-editar" title="Editar datos">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button class="btn btn-danger btn-sm" id="btn-playa-liberar">
          <i class="fas fa-door-open"></i> Liberar
        </button>
        <button class="btn btn-outline btn-sm" id="btn-playa-pdf">
          <i class="fas fa-file-pdf"></i> PDF
        </button>`;
      document.getElementById('btn-playa-editar')?.addEventListener('click',  () => _abrirEditar(id));
      document.getElementById('btn-playa-liberar')?.addEventListener('click', () => _confirmarLiberar(id));
      document.getElementById('btn-playa-pdf')?.addEventListener('click',     () => _generarPDF(c));
    } else {
      footer.innerHTML = `
        <button class="btn btn-primary" id="btn-playa-ocupar">
          <i class="fas fa-sign-in-alt"></i> Ocupar churuata
        </button>`;
      document.getElementById('btn-playa-ocupar')?.addEventListener('click', () => _abrirFormOcupar(id));
    }
  }

  /* ---- HELPERS ---- */
  function _zonaLabel(z) {
    const m = { 'Frente al mar': 'Islote', 'Zona media': 'Islote', 'Zona trasera': 'Islote', 'Orilla de mar': 'Orilla de Playa', 'Area Verde': 'Área Verde', 'Area Arbol': 'Área de Árbol', 'Premium': 'Premium' };
    return m[z] || z;
  }
  function _labelMetodo(m) {
    return { PAGO_MOVIL: 'Pago Móvil', DIVISAS: 'USD', MIXTO: 'Mixto (USD + Bs)' }[m] || m;
  }

  /* ---- OPEN OCUPAR ---- */
  function _abrirFormOcupar(id) {
    const modal = document.getElementById('modal-ocupar');
    if (!modal) return;
    const c      = _sistema.get(id);
    const s      = Storage.loadSettings();
    const precio = _sistema.getPrecio(c);
    const pSilla = s.precioSilla || 2;
    const tasa   = s.tasaCambio  || 36.5;

    document.getElementById('modal-ocp-titulo').textContent = `Ocupar ${id}`;
    document.getElementById('ocp-id').value = id;
    document.getElementById('ocp-modo').value = 'ocupar';

    ['ocp-nombre','ocp-cedula','ocp-telefono','ocp-notas',
     'ocp-ref-movil','ocp-tel-movil','ocp-monto-usd-mixto','ocp-monto-bs-mixto'].forEach(fid => {
      const el = document.getElementById(fid); if (el) el.value = '';
    });
    const sillaEl = document.getElementById('ocp-sillas');
    if (sillaEl) sillaEl.value = 0;
    const metEl = document.getElementById('ocp-metodo');
    if (metEl) { metEl.value = 'USD'; _togglePagoUI('USD', precio, pSilla, tasa, 0); }
    modal.style.display = 'flex';
    document.getElementById('ocp-nombre')?.focus();
  }

  /* ---- OPEN EDITAR ---- */
  function _abrirEditar(id) {
    const modal = document.getElementById('modal-ocupar');
    if (!modal) return;
    const c      = _sistema.get(id);
    if (!c || !c.ocupada) return;
    const s      = Storage.loadSettings();
    const precio = _sistema.getPrecio(c);
    const pSilla = s.precioSilla || 2;
    const tasa   = s.tasaCambio  || 36.5;

    document.getElementById('modal-ocp-titulo').textContent = `Editar ${id}`;
    document.getElementById('ocp-id').value   = id;
    document.getElementById('ocp-modo').value = 'editar';

    document.getElementById('ocp-nombre').value    = c.cliente.nombreCompleto || '';
    document.getElementById('ocp-cedula').value    = c.cliente.cedula         || '';
    document.getElementById('ocp-telefono').value  = c.cliente.telefono       || '';
    document.getElementById('ocp-notas').value     = c.notas                  || '';
    document.getElementById('ocp-sillas').value    = c.sillasAlquiladas       || 0;
    document.getElementById('ocp-ref-movil').value = c.referenciaMovil        || '';
    document.getElementById('ocp-tel-movil').value = c.telefonoMovil          || '';

    const metMap = { DIVISAS: 'USD', PAGO_MOVIL: 'PAGO_MOVIL', MIXTO: 'MIXTO' };
    const metEl  = document.getElementById('ocp-metodo');
    if (metEl) {
      metEl.value = metMap[c.metodoPago] || 'USD';
      _togglePagoUI(metEl.value, precio, pSilla, tasa, c.sillasAlquiladas || 0);
    }
    if (c.metodoPago === 'MIXTO') {
      document.getElementById('ocp-monto-usd-mixto').value = c.montoUSD || '';
      document.getElementById('ocp-monto-bs-mixto').value  = c.montoBs  || '';
    }

    modal.style.display = 'flex';
    document.getElementById('ocp-nombre')?.focus();
  }

  /* ---- PAYMENT UI TOGGLE ---- */
  function _togglePagoUI(metodo, precioBase, pSilla, tasa, sillas) {
    const movilRow = document.getElementById('ocp-movil-row');
    const mixtoRow = document.getElementById('ocp-mixto-row');
    const resumen  = document.getElementById('ocp-resumen');

    if (movilRow) movilRow.style.display = 'none';
    if (mixtoRow) mixtoRow.style.display = 'none';

    const total = precioBase + (sillas * pSilla);

    if (metodo === 'USD') {
      if (resumen) resumen.innerHTML = `<div class="resumen-box">
        <span>Churuata:</span><strong>USD ${precioBase.toFixed(2)}</strong>
        <span>Sillas (${sillas}):</span><strong>USD ${(sillas * pSilla).toFixed(2)}</strong>
        <span class="total-row">Total:</span><strong class="total-val">USD ${total.toFixed(2)}</strong>
      </div>`;
    } else if (metodo === 'PAGO_MOVIL') {
      if (movilRow) movilRow.style.display = '';
      const totalBs = (10 * tasa) + (sillas * pSilla * tasa);
      if (resumen) resumen.innerHTML = `<div class="resumen-box">
        <span>Base ($10 × Bs ${tasa}):</span><strong>Bs ${(10 * tasa).toFixed(2)}</strong>
        <span>Sillas (${sillas}):</span><strong>Bs ${(sillas * pSilla * tasa).toFixed(2)}</strong>
        <span class="total-row">Total:</span><strong class="total-val">Bs ${totalBs.toFixed(2)}</strong>
      </div>`;
    } else if (metodo === 'MIXTO') {
      if (movilRow) movilRow.style.display = '';
      if (mixtoRow) mixtoRow.style.display = '';
      if (resumen) resumen.innerHTML = `<div class="resumen-box">
        <span>Referencia total:</span><strong>USD ${total.toFixed(2)}</strong>
        <span style="grid-column:1/-1;font-size:.8rem;color:var(--text-muted)">Distribuye entre USD y Bs</span>
      </div>`;
    }
  }

  /* ---- SUBMIT FORM (ocupar or editar) ---- */
  function _submitForm() {
    const modo           = document.getElementById('ocp-modo')?.value || 'ocupar';
    const id             = document.getElementById('ocp-id')?.value;
    const nombreCompleto = document.getElementById('ocp-nombre')?.value?.trim();
    const cedula         = document.getElementById('ocp-cedula')?.value?.trim();
    const telefono       = document.getElementById('ocp-telefono')?.value?.trim();
    const sillas         = parseInt(document.getElementById('ocp-sillas')?.value) || 0;
    const metodo         = document.getElementById('ocp-metodo')?.value;
    const notas          = document.getElementById('ocp-notas')?.value?.trim();
    const refMovil       = document.getElementById('ocp-ref-movil')?.value?.trim();
    const telMovil       = document.getElementById('ocp-tel-movil')?.value?.trim();
    const banco          = document.getElementById('ocp-banco')?.value?.trim();
    const montoUSD       = document.getElementById('ocp-monto-usd-mixto')?.value;
    const montoBs        = document.getElementById('ocp-monto-bs-mixto')?.value;

    if (!nombreCompleto) { Toast.error('El nombre completo es obligatorio'); return; }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(nombreCompleto)) { Toast.error('El nombre solo puede contener letras y espacios'); return; }
    if (!cedula) { Toast.error('La cédula es obligatoria'); return; }
    if ((metodo === 'PAGO_MOVIL' || metodo === 'MIXTO') && refMovil && !/^\d{4}$/.test(refMovil)) {
      Toast.error('La referencia debe tener exactamente 4 dígitos'); return;
    }
    if (metodo === 'MIXTO') {
      if (!((parseFloat(montoUSD) || 0) + (parseFloat(montoBs) || 0))) {
        Toast.error('Ingresa al menos un monto en pago Mixto'); return;
      }
    }

    const session = Auth.getSession();
    const payload = {
      nombreCompleto, cedula, telefono, sillas,
      metodoPago: metodo === 'USD' ? 'DIVISAS' : metodo,
      divisa: 'USD', notas,
      referenciaMovil: refMovil, telefonoMovil: telMovil, banco,
      montoUSD: parseFloat(montoUSD) || 0,
      montoBs:  parseFloat(montoBs)  || 0,
      operador: session?.nombre || 'Sistema'
    };

    const res = modo === 'editar' ? _sistema.editar(id, payload) : _sistema.ocupar(id, payload);

    if (res.success) {
      Toast.success(modo === 'editar' ? `${id} actualizada` : `Churuata ${id} ocupada`);
      _cerrarModal('modal-ocupar');
      refresh();
      if (typeof app !== 'undefined') app.updateHeaderStats();
      if (modo === 'editar') { _selId = id; _mostrarDetalle(id); }
      else { _selId = id; _mostrarDetalle(id); }
    } else {
      Toast.error(res.error || 'Error al procesar');
    }
  }

  /* ---- LIBERAR ---- */
  function _confirmarLiberar(id) {
    _liberarId = id;
    const modal = document.getElementById('modal-liberar');
    if (modal) modal.style.display = 'flex';
  }

  function _ejecutarLiberar() {
    if (!_liberarId) return;
    const res = _sistema.liberar(_liberarId);
    if (res.success) {
      Toast.success('Churuata liberada correctamente');
      _selId = null; _liberarId = null;
      document.getElementById('panel-detalle').style.display = 'none';
      _cerrarModal('modal-liberar');
      refresh();
      if (typeof app !== 'undefined') app.updateHeaderStats();
    } else { Toast.error(res.error); }
  }

  /* ---- PDF individual ---- */
  function _generarPDF(c) {
    if (typeof window.jspdf === 'undefined') { Toast.warning('PDF no disponible'); return; }
    try {
      const { jsPDF } = window.jspdf;
      const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const cx = pageW / 2, mL = 25;

      doc.setFillColor(0, 119, 182);
      doc.rect(0, 0, pageW, 38, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(255,255,255);
      doc.text('Playa Delfín', cx, 15, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica','normal');
      doc.text('Comprobante de Churuata Playa', cx, 24, { align: 'center' });
      doc.setFontSize(8); doc.text('v2.0.2', cx, 31, { align: 'center' });

      doc.setFillColor(240,248,255);
      doc.roundedRect(mL, 44, pageW-50, 26, 3, 3, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(0,119,182);
      doc.text(`Churuata: ${c.id}`, cx, 55, { align: 'center' });
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(80,80,80);
      doc.text(`Zona: ${_zonaLabel(c.zona)}  |  Tipo: ${c.tipo}  |  Entrada: ${c.fechaAlquiler ? new Date(c.fechaAlquiler).toLocaleString('es-VE') : '—'}`, cx, 63, { align: 'center' });

      let montoLabel = c.metodoPago === 'PAGO_MOVIL' ? `Bs ${c.montoTotal?.toFixed(2)}` :
                       c.metodoPago === 'MIXTO' ? `USD ${c.montoUSD?.toFixed(2)} + Bs ${c.montoBs?.toFixed(2)}` :
                       `USD ${c.montoTotal?.toFixed(2)}`;

      doc.setFillColor(248,248,248);
      doc.roundedRect(mL, 76, pageW-50, 72, 3, 3, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(0,119,182);
      doc.text('Datos del Cliente', cx, 87, { align: 'center' });

      const rows = [['Nombre:', c.cliente.nombreCompleto||'—'],['Cédula:', c.cliente.cedula||'—'],
        ['Teléfono:', c.cliente.telefono||'—'],['Sillas:', String(c.sillasAlquiladas||0)],
        ['Método:', _labelMetodo(c.metodoPago)],['Total:', montoLabel]];
      let yR = 97;
      rows.forEach(([label, val]) => {
        doc.setFont('helvetica','bold'); doc.setTextColor(80,80,80); doc.setFontSize(9);
        doc.text(label, mL+5, yR);
        doc.setFont('helvetica','normal'); doc.setTextColor(30,30,30);
        doc.text(String(val), mL+42, yR); yR += 9;
      });
      if (c.notas) {
        doc.setFont('helvetica','italic'); doc.setFontSize(8); doc.setTextColor(100,100,100);
        doc.text(`Notas: ${c.notas}`, cx, yR+4, { align:'center', maxWidth: pageW-50 });
      }

      doc.setFillColor(0,119,182);
      doc.rect(0, pageH-18, pageW, 18, 'F');
      doc.setFontSize(7); doc.setTextColor(255,255,255);
      doc.text('Playa Delfín — Sistema de Gestión Operativa v2.0.2', cx, pageH-8, { align:'center' });

      doc.save(`churuata-${c.id}-${new Date().toISOString().split('T')[0]}.pdf`);
      Toast.success('PDF generado');
    } catch(e) {
      console.error('PDF error:', e);
      Toast.error('Error al generar el PDF');
    }
  }

  function _cerrarModal(id) {
    const m = document.getElementById(id); if (m) m.style.display = 'none';
  }

  /* ---- EVENTS ---- */
  function _setupEventos() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => _cerrarModal(btn.dataset.closeModal));
    });
    ['modal-ocupar','modal-liberar'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) modal.addEventListener('click', e => { if (e.target === modal) _cerrarModal(id); });
    });

    document.getElementById('btn-confirmar-ocupar')?.addEventListener('click', _submitForm);
    document.getElementById('btn-confirmar-liberar')?.addEventListener('click', _ejecutarLiberar);

    document.getElementById('ocp-metodo')?.addEventListener('change', function() {
      const c  = _sistema.get(document.getElementById('ocp-id')?.value);
      const s  = Storage.loadSettings();
      const p  = c ? _sistema.getPrecio(c) : (s.precioAzul || 10);
      const ps = s.precioSilla || 2;
      const t  = s.tasaCambio  || 36.5;
      const sl = parseInt(document.getElementById('ocp-sillas')?.value) || 0;
      _togglePagoUI(this.value, p, ps, t, sl);
    });

    document.getElementById('ocp-sillas')?.addEventListener('input', function() {
      const c   = _sistema.get(document.getElementById('ocp-id')?.value);
      const s   = Storage.loadSettings();
      const p   = c ? _sistema.getPrecio(c) : (s.precioAzul || 10);
      const ps  = s.precioSilla || 2;
      const t   = s.tasaCambio  || 36.5;
      const met = document.getElementById('ocp-metodo')?.value || 'USD';
      _togglePagoUI(met, p, ps, t, parseInt(this.value) || 0);
    });

    document.getElementById('ocp-nombre')?.addEventListener('input', function() {
      const c = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
      if (this.value !== c) this.value = c;
    });

    document.getElementById('ocp-ref-movil')?.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  return { init, refresh };
})();
