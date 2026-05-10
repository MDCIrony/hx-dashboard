// src/view/format.js
export { ageLbl, dateLbl } from '../shared/format-date.js';

export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function pct(v, total) {
  return total ? ((v / total) * 100).toFixed(1) + '%' : '0%';
}

export function getBadgeHtml(status) {
  const map = {
    ok:               { cls: 'b-ok',  txt: '✓ Operativo' },
    ok_con_otros:     { cls: 'b-ok',  txt: '✓ Operativo' },
    falla_p1:         { cls: 'b-p1',  txt: '▲ P1 Crítica' },
    falla_p2:         { cls: 'b-p2',  txt: '● P2 Moderada' },
    sin_comunicacion: { cls: 'b-sc b-sc-anim', txt: '📡 Sin Comm. >72h' },
    sin_datos:        { cls: 'b-sd',  txt: '— Sin Datos' }
  };
  const m = map[status] || { cls: 'b-sd', txt: escapeHtml(status) };
  return `<span class="badge ${m.cls}">${m.txt}</span>`;
}
