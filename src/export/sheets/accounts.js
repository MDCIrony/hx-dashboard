// src/export/sheets/accounts.js
import * as XLSX from 'xlsx';
import { C, cell, header } from '../xlsx-styles.js';

function setVal(ws, r, c, val, style) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = { v: val ?? '', t: typeof val === 'number' ? 'n' : 's', s: style };
}

export function buildAccountsSheet({ accounts }) {
  const ws = {};
  const headers = ['Cuenta','Total','Sin Comunicación','Falla P1','Falla P2','Operativos','Sin Datos'];
  headers.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = { v: h, t: 's', s: header() };
  });
  accounts.forEach((a, i) => {
    const r = i + 1;
    const altBg = i % 2 === 1 ? C.rowAlt : C.white;
    const styles = [
      cell(C.hxDark, altBg, true, 10),
      cell(C.hxDark, altBg, true, 10),
      cell(C.scFg, C.scBg, false, 10),
      cell(C.p1Fg, C.p1Bg, false, 10),
      cell(C.p2Fg, C.p2Bg, false, 10),
      cell(C.okFg, C.okBg, false, 10),
      cell(C.sdFg, C.sdBg, false, 10),
    ];
    [a.account, a.total, a.sin_comunicacion||0, a.falla_p1||0, a.falla_p2||0, a.ok||0, a.sin_datos||0]
      .forEach((v, c) => setVal(ws, r, c, v, styles[c]));
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: accounts.length, c: 6 } });
  ws['!cols'] = [{wch:32},{wch:10},{wch:18},{wch:12},{wch:12},{wch:14},{wch:12}];
  ws['!rows'] = [{ hpt: 22 }, ...accounts.map(() => ({ hpt: 18 }))];
  return ws;
}
