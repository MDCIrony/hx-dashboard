// src/export/sheets/summary.js
import * as XLSX from 'xlsx';
import { C, cell, header } from '../xlsx-styles.js';

function pct(v, t) { return t ? ((v/t)*100).toFixed(1) + '%' : '0%'; }
function applyStyle(ws, r, c, s) {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (ws[addr]) ws[addr].s = s; else ws[addr] = { v: '', t: 's', s };
}

export function buildSummarySheet({ stats, activeAcct, now, filteredLen }) {
  const ws = {};
  const rows = [
    ['HX PERFORMANCE — REPORTE DE MONITOREO DE COMPONENTES'],
    ['Generado:', now],
    ['Filtro aplicado:', activeAcct || 'Todas las cuentas'],
    ['Vehículos en reporte:', filteredLen],
    [],
    ['INDICADOR', 'CANTIDAD', '% DEL TOTAL'],
    ['Total Flota', stats.total, '100%'],
    ['Sin Comunicación >72h', stats.sin_comunicacion||0, pct(stats.sin_comunicacion||0, stats.total)],
    ['Falla Crítica P1', stats.falla_p1||0, pct(stats.falla_p1||0, stats.total)],
    ['Falla Moderada P2', stats.falla_p2||0, pct(stats.falla_p2||0, stats.total)],
    ['Operativos', stats.ok||0, pct(stats.ok||0, stats.total)],
    ['Sin Datos', stats.sin_datos||0, pct(stats.sin_datos||0, stats.total)],
  ];
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A1' });
  ws['!cols'] = [{ wch: 36 }, { wch: 32 }, { wch: 16 }];
  ws['!rows'] = [{ hpt: 28 }, { hpt: 16 }, { hpt: 16 }, { hpt: 16 }, { hpt: 8 }, { hpt: 18 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  // título
  applyStyle(ws, 0, 0, {
    font: { bold: true, sz: 14, color: { rgb: C.white } },
    fill: { fgColor: { rgb: C.hxDark } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  // metadatos
  [[1,0],[2,0],[3,0]].forEach(([r,c]) => applyStyle(ws, r, c, cell(C.hxDark, C.lightGray, true, 10)));
  [[1,1],[2,1],[3,1]].forEach(([r,c]) => applyStyle(ws, r, c, cell(C.hxDark, C.white, false, 10)));
  // header
  [0,1,2].forEach(c => applyStyle(ws, 5, c, header()));
  // filas data
  const sColors = [
    null,
    { bg: C.scBg, fg: C.scFg },
    { bg: C.p1Bg, fg: C.p1Fg },
    { bg: C.p2Bg, fg: C.p2Fg },
    { bg: C.okBg, fg: C.okFg },
    { bg: C.sdBg, fg: C.sdFg }
  ];
  sColors.forEach((sc, i) => {
    const r = 6 + i;
    const m = sc || { bg: C.lightGray, fg: C.hxDark };
    [0,1,2].forEach(c => applyStyle(ws, r, c, cell(m.fg, m.bg, c === 1, 10)));
  });
  return ws;
}
