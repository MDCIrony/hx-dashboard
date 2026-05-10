// src/view/components/kpi-strip.js

const KPIS = [
  { key: 'all',              label: 'Total Flota',       color: '#2563eb', cls: 'c-all' },
  { key: 'sin_comunicacion', label: 'Sin Com. >72h',     color: '#b45309', cls: 'c-sc'  },
  { key: 'falla_p1',         label: 'Falla P1 Crítica',  color: '#dc2626', cls: 'c-p1'  },
  { key: 'falla_p2',         label: 'Falla P2 Moderada', color: '#d97706', cls: 'c-p2'  },
  { key: 'ok',               label: 'Operativos',        color: '#16a34a', cls: 'c-ok'  }
];

export function kpiStripView({ onFilter }) {
  const root = document.createElement('section');
  root.className = 'kpi-strip';
  root.innerHTML = `<div class="kpi-grid">${KPIS.map(k => `
    <div class="kpi-card${k.key === 'all' ? ' active' : ''}" data-f="${k.key}">
      <canvas class="kpi-pie" data-pie="${k.key}" width="42" height="42"></canvas>
      <div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-num ${k.cls}" data-num="${k.key}">0</div>
      </div>
    </div>
  `).join('')}</div>`;
  root.querySelectorAll('.kpi-card').forEach(card => {
    card.addEventListener('click', () => {
      root.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      onFilter(card.dataset.f);
    });
  });
  return root;
}

export function updateActiveFilter(root, filter) {
  const target = filter || 'all';
  root.querySelectorAll('.kpi-card').forEach(card => {
    card.classList.toggle('active', card.dataset.f === target);
  });
}

export function updateKpis(root, stats) {
  const total = stats?.total || 0;
  for (const k of KPIS) {
    const val = k.key === 'all' ? total : (stats?.[k.key] || 0);
    root.querySelector(`[data-num="${k.key}"]`).textContent = val.toLocaleString();
    drawPie(root.querySelector(`[data-pie="${k.key}"]`), val, total, k.color);
  }
}

function drawPie(canvas, val, total, color) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2, r = W/2 - 5;
  ctx.clearRect(0, 0, W, H);
  const pct = total > 0 ? val / total : 0;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI);
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 6; ctx.stroke();
  if (pct > 0) {
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + 2*Math.PI*pct);
    ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.fillStyle = pct > 0 ? color : '#9ca3af';
  ctx.font = "bold 10px 'IBM Plex Mono', monospace";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(total > 0 ? Math.round(pct*100) + '%' : '—', cx, cy);
}
