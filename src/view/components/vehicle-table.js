// src/view/components/vehicle-table.js
import { COMP_LABELS, PAGE_SIZE } from '../../domain/rules.js';
import { ageLbl, dateLbl, escapeHtml, getBadgeHtml } from '../format.js';

const COLS = [
  { key: 'vehicle',          label: 'Vehículo' },
  { key: 'device_id',        label: 'Guardian' },
  { key: 'account',          label: 'Cuenta' },
  { key: 'fleet',            label: 'Flota' },
  { key: 'status',           label: 'Estado' },
  { key: null,               label: 'Fallas' },
  { key: 'contact_age_days', label: 'Contacto Guardian' },
  { key: 'ffcLastCommsDays', label: 'Contacto FFC' },
  { key: 'ffcSdCriticalErrors', label: 'Error SD' },
  { key: 'ffcVideoLossErrors',  label: 'Error Video' }
];

export function vehicleTableView({ onSort, onRowClick, onPage }) {
  const root = document.createElement('section');
  root.className = 'table-wrap';
  root.innerHTML = `
    <table>
      <thead><tr>${COLS.map(c => `<th data-col="${c.key || ''}">${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
      <tbody data-tbody></tbody>
    </table>
    <div class="pag" data-pag></div>
  `;
  root.querySelectorAll('th').forEach(th => {
    const col = th.dataset.col;
    if (!col) return;
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => onSort(col));
  });
  root._handlers = { onRowClick, onPage };
  return root;
}

export function updateTable(root, { vehicles, page, sortCol, sortDir }) {
  // sort indicator
  root.querySelectorAll('th').forEach(th => {
    th.className = th.dataset.col === sortCol ? sortDir : '';
  });

  const totalPages = Math.max(1, Math.ceil(vehicles.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = vehicles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const tbody = root.querySelector('[data-tbody]');
  const frag = document.createDocumentFragment();
  for (const v of slice) frag.appendChild(buildRow(v, root._handlers.onRowClick));
  tbody.replaceChildren(frag);

  renderPagination(root.querySelector('[data-pag]'), safePage, totalPages, root._handlers.onPage);
}

function buildRow(v, onRowClick) {
  const tr = document.createElement('tr');
  const rowCls = { ok:'row-ok', ok_con_otros:'row-ok-otros', falla_p1:'row-p1',
                   falla_p2:'row-p2', sin_comunicacion:'row-sc', sin_datos:'row-sd' };
  tr.className = rowCls[v.status] || '';
  tr.addEventListener('click', () => onRowClick(v));

  const noGuardian = !v.device_id;
  const flags = v.flags;

  let pillsHtml;
  if (noGuardian || (!flags.has_contact && !flags.has_comps) || flags.sin_info_con_com) {
    pillsHtml = `<span class="sin-info">SIN INFORMACIÓN</span>`;
  } else if (v.failed_components.length > 0) {
    pillsHtml = `<div class="pills">${v.failed_components.map(fc =>
      `<span class="pill pill-p${fc.priority}">${escapeHtml(COMP_LABELS[fc.component] || fc.component)} ${fc.value}%</span>`
    ).join('')}</div>`;
  } else {
    pillsHtml = `<span class="no-falla">✓ Vehículo sin fallas</span>`;
  }

  tr.innerHTML = `
    <td class="veh"><span class="veh-chip">${escapeHtml(v.vehicle)}</span></td>
    <td>${noGuardian ? '<span class="guardian-none">SIN GUARDIAN</span>' : `<span class="guardian-chip">${escapeHtml(v.device_id)}</span>`}</td>
    <td class="acc" title="${escapeHtml(v.account)}">${escapeHtml(v.account)}</td>
    <td class="flt" title="${escapeHtml(v.fleet)}">${escapeHtml(v.fleet)}</td>
    <td>${getBadgeHtml(v.status)}</td>
    <td>${pillsHtml}</td>
    <td>${guardianContactHtml(v)}</td>
    <td>${ffcContactHtml(v)}</td>
    <td>${ffcErrHtml(v.ffc?.sdErrors)}</td>
    <td>${ffcErrHtml(v.ffc?.videoErrors)}</td>
  `;
  return tr;
}

function guardianContactHtml(v) {
  const age = v.contact_age_days;
  if (age === null) return `<div class="contact-cell"><span class="contact-none">Sin Contacto</span></div>`;
  const lbl = ageLbl(age), dl = dateLbl(v.last_contact_utc);
  if (age > 3) return `<div class="contact-cell"><span class="contact-crit">📡 ${escapeHtml(lbl)} ⚠</span><br><span class="contact-date">${escapeHtml(dl)}</span></div>`;
  const showOK = !!v.device_id && v.flags.has_comps;
  return `<div class="contact-cell"><div class="contact-ok-row"><span class="contact-val">${escapeHtml(lbl)}</span>${showOK ? '<span class="contact-ok-tag">OK</span>' : ''}</div><span class="contact-date">${escapeHtml(dl)}</span></div>`;
}

function ffcContactHtml(v) {
  const days = v.ffc?.days ?? null;
  if (days === null) return `<span class="ffc-none">SIN FFC</span>`;
  const lbl = ageLbl(days), dl = dateLbl(v.ffc.lastComms);
  if (days > 3) return `<div class="ffc-cell"><span class="ffc-crit">📡 ${escapeHtml(lbl)} ⚠</span><br><span class="ffc-date">${escapeHtml(dl)}</span></div>`;
  return `<div class="ffc-cell"><div class="ffc-ok-row"><span class="ffc-val">${escapeHtml(lbl)}</span><span class="ffc-ok-tag">OK</span></div><span class="ffc-date">${escapeHtml(dl)}</span></div>`;
}

function ffcErrHtml(val) {
  if (val === null || val === undefined) return `<span class="sin-datos-txt">—</span>`;
  const n = Number(val);
  return `<span class="ffc-err-cell ${n === 0 ? 'ffc-err-ok' : 'ffc-err-bad'}">${n === 0 ? '0 ✓' : n + ' ⚠'}</span>`;
}

function renderPagination(pag, page, total, onPage) {
  pag.innerHTML = '';
  if (total <= 1) return;
  const btn = (label, dis, act, cb) => {
    const b = document.createElement('button');
    b.className = 'pb' + (act ? ' active' : '');
    b.textContent = label;
    b.disabled = dis;
    if (!dis) b.addEventListener('click', cb);
    return b;
  };
  pag.appendChild(btn('←', page === 1, false, () => onPage(page - 1)));
  const s = Math.max(1, page - 2), e = Math.min(total, page + 2);
  if (s > 1) {
    pag.appendChild(btn(1, false, false, () => onPage(1)));
    if (s > 2) {
      const d = document.createElement('span'); d.className = 'pi'; d.textContent = '…';
      pag.appendChild(d);
    }
  }
  for (let p = s; p <= e; p++) pag.appendChild(btn(String(p), false, p === page, () => onPage(p)));
  if (e < total) {
    if (e < total - 1) {
      const d = document.createElement('span'); d.className = 'pi'; d.textContent = '…';
      pag.appendChild(d);
    }
    pag.appendChild(btn(String(total), false, false, () => onPage(total)));
  }
  pag.appendChild(btn('→', page === total, false, () => onPage(page + 1)));
  const info = document.createElement('span');
  info.className = 'pi';
  info.textContent = `Pág. ${page} / ${total}`;
  pag.appendChild(info);
}
