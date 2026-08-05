const activeToasts = [];

export function showToast(msg, type = 'success') {
  const container = document.getElementById('toast');
  if (!container) return;
  const t = document.createElement('div');
  const typeClass = type === 'warning' ? 'toast-warning' : type === 'danger' ? 'toast-danger' : 'toast-success';
  t.className = `toast ${typeClass}`;
  t.textContent = msg;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));

  const dur = type === 'warning' || type === 'danger' ? 6000 : 2500;
  const timeoutId = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
    const idx = activeToasts.indexOf(timeoutId);
    if (idx !== -1) activeToasts.splice(idx, 1);
  }, dur);
  activeToasts.push(timeoutId);
}
