// src/export/xlsx.js
import * as XLSX from 'xlsx';
import { buildSummarySheet } from './sheets/summary.js';
import { buildVehiclesSheet } from './sheets/vehicles.js';
import { buildAccountsSheet } from './sheets/accounts.js';
import { getFilteredVehicles, getAccountStats } from '../app/controller.js';

export function exportFleetXLSX(state) {
  const filtered = getFilteredVehicles(state);
  if (!filtered.length) throw new Error('No hay vehículos para exportar');

  const wb = XLSX.utils.book_new();
  const activeAcct = state.ui.account || '';
  const stats = getAccountStats(state);
  const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  const dateStr = new Date().toLocaleDateString('es-CL', { timeZone: 'America/Santiago' }).replace(/\//g, '-');

  XLSX.utils.book_append_sheet(wb, buildSummarySheet({ stats, activeAcct, now, filteredLen: filtered.length }), 'Resumen');
  XLSX.utils.book_append_sheet(wb, buildVehiclesSheet({ vehicles: filtered }), 'Vehículos');

  const accountsForSheet = activeAcct
    ? state.data.accounts.filter(a => a.account === activeAcct)
    : state.data.accounts.slice().sort((a, b) => a.account.localeCompare(b.account));
  XLSX.utils.book_append_sheet(wb, buildAccountsSheet({ accounts: accountsForSheet }), 'Por Cuenta');

  const fname = `HxPerformance_${activeAcct ? activeAcct.replace(/[^a-zA-Z0-9]/g, '_') + '_' : ''}${dateStr}.xlsx`;
  XLSX.writeFile(wb, fname);
}
