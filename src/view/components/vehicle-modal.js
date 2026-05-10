// src/view/components/vehicle-modal.js
import { P1_COLS, P2_COLS, P3_COLS, COMP_LABELS } from '../../domain/rules.js';
import { ageLbl, dateLbl, escapeHtml, getBadgeHtml } from '../format.js';

export function vehicleModalView() {
  const root = document.createElement('div');
  root.id = 'overlay';
  root.innerHTML = `
    <div class="modal">
      <div class="m-head">
        <div>
          <div class="m-veh" data-veh></div>
          <div class="m-guardian" data-guardian></div>
          <div class="m-meta" data-meta></div>
        </div>
        <button class="m-close" data-close>✕</button>
      </div>
      <div class="m-body">
        <div data-comm-box></div>
        <div data-ffc-box></div>
        <div data-general></div>
        <div data-components></div>
      </div>
    </div>
  `;
  root.querySelector('[data-close]').addEventListener('click', () => root.classList.remove('open'));
  root.addEventListener('click', e => { if (e.target === root) root.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') root.classList.remove('open'); });
  return root;
}

export function showVehicle(root, v) {
  root.querySelector('[data-veh]').textContent = v.vehicle;
  root.querySelector('[data-guardian]').textContent = 'Guardian: ' + (v.device_id || 'SIN GUARDIAN');
  root.querySelector('[data-meta]').textContent = `${v.account} · ${v.fleet}`;
  root.querySelector('[data-comm-box]').innerHTML = commBoxHtml(v);
  root.querySelector('[data-ffc-box]').innerHTML = ffcBoxHtml(v);
  root.querySelector('[data-general]').innerHTML = `<div class="mrow"><span class="mrow-l">Estado</span><span>${getBadgeHtml(v.status)}</span></div>`;
  root.querySelector('[data-components]').innerHTML = componentsHtml(v);
  root.classList.add('open');
}

function commBoxHtml(v) {
  const age = v.contact_age_days;
  if (age === null) {
    return `<div class="comm-box none"><div><div class="comm-big none">Sin Contacto</div><div class="comm-label">Guardian — sin registro de contacto</div></div></div>`;
  }
  const isCrit = age > 3, isWarn = age > 1 && !isCrit;
  const cls = isCrit ? 'crit' : isWarn ? 'warn' : 'ok';
  const lbl = ageLbl(age), dl = dateLbl(v.last_contact_utc);
  const badge = isCrit ? '<span class="badge b-sc b-sc-anim">📡 Sin Comunicación >72h</span>'
              : isWarn ? '<span class="badge b-p2">⚠ Contacto con retraso</span>'
                       : '<span class="badge b-ok">✓ Comunicación Normal</span>';
  return `<div class="comm-box ${cls}">
    <div>
      <div class="comm-big ${cls}">${escapeHtml(lbl)}</div>
      <div class="comm-label">Guardian — Antigüedad último contacto</div>
      <div class="comm-date">${escapeHtml(dl)}</div>
    </div>
    <div class="comm-status-badge">${badge}</div>
  </div>`;
}

function ffcBoxHtml(v) {
  const ffc = v.ffc;
  if (!ffc || ffc.days === null) {
    return `<div class="ffc-box"><div class="ffc-box-title">📷 FFC — Forward Facing Camera</div><div class="ffc-empty">SIN FFC — Sin datos de cámara frontal</div></div>`;
  }
  const isCrit = ffc.days > 3;
  const sdClass = ffc.sdErrors === 0 ? 'ok' : 'crit';
  const vidClass = ffc.videoErrors === 0 ? 'ok' : 'warn';
  return `<div class="ffc-box">
    <div class="ffc-box-title">📷 FFC — Forward Facing Camera</div>
    <div class="ffc-grid">
      <div>
        <div class="ffc-item-label">Último Contacto</div>
        <div class="ffc-item-val ${isCrit ? 'crit' : 'ok'}">${isCrit ? '📡 ' : ''}${escapeHtml(ageLbl(ffc.days))}${isCrit ? ' ⚠' : ''}</div>
        <div class="ffc-item-date">${escapeHtml(dateLbl(ffc.lastComms))}</div>
      </div>
      <div><div class="ffc-item-label">Error SD</div><div class="ffc-item-val ${sdClass}">${ffc.sdErrors === 0 ? '0 ✓' : ffc.sdErrors + ' ⚠'}</div></div>
      <div><div class="ffc-item-label">Error Video</div><div class="ffc-item-val ${vidClass}">${ffc.videoErrors === 0 ? '0 ✓' : ffc.videoErrors + ' ⚠'}</div></div>
    </div>
  </div>`;
}

function componentsHtml(v) {
  if (!v.device_id) return `<div class="m-empty">Sin Guardian asignado — sin datos de componentes.</div>`;
  if (v.flags.sin_info_con_com || (!v.flags.has_comps && !v.flags.sin_comunicacion))
    return `<div class="m-warn">⚠ Comunicación activa pero sin datos de componentes.</div>`;
  if (!v.flags.has_comps) return `<div class="m-empty">Sin datos de componentes disponibles.</div>`;

  const failMap = Object.fromEntries(v.failed_components.map(f => [f.component, f]));
  const groups = [
    { label: 'Prioridad 1 — Crítica',        tag: 'p1', cols: P1_COLS, color: 'var(--p1)' },
    { label: 'Prioridad 2 — Moderada',       tag: 'p2', cols: P2_COLS, color: 'var(--p2)' },
    { label: 'Otros Componentes (FFC / PSU)', tag: 'p3', cols: P3_COLS, color: 'var(--otra)' }
  ];

  return groups.map(g => `
    <div class="prio-section">
      <div class="prio-header"><span class="prio-tag ${g.tag}">${g.label}</span></div>
      ${g.cols.map(col => {
        const f = failMap[col];
        const failing = !!f;
        const pct = failing ? f.value : null;
        const color = failing ? g.color : 'var(--ok)';
        return `<div class="ccomp-row ${failing ? 'failing-' + g.tag : ''}">
          <span class="ccomp-name">${escapeHtml(COMP_LABELS[col] || col)}</span>
          <div class="ccomp-right">
            <div class="cbar"><div class="cbar-fill" style="width:${failing ? pct : 100}%;background:${color}"></div></div>
            <span class="cpct" style="color:${color}">${failing ? pct.toFixed(1) + '%' : 'OK'}</span>
            ${failing ? `<span class="badge b-${g.tag}">FALLA</span>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  `).join('');
}
