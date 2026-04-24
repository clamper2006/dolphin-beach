/* ================================================================
   components/toast.js — Playa Delfín v2.0.1
   Notification toasts
   ================================================================ */

const Toast = (() => {
  let _container = null;

  function _getContainer() {
    if (!_container) {
      _container = document.getElementById('toast-container');
      if (!_container) {
        _container = document.createElement('div');
        _container.id = 'toast-container';
        document.body.appendChild(_container);
      }
    }
    return _container;
  }

  function _show(message, type = 'info', duration = 3500) {
    const container = _getContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: 'fa-check-circle',
      error:   'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info:    'fa-info-circle'
    };
    const icon = icons[type] || icons.info;

    toast.innerHTML = `
      <i class="fas ${icon} toast-icon"></i>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" aria-label="Cerrar"><i class="fas fa-times"></i></button>
    `;

    const close = toast.querySelector('.toast-close');
    close.addEventListener('click', () => _dismiss(toast));

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));

    const timer = setTimeout(() => _dismiss(toast), duration);
    toast._timer = timer;

    return toast;
  }

  function _dismiss(toast) {
    clearTimeout(toast._timer);
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }

  return {
    success: (msg, dur) => _show(msg, 'success', dur),
    error:   (msg, dur) => _show(msg, 'error',   dur || 5000),
    warning: (msg, dur) => _show(msg, 'warning', dur),
    info:    (msg, dur) => _show(msg, 'info',    dur)
  };
})();
