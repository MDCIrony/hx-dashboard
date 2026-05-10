// src/app/controller.js
import { parsePerformance, parseGrafana } from '../domain/csv-parse.js';
import { mergeFleetData } from '../domain/merge.js';
import { classifyVehicle } from '../domain/classify.js';
import { buildGlobalStats, buildAccountStats } from '../domain/aggregate.js';
import { STATUS_ORDER, PAGE_SIZE } from '../domain/rules.js';

export function createController(store) {
  return {
    async handleApplyUpload(perfText, grafText) {
      const perf = parsePerformance(perfText);
      const graf = parseGrafana(grafText);
      const merged = mergeFleetData(perf, graf);
      const vehicles = merged.map(classifyVehicle);
      const stats = buildGlobalStats(vehicles);
      const accounts = buildAccountStats(vehicles);
      store.setState({
        data: { vehicles, accounts, stats, loadedAt: new Date().toISOString() },
        ui: { filter: 'all', search: '', account: '', component: '', priority: '', sortCol: 'status', sortDir: 'asc', page: 1 }
      });
    },

    reset() {
      store.setState({
        data: { vehicles: [], accounts: [], stats: null, loadedAt: null },
        ui: { filter: 'all', search: '', account: '', component: '', priority: '', sortCol: 'status', sortDir: 'asc', page: 1 }
      });
    },

    setFilter(v)    { store.setState({ ui: { filter: v, page: 1 } }); },
    setSearch(v)    { store.setState({ ui: { search: v.toLowerCase(), page: 1 } }); },
    setAccount(v)   { store.setState({ ui: { account: v, page: 1 } }); },
    setComponent(v) { store.setState({ ui: { component: v, page: 1 } }); },
    setPriority(v)  { store.setState({ ui: { priority: v, page: 1 } }); },
    setSort(col) {
      const ui = store.getState().ui;
      const sortDir = (ui.sortCol === col && ui.sortDir === 'asc') ? 'desc' : 'asc';
      store.setState({ ui: { sortCol: col, sortDir, page: 1 } });
    },
    setPage(p) { store.setState({ ui: { page: p } }); },
  };
}

// Selector derivado
export function getFilteredVehicles(state) {
  const { vehicles } = state.data;
  const { filter, search, account, component, priority, sortCol, sortDir } = state.ui;
  let out = vehicles.filter(v => {
    if (filter === 'ok' && v.status !== 'ok' && v.status !== 'ok_con_otros') return false;
    if (filter !== 'all' && filter !== 'ok' && v.status !== filter) return false;
    if (account && v.account !== account) return false;
    if (priority && v.status !== priority) return false;
    if (search) {
      const s = search;
      if (!(v.vehicle || '').toLowerCase().includes(s)
        && !(v.account || '').toLowerCase().includes(s)
        && !(v.device_id || '').toLowerCase().includes(s)
        && !(v.fleet || '').toLowerCase().includes(s)) return false;
    }
    if (component && !v.failed_components.some(fc => fc.component === component)) return false;
    return true;
  });
  out = sortVehicles(out, sortCol, sortDir);
  return out;
}

function sortVehicles(arr, col, dir) {
  const factor = dir === 'asc' ? 1 : -1;
  return arr.slice().sort((a, b) => {
    let va = a[col], vb = b[col];
    if (col === 'status') { va = STATUS_ORDER[va] ?? 99; vb = STATUS_ORDER[vb] ?? 99; }
    if (va === null || va === undefined) va = factor > 0 ? Infinity : -Infinity;
    if (vb === null || vb === undefined) vb = factor > 0 ? Infinity : -Infinity;
    if (typeof va === 'string') return factor * va.localeCompare(vb);
    return factor * (va - vb);
  });
}

export function getAccountStats(state) {
  const { account } = state.ui;
  if (!account) return state.data.stats;
  const acct = state.data.accounts.find(a => a.account === account);
  return acct || state.data.stats;
}

export { PAGE_SIZE };
