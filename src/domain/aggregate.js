// src/domain/aggregate.js

function emptyStats() {
  return { total: 0, ok: 0, falla_p1: 0, falla_p2: 0, sin_comunicacion: 0, sin_datos: 0 };
}

function addToStats(s, status) {
  s.total++;
  if (status === 'ok' || status === 'ok_con_otros') s.ok++;
  else if (s[status] !== undefined) s[status]++;
}

export function buildGlobalStats(vehicles) {
  const s = emptyStats();
  for (const v of vehicles) addToStats(s, v.status);
  return s;
}

export function buildAccountStats(vehicles) {
  const byAcct = new Map();
  for (const v of vehicles) {
    const key = v.account || '(sin cuenta)';
    if (!byAcct.has(key)) byAcct.set(key, { account: key, ...emptyStats() });
    addToStats(byAcct.get(key), v.status);
  }
  return Array.from(byAcct.values()).sort((a, b) => a.account.localeCompare(b.account));
}
