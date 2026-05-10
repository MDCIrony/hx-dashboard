// src/view/components/empty-state.js
// (el CSS se importa de manera centralizada desde src/main.js)

export function emptyStateView({ onPickPerf, onPickGraf, onApply, perfName, grafName, ready }) {
  const root = document.createElement('section');
  root.className = 'empty-state';
  root.innerHTML = `
    <div class="empty-card">
      <div class="empty-logo"><img src="./logo.png" alt="Hx"></div>
      <h1 class="empty-title">Hx Performance — Monitoreo de Componentes</h1>
      <p class="empty-sub">Subí los dos CSV para comenzar.</p>
      <div class="empty-rows">
        <div class="empty-row">
          <span class="empty-label">Performance.csv</span>
          <span class="empty-status" data-perf-status>${perfName ? '✓ ' + perfName : 'Sin cargar'}</span>
          <button class="empty-btn" data-pick-perf>Elegir</button>
        </div>
        <div class="empty-row">
          <span class="empty-label">Grafana.csv</span>
          <span class="empty-status" data-graf-status>${grafName ? '✓ ' + grafName : 'Sin cargar'}</span>
          <button class="empty-btn" data-pick-graf>Elegir</button>
        </div>
      </div>
      <button class="empty-apply" data-apply ${ready ? '' : 'disabled'}>Cargar dashboard</button>
      <input type="file" accept=".csv" data-file-perf hidden>
      <input type="file" accept=".csv" data-file-graf hidden>
    </div>
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
