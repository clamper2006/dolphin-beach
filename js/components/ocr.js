/* ================================================================
   components/ocr.js — Playa Delfín v2.0.1
   OCR Module: Client-side cedula scanning via Tesseract.js
   100% offline-capable after first Tesseract CDN load
   ================================================================ */

const OCRScanner = (() => {
  let _stream       = null;
  let _capturedImg  = null;
  let _onComplete   = null;
  let _worker       = null;

  const STATES = {
    IDLE:         'idle',
    CAMERA:       'camera',
    PROCESSING:   'Procesando...',
    EXTRACTING:   'Extrayendo datos...',
    VALIDATING:   'Validando...',
    DONE:         'done'
  };

  /* ---- PUBLIC: init ---- */
  function open(onCompleteCb) {
    _onComplete  = onCompleteCb;
    _capturedImg = null;
    _renderModal();
    _openModal();
    _startCamera();
  }

  /* ---- MODAL HTML ---- */
  function _renderModal() {
    let existing = document.getElementById('modal-ocr');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id        = 'modal-ocr';
    modal.className = 'modal';
    modal.style.zIndex = '400';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:480px">
        <div class="modal-header">
          <h3><i class="fas fa-id-card"></i> Escanear Cédula</h3>
          <button class="modal-close" id="ocr-btn-cerrar"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" style="padding:.75rem">

          <!-- Steps indicator -->
          <div id="ocr-steps" class="ocr-steps">
            <div class="ocr-step active" id="ocr-step-1">
              <div class="ocr-step-dot">1</div>
              <span>Capturar</span>
            </div>
            <div class="ocr-step-line"></div>
            <div class="ocr-step" id="ocr-step-2">
              <div class="ocr-step-dot">2</div>
              <span>Procesar</span>
            </div>
            <div class="ocr-step-line"></div>
            <div class="ocr-step" id="ocr-step-3">
              <div class="ocr-step-dot">3</div>
              <span>Validar</span>
            </div>
          </div>

          <!-- Camera view -->
          <div id="ocr-camera-view" style="position:relative;border-radius:10px;overflow:hidden;background:#000;margin:.5rem 0">
            <video id="ocr-video" autoplay playsinline
              style="width:100%;max-height:260px;object-fit:cover;display:block"></video>
            <!-- Overlay guide -->
            <div class="ocr-frame-guide">
              <div class="ocr-corner tl"></div>
              <div class="ocr-corner tr"></div>
              <div class="ocr-corner bl"></div>
              <div class="ocr-corner br"></div>
              <span class="ocr-guide-text">Centra la cédula aquí</span>
            </div>
          </div>

          <!-- Preview view (after capture) -->
          <div id="ocr-preview-view" style="display:none;margin:.5rem 0">
            <img id="ocr-preview-img" style="width:100%;max-height:260px;object-fit:contain;border-radius:10px;border:2px solid var(--primary)" alt="Cédula capturada">
          </div>

          <!-- Status box -->
          <div id="ocr-status" class="ocr-status-box" style="display:none">
            <div class="ocr-spinner"></div>
            <span id="ocr-status-text">Procesando...</span>
          </div>

          <!-- Result box (editable) -->
          <div id="ocr-result-box" style="display:none">
            <div class="ocr-result-header">
              <i class="fas fa-check-circle" style="color:var(--success)"></i>
              <span>Datos extraídos — verifica y edita si es necesario</span>
            </div>
            <div class="form-group" style="margin-top:.5rem">
              <label for="ocr-res-nombre"><i class="fas fa-user"></i> Nombre Completo</label>
              <input type="text" id="ocr-res-nombre" placeholder="Nombre extraído de la cédula" maxlength="80">
            </div>
            <div class="form-group">
              <label for="ocr-res-cedula"><i class="fas fa-id-badge"></i> Número de Cédula</label>
              <input type="text" id="ocr-res-cedula" placeholder="Número extraído" maxlength="15">
            </div>
          </div>

          <!-- Error box -->
          <div id="ocr-error-box" class="ocr-error-box" style="display:none">
            <i class="fas fa-exclamation-triangle"></i>
            <span id="ocr-error-text">No se pudo extraer texto. Intenta de nuevo.</span>
          </div>

          <!-- Hidden canvas for processing -->
          <canvas id="ocr-canvas" style="display:none"></canvas>
        </div>

        <!-- Footer buttons -->
        <div class="modal-footer">
          <div id="ocr-footer-camera">
            <button class="btn btn-outline" id="ocr-btn-cancelar">Cancelar</button>
            <button class="btn btn-primary" id="ocr-btn-capturar">
              <i class="fas fa-camera"></i> Capturar
            </button>
          </div>
          <div id="ocr-footer-preview" style="display:none">
            <button class="btn btn-outline" id="ocr-btn-retomar">
              <i class="fas fa-redo"></i> Retomar
            </button>
            <button class="btn btn-primary" id="ocr-btn-procesar">
              <i class="fas fa-magic"></i> Procesar OCR
            </button>
          </div>
          <div id="ocr-footer-result" style="display:none">
            <button class="btn btn-outline" id="ocr-btn-reintentar">
              <i class="fas fa-redo"></i> Reintentar
            </button>
            <button class="btn btn-primary" id="ocr-btn-confirmar">
              <i class="fas fa-check"></i> Confirmar datos
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    _bindEvents();
  }

  /* ---- BIND EVENTS ---- */
  function _bindEvents() {
    document.getElementById('ocr-btn-cerrar')?.addEventListener('click',    _close);
    document.getElementById('ocr-btn-cancelar')?.addEventListener('click',  _close);
    document.getElementById('ocr-btn-capturar')?.addEventListener('click',  _capture);
    document.getElementById('ocr-btn-retomar')?.addEventListener('click',   _retake);
    document.getElementById('ocr-btn-procesar')?.addEventListener('click',  _process);
    document.getElementById('ocr-btn-reintentar')?.addEventListener('click', _retake);
    document.getElementById('ocr-btn-confirmar')?.addEventListener('click', _confirm);

    document.getElementById('modal-ocr')?.addEventListener('click', e => {
      if (e.target === document.getElementById('modal-ocr')) _close();
    });
  }

  /* ---- CAMERA ---- */
  async function _startCamera() {
    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      const video = document.getElementById('ocr-video');
      if (video) {
        video.srcObject = _stream;
        video.play();
      }
    } catch(err) {
      console.error('OCR camera error:', err);
      let msg = 'No se pudo acceder a la cámara. Verifica los permisos.';
      if (err.name === 'NotAllowedError') msg = 'Permiso de cámara denegado. Habilítalo en tu navegador.';
      else if (err.name === 'NotFoundError') msg = 'No se encontró cámara en el dispositivo.';
      else if (err.name === 'NotReadableError') msg = 'La cámara está siendo usada por otra aplicación.';
      _showError(msg);
      _setFooter('camera');
    }
  }

  function _stopCamera() {
    if (_stream) {
      _stream.getTracks().forEach(t => t.stop());
      _stream = null;
    }
  }

  /* ---- CAPTURE ---- */
  function _capture() {
    const video  = document.getElementById('ocr-video');
    const canvas = document.getElementById('ocr-canvas');
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Store original (JPEG) for preview
    _capturedImg = canvas.toDataURL('image/jpeg', 0.9);

    // Show preview
    const previewImg = document.getElementById('ocr-preview-img');
    if (previewImg) previewImg.src = _capturedImg;

    document.getElementById('ocr-camera-view').style.display = 'none';
    document.getElementById('ocr-preview-view').style.display = '';
    _setFooter('preview');
    _setStep(2);
  }

  /* ---- RETAKE ---- */
  function _retake() {
    _capturedImg = null;
    document.getElementById('ocr-camera-view').style.display = '';
    document.getElementById('ocr-preview-view').style.display = 'none';
    document.getElementById('ocr-result-box').style.display = 'none';
    document.getElementById('ocr-error-box').style.display = 'none';
    document.getElementById('ocr-status').style.display = 'none';
    _setFooter('camera');
    _setStep(1);

    // Restart camera if needed
    if (!_stream) _startCamera();
  }

  /* ---- PROCESS (OCR) ---- */
  async function _process() {
    if (!_capturedImg) return;

    _setFooter('none');
    _showStatus(STATES.PROCESSING);
    _setStep(2);

    try {
      // Preprocess image for better OCR accuracy
      const processedDataURL = _preprocessImage(_capturedImg);

      _showStatus(STATES.EXTRACTING);

      // Run Tesseract OCR
      let ocrText = '';

      // Graceful fallback if Tesseract not yet loaded
      if (typeof Tesseract === 'undefined') {
        _showError('Motor OCR no disponible. Verifica tu conexión e intenta de nuevo, o ingresa los datos manualmente.');
        _setFooter('preview');
        return;
      }

      if (typeof Tesseract !== 'undefined') {
        try {
          const result = await Tesseract.recognize(processedDataURL, 'spa+eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                const pct = Math.round((m.progress || 0) * 100);
                _showStatus(`Extrayendo datos... ${pct}%`);
              }
            }
          });
          ocrText = result?.data?.text || '';
        } catch(tessErr) {
          console.warn('Tesseract error:', tessErr);
          ocrText = '';
        }
      }

      _showStatus(STATES.VALIDATING);

      // Extract fields from OCR text
      const extracted = _extractData(ocrText);

      await _delay(400); // brief pause for UX

      // Populate result fields
      document.getElementById('ocr-res-nombre').value = extracted.nombre || '';
      document.getElementById('ocr-res-cedula').value = extracted.cedula || '';

      // Hide status, show result
      document.getElementById('ocr-status').style.display = 'none';
      document.getElementById('ocr-result-box').style.display = '';
      _setFooter('result');
      _setStep(3);

      if (!extracted.nombre && !extracted.cedula) {
        _showError('No se detectaron datos claros. Completa los campos manualmente o reintenta con mejor iluminación.');
      }

    } catch(err) {
      console.error('OCR processing error:', err);
      document.getElementById('ocr-status').style.display = 'none';
      _showError('Error al procesar. Reintenta con mejor iluminación o ingresa los datos manualmente.');
      _setFooter('preview');
    }
  }

  /* ---- IMAGE PREPROCESSING ---- */
  function _preprocessImage(dataURL) {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    const img    = new Image();

    // Synchronous via try (image is already loaded as data URL)
    img.src = dataURL;

    // Target size: scale down to 1600px wide max for performance
    const targetW = Math.min(img.width || 1280, 1600);
    const scale   = targetW / (img.width || 1280);
    canvas.width  = targetW;
    canvas.height = Math.round((img.height || 720) * scale);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Step 1: Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = data[i + 1] = data[i + 2] = gray;
    }

    // Step 2: Increase contrast (alpha=1.8, beta=-40)
    const alpha = 1.8;
    const beta  = -40;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.min(255, Math.max(0, Math.round(data[i] * alpha + beta)));
      data[i] = data[i + 1] = data[i + 2] = v;
    }

    // Step 3: Binarization (Otsu-like threshold at 128)
    const threshold = 128;
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i] > threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = v;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png'); // PNG for lossless OCR input
  }

  /* ---- EXTRACT DATA FROM OCR TEXT ---- */
  function _extractData(rawText) {
    if (!rawText) return { nombre: '', cedula: '' };

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let cedula = '';
    let nombre = '';

    // Extract cedula: 6–10 consecutive digits (optionally prefixed by V- or E-)
    const cedulaRegex = /(?:V[-\s]?|E[-\s]?)?(\d{6,10})/i;
    for (const line of lines) {
      const m = line.match(cedulaRegex);
      if (m) {
        const prefix = line.toLowerCase().includes('e-') || line.toLowerCase().includes('e ') ? 'E-' : 'V-';
        cedula = prefix + m[1];
        break;
      }
    }

    // Fallback: any 6-10 digit sequence
    if (!cedula) {
      const m = rawText.match(/\b(\d{6,10})\b/);
      if (m) cedula = 'V-' + m[1];
    }

    // Extract name: look for lines in ALL CAPS (names on Venezuelan IDs are uppercase)
    const nameRegex = /^[A-ZÁÉÍÓÚÑÜ]{2,}(?:\s[A-ZÁÉÍÓÚÑÜ]{2,}){1,5}$/;
    for (const line of lines) {
      const cleaned = line.replace(/[^A-Za-záéíóúÁÉÍÓÚÑñ\s]/g, '').trim();
      if (cleaned.length >= 5 && nameRegex.test(cleaned)) {
        nombre = _toTitleCase(cleaned);
        break;
      }
    }

    // Fallback: look for longest uppercase line
    if (!nombre) {
      let best = '';
      for (const line of lines) {
        const cleaned = line.replace(/[^A-Za-záéíóúÁÉÍÓÚÑñ\s]/g, '').trim();
        if (cleaned.length > best.length && /[A-Z]{3,}/.test(cleaned) && !/\d/.test(cleaned)) {
          best = cleaned;
        }
      }
      if (best.length >= 4) nombre = _toTitleCase(best);
    }

    return { nombre, cedula };
  }

  function _toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  /* ---- CONFIRM ---- */
  function _confirm() {
    const nombre = (document.getElementById('ocr-res-nombre')?.value || '').trim();
    const cedula = (document.getElementById('ocr-res-cedula')?.value || '').trim();

    // Validate
    const nameRegex   = /^[A-Za-záéíóúÁÉÍÓÚÑñ\s]+$/;
    const cedulaRegex = /^[VEve]-?\d{6,10}$|^\d{6,10}$/;

    if (nombre && !nameRegex.test(nombre)) {
      Toast.warning('El nombre contiene caracteres inválidos. Verifica antes de confirmar.');
    }

    if (cedula && !cedulaRegex.test(cedula)) {
      Toast.warning('La cédula no parece tener el formato correcto. Verifica.');
    }

    _close();

    if (_onComplete) {
      _onComplete({ nombre, cedula });
    }
  }

  /* ---- HELPERS ---- */
  function _openModal() {
    const modal = document.getElementById('modal-ocr');
    if (modal) modal.style.display = 'flex';
  }

  function _close() {
    _stopCamera();
    const modal = document.getElementById('modal-ocr');
    if (modal) modal.style.display = 'none';
  }

  function _showStatus(text) {
    const box  = document.getElementById('ocr-status');
    const span = document.getElementById('ocr-status-text');
    if (box)  box.style.display  = 'flex';
    if (span) span.textContent   = text;
  }

  function _showError(text) {
    const box  = document.getElementById('ocr-error-box');
    const span = document.getElementById('ocr-error-text');
    if (box)  box.style.display  = 'flex';
    if (span) span.textContent   = text;
    document.getElementById('ocr-status')?.style && (document.getElementById('ocr-status').style.display = 'none');
  }

  function _setStep(n) {
    for (let i = 1; i <= 3; i++) {
      const el = document.getElementById(`ocr-step-${i}`);
      if (el) {
        el.classList.toggle('active',    i === n);
        el.classList.toggle('completed', i < n);
      }
    }
  }

  function _setFooter(state) {
    const footers = { camera: 'ocr-footer-camera', preview: 'ocr-footer-preview', result: 'ocr-footer-result' };
    Object.values(footers).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    if (state !== 'none' && footers[state]) {
      const el = document.getElementById(footers[state]);
      if (el) el.style.display = 'flex';
    }
  }

  function _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return { open };
})();
