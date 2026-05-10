// src/view/format.js

export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function ageLbl(days) {
  if (days === null || days === undefined) return null;
  const h = days * 24;
  if (h < 1) return Math.round(h * 60) + 'min';
  if (h < 24) return h.toFixed(1) + 'h';
  return days.toFixed(1) + 'd';
}

export function dateLbl(utcStr) {
  if (!utcStr) return '';
  try {
    return new Date(utcStr.replace(' ', 'T') + 'Z').toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
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
