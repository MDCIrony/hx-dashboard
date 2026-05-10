// src/view/components/upload-panel.js
export function uploadPanelView({ onPickPerf, onPickGraf, onApply }) {
  const root = document.createElement('div');
  root.className = 'upload-panel';
  root.innerHTML = `
    <div class="up-title">Reemplazar datos</div>
    <div class="up-row">
      <span class="up-label">Performance.csv</span>
      <span class="up-status" data-perf-status>Sin cargar</span>
      <button class="up-btn" data-pick-perf>Elegir</button>
    </div>
    <div class="up-row">
      <span class="up-label">Grafana.csv</span>
      <span class="up-status" data-graf-status>Sin cargar</span>
      <button class="up-btn" data-pick-graf>Elegir</button>
    </div>
    <button class="up-apply" data-apply disabled>Aplicar</button>
    <input type="file" accept=".csv" data-file-perf hidden>
    <input type="file" accept=".csv" data-file-graf hidden>
  `;
  const fp = root.querySelector('[data-file-perf]');
  const fg = root.querySelector('[data-file-graf]');
  root.querySelector('[data-pick-perf]').addEventListener('click', () => fp.click());
  root.querySelector('[data-pick-graf]').addEventListener('click', () => fg.click());
  fp.addEventListener('change', e => { if (e.target.files[0]) onPickPerf(e.target.files[0]); e.target.value=''; });
  fg.addEventListener('change', e => { if (e.target.files[0]) onPickGraf(e.target.files[0]); e.target.value=''; });
  root.querySelector('[data-apply]').addEventListener('click', onApply);
  return root;
}

export function setUploadStatus(root, kind, name, ready) {
  const sel = kind === 'perf' ? '[data-perf-status]' : '[data-graf-status]';
  const el = root.querySelector(sel);
  el.textContent = name ? '✓ ' + name : 'Sin cargar';
  el.classList.toggle('loaded', !!name);
  root.querySelector('[data-apply]').disabled = !ready;
}

export function toggleUploadPanel(root, force) {
  if (force === undefined) root.classList.toggle('open');
  else root.classList.toggle('open', force);
}
