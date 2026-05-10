// src/domain/rules.js

export const FAILURE_THRESHOLD = 0.75;
export const STALE_CONTACT_DAYS = 3;
export const WARN_CONTACT_DAYS = 1;
export const PAGE_SIZE = 50;

export const COMP_COLS = [
  'tracking', 'buzzer', 'camera', 'camera_detection',
  'ffc_data', 'ffc_detection', 'ffc_streaming',
  'gps_detection', 'gps_coverage', 'ir', 'psu', 'vib_motor'
];

export const P1_COLS = ['tracking', 'ir', 'gps_detection', 'gps_coverage', 'camera_detection', 'camera'];
export const P2_COLS = ['vib_motor', 'buzzer'];
export const P3_COLS = COMP_COLS.filter(c => !P1_COLS.includes(c) && !P2_COLS.includes(c));

export const COMP_LABELS = {
  tracking: 'Tracking', buzzer: 'Buzzer', camera: 'Cámara',
  camera_detection: 'Detección Cámara', ffc_data: 'FFC Datos',
  ffc_detection: 'Detección FFC', ffc_streaming: 'Streaming FFC',
  gps_detection: 'Detección GPS', gps_coverage: 'Cobertura GPS',
  ir: 'Sensor ICS (IR)', psu: 'PSU', vib_motor: 'Motor Vibrador'
};

export const STATUS_LABELS = {
  ok: 'Operativo',
  ok_con_otros: 'Operativo',
  falla_p1: 'P1 — Falla Crítica',
  falla_p2: 'P2 — Falla Moderada',
  sin_comunicacion: 'Sin Comunicación >72h',
  sin_datos: 'Sin Datos'
};

export const STATUS_ORDER = {
  sin_comunicacion: 0, falla_p1: 1, falla_p2: 2,
  ok_con_otros: 3, sin_datos: 4, ok: 5
};

export function priorityOf(component) {
  if (P1_COLS.includes(component)) return 1;
  if (P2_COLS.includes(component)) return 2;
  return 3;
}
