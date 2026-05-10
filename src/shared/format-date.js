// src/shared/format-date.js

export function ageLbl(days) {
  if (days === null || days === undefined) return null;
  const h = days * 24;
  if (h < 1) return Math.round(h * 60) + 'min';
  if (h < 24) return h.toFixed(1) + 'h';
  return days.toFixed(1) + 'd';
}

export function dateLbl(utcStr) {
  if (!utcStr) return '';
  const d = new Date(utcStr.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
