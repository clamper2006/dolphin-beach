/* ================================================================
   pages/registro.js — Playa Delfín v2.0.2
   Entry Registration + OCR + Daily PDF
   ================================================================ */

const RegistroPage = (() => {
  let _registros     = [];
  let _filtroFecha   = null;
  let _cameraStream  = null;
  let _capturedPhoto = null;

  function init() {
    _registros   = Storage.loadRegistros();
    _filtroFecha = _hoy();
    _renderFecha();
    _actualizarContador();
    _renderTabla();
    _setupEventos();
  }

  function _hoy() { return new Date().toISOString().split('T')[0]; }

  function _renderFecha() {
    const el = document.getElementById('registro-fecha');
    if (el) el.textContent = new Date().toLocaleDateString('es-VE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const filtro = document.getElementById('filtro-fecha-reg');
    if (filtro) filtro.value = _hoy();
  }

  function _actualizarContador() {
    const hoy      = _hoy();
    const countHoy = _registros.filter(r => r.fecha === hoy).length;
    const el    = document.getElementById('registro-count');
    const badge = document.getElementById('badge-registro');
    if (el)    el.textContent = countHoy;
    if (badge) { badge.textContent = countHoy; badge.classList.toggle('visible', countHoy > 0); }
  }

  function _getRegistrosFiltrados() {
    return _filtroFecha ? _registros.filter(r => r.fecha === _filtroFecha) : _registros;
  }

  function _renderTabla() {
    const tbody   = document.getElementById('tbody-registros');
    const countEl = document.getElementById('table-count-reg');
    if (!tbody) return;
    const lista = _getRegistrosFiltrados().slice().reverse();
    if (countEl) countEl.textContent = `${lista.length} registros`;

    if (lista.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><i class="fas fa-inbox"></i> No hay registros para esta fecha</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map((r, idx) => `
      <tr>
        <td><strong>${lista.length - idx}</strong></td>
        <td>${r.hora || '—'}</td>
        <td><strong>${r.nombre}</strong></td>
        <td><code>${r.cedula || '—'}</code></td>
        <td>
          <button class="btn btn-sm btn-icon-danger" onclick="RegistroPage.eliminar('${r.id}')" title="Eliminar">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>`).join('');
  }

  /* ---- OCR ---- */
  function _abrirOCR() {
    if (typeof OCRScanner === 'undefined') { Toast.error('Módulo OCR no disponible'); return; }
    OCRScanner.open(result => {
      if (!result) return;
      const nombreEl = document.getElementById('reg-nombre');
      const cedulaEl = document.getElementById('reg-cedula');
      if (nombreEl && result.nombre) {
        nombreEl.value = result.nombre;
        nombreEl.classList.add('ocr-filled');
        setTimeout(() => nombreEl.classList.remove('ocr-filled'), 2000);
      }
      if (cedulaEl && result.cedula) {
        cedulaEl.value = result.cedula;
        cedulaEl.classList.add('ocr-filled');
        setTimeout(() => cedulaEl.classList.remove('ocr-filled'), 2000);
      }
      if (result.nombre || result.cedula) {
        Toast.success('Datos extraídos. Verifica y confirma.');
      } else {
        Toast.warning('No se detectaron datos. Completa manualmente.');
      }
    });
  }

  /* ---- CAMERA ---- */
  async function abrirCamara() {
    const modal = document.getElementById('modal-camara');
    if (!modal) return;
    _capturedPhoto = null;
    _mostrarPreview(null);
    try {
      _cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      const video = document.getElementById('cam-video');
      if (video) { video.srcObject = _cameraStream; video.play(); }
      _toggleCameraUI(false);
      modal.style.display = 'flex';
    } catch(err) {
      console.error('Camera error:', err);
      Toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }

  function capturar() {
    const video  = document.getElementById('cam-video');
    const canvas = document.getElementById('cam-canvas');
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    _capturedPhoto = canvas.toDataURL('image/jpeg', 0.5); // compressed for PDF
    _mostrarPreview(_capturedPhoto);
    _toggleCameraUI(true);
  }

  function retomar() {
    _capturedPhoto = null;
    _mostrarPreview(null);
    _toggleCameraUI(false);
  }

  function _mostrarPreview(src) {
    const preview   = document.getElementById('cam-preview');
    const container = document.getElementById('cam-preview-container');
    if (!preview || !container) return;
    if (src) { preview.src = src; container.style.display = 'block'; }
    else     { preview.src = ''; container.style.display  = 'none'; }
  }

  function _toggleCameraUI(captured) {
    const btnCap  = document.getElementById('btn-capturar-foto');
    const btnRet  = document.getElementById('btn-retomar');
    const btnAcep = document.getElementById('btn-aceptar-foto');
    const videoEl = document.getElementById('cam-video');
    if (btnCap)  btnCap.style.display  = captured ? 'none'        : 'inline-flex';
    if (btnRet)  btnRet.style.display  = captured ? 'inline-flex' : 'none';
    if (btnAcep) btnAcep.style.display = captured ? 'inline-flex' : 'none';
    if (videoEl) videoEl.style.display = captured ? 'none'        : 'block';
  }

  function aceptarFoto() {
    _cerrarCamara();
    const ind = document.getElementById('foto-indicator');
    if (ind) ind.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i> Foto capturada`;
  }

  function _cerrarCamara() {
    if (_cameraStream) { _cameraStream.getTracks().forEach(t => t.stop()); _cameraStream = null; }
    const modal = document.getElementById('modal-camara');
    if (modal) modal.style.display = 'none';
  }

  /* ---- REGISTER ---- */
  function registrar() {
    const nombre = document.getElementById('reg-nombre')?.value?.trim();
    const cedula = document.getElementById('reg-cedula')?.value?.trim();

    if (!nombre) { Toast.error('El nombre completo es obligatorio'); return; }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(nombre)) { Toast.error('Solo letras y espacios en el nombre'); return; }
    if (!cedula) { Toast.error('La cédula es obligatoria'); return; }

    const hoy       = _hoy();
    const duplicado = _registros.find(r => r.fecha === hoy && r.cedula === cedula);
    if (duplicado) Toast.warning(`Cédula ${cedula} ya registrada hoy a las ${duplicado.hora}`);

    const ahora = new Date();
    const registro = {
      id:    `reg_${Date.now()}`,
      fecha: hoy,
      hora:  ahora.toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit' }),
      nombre, cedula,
      foto:  _capturedPhoto || null
    };

    _registros.push(registro);
    Storage.saveRegistros(_registros);
    _actualizarContador();
    _renderTabla();

    document.getElementById('reg-nombre').value = '';
    document.getElementById('reg-cedula').value = '';
    _capturedPhoto = null;
    const ind = document.getElementById('foto-indicator');
    if (ind) ind.innerHTML = `<i class="fas fa-camera" style="color:var(--text-muted)"></i> Sin foto`;

    Toast.success(`Registrado: ${nombre}`);
  }

  function eliminar(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    _registros = _registros.filter(r => r.id !== id);
    Storage.saveRegistros(_registros);
    _actualizarContador();
    _renderTabla();
    Toast.info('Registro eliminado');
  }

  /* ================================================================
     PDF DIARIO — Un PDF con TODOS los registros del día
     Header azul completo | Logo blanco top-right | Tabla estructurada
     ================================================================ */
  function generarPDFDiario() {
    if (typeof window.jspdf === 'undefined') { Toast.warning('PDF no disponible'); return; }

    const lista  = _getRegistrosFiltrados();
    const fecha  = _filtroFecha || _hoy();

    if (lista.length === 0) {
      Toast.warning('No hay registros para generar el PDF del día');
      return;
    }

    try {
      const { jsPDF }  = window.jspdf;
      const doc        = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW      = doc.internal.pageSize.getWidth();
      const pageH      = doc.internal.pageSize.getHeight();
      const cx         = pageW / 2;
      const mL         = 14;
      const mR         = pageW - 14;
      const HEADER_H   = 42;
      const FOOTER_H   = 14;
      const COL_FOTO   = 28;  // photo column width
      const ROW_H      = 26;  // row height per record

      // ---- HEADER function (called per page) ----
      function drawHeader(pageNum, totalPages) {
        doc.setFillColor(0, 119, 182);
        doc.rect(0, 0, pageW, HEADER_H, 'F');

        // Logo placeholder top-right (white text)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('🏖 Playa Delfín', pageW - 15, 10, { align: 'right' });

        // Title
        doc.setFontSize(18);
        doc.text('Playa Delfín', cx, 14, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Registro de Entradas — Reporte Diario', cx, 22, { align: 'center' });

        const fechaDisplay = new Date(fecha + 'T12:00:00').toLocaleDateString('es-VE', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        doc.setFontSize(9);
        doc.text(fechaDisplay, cx, 30, { align: 'center' });

        doc.setFontSize(8);
        doc.text(`Total registros: ${lista.length}`, mL, 38);
        doc.text(`Página ${pageNum} de ${totalPages}`, pageW - mL, 38, { align: 'right' });
      }

      // ---- FOOTER function ----
      function drawFooter() {
        doc.setFillColor(0, 119, 182);
        doc.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, 'F');
        doc.setFontSize(7); doc.setTextColor(255, 255, 255);
        doc.text('Playa Delfín — Sistema de Gestión Operativa v2.0.2', cx, pageH - 5, { align: 'center' });
      }

      // Pre-calculate total pages (approx)
      const usableH   = pageH - HEADER_H - FOOTER_H - 24; // 24 = table header row + padding
      const rowsPerPg = Math.floor(usableH / ROW_H);
      const totalPages = Math.max(1, Math.ceil(lista.length / rowsPerPg));

      let currentPage  = 1;
      let y            = HEADER_H + 8;

      drawHeader(currentPage, totalPages);

      // Column headers
      function drawTableHeader(yPos) {
        doc.setFillColor(224, 240, 252);
        doc.rect(mL, yPos, pageW - mL * 2, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 80, 140);
        const cols = [
          { label: '#',              x: mL + 2,          w: 8  },
          { label: 'Foto',           x: mL + 12,         w: COL_FOTO },
          { label: 'Nombre Completo',x: mL + 42,         w: 70 },
          { label: 'Cédula',         x: mL + 114,        w: 30 },
          { label: 'Hora',           x: mL + 145,        w: 20 },
        ];
        cols.forEach(c => doc.text(c.label, c.x, yPos + 5.5));
        return yPos + 8;
      }

      y = drawTableHeader(y);

      // Rows
      lista.forEach((r, idx) => {
        // New page check
        if (idx > 0 && (y + ROW_H) > (pageH - FOOTER_H - 4)) {
          drawFooter();
          doc.addPage();
          currentPage++;
          y = HEADER_H + 8;
          drawHeader(currentPage, totalPages);
          y = drawTableHeader(y);
        }

        const rowY = y;

        // Row background alternation
        if (idx % 2 === 0) {
          doc.setFillColor(248, 251, 255);
          doc.rect(mL, rowY, pageW - mL * 2, ROW_H, 'F');
        }

        // Row border
        doc.setDrawColor(220, 230, 240);
        doc.rect(mL, rowY, pageW - mL * 2, ROW_H, 'S');

        // # number
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 119, 182);
        doc.text(String(idx + 1), mL + 2, rowY + ROW_H / 2 + 1);

        // Photo
        if (r.foto) {
          try {
            doc.addImage(r.foto, 'JPEG', mL + 10, rowY + 1.5, 22, ROW_H - 3, undefined, 'FAST');
          } catch(imgErr) {
            // Photo failed — draw placeholder
            doc.setFillColor(200, 220, 240);
            doc.rect(mL + 10, rowY + 1.5, 22, ROW_H - 3, 'F');
            doc.setFontSize(6); doc.setTextColor(100, 130, 160);
            doc.text('Sin foto', mL + 21, rowY + ROW_H / 2, { align: 'center' });
          }
        } else {
          doc.setFillColor(235, 242, 250);
          doc.rect(mL + 10, rowY + 1.5, 22, ROW_H - 3, 'F');
          doc.setFontSize(6); doc.setTextColor(140, 160, 180);
          doc.text('Sin foto', mL + 21, rowY + ROW_H / 2, { align: 'center' });
        }

        // Name
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
        const nameLines = doc.splitTextToSize(r.nombre || '—', 68);
        doc.text(nameLines[0], mL + 42, rowY + 8);
        if (nameLines[1]) { doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text(nameLines[1], mL + 42, rowY + 14); }

        // Cedula
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(60, 60, 60);
        doc.text(r.cedula || '—', mL + 114, rowY + ROW_H / 2 + 1);

        // Hora
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(0, 119, 182);
        doc.text(r.hora || '—', mL + 145, rowY + ROW_H / 2 + 1);

        y += ROW_H;
      });

      drawFooter();

      const fileName = `registros-${fecha}.pdf`;
      doc.save(fileName);
      Toast.success(`PDF del día generado (${lista.length} registros)`);
    } catch(e) {
      console.error('Daily PDF error:', e);
      Toast.error('Error al generar el PDF diario');
    }
  }

  /* ---- EVENTS ---- */
  function _setupEventos() {
    document.getElementById('btn-registrar')?.addEventListener('click', registrar);
    document.getElementById('btn-scan-ocr')?.addEventListener('click', _abrirOCR);
    document.getElementById('btn-pdf-diario')?.addEventListener('click', generarPDFDiario);

    document.getElementById('reg-nombre')?.addEventListener('input', function() {
      const c = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
      if (this.value !== c) this.value = c;
    });

    document.getElementById('btn-abrir-camara')?.addEventListener('click', abrirCamara);
    document.getElementById('btn-capturar-foto')?.addEventListener('click', capturar);
    document.getElementById('btn-retomar')?.addEventListener('click', retomar);
    document.getElementById('btn-aceptar-foto')?.addEventListener('click', aceptarFoto);
    document.getElementById('btn-cerrar-camara')?.addEventListener('click', _cerrarCamara);

    document.getElementById('filtro-fecha-reg')?.addEventListener('change', function() {
      _filtroFecha = this.value || _hoy();
      _renderTabla();
    });

    ['reg-nombre','reg-cedula'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') registrar(); });
    });
  }

  return { init, registrar, eliminar, generarPDFDiario };
})();
