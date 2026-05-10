// src/view/components/header.js
import logoUrl from '../../assets/logo.png';

export function headerView({ onUploadToggle, onExport, timestamp }) {
  const root = document.createElement('header');
  root.className = 'header';
  root.innerHTML = `
    <div class="brand">
      <div class="brand-logo"><img alt="Hx"></div>
      <div>
        <div class="brand-title">Hx Performance</div>
        <div class="brand-sub">MONITOREO DE COMPONENTES</div>
      </div>
    </div>
    <div class="header-right">
      <span class="header-ts" data-ts>${timestamp || ''}</span>
      <button class="btn btn-upload" data-upload>↑ Cargar CSVs</button>
      <button class="btn btn-export" data-export>↓ Exportar XLSX</button>
    </div>
  `;
  root.querySelector('img').src = logoUrl;
  root.querySelector('[data-upload]').addEventListener('click', onUploadToggle);
  root.querySelector('[data-export]').addEventListener('click', onExport);
  return root;
}

export function updateHeaderTs(root, ts) {
  root.querySelector('[data-ts]').textContent = ts;
}
