// src/view/components/alert-banner.js
export function alertBannerView({ onClick }) {
  const root = document.createElement('section');
  root.className = 'alert-banner';
  root.innerHTML = `
    <span class="alert-icon">⚠</span>
    <span class="alert-text">Sin Comunicación</span>
    <span class="alert-sub">— vehículos sin contacto en las últimas 72h</span>
    <span class="alert-count" data-count>0 vehículos →</span>
  `;
  root.querySelector('[data-count]').addEventListener('click', onClick);
  return root;
}

export function updateAlertCount(root, n) {
  root.querySelector('[data-count]').textContent = `${n.toLocaleString()} vehículos →`;
  root.style.display = n > 0 ? '' : 'none';
}
