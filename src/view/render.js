// src/view/render.js
import { emptyStateView } from './components/empty-state.js';
import { headerView, updateHeaderTs } from './components/header.js';
import { kpiStripView, updateKpis, updateActiveFilter } from './components/kpi-strip.js';
import { filtersView, updateAccountOptions, syncFilterInputs, updateCount } from './components/filters.js';
import { alertBannerView, updateAlertCount } from './components/alert-banner.js';
import { vehicleTableView, updateTable } from './components/vehicle-table.js';
import { vehicleModalView, showVehicle } from './components/vehicle-modal.js';
import { uploadPanelView, setUploadStatus, toggleUploadPanel } from './components/upload-panel.js';
import { toastView, showToast } from './components/toast.js';
import { getFilteredVehicles, getAccountStats } from '../app/controller.js';

export function mount(container, store, controller, exportFn) {
  const view = {
    mode: null,           // 'empty' | 'full'
    pendingPerf: null,    // { name, text }
    pendingGraf: null,
    refs: {}              // referencias a roots de componentes
  };

  const toast = toastView();
  container.appendChild(toast);

  function readFile(file) {
    return new Promise((res, rej) => {
      if (file.size > 50 * 1024 * 1024) return rej(new Error('Archivo > 50 MB'));
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error('No se pudo leer el archivo'));
      r.readAsText(file, 'utf-8');
    });
  }

  async function applyUpload() {
    if (!view.pendingPerf || !view.pendingGraf) {
      showToast(toast, '⚠ Cargá ambos archivos primero');
      return;
    }
    showToast(toast, '⏳ Procesando archivos…');
    try {
      await controller.handleApplyUpload(view.pendingPerf.text, view.pendingGraf.text);
      view.pendingPerf = null; view.pendingGraf = null;
      showToast(toast, '✅ Dashboard actualizado');
    } catch (err) {
      console.error(err);
      showToast(toast, '❌ ' + err.message);
    }
  }

  async function pickFile(kind, file) {
    try {
      const text = await readFile(file);
      const slot = { name: file.name, text };
      if (kind === 'perf') view.pendingPerf = slot; else view.pendingGraf = slot;
      const ready = !!(view.pendingPerf && view.pendingGraf);
      if (view.mode === 'empty') {
        const root = view.refs.empty;
        root.querySelector(kind === 'perf' ? '[data-perf-status]' : '[data-graf-status]').textContent = '✓ ' + file.name;
        root.querySelector('[data-apply]').disabled = !ready;
      } else if (view.refs.uploadPanel) {
        setUploadStatus(view.refs.uploadPanel, kind, file.name, ready);
      }
    } catch (err) {
      showToast(toast, '❌ ' + err.message);
    }
  }

  function buildEmpty() {
    if (view.refs.modal && typeof view.refs.modal._destroy === 'function') view.refs.modal._destroy();
    container.replaceChildren(toast);
    const empty = emptyStateView({
      onPickPerf: f => pickFile('perf', f),
      onPickGraf: f => pickFile('graf', f),
      onApply: applyUpload,
      ready: false
    });
    container.appendChild(empty);
    view.refs = { empty };
    view.mode = 'empty';
  }

  function buildFull() {
    if (view.refs.modal && typeof view.refs.modal._destroy === 'function') view.refs.modal._destroy();
    container.replaceChildren(toast);
    const uploadPanel = uploadPanelView({
      onPickPerf: f => pickFile('perf', f),
      onPickGraf: f => pickFile('graf', f),
      onApply: () => { applyUpload(); toggleUploadPanel(uploadPanel, false); }
    });
    const header = headerView({
      onUploadToggle: () => toggleUploadPanel(uploadPanel),
      onExport: () => exportFn(store.getState()),
      timestamp: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })
    });
    const kpi = kpiStripView({ onFilter: f => controller.setFilter(f) });
    const banner = alertBannerView({ onClick: () => controller.setFilter('sin_comunicacion') });
    const filters = filtersView({
      onSearch: v => controller.setSearch(v),
      onAccount: v => { controller.setAccount(v); },
      onComponent: v => controller.setComponent(v),
      onPriority: v => controller.setPriority(v)
    });
    const modal = vehicleModalView();
    const table = vehicleTableView({
      onSort: c => controller.setSort(c),
      onRowClick: v => showVehicle(modal, v),
      onPage: p => { controller.setPage(p); window.scrollTo(0, 300); }
    });

    container.append(header, uploadPanel, kpi, banner, filters, table, modal);
    view.refs = { header, kpi, banner, filters, table, modal, uploadPanel };
    view.mode = 'full';
  }

  function update(state) {
    const isEmpty = state.data.vehicles.length === 0;
    if (isEmpty && view.mode !== 'empty') buildEmpty();
    else if (!isEmpty && view.mode !== 'full') buildFull();

    if (view.mode === 'full') {
      const stats = getAccountStats(state);
      updateKpis(view.refs.kpi, stats);
      updateActiveFilter(view.refs.kpi, state.ui.filter);
      updateAlertCount(view.refs.banner, stats.sin_comunicacion || 0);
      updateAccountOptions(view.refs.filters, state.data.accounts, state.ui.account);
      syncFilterInputs(view.refs.filters, state.ui);
      const filtered = getFilteredVehicles(state);
      updateCount(view.refs.filters, filtered.length);
      updateTable(view.refs.table, {
        vehicles: filtered,
        page: state.ui.page,
        sortCol: state.ui.sortCol,
        sortDir: state.ui.sortDir
      });
      updateHeaderTs(view.refs.header, new Date(state.data.loadedAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' }));
    }
  }

  store.subscribe(update);
  update(store.getState());
}
