// src/domain/csv-parse.js
import Papa from 'papaparse';
import { COMP_COLS } from './rules.js';

function clean(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function num(v) {
  const s = clean(v);
  if (s === null) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function stripSmla(s) {
  if (s === null) return null;
  return s.replace(/^\(SMLA\)\s+/, '');
}

export function parsePerformance(text) {
  const { data, errors } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  });
  if (errors.length) {
    const fatal = errors.find(e => e.type === 'Delimiter' || e.type === 'Quotes');
    if (fatal) throw new Error(`CSV inválido (Performance): ${fatal.message}`);
  }
  return data.map(row => ({
    vehicle: clean(row.vehicle),
    device_id: clean(row.device_id),
    account: stripSmla(clean(row.account)),
    fleet: stripSmla(clean(row.fleet)),
    last_contact_utc: clean(row.last_contact_utc),
    contact_age_days: num(row.contact_age_days),
    comps: Object.fromEntries(COMP_COLS.map(c => [c, num(row[c])]))
  })).filter(r => r.vehicle !== null);
}

export function parseGrafana(text) {
  let cleaned = text;
  const firstLine = text.slice(0, text.indexOf('\n')).trim().toLowerCase();
  if (firstLine.startsWith('sep=')) {
    cleaned = text.slice(text.indexOf('\n') + 1);
  }
  const { data, errors } = Papa.parse(cleaned, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^"|"$/g, '')
  });
  if (errors.length) {
    const fatal = errors.find(e => e.type === 'Delimiter' || e.type === 'Quotes');
    if (fatal) throw new Error(`CSV inválido (Grafana): ${fatal.message}`);
  }
  return data
    .map(row => ({
      guardianSerial: (clean(row.guardianSerial) || '').toUpperCase(),
      ffcLastComms: clean(row.ffcLastComms),
      ffcLastCommsDays: num(row.ffcLastCommsDays),
      ffcSdCriticalErrors: num(row.ffcSdCriticalErrors),
      ffcVideoLossErrors: num(row.ffcVideoLossErrors)
    }))
    .filter(r => r.guardianSerial && r.guardianSerial !== 'NAN');
}
