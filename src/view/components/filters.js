// src/view/components/filters.js
import { COMP_COLS, COMP_LABELS } from '../../domain/rules.js';
import { escapeHtml } from '../format.js';

export function filtersView({ onSearch, onAccount, onComponent, onPriority }) {
  const root = document.createElement('section');
  root.className = 'filters';
  root.innerHTML = `
    <span class="fl">Buscar</span>
    <input class="finput" type="text" placeholder="Vehículo, cuenta, guardian..." data-search>
    <span class="fl">Cuenta</span>
    <select class="finput" data-account><option value="">Todas</option></select>
    <span class="fl">Componente fallando</span>
    <select class="finput" data-component>
      <option value="">Todos</option>
      ${COMP_COLS.map(c => `<option value="${c}">${escapeHtml(COMP_LABELS[c])}</option>`).join('')}
    </select>
    <span class="fl">Estado</span>
    <select class="finput" data-priority>
      <option value="">Cualquiera</option>
      <option value="falla_p1">P1 — Crítica</option>
      <option value="falla_p2">P2 — Moderada</option>
      <option value="sin_comunicacion">Sin Comunicación</option>
      <option value="sin_datos">Sin Datos</option>
      <option value="ok">Operativo</option>
    </select>
    <span class="res-count" data-count>0 vehículos</span>
  `;
  root.querySelector('[data-search]').addEventListener('input', e => onSearch(e.target.value));
  root.querySelector('[data-account]').addEventListener('change', e => onAccount(e.target.value));
  root.querySelector('[data-component]').addEventListener('change', e => onComponent(e.target.value));
  root.querySelector('[data-priority]').addEventListener('change', e => onPriority(e.target.value));
  return root;
}

export function updateAccountOptions(root, accounts) {
  const sel = root.querySelector('[data-account]');
  while (sel.options.length > 1) sel.remove(1);
  accounts.slice().sort((a,b) => a.account.localeCompare(b.account)).forEach(a => {
    const o = document.createElement('option');
    o.value = a.account;
    o.textContent = `${a.account} (${a.total})`;
    sel.appendChild(o);
  });
}

export function updateCount(root, n) {
  root.querySelector('[data-count]').textContent = n.toLocaleString() + ' vehículos';
}
