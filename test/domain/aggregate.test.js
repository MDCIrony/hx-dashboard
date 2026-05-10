// test/domain/aggregate.test.js
import { describe, it, expect } from 'vitest';
import { buildGlobalStats, buildAccountStats } from '../../src/domain/aggregate.js';

const sample = [
  { account: 'A', status: 'ok' },
  { account: 'A', status: 'ok_con_otros' },
  { account: 'A', status: 'falla_p1' },
  { account: 'B', status: 'sin_comunicacion' },
  { account: 'B', status: 'sin_datos' },
];

describe('buildGlobalStats', () => {
  it('agrupa ok + ok_con_otros como ok', () => {
    const s = buildGlobalStats(sample);
    expect(s.total).toBe(5);
    expect(s.ok).toBe(2);
    expect(s.falla_p1).toBe(1);
    expect(s.falla_p2).toBe(0);
    expect(s.sin_comunicacion).toBe(1);
    expect(s.sin_datos).toBe(1);
  });
});

describe('buildAccountStats', () => {
  it('agrupa por cuenta, devuelve array ordenado por nombre', () => {
    const r = buildAccountStats(sample);
    expect(r.length).toBe(2);
    expect(r[0].account).toBe('A');
    expect(r[0].total).toBe(3);
    expect(r[0].ok).toBe(2);
    expect(r[1].account).toBe('B');
    expect(r[1].sin_comunicacion).toBe(1);
    expect(r[1].sin_datos).toBe(1);
  });
});
