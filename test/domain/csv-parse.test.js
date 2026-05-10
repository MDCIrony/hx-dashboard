// test/domain/csv-parse.test.js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePerformance } from '../../src/domain/csv-parse.js';

const perfCsv = readFileSync(resolve('test/fixtures/performance-sample.csv'), 'utf8');

describe('parsePerformance', () => {
  it('parsea todas las filas no vacías', () => {
    const rows = parsePerformance(perfCsv);
    expect(rows.length).toBe(7);
  });

  it('extrae los campos base correctamente', () => {
    const [first] = parsePerformance(perfCsv);
    expect(first.vehicle).toBe('VEH001');
    expect(first.device_id).toBe('DEV-001');
    expect(first.last_contact_utc).toBe('2026-05-09 10:00:00');
    expect(first.contact_age_days).toBe(0.5);
  });

  it('quita el prefijo "(SMLA) " de account y fleet', () => {
    const [first] = parsePerformance(perfCsv);
    expect(first.account).toBe('ACME');
    expect(first.fleet).toBe('ACME-FLEET-A');
  });

  it('mantiene comas dentro de campos quoted', () => {
    const rows = parsePerformance(perfCsv);
    const v6 = rows.find(r => r.vehicle === 'VEH006');
    expect(v6.account).toBe('Quote, Test');
    expect(v6.fleet).toBe('Quote, Fleet');
  });

  it('parsea los componentes en .comps como números o null', () => {
    const rows = parsePerformance(perfCsv);
    const v1 = rows.find(r => r.vehicle === 'VEH001');
    expect(v1.comps.tracking).toBe(0.5);
    expect(v1.comps.vib_motor).toBe(0.98);
    const v2 = rows.find(r => r.vehicle === 'VEH002');
    expect(v2.comps.tracking).toBeNull();
  });

  it('device_id vacío → null', () => {
    const rows = parsePerformance(perfCsv);
    const v4 = rows.find(r => r.vehicle === 'VEH004');
    expect(v4.device_id).toBeNull();
  });
});

import { parseGrafana } from '../../src/domain/csv-parse.js';
const grafCsv = readFileSync(resolve('test/fixtures/grafana-sample.csv'), 'utf8');

describe('parseGrafana', () => {
  it('omite la línea sep=,', () => {
    const rows = parseGrafana(grafCsv);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].guardianSerial).toBeDefined();
  });

  it('normaliza guardianSerial a mayúsculas y descarta NaN/vacío', () => {
    const rows = parseGrafana(grafCsv);
    const serials = rows.map(r => r.guardianSerial);
    expect(serials).toContain('DEV-001');
    expect(serials).not.toContain('NaN');
    expect(serials).not.toContain('');
  });

  it('parsea ffcLastCommsDays como número', () => {
    const rows = parseGrafana(grafCsv);
    const r = rows.find(r => r.guardianSerial === 'DEV-001');
    expect(r.ffcLastCommsDays).toBe(1.5);
    expect(r.ffcSdCriticalErrors).toBe(0);
  });
});
