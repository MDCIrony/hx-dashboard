// src/domain/merge.js

export function mergeFleetData(perfRows, grafRows) {
  // 1. Dedup perfRows por vehicle (gana menor contact_age_days)
  const byVehicle = new Map();
  for (const r of perfRows) {
    if (!r.vehicle) continue;
    const cur = byVehicle.get(r.vehicle);
    if (!cur) { byVehicle.set(r.vehicle, r); continue; }
    const a = r.contact_age_days, b = cur.contact_age_days;
    if (a !== null && (b === null || a < b)) byVehicle.set(r.vehicle, r);
  }

  // 2. Dedup grafRows por guardianSerial (gana menor ffcLastCommsDays)
  const ffcByGuardian = new Map();
  for (const g of grafRows) {
    const key = g.guardianSerial;
    if (!key) continue;
    const cur = ffcByGuardian.get(key);
    const candidate = {
      lastComms: g.ffcLastComms,
      days: g.ffcLastCommsDays,
      sdErrors: g.ffcSdCriticalErrors,
      videoErrors: g.ffcVideoLossErrors
    };
    if (!cur) { ffcByGuardian.set(key, candidate); continue; }
    const a = candidate.days, b = cur.days;
    if (a !== null && (b === null || a < b)) ffcByGuardian.set(key, candidate);
  }

  // 3. Join left desde Performance
  const out = [];
  for (const r of byVehicle.values()) {
    const key = (r.device_id || '').toUpperCase();
    const ffc = key ? (ffcByGuardian.get(key) || null) : null;
    out.push({ ...r, ffc });
  }
  return out;
}
