// src/export/xlsx-styles.js

export const C = {
  hxRed:'C0392B', hxDark:'1E293B', white:'FFFFFF',
  lightGray:'F5F7FA', midGray:'E2E8F0',
  headerBg:'1E293B', headerFg:'FFFFFF',
  p1Bg:'FECACA', p1Fg:'991B1B',
  p2Bg:'FDE68A', p2Fg:'92400E',
  scBg:'FCD34D', scFg:'78350F',
  okBg:'BBF7D0', okFg:'14532D',
  sdBg:'E5E7EB', sdFg:'374151',
  rowAlt:'F8FAFC'
};

export function cell(fg, bg, bold = false, sz = 10, wrap = false) {
  return {
    font: { bold, color: { rgb: fg || C.hxDark }, sz },
    fill: { fgColor: { rgb: bg || C.white } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: wrap },
    border: {
      top:    { style: 'thin', color: { rgb: C.midGray } },
      bottom: { style: 'thin', color: { rgb: C.midGray } },
      left:   { style: 'thin', color: { rgb: C.midGray } },
      right:  { style: 'thin', color: { rgb: C.midGray } }
    }
  };
}

export function header() {
  return {
    font: { bold: true, sz: 11, color: { rgb: C.white } },
    fill: { fgColor: { rgb: C.headerBg } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top:    { style: 'medium', color: { rgb: C.hxDark } },
      bottom: { style: 'medium', color: { rgb: C.hxDark } },
      left:   { style: 'thin',   color: { rgb: C.midGray } },
      right:  { style: 'thin',   color: { rgb: C.midGray } }
    }
  };
}

export function statusStyle(status) {
  const map = {
    ok:               { bg: C.okBg, fg: C.okFg },
    ok_con_otros:     { bg: C.okBg, fg: C.okFg },
    falla_p1:         { bg: C.p1Bg, fg: C.p1Fg },
    falla_p2:         { bg: C.p2Bg, fg: C.p2Fg },
    sin_comunicacion: { bg: C.scBg, fg: C.scFg },
    sin_datos:        { bg: C.sdBg, fg: C.sdFg }
  };
  const m = map[status] || { bg: C.white, fg: C.hxDark };
  return cell(m.fg, m.bg, true, 10);
}

export function contactStyle(days) {
  if (days === null || days === undefined) return cell(C.sdFg, C.sdBg, false, 10);
  if (days > 3) return cell(C.scFg, C.scBg, true, 10);
  return cell(C.okFg, C.okBg, false, 10);
}

export function errStyle(val) {
  if (val === null || val === undefined) return cell(C.sdFg, C.sdBg, false, 10);
  return val === 0 ? cell(C.okFg, C.okBg, false, 10) : cell(C.p1Fg, C.p1Bg, true, 10);
}
