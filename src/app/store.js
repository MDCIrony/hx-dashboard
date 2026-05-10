// src/app/store.js

export function createStore(initial) {
  let state = initial;
  const subs = new Set();

  function notify() { for (const fn of subs) fn(state); }

  return {
    getState: () => state,
    setState(patch) {
      state = mergeDeep(state, patch);
      notify();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    }
  };
}

function mergeDeep(target, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out = { ...target };
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    out[k] = (v && typeof v === 'object' && !Array.isArray(v))
      ? mergeDeep(target?.[k] ?? {}, v)
      : v;
  }
  return out;
}

export const INITIAL_STATE = {
  data: { vehicles: [], accounts: [], stats: null, loadedAt: null },
  ui: {
    filter: 'all', search: '', account: '', component: '',
    priority: '', sortCol: 'status', sortDir: 'asc', page: 1
  }
};
