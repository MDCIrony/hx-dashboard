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
    if (!byAcct.has(v.account)) byAcct.set(v.account, { account: v.account, ...emptyStats() });
    addToStats(byAcct.get(v.account), v.status);
  }
  return Array.from(byAcct.values()).sort((a, b) => a.account.localeCompare(b.account));
}
