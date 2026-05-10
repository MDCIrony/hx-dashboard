// src/export/sheets/vehicles.js
import * as XLSX from 'xlsx';
import { C, cell, header, statusStyle, contactStyle, errStyle } from '../xlsx-styles.js';
import { STATUS_LABELS, COMP_LABELS } from '../../domain/rules.js';
import { dateLbl } from '../../shared/format-date.js';

function setVal(ws, r, c, val, style) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const t = typeof val === 'number' ? 'n' : 's';
  ws[addr] = { v: val ?? '', t, s: style };
}

export function buildVehiclesSheet({ vehicles }) {
  const ws = {};
  const headers = ['Vehículo','Guardian','Cuenta','Flota','Estado','Fallas de Componente',
                   'Contacto Guardian (días)','Fecha Contacto Guardian',
                   'Contacto FFC (días)','Fecha Contacto FFC',
                   'Error SD','Error Video FFC'];
  headers.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = { v: h, t: 's', s: header() };
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: vehicles.length, c: headers.length - 1 } });
  ws['!cols'] = [{wch:14},{wch:22},{wch:22},{wch:26},{wch:22},{wch:48},{wch:16},{wch:22},{wch:16},{wch:22},{wch:10},{wch:14}];
  ws['!rows'] = [{ hpt: 22 }];

  vehicles.forEach((v, i) => {
    const r = i + 1;
    const altBg = i % 2 === 1 ? C.rowAlt : C.white;
    const baseCell = (bold = false, wrap = false) => cell(C.hxDark, altBg, bold, 10, wrap);
    const noG = !v.device_id;
    const failDesc = noG || (!v.flags.has_contact && !v.flags.has_comps) || v.flags.sin_info_con_com
      ? 'SIN INFORMACIÓN'
      : v.failed_components.length > 0
        ? v.failed_components.map(fc => `${COMP_LABELS[fc.component] || fc.component} ${fc.value}%`).join(' | ')
        : '✓ Vehículo sin fallas';

    setVal(ws, r, 0, v.vehicle, cell(C.okFg, C.okBg, true, 10));
    setVal(ws, r, 1, noG ? 'SIN GUARDIAN' : v.device_id, noG ? cell(C.sdFg, C.sdBg, false, 10) : baseCell());
    setVal(ws, r, 2, v.account, baseCell());
    setVal(ws, r, 3, v.fleet, baseCell());
    setVal(ws, r, 4, STATUS_LABELS[v.status] || v.status, statusStyle(v.status));
    setVal(ws, r, 5, failDesc, cell(
      failDesc === 'SIN INFORMACIÓN' ? C.p1Fg : failDesc === '✓ Vehículo sin fallas' ? C.okFg : C.hxDark,
      failDesc === 'SIN INFORMACIÓN' ? C.p1Bg : altBg, false, 10, true));
    setVal(ws, r, 6, v.contact_age_days ?? 'Sin Contacto', contactStyle(v.contact_age_days));
    setVal(ws, r, 7, dateLbl(v.last_contact_utc) || 'Sin Contacto', contactStyle(v.contact_age_days));
    setVal(ws, r, 8, v.ffc?.days ?? 'SIN FFC', contactStyle(v.ffc?.days ?? null));
    setVal(ws, r, 9, dateLbl(v.ffc?.lastComms) || 'SIN FFC', contactStyle(v.ffc?.days ?? null));
    setVal(ws, r, 10, v.ffc?.sdErrors ?? '—', errStyle(v.ffc?.sdErrors ?? null));
    setVal(ws, r, 11, v.ffc?.videoErrors ?? '—', errStyle(v.ffc?.videoErrors ?? null));
    ws['!rows'].push({ hpt: 18 });
  });
  return ws;
}
