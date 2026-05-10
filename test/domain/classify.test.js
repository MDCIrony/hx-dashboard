// test/domain/classify.test.js
import { describe, it, expect } from 'vitest';
import { classifyVehicle } from '../../src/domain/classify.js';
import { COMP_COLS } from '../../src/domain/rules.js';

function vehicle(overrides = {}) {
  const comps = Object.fromEntries(COMP_COLS.map(c => [c, 1.0]));
  return {
    vehicle: 'V', device_id: 'D', account: 'A', fleet: 'F',
    last_contact_utc: '2026-05-09 10:00:00',
    contact_age_days: 0.5,
    comps,
    ffc: null,
    ...overrides
  };
}

describe('classifyVehicle', () => {
  it('todos los comps OK → ok', () => {
    const v = classifyVehicle(vehicle());
    expect(v.status).toBe('ok');
    expect(v.failed_components).toEqual([]);
  });

  it('contact_age_days > 3 → sin_comunicacion', () => {
    const v = classifyVehicle(vehicle({ contact_age_days: 5 }));
    expect(v.status).toBe('sin_comunicacion');
  });

  it('sin contacto y sin comps → sin_datos', () => {
    const comps = Object.fromEntries(COMP_COLS.map(c => [c, null]));
    const v = classifyVehicle(vehicle({ contact_age_days: null, comps }));
    expect(v.status).toBe('sin_datos');
  });

  it('con contacto pero sin comps → falla_p1 (sin_info_con_com)', () => {
    const comps = Object.fromEntries(COMP_COLS.map(c => [c, null]));
    const v = classifyVehicle(vehicle({ comps }));
    expect(v.status).toBe('falla_p1');
    expect(v.flags.sin_info_con_com).toBe(true);
  });

  it('un componente P1 < 0.75 → falla_p1', () => {
    const v = classifyVehicle(vehicle({ comps: { ...vehicle().comps, tracking: 0.5 } }));
    expect(v.status).toBe('falla_p1');
    expect(v.failed_components[0]).toMatchObject({ component: 'tracking', priority: 1, value: 50 });
  });

  it('solo P2 fallando → falla_p2', () => {
    const v = classifyVehicle(vehicle({ comps: { ...vehicle().comps, buzzer: 0.4 } }));
    expect(v.status).toBe('falla_p2');
  });

  it('solo P3 fallando → ok_con_otros', () => {
    const v = classifyVehicle(vehicle({ comps: { ...vehicle().comps, ffc_streaming: 0 } }));
    expect(v.status).toBe('ok_con_otros');
  });

  it('umbral exacto 0.75 NO es falla', () => {
    const v = classifyVehicle(vehicle({ comps: { ...vehicle().comps, tracking: 0.75 } }));
    expect(v.status).toBe('ok');
  });

  it('failed_components ordenados por prioridad ascendente', () => {
    const v = classifyVehicle(vehicle({ comps: { ...vehicle().comps, buzzer: 0.5, tracking: 0.5 } }));
    expect(v.failed_components.map(f => f.priority)).toEqual([1, 2]);
  });

  it('contact_age_days > 3 gana sobre falla P1', () => {
    const v = classifyVehicle(vehicle({
      contact_age_days: 10,
      comps: { ...vehicle().comps, tracking: 0.1 }
    }));
    expect(v.status).toBe('sin_comunicacion');
  });
});
