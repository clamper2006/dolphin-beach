/* ================================================================
   pages/registro.js — Registro de Entrada (Alcabala Digital)
   ================================================================ */

const RegistroPage = (() => {
  let _registros = [];
  let _filtroFecha = null;
  let _cameraStream = null;
  let _lastCapture = null;

  function init() {
    _registros = Storage.loadRegistros();
    _filtroFecha = _hoy();
    _renderFecha();
    _actualizarContador();
    _renderTabla();
    _setupEventos();
  }

  function _hoy() {
    return new Date().toISOString().split('T')[0];
  }

  function _renderFecha() {
    const el = document.getElementById('registro-fecha');
    if (el) {
      el.textContent = new Date().toLocaleDateString('es-VE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    }
    const filtro = document.getElementById('filtro-fecha-reg');
    if (filtro) filtro.value = _hoy();
  }

  function _actualizarContador() {
    const hoy = _hoy();
    const countHoy = _registros.filter(r => r.fecha === hoy).length;
    const el = document.getElementById('registro-count');
    if (el) el.textContent = countHoy;
    // Update nav badge
    const badge = document.getElementById('badge-registro');
    if (badge) {
      badge.textContent = countHoy;
      badge.classList.toggle('visible', countHoy > 0);
    }
  }

  function _getRegistrosFiltrados() {
    if (!_filtroFecha) return _registros;
    return _registros.filter(r => r.fecha === _filtroFecha);
  }

  function _renderTabla() {
    const tbody = document.getElementById('tbody-registros');
    const countEl = document.getElementById('table-count-reg');
    if (!tbody) return;

    const lista = _getRegistrosFiltrados().slice().reverse(); // most recent first
    if (countEl) countEl.textContent = `${lista.length} registros`;

    if (lista.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="5"><i class="fas fa-inbox"></i> No hay registros para esta fecha</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((r, idx) => `
      <tr>
        <td><strong>${lista.length - idx}</strong></td>
        <td>${r.hora || '—'}</td>
        <td><strong>${r.nombre}</strong></td>
        <td><code>${r.cedula || '—'}</code></td>
        <td>
          <button class="btn btn-sm" style="color:var(--danger);border-color:var(--danger);background:var(--danger-light)"
                  onclick="RegistroPage.eliminar('${r.id}')" title="Eliminar registro">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  function registrar() {
    const nombre = document.getElementById('reg-nombre')?.value?.trim();
    const cedula = document.getElementById('reg-cedula')?.value?.trim();

    if (!nombre) { Toast.error('El nombre es obligatorio'); document.getElementById('reg-nombre')?.focus(); return; }
    if (!cedula) { Toast.error('La cédula es obligatoria'); document.getElementById('reg-cedula')?.focus(); return; }

    // Verificar duplicado hoy
    const hoy = _hoy();
    const duplicado = _registros.find(r => r.fecha === hoy && r.cedula === cedula);
    if (duplicado) {
      Toast.warning(`La cédula ${cedula} ya fue registrada hoy (${duplicado.hora})`);
    }

    const ahora = new Date();
    const registro = {
      id:     `reg_${Date.now()}`,
      nombre,
      cedula,
      fecha:  hoy,
      hora:   ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ts:     ahora.toISOString()
    };

    _registros.push(registro);
    Storage.saveRegistros(_registros);
    _limpiarFormulario();
    _actualizarContador();
    if (_filtroFecha === hoy) _renderTabla();
    Toast.success(`✅ ${nombre} registrado correctamente`);
    document.getElementById('reg-nombre')?.focus();
  }

  function eliminar(id) {
    _registros = _registros.filter(r => r.id !== id);
    Storage.saveRegistros(_registros);
    _actualizarContador();
    _renderTabla();
    Toast.info('Registro eliminado');
  }

  function _limpiarFormulario() {
    const n = document.getElementById('reg-nombre');
    const c = document.getElementById('reg-cedula');
    if (n) n.value = '';
    if (c) c.value = '';
  }

  // ---------- CAMERA ----------
  async function _abrirCamera() {
    const section = document.getElementById('camera-section');
    if (!section) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      Toast.warning('Tu dispositivo no soporta acceso a la cámara');
      return;
    }
    try {
      _cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      const video = document.getElementById('camera-video');
      video.srcObject = _cameraStream;
      section.style.display = 'block';
      document.getElementById('camera-result').style.display = 'none';
      section.scrollIntoView({ behavior: 'smooth' });
    } catch(e) {
      Toast.error('No se pudo acceder a la cámara: ' + e.message);
    }
  }

  function _cerrarCamera() {
    if (_cameraStream) {
      _cameraStream.getTracks().forEach(t => t.stop());
      _cameraStream = null;
    }
    const section = document.getElementById('camera-section');
    if (section) section.style.display = 'none';
  }

  function _capturar() {
    const video  = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    _lastCapture = canvas.toDataURL('image/jpeg', 0.8);

    const preview = document.getElementById('camera-preview');
    const result  = document.getElementById('camera-result');
    if (preview) preview.src = _lastCapture;
    if (result)  result.style.display = 'flex';

    _cerrarCamera();
    Toast.success('Captura realizada — ingresa el número del documento');
    document.getElementById('reg-cedula')?.focus();
  }

  // ---------- PDF ----------
  function generarPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { Toast.error('Librería PDF no disponible'); return; }

    const lista    = _getRegistrosFiltrados().slice().reverse();
    const fecha    = _filtroFecha || _hoy();
    const fechaFmt = new Date(fecha + 'T12:00:00').toLocaleDateString('es-VE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageW  = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(30, 136, 229);
    doc.rect(0, 0, pageW, 45, 'F');

    // Logo placeholder
    doc.setFillColor(255, 255, 255, 50);
    doc.roundedRect(margin, 8, 28, 28, 3, 3, 'S');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DOLPHIN', margin + 14, 23, { align: 'center' });
    doc.text('BEACH', margin + 14, 28, { align: 'center' });

    // Title
    doc.setFontSize(16);
    doc.text('REPORTE DE REGISTRO DE ENTRADA', pageW / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Control de Acceso — Alcabala Digital', pageW / 2, 26, { align: 'center' });
    doc.text(`Fecha: ${fechaFmt}`, pageW / 2, 34, { align: 'center' });

    // Sub-header
    doc.setFillColor(240, 248, 255);
    doc.rect(0, 45, pageW, 18, 'F');
    doc.setTextColor(30, 136, 229);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Total de visitantes: ${lista.length}`, margin, 57);
    doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pageW - margin, 57, { align: 'right' });

    // Table
    doc.autoTable({
      startY: 70,
      head: [['#', 'Hora de Entrada', 'Nombre Completo', 'Cédula / Documento']],
      body: lista.map((r, i) => [i + 1, r.hora, r.nombre, r.cedula || '—']),
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 4,
        lineColor: [220, 230, 240],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [30, 136, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 38 },
        2: { cellWidth: 90 },
        3: { cellWidth: 50 }
      },
      margin: { left: margin, right: margin }
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < 260) {
      doc.setDrawColor(220, 230, 240);
      doc.line(margin, finalY, pageW - margin, finalY);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Dolphin Beach — Sistema de Gestión Operativa v2.0', pageW / 2, finalY + 8, { align: 'center' });
    }

    // Page numbers
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(`Página ${i} de ${pages}`, pageW - margin, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }

    doc.save(`registro-entrada-${fecha}.pdf`);
    Toast.success('PDF generado y descargado');
  }

  function imprimir() {
    window.print();
  }

  // ---------- EVENTS ----------
  function _setupEventos() {
    document.getElementById('btn-registrar')?.addEventListener('click', registrar);

    document.getElementById('btn-limpiar-reg')?.addEventListener('click', () => {
      _limpiarFormulario();
      document.getElementById('reg-nombre')?.focus();
    });

    // Enter para registrar
    ['reg-nombre', 'reg-cedula'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') registrar();
      });
    });

    // Camera
    document.getElementById('btn-camera')?.addEventListener('click', _abrirCamera);
    document.getElementById('btn-capture')?.addEventListener('click', _capturar);
    document.getElementById('btn-close-camera')?.addEventListener('click', _cerrarCamera);

    // Filtros
    document.getElementById('filtro-fecha-reg')?.addEventListener('change', e => {
      _filtroFecha = e.target.value || null;
      _renderTabla();
    });
    document.getElementById('btn-filtro-hoy')?.addEventListener('click', () => {
      _filtroFecha = _hoy();
      const el = document.getElementById('filtro-fecha-reg');
      if (el) el.value = _filtroFecha;
      _renderTabla();
    });
    document.getElementById('btn-filtro-todo')?.addEventListener('click', () => {
      _filtroFecha = null;
      const el = document.getElementById('filtro-fecha-reg');
      if (el) el.value = '';
      _renderTabla();
    });

    // PDF & Print
    document.getElementById('btn-pdf-registro')?.addEventListener('click', generarPDF);
    document.getElementById('btn-print-registro')?.addEventListener('click', imprimir);
  }

  return { init, eliminar, generarPDF };
})();
