// test/domain/merge.test.js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePerformance, parseGrafana } from '../../src/domain/csv-parse.js';
import { mergeFleetData } from '../../src/domain/merge.js';

const perfCsv = readFileSync(resolve('test/fixtures/performance-sample.csv'), 'utf8');
const grafCsv = readFileSync(resolve('test/fixtures/grafana-sample.csv'), 'utf8');

describe('mergeFleetData', () => {
  it('dedup de Performance por vehicle: gana menor contact_age_days', () => {
    const perf = parsePerformance(perfCsv);
    const graf = parseGrafana(grafCsv);
    const merged = mergeFleetData(perf, graf);
    const v5 = merged.filter(v => v.vehicle === 'VEH005');
    expect(v5.length).toBe(1);
    expect(v5[0].contact_age_days).toBe(0.3);
  });

  it('join FFC por device_id ↔ guardianSerial', () => {
    const merged = mergeFleetData(parsePerformance(perfCsv), parseGrafana(grafCsv));
    const v1 = merged.find(v => v.vehicle === 'VEH001');
    expect(v1.ffc).not.toBeNull();
    expect(v1.ffc.days).toBe(1.5);
  });

  it('dedup de Grafana por guardianSerial: gana menor ffcLastCommsDays', () => {
    const merged = mergeFleetData(parsePerformance(perfCsv), parseGrafana(grafCsv));
    const v5 = merged.find(v => v.vehicle === 'VEH005');
    expect(v5.ffc.days).toBe(0.2);
    expect(v5.ffc.sdErrors).toBe(1);
  });

  it('vehículo sin device_id → ffc null', () => {
    const merged = mergeFleetData(parsePerformance(perfCsv), parseGrafana(grafCsv));
    const v4 = merged.find(v => v.vehicle === 'VEH004');
    expect(v4.ffc).toBeNull();
  });

  it('vehículo con device_id sin match en Grafana → ffc null', () => {
    const merged = mergeFleetData(parsePerformance(perfCsv), parseGrafana(grafCsv));
    // VEH002 tiene device_id DEV-002 que NO existe en grafana-sample.csv
    const v2 = merged.find(v => v.vehicle === 'VEH002');
    expect(v2).toBeDefined();
    expect(v2.ffc).toBeNull();
  });

  it('grafana huérfano (sin vehículo) se descarta', () => {
    const merged = mergeFleetData(parsePerformance(perfCsv), parseGrafana(grafCsv));
    expect(merged.find(v => v.device_id === 'DEV-999')).toBeUndefined();
  });
});
