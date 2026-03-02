/* ================================================================
   components/toast.js — Toast Notification System
   ================================================================ */

const Toast = (() => {
  const ICONS = {
    success: 'fa-check-circle',
    error:   'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info:    'fa-info-circle'
  };

  function show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas ${ICONS[type] || ICONS.info} toast-icon"></i>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" aria-label="Cerrar"><i class="fas fa-times"></i></button>
    `;

    const close = () => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', close);
    container.appendChild(toast);
    setTimeout(close, duration);
  }

  return {
    success: (msg, d) => show(msg, 'success', d),
    error:   (msg, d) => show(msg, 'error',   d || 5000),
    warning: (msg, d) => show(msg, 'warning', d),
    info:    (msg, d) => show(msg, 'info',    d)
  };
})();
