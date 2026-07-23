export function showToast(msg, type = 'success') {
  const container = document.getElementById('toast');
  if (!container) return;
  const t = document.createElement('div');
  const typeClass = type === 'warning' ? 'toast-warning' : type === 'danger' ? 'toast-danger' : 'toast-success';
  t.className = `toast ${typeClass}`;
  t.textContent = msg;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

export function initToast() {
}
