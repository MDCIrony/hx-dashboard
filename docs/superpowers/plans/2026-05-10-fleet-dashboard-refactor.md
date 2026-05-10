# Hx Performance Dashboard — Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorizar `fleet_dashboard.html` (monolito 840 líneas + 3 MB JSON inline) en una app desacoplada Vanilla JS + ES modules + Vite, que arranca vacía, parsea los CSVs en cliente con PapaParse, separa dominio puro / app / vista, y se despliega en GitHub Pages.

**Architecture:** Tres capas con dependencias unidireccionales (`view → app → domain`). El dominio es puro (sin DOM), testeable con Vitest. El estado vive en un store mínimo con pub/sub. La vista se suscribe y re-renderiza con `DocumentFragment`. El export XLSX vive en su propio módulo. El archivo HTML queda solo como shell.

**Tech Stack:** Vite 5 · Vanilla JS (ES modules) · PapaParse · SheetJS (xlsx) · Vitest · @fontsource/ibm-plex-{mono,sans}

**Spec:** `docs/superpowers/specs/2026-05-10-fleet-dashboard-refactor-design.md`
**Merge doc:** `docs/csv-merge.md`

---

## Convenciones de commits

`type(scope): description` — `feat`, `fix`, `refactor`, `chore`, `docs`, `test`. Sin Co-Authored-By.

## Convención de path

Todo path es relativo a `dashboard/` (la raíz del proyecto). Los archivos originales `fleet_dashboard.html`, `Performance.csv`, `Grafana.csv` se preservan hasta el final.

---

## FASE 0 — Bootstrap del proyecto

### Task 0.1: Inicializar Vite + estructura

**Files:**
- Create: `package.json`, `vite.config.js`, `.gitignore`, `index.html`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "hx-fleet-dashboard",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "papaparse": "^5.4.1",
    "xlsx": "^0.18.5",
    "@fontsource/ibm-plex-mono": "^5.0.13",
    "@fontsource/ibm-plex-sans": "^5.0.13"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Crear `vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  // CAMBIAR '<repo>' por el nombre real del repo en GitHub
  base: process.env.NODE_ENV === 'production' ? '/<repo>/' : '/',
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true },
  test: { environment: 'node', include: ['test/**/*.test.js'] }
});
```

- [ ] **Step 3: Crear `.gitignore`**

```
node_modules
dist
.vite
*.log
```

- [ ] **Step 4: Crear `index.html` (shell mínimo)**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hx Performance — Monitoreo de Componentes</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Instalar y verificar**

```bash
npm install
npm run dev
```
Expected: Vite arranca en `http://localhost:5173`, página en blanco sin errores en consola.

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.js .gitignore index.html
git commit -m "chore: bootstrap vite project"
```

---

### Task 0.2: Copiar logo y CSVs de fixtures

**Files:**
- Create: `src/assets/logo.png`, `test/fixtures/performance-sample.csv`, `test/fixtures/grafana-sample.csv`

- [ ] **Step 1: Extraer logo del HTML viejo**

El logo vive como base64 en `fleet_dashboard.html` línea ~232. Decodificarlo a `src/assets/logo.png`:

```bash
mkdir -p src/assets test/fixtures
node -e "
const fs = require('fs');
const html = fs.readFileSync('fleet_dashboard.html','utf8');
const m = html.match(/src=\"data:image\/[^;]+;base64,([^\"]+)\"/);
if (!m) { console.error('logo no encontrado'); process.exit(1); }
fs.writeFileSync('src/assets/logo.png', Buffer.from(m[1],'base64'));
console.log('logo extraído');
"
```

- [ ] **Step 2: Crear fixtures CSV pequeñas**

`test/fixtures/performance-sample.csv`:

```csv
account,fleet,start_date,period_days,vehicle,device_id,software_version,last_contact_utc,contact_age_days,operating_time_hrs,mobile_time_hrs,distance_travelled_kms,restarts,heartbeats_per_hour,fatigue_events,distraction_events,acceleration_events,overspeed_events,operator_events,fov_exceptions,fov_in_progress,tracking,buzzer,camera,camera_detection,ffc_data,ffc_detection,ffc_streaming,gps_detection,gps_coverage,ir,psu,vib_motor
(SMLA) ACME,(SMLA) ACME-FLEET-A,2026-05-03,7,VEH001,DEV-001,1.0,2026-05-09 10:00:00,0.5,10,5,100,1,5,0,0,0,0,0,0,0.5,0.8,1.0,0.95,1.0,0.95,1.0,0.99,1.0,0.99,1.0,1.0,0.98
(SMLA) ACME,(SMLA) ACME-FLEET-A,2026-05-03,7,VEH002,DEV-002,1.0,2026-05-01 10:00:00,9.0,0,0,0,0,0,0,0,0,0,0,0,,,,,,,,,,,,
(SMLA) ACME,(SMLA) ACME-FLEET-A,2026-05-03,7,VEH003,DEV-003,1.0,2026-05-09 10:00:00,0.5,5,2,50,0,2,0,0,0,0,0,0,0.2,0.5,0.6,0.7,1.0,0.95,1.0,0.99,1.0,0.99,1.0,1.0,0.98
ACME2,ACME2-FLEET-B,2026-05-03,7,VEH004,,1.0,2026-05-09 10:00:00,0.5,5,2,50,0,2,0,0,0,0,0,0,,,,,,,,,,,,
ACME2,ACME2-FLEET-B,2026-05-03,7,VEH005,DEV-005,1.0,2026-05-09 10:00:00,0.5,5,2,50,0,2,0,0,0,0,0,0,0.95,0.99,1.0,0.95,1.0,0.95,1.0,0.99,1.0,0.99,1.0,1.0,0.85
ACME2,ACME2-FLEET-B,2026-05-03,7,VEH005,DEV-005,1.0,2026-05-09 11:00:00,0.3,5,2,50,0,2,0,0,0,0,0,0,0.95,0.99,1.0,0.95,1.0,0.95,1.0,0.99,1.0,0.99,1.0,1.0,0.85
"Quote, Test","Quote, Fleet",2026-05-03,7,VEH006,DEV-006,1.0,2026-05-09 10:00:00,0.5,5,2,50,0,2,0,0,0,0,0,0,1.0,0.99,1.0,0.95,1.0,0.95,1.0,0.99,1.0,0.99,1.0,1.0,0.98
```

`test/fixtures/grafana-sample.csv` (con `sep=,` líder):

```csv
sep=,
"period_max","period_min","companyName","fleetName","vehicleName","vehiclePlate","guardianSerial","ffcLastComms","ffcLastCommsDays","ffcSdCriticalErrors","ffcVideoLossErrors"
2026-05-09 20:00:00,2026-05-03 20:00:00,ACME,ACME-FLEET-A,VEH001,VEH001,DEV-001,2026-05-08 10:00:00,1.5,0,0
2026-05-09 20:00:00,2026-05-03 20:00:00,ACME,ACME-FLEET-A,VEH003,VEH003,DEV-003,2026-05-04 10:00:00,5.5,2,10
2026-05-09 20:00:00,2026-05-03 20:00:00,ACME2,ACME2-FLEET-B,VEH005,VEH005,DEV-005,2026-05-09 09:00:00,0.5,0,0
2026-05-09 20:00:00,2026-05-03 20:00:00,ACME2,ACME2-FLEET-B,VEH005,VEH005,DEV-005,2026-05-09 12:00:00,0.2,1,3
2026-05-09 20:00:00,2026-05-03 20:00:00,ORPHAN,ORPHAN-FLEET,XXX,XXX,DEV-999,2026-05-09 10:00:00,0.5,0,0
2026-05-09 20:00:00,2026-05-03 20:00:00,NAN,NAN,NAN,NAN,NaN,,,,
```

- [ ] **Step 3: Commit**

```bash
git add src/assets/logo.png test/fixtures/
git commit -m "chore: add logo asset and csv fixtures"
```

---

## FASE 1 — Dominio (TDD, puro, sin DOM)

### Task 1.1: `domain/rules.js`

**Files:**
- Create: `src/domain/rules.js`

- [ ] **Step 1: Escribir el módulo de constantes**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/domain/rules.js
git commit -m "feat(domain): add rules and constants module"
```

---

### Task 1.2: `domain/csv-parse.js` (Performance) — TDD

**Files:**
- Create: `test/domain/csv-parse.test.js`, `src/domain/csv-parse.js`

- [ ] **Step 1: Escribir el primer test**

```js
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
```

- [ ] **Step 2: Correr el test (debe fallar por módulo inexistente)**

```bash
npm test
```
Expected: FAIL — `Cannot find module .../csv-parse.js`.

- [ ] **Step 3: Implementar `parsePerformance`**

```js
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
```

- [ ] **Step 4: Correr los tests**

```bash
npm test
```
Expected: 6 tests PASS.

- [ ] **Step 5: Agregar tests y parser para Grafana**

Append a `test/domain/csv-parse.test.js`:

```js
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
```

- [ ] **Step 6: Implementar `parseGrafana`**

Append a `src/domain/csv-parse.js`:

```js
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
```

- [ ] **Step 7: Correr todos los tests**

```bash
npm test
```
Expected: 9 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/domain/csv-parse.js test/domain/csv-parse.test.js
git commit -m "feat(domain): csv parser with papaparse (performance + grafana)"
```

---

### Task 1.3: `domain/merge.js` — TDD

**Files:**
- Create: `test/domain/merge.test.js`, `src/domain/merge.js`

- [ ] **Step 1: Tests**

```js
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

  it('grafana huérfano (sin vehículo) se descarta', () => {
    const merged = mergeFleetData(parsePerformance(perfCsv), parseGrafana(grafCsv));
    expect(merged.find(v => v.device_id === 'DEV-999')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correr tests (debe fallar)**

```bash
npm test
```
Expected: FAIL — `merge.js` no existe.

- [ ] **Step 3: Implementar `mergeFleetData`**

```js
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
```

- [ ] **Step 4: Correr tests**

```bash
npm test
```
Expected: todos los tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/merge.js test/domain/merge.test.js
git commit -m "feat(domain): merge performance + grafana data"
```

---

### Task 1.4: `domain/classify.js` — TDD

**Files:**
- Create: `test/domain/classify.test.js`, `src/domain/classify.js`

- [ ] **Step 1: Tests cubriendo cada rama**

```js
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
});
```

- [ ] **Step 2: Correr tests (deben fallar)**

```bash
npm test
```
Expected: FAIL — `classify.js` no existe.

- [ ] **Step 3: Implementar `classifyVehicle`**

```js
// src/domain/classify.js
import {
  COMP_COLS, FAILURE_THRESHOLD, STALE_CONTACT_DAYS, priorityOf
} from './rules.js';

export function classifyVehicle(v) {
  const age = v.contact_age_days;
  const sinCom = age !== null && age > STALE_CONTACT_DAYS;
  const hasContact = age !== null;
  const hasComps = COMP_COLS.some(c => v.comps[c] !== null);
  const sinContactoTotal = !hasContact && !hasComps;
  const sinInfoConCom = hasContact && !hasComps && !sinCom;

  const failed = [];
  for (const c of COMP_COLS) {
    const val = v.comps[c];
    if (val !== null && val < FAILURE_THRESHOLD) {
      failed.push({
        component: c,
        value: Math.round(val * 1000) / 10,
        priority: priorityOf(c)
      });
    }
  }
  failed.sort((a, b) => a.priority - b.priority);

  let status;
  if (sinCom) status = 'sin_comunicacion';
  else if (sinContactoTotal) status = 'sin_datos';
  else if (sinInfoConCom) status = 'falla_p1';
  else if (!hasComps) status = 'sin_datos';
  else if (failed.some(f => f.priority === 1)) status = 'falla_p1';
  else if (failed.some(f => f.priority === 2)) status = 'falla_p2';
  else if (failed.some(f => f.priority === 3)) status = 'ok_con_otros';
  else status = 'ok';

  return {
    ...v,
    status,
    failed_components: failed,
    flags: {
      sin_comunicacion: sinCom,
      has_contact: hasContact,
      has_comps: hasComps,
      sin_contacto_total: sinContactoTotal,
      sin_info_con_com: sinInfoConCom
    }
  };
}
```

- [ ] **Step 4: Correr tests**

```bash
npm test
```
Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/classify.js test/domain/classify.test.js
git commit -m "feat(domain): vehicle status classification rules"
```

---

### Task 1.5: `domain/aggregate.js` — TDD

**Files:**
- Create: `test/domain/aggregate.test.js`, `src/domain/aggregate.js`

- [ ] **Step 1: Tests**

```js
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
```

- [ ] **Step 2: Implementar**

```js
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
```

- [ ] **Step 3: Correr tests**

```bash
npm test
```
Expected: todos los tests del dominio PASS.

- [ ] **Step 4: Commit**

```bash
git add src/domain/aggregate.js test/domain/aggregate.test.js
git commit -m "feat(domain): global and account aggregations"
```

---

## FASE 2 — App layer (store + controller)

### Task 2.1: `app/store.js`

**Files:**
- Create: `src/app/store.js`

- [ ] **Step 1: Implementar store**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/store.js
git commit -m "feat(app): minimal pub/sub store"
```

---

### Task 2.2: `app/controller.js`

**Files:**
- Create: `src/app/controller.js`

- [ ] **Step 1: Implementar**

```js
// src/app/controller.js
import { parsePerformance, parseGrafana } from '../domain/csv-parse.js';
import { mergeFleetData } from '../domain/merge.js';
import { classifyVehicle } from '../domain/classify.js';
import { buildGlobalStats, buildAccountStats } from '../domain/aggregate.js';
import { STATUS_ORDER, PAGE_SIZE } from '../domain/rules.js';

export function createController(store) {
  return {
    async handleApplyUpload(perfText, grafText) {
      const perf = parsePerformance(perfText);
      const graf = parseGrafana(grafText);
      const merged = mergeFleetData(perf, graf);
      const vehicles = merged.map(classifyVehicle);
      const stats = buildGlobalStats(vehicles);
      const accounts = buildAccountStats(vehicles);
      store.setState({
        data: { vehicles, accounts, stats, loadedAt: new Date().toISOString() },
        ui: { filter: 'all', search: '', account: '', component: '', priority: '', sortCol: 'status', sortDir: 'asc', page: 1 }
      });
    },

    reset() {
      store.setState({
        data: { vehicles: [], accounts: [], stats: null, loadedAt: null },
        ui: { filter: 'all', search: '', account: '', component: '', priority: '', sortCol: 'status', sortDir: 'asc', page: 1 }
      });
    },

    setFilter(v)    { store.setState({ ui: { filter: v, page: 1 } }); },
    setSearch(v)    { store.setState({ ui: { search: v.toLowerCase(), page: 1 } }); },
    setAccount(v)   { store.setState({ ui: { account: v, page: 1 } }); },
    setComponent(v) { store.setState({ ui: { component: v, page: 1 } }); },
    setPriority(v)  { store.setState({ ui: { priority: v, page: 1 } }); },
    setSort(col) {
      const ui = store.getState().ui;
      const sortDir = (ui.sortCol === col && ui.sortDir === 'asc') ? 'desc' : 'asc';
      store.setState({ ui: { sortCol: col, sortDir, page: 1 } });
    },
    setPage(p) { store.setState({ ui: { page: p } }); },
  };
}

// Selector derivado
export function getFilteredVehicles(state) {
  const { vehicles } = state.data;
  const { filter, search, account, component, priority, sortCol, sortDir } = state.ui;
  let out = vehicles.filter(v => {
    if (filter === 'ok' && v.status !== 'ok' && v.status !== 'ok_con_otros') return false;
    if (filter !== 'all' && filter !== 'ok' && v.status !== filter) return false;
    if (account && v.account !== account) return false;
    if (priority && v.status !== priority) return false;
    if (search) {
      const s = search;
      if (!v.vehicle.toLowerCase().includes(s)
        && !v.account.toLowerCase().includes(s)
        && !(v.device_id || '').toLowerCase().includes(s)
        && !v.fleet.toLowerCase().includes(s)) return false;
    }
    if (component && !v.failed_components.some(fc => fc.component === component)) return false;
    return true;
  });
  out = sortVehicles(out, sortCol, sortDir);
  return out;
}

function sortVehicles(arr, col, dir) {
  const factor = dir === 'asc' ? 1 : -1;
  return arr.slice().sort((a, b) => {
    let va = a[col], vb = b[col];
    if (col === 'status') { va = STATUS_ORDER[va] ?? 99; vb = STATUS_ORDER[vb] ?? 99; }
    if (va === null || va === undefined) va = factor > 0 ? Infinity : -Infinity;
    if (vb === null || vb === undefined) vb = factor > 0 ? Infinity : -Infinity;
    if (typeof va === 'string') return factor * va.localeCompare(vb);
    return factor * (va - vb);
  });
}

export function getAccountStats(state) {
  const { account } = state.ui;
  if (!account) return state.data.stats;
  const acct = state.data.accounts.find(a => a.account === account);
  return acct || state.data.stats;
}

export { PAGE_SIZE };
```

- [ ] **Step 2: Commit**

```bash
git add src/app/controller.js
git commit -m "feat(app): controller use cases and selectors"
```

---

## FASE 3 — Estilos (migrar desde el monolito)

### Task 3.1: Extraer y dividir CSS

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components/*.css`

- [ ] **Step 1: Crear `src/styles/tokens.css` con las variables**

Copiar literalmente las variables `:root{...}` del HTML original (líneas 10–24).

```css
:root {
  --bg:#f5f7fa; --surface:#fff; --surface2:#f0f4f8; --border:#dde3ec; --border2:#c8d2de;
  --ok:#16a34a; --ok-bg:#f0fdf4; --ok-bd:#bbf7d0;
  --p1:#dc2626; --p1-bg:#fff5f5; --p1-bd:#fecaca;
  --p2:#d97706; --p2-bg:#fffbeb; --p2-bd:#fde68a;
  --sincom:#b45309; --sincom-bg:#fef3c7; --sincom-bd:#fcd34d;
  --otra:#7c3aed; --otra-bg:#f5f3ff; --otra-bd:#ddd6fe;
  --sd:#9ca3af; --sd-bg:#f9fafb; --sd-bd:#e5e7eb;
  --ffc:#0891b2; --ffc-bg:#ecfeff; --ffc-bd:#a5f3fc;
  --ffc-err:#dc2626; --ffc-warn:#d97706;
  --text:#1e293b; --text-dim:#475569; --text-muted:#94a3b8;
  --accent:#2563eb;
  --veh-color:#15803d; --veh-bg:#dcfce7; --veh-bd:#bbf7d0;
  --mono:'IBM Plex Mono', monospace;
  --sans:'IBM Plex Sans', sans-serif;
}
```

- [ ] **Step 2: Crear `src/styles/base.css`**

```css
@import '@fontsource/ibm-plex-mono/400.css';
@import '@fontsource/ibm-plex-mono/600.css';
@import '@fontsource/ibm-plex-mono/700.css';
@import '@fontsource/ibm-plex-sans/300.css';
@import '@fontsource/ibm-plex-sans/400.css';
@import '@fontsource/ibm-plex-sans/500.css';
@import '@fontsource/ibm-plex-sans/600.css';

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  min-height: 100vh;
}
```

- [ ] **Step 3: Crear los componentes CSS**

Mapear las reglas del HTML original a archivos. Cada uno copia las reglas tal cual del HTML viejo (líneas 27–230):

- `src/styles/components/header.css` ← reglas `.header`, `.brand`, `.brand-logo`, `.brand-title`, `.brand-sub`, `.header-right`, `.header-ts`, `.btn`, `.btn-upload`, `.btn-export`.
- `src/styles/components/kpi-strip.css` ← `.kpi-strip`, `.kpi-grid`, `.kpi-card`, `.kpi-pie`, `.kpi-label`, `.kpi-badge`, `.kpi-num`, `.kpi-desc`.
- `src/styles/components/filters.css` ← `.filters`, `.fl`, `.finput`, `.res-count`.
- `src/styles/components/alert-banner.css` ← `.alert-banner`, `.alert-icon`, `@keyframes blink`, `.alert-text`, `.alert-sub`, `.alert-count`.
- `src/styles/components/table.css` ← `.table-wrap`, scrollbars, `table`, `thead`, `tbody`, badges (`.badge`, `.b-ok`, `.b-p1`, `.b-p2`, `.b-sc`, `.b-sd`), pills (`.pill`, `.pill-p1`, `.pill-p2`, `.pill-p3`), row colors (`.row-ok`, etc.), `.veh-chip`, `.guardian-chip`, `.guardian-none`, `.contact-cell`, `.ffc-cell`, `.ffc-err-cell`, paginación (`.pag`, `.pb`, `.pi`).
- `src/styles/components/modal.css` ← `#overlay`, `.modal`, `.m-head`, `.m-veh`, `.m-guardian`, `.m-meta`, `.mrow`, `.comm-box`, `.ffc-box`, `.ffc-grid`, `.prio-section`, `.prio-tag`, `.ccomp-row`, `.cbar`, `.cbar-fill`, `.cpct`, `.failing-p1/p2/p3`.
- `src/styles/components/upload-panel.css` ← `.upload-panel`, `.up-title`, `.up-row`, `.up-label`, `.up-status`, `.up-btn`, `.up-apply`.
- `src/styles/components/toast.css` ← `.toast`.
- `src/styles/components/empty-state.css` ← nuevo, ver Task 4.1.

- [ ] **Step 4: Commit**

```bash
git add src/styles/
git commit -m "refactor(styles): split monolithic css into tokens + per-component files"
```

---

## FASE 4 — View components

### Task 4.1: Empty state component

**Files:**
- Create: `src/view/components/empty-state.js`, `src/styles/components/empty-state.css`

- [ ] **Step 1: Crear el componente**

```js
// src/view/components/empty-state.js
// (el CSS se importa de manera centralizada desde src/main.js)

export function emptyStateView({ onPickPerf, onPickGraf, onApply, perfName, grafName, ready }) {
  const root = document.createElement('section');
  root.className = 'empty-state';
  root.innerHTML = `
    <div class="empty-card">
      <div class="empty-logo"><img src="./logo.png" alt="Hx"></div>
      <h1 class="empty-title">Hx Performance — Monitoreo de Componentes</h1>
      <p class="empty-sub">Subí los dos CSV para comenzar.</p>
      <div class="empty-rows">
        <div class="empty-row">
          <span class="empty-label">Performance.csv</span>
          <span class="empty-status" data-perf-status>${perfName ? '✓ ' + perfName : 'Sin cargar'}</span>
          <button class="empty-btn" data-pick-perf>Elegir</button>
        </div>
        <div class="empty-row">
          <span class="empty-label">Grafana.csv</span>
          <span class="empty-status" data-graf-status>${grafName ? '✓ ' + grafName : 'Sin cargar'}</span>
          <button class="empty-btn" data-pick-graf>Elegir</button>
        </div>
      </div>
      <button class="empty-apply" data-apply ${ready ? '' : 'disabled'}>Cargar dashboard</button>
      <input type="file" accept=".csv" data-file-perf hidden>
      <input type="file" accept=".csv" data-file-graf hidden>
    </div>
  `;
  const fp = root.querySelector('[data-file-perf]');
  const fg = root.querySelector('[data-file-graf]');
  root.querySelector('[data-pick-perf]').addEventListener('click', () => fp.click());
  root.querySelector('[data-pick-graf]').addEventListener('click', () => fg.click());
  fp.addEventListener('change', e => { if (e.target.files[0]) onPickPerf(e.target.files[0]); e.target.value=''; });
  fg.addEventListener('change', e => { if (e.target.files[0]) onPickGraf(e.target.files[0]); e.target.value=''; });
  root.querySelector('[data-apply]').addEventListener('click', onApply);
  return root;
}
```

- [ ] **Step 2: CSS del empty state**

```css
/* src/styles/components/empty-state.css */
.empty-state { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
.empty-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.empty-logo { width: 56px; height: 56px; margin-bottom: 16px; }
.empty-logo img { width: 100%; height: 100%; object-fit: contain; }
.empty-title { font-family: var(--mono); font-size: 16px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 6px; }
.empty-sub { color: var(--text-muted); font-size: 13px; margin-bottom: 20px; }
.empty-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.empty-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; }
.empty-label { font-family: var(--mono); font-size: 11px; color: var(--text-dim); flex-shrink: 0; min-width: 130px; }
.empty-status { font-family: var(--mono); font-size: 10px; color: var(--text-muted); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-status.loaded { color: var(--ok); }
.empty-btn { font-family: var(--mono); font-size: 10px; font-weight: 600; padding: 6px 12px; border-radius: 4px; cursor: pointer; border: none; background: var(--accent); color: #fff; }
.empty-apply { width: 100%; background: var(--ok); color: #fff; font-family: var(--mono); font-size: 12px; font-weight: 600; padding: 10px; border-radius: 6px; border: none; cursor: pointer; }
.empty-apply:disabled { background: var(--border2); color: var(--text-muted); cursor: not-allowed; }
```

- [ ] **Step 3: Commit**

```bash
git add src/view/components/empty-state.js src/styles/components/empty-state.css
git commit -m "feat(view): empty-state component with csv pickers"
```

---

### Task 4.2: `view/format.js`

**Files:**
- Create: `src/view/format.js`

- [ ] **Step 1: Implementar helpers**

```js
// src/view/format.js

export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function ageLbl(days) {
  if (days === null || days === undefined) return null;
  const h = days * 24;
  if (h < 1) return Math.round(h * 60) + 'min';
  if (h < 24) return h.toFixed(1) + 'h';
  return days.toFixed(1) + 'd';
}

export function dateLbl(utcStr) {
  if (!utcStr) return '';
  try {
    return new Date(utcStr.replace(' ', 'T') + 'Z').toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
}

export function pct(v, total) {
  return total ? ((v / total) * 100).toFixed(1) + '%' : '0%';
}

export function getBadgeHtml(status) {
  const map = {
    ok:               { cls: 'b-ok',  txt: '✓ Operativo' },
    ok_con_otros:     { cls: 'b-ok',  txt: '✓ Operativo' },
    falla_p1:         { cls: 'b-p1',  txt: '▲ P1 Crítica' },
    falla_p2:         { cls: 'b-p2',  txt: '● P2 Moderada' },
    sin_comunicacion: { cls: 'b-sc b-sc-anim', txt: '📡 Sin Comm. >72h' },
    sin_datos:        { cls: 'b-sd',  txt: '— Sin Datos' }
  };
  const m = map[status] || { cls: 'b-sd', txt: escapeHtml(status) };
  return `<span class="badge ${m.cls}">${m.txt}</span>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/view/format.js
git commit -m "feat(view): format helpers with html escaping"
```

---

### Task 4.3: Header + KPI strip

**Files:**
- Create: `src/view/components/header.js`, `src/view/components/kpi-strip.js`

- [ ] **Step 1: Header**

```js
// src/view/components/header.js
import logoUrl from '../../assets/logo.png';

export function headerView({ onUploadToggle, onExport, timestamp }) {
  const root = document.createElement('header');
  root.className = 'header';
  root.innerHTML = `
    <div class="brand">
      <div class="brand-logo"><img alt="Hx"></div>
      <div>
        <div class="brand-title">Hx Performance</div>
        <div class="brand-sub">MONITOREO DE COMPONENTES</div>
      </div>
    </div>
    <div class="header-right">
      <span class="header-ts" data-ts>${timestamp || ''}</span>
      <button class="btn btn-upload" data-upload>↑ Cargar CSVs</button>
      <button class="btn btn-export" data-export>↓ Exportar XLSX</button>
    </div>
  `;
  root.querySelector('img').src = logoUrl;
  root.querySelector('[data-upload]').addEventListener('click', onUploadToggle);
  root.querySelector('[data-export]').addEventListener('click', onExport);
  return root;
}

export function updateHeaderTs(root, ts) {
  root.querySelector('[data-ts]').textContent = ts;
}
```

- [ ] **Step 2: KPI strip con pies**

```js
// src/view/components/kpi-strip.js

const KPIS = [
  { key: 'all',              label: 'Total Flota',       color: '#2563eb', cls: 'c-all' },
  { key: 'sin_comunicacion', label: 'Sin Com. >72h',     color: '#b45309', cls: 'c-sc'  },
  { key: 'falla_p1',         label: 'Falla P1 Crítica',  color: '#dc2626', cls: 'c-p1'  },
  { key: 'falla_p2',         label: 'Falla P2 Moderada', color: '#d97706', cls: 'c-p2'  },
  { key: 'ok',               label: 'Operativos',        color: '#16a34a', cls: 'c-ok'  }
];

export function kpiStripView({ onFilter }) {
  const root = document.createElement('section');
  root.className = 'kpi-strip';
  root.innerHTML = `<div class="kpi-grid">${KPIS.map(k => `
    <div class="kpi-card${k.key === 'all' ? ' active' : ''}" data-f="${k.key}">
      <canvas class="kpi-pie" data-pie="${k.key}" width="42" height="42"></canvas>
      <div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-num ${k.cls}" data-num="${k.key}">0</div>
      </div>
    </div>
  `).join('')}</div>`;
  root.querySelectorAll('.kpi-card').forEach(card => {
    card.addEventListener('click', () => {
      root.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      onFilter(card.dataset.f);
    });
  });
  return root;
}

export function updateKpis(root, stats) {
  const total = stats?.total || 0;
  for (const k of KPIS) {
    const val = k.key === 'all' ? total : (stats?.[k.key] || 0);
    root.querySelector(`[data-num="${k.key}"]`).textContent = val.toLocaleString();
    drawPie(root.querySelector(`[data-pie="${k.key}"]`), val, total, k.color);
  }
}

function drawPie(canvas, val, total, color) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2, r = W/2 - 5;
  ctx.clearRect(0, 0, W, H);
  const pct = total > 0 ? val / total : 0;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI);
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 6; ctx.stroke();
  if (pct > 0) {
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + 2*Math.PI*pct);
    ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.fillStyle = pct > 0 ? color : '#9ca3af';
  ctx.font = "bold 10px 'IBM Plex Mono', monospace";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(total > 0 ? Math.round(pct*100) + '%' : '—', cx, cy);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/view/components/header.js src/view/components/kpi-strip.js
git commit -m "feat(view): header and kpi-strip components"
```

---

### Task 4.4: Filters + Alert banner

**Files:**
- Create: `src/view/components/filters.js`, `src/view/components/alert-banner.js`

- [ ] **Step 1: Filters**

```js
// src/view/components/filters.js
import { COMP_COLS, COMP_LABELS } from '../../domain/rules.js';
import { escapeHtml } from '../format.js';

export function filtersView({ onSearch, onAccount, onComponent, onPriority }) {
  const root = document.createElement('section');
  root.className = 'filters';
  root.innerHTML = `
    <span class="fl">Buscar</span>
    <input class="finput" type="text" placeholder="Vehículo, cuenta, guardian..." data-search>
    <span class="fl">Cuenta</span>
    <select class="finput" data-account><option value="">Todas</option></select>
    <span class="fl">Componente fallando</span>
    <select class="finput" data-component>
      <option value="">Todos</option>
      ${COMP_COLS.map(c => `<option value="${c}">${escapeHtml(COMP_LABELS[c])}</option>`).join('')}
    </select>
    <span class="fl">Estado</span>
    <select class="finput" data-priority>
      <option value="">Cualquiera</option>
      <option value="falla_p1">P1 — Crítica</option>
      <option value="falla_p2">P2 — Moderada</option>
      <option value="sin_comunicacion">Sin Comunicación</option>
      <option value="sin_datos">Sin Datos</option>
      <option value="ok">Operativo</option>
    </select>
    <span class="res-count" data-count>0 vehículos</span>
  `;
  root.querySelector('[data-search]').addEventListener('input', e => onSearch(e.target.value));
  root.querySelector('[data-account]').addEventListener('change', e => onAccount(e.target.value));
  root.querySelector('[data-component]').addEventListener('change', e => onComponent(e.target.value));
  root.querySelector('[data-priority]').addEventListener('change', e => onPriority(e.target.value));
  return root;
}

export function updateAccountOptions(root, accounts) {
  const sel = root.querySelector('[data-account]');
  while (sel.options.length > 1) sel.remove(1);
  accounts.slice().sort((a,b) => a.account.localeCompare(b.account)).forEach(a => {
    const o = document.createElement('option');
    o.value = a.account;
    o.textContent = `${a.account} (${a.total})`;
    sel.appendChild(o);
  });
}

export function updateCount(root, n) {
  root.querySelector('[data-count]').textContent = n.toLocaleString() + ' vehículos';
}
```

- [ ] **Step 2: Alert banner**

```js
// src/view/components/alert-banner.js
export function alertBannerView({ onClick }) {
  const root = document.createElement('section');
  root.className = 'alert-banner';
  root.innerHTML = `
    <span class="alert-icon">⚠</span>
    <span class="alert-text">Sin Comunicación</span>
    <span class="alert-sub">— vehículos sin contacto en las últimas 72h</span>
    <span class="alert-count" data-count>0 vehículos →</span>
  `;
  root.querySelector('[data-count]').addEventListener('click', onClick);
  return root;
}

export function updateAlertCount(root, n) {
  root.querySelector('[data-count]').textContent = `${n.toLocaleString()} vehículos →`;
  root.style.display = n > 0 ? '' : 'none';
}
```

- [ ] **Step 3: Commit**

```bash
git add src/view/components/filters.js src/view/components/alert-banner.js
git commit -m "feat(view): filters and alert-banner components"
```

---

### Task 4.5: Vehicle table

**Files:**
- Create: `src/view/components/vehicle-table.js`

- [ ] **Step 1: Implementar tabla con DocumentFragment**

```js
// src/view/components/vehicle-table.js
import { COMP_LABELS, PAGE_SIZE } from '../../domain/rules.js';
import { ageLbl, dateLbl, escapeHtml, getBadgeHtml } from '../format.js';

const COLS = [
  { key: 'vehicle',          label: 'Vehículo' },
  { key: 'device_id',        label: 'Guardian' },
  { key: 'account',          label: 'Cuenta' },
  { key: 'fleet',            label: 'Flota' },
  { key: 'status',           label: 'Estado' },
  { key: null,               label: 'Fallas' },
  { key: 'contact_age_days', label: 'Contacto Guardian' },
  { key: 'ffcLastCommsDays', label: 'Contacto FFC' },
  { key: 'ffcSdCriticalErrors', label: 'Error SD' },
  { key: 'ffcVideoLossErrors',  label: 'Error Video' }
];

export function vehicleTableView({ onSort, onRowClick, onPage }) {
  const root = document.createElement('section');
  root.className = 'table-wrap';
  root.innerHTML = `
    <table>
      <thead><tr>${COLS.map(c => `<th data-col="${c.key || ''}">${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
      <tbody data-tbody></tbody>
    </table>
    <div class="pag" data-pag></div>
  `;
  root.querySelectorAll('th').forEach(th => {
    const col = th.dataset.col;
    if (!col) return;
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => onSort(col));
  });
  root._handlers = { onRowClick, onPage };
  return root;
}

export function updateTable(root, { vehicles, page, sortCol, sortDir }) {
  // sort indicator
  root.querySelectorAll('th').forEach(th => {
    th.className = th.dataset.col === sortCol ? sortDir : '';
  });

  const totalPages = Math.max(1, Math.ceil(vehicles.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = vehicles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const tbody = root.querySelector('[data-tbody]');
  const frag = document.createDocumentFragment();
  for (const v of slice) frag.appendChild(buildRow(v, root._handlers.onRowClick));
  tbody.replaceChildren(frag);

  renderPagination(root.querySelector('[data-pag]'), safePage, totalPages, root._handlers.onPage);
}

function buildRow(v, onRowClick) {
  const tr = document.createElement('tr');
  const rowCls = { ok:'row-ok', ok_con_otros:'row-ok-otros', falla_p1:'row-p1',
                   falla_p2:'row-p2', sin_comunicacion:'row-sc', sin_datos:'row-sd' };
  tr.className = rowCls[v.status] || '';
  tr.addEventListener('click', () => onRowClick(v));

  const noGuardian = !v.device_id;
  const flags = v.flags;

  let pillsHtml;
  if (noGuardian || (!flags.has_contact && !flags.has_comps) || flags.sin_info_con_com) {
    pillsHtml = `<span class="sin-info">SIN INFORMACIÓN</span>`;
  } else if (v.failed_components.length > 0) {
    pillsHtml = `<div class="pills">${v.failed_components.map(fc =>
      `<span class="pill pill-p${fc.priority}">${escapeHtml(COMP_LABELS[fc.component] || fc.component)} ${fc.value}%</span>`
    ).join('')}</div>`;
  } else {
    pillsHtml = `<span class="no-falla">✓ Vehículo sin fallas</span>`;
  }

  tr.innerHTML = `
    <td class="veh"><span class="veh-chip">${escapeHtml(v.vehicle)}</span></td>
    <td>${noGuardian ? '<span class="guardian-none">SIN GUARDIAN</span>' : `<span class="guardian-chip">${escapeHtml(v.device_id)}</span>`}</td>
    <td class="acc" title="${escapeHtml(v.account)}">${escapeHtml(v.account)}</td>
    <td class="flt" title="${escapeHtml(v.fleet)}">${escapeHtml(v.fleet)}</td>
    <td>${getBadgeHtml(v.status)}</td>
    <td>${pillsHtml}</td>
    <td>${guardianContactHtml(v)}</td>
    <td>${ffcContactHtml(v)}</td>
    <td>${ffcErrHtml(v.ffc?.sdErrors)}</td>
    <td>${ffcErrHtml(v.ffc?.videoErrors)}</td>
  `;
  return tr;
}

function guardianContactHtml(v) {
  const age = v.contact_age_days;
  if (age === null) return `<div class="contact-cell"><span class="contact-none">Sin Contacto</span></div>`;
  const lbl = ageLbl(age), dl = dateLbl(v.last_contact_utc);
  if (age > 3) return `<div class="contact-cell"><span class="contact-crit">📡 ${escapeHtml(lbl)} ⚠</span><br><span class="contact-date">${escapeHtml(dl)}</span></div>`;
  const showOK = !!v.device_id && v.flags.has_comps;
  return `<div class="contact-cell"><div class="contact-ok-row"><span class="contact-val">${escapeHtml(lbl)}</span>${showOK ? '<span class="contact-ok-tag">OK</span>' : ''}</div><span class="contact-date">${escapeHtml(dl)}</span></div>`;
}

function ffcContactHtml(v) {
  const days = v.ffc?.days ?? null;
  if (days === null) return `<span class="ffc-none">SIN FFC</span>`;
  const lbl = ageLbl(days), dl = dateLbl(v.ffc.lastComms);
  if (days > 3) return `<div class="ffc-cell"><span class="ffc-crit">📡 ${escapeHtml(lbl)} ⚠</span><br><span class="ffc-date">${escapeHtml(dl)}</span></div>`;
  return `<div class="ffc-cell"><div class="ffc-ok-row"><span class="ffc-val">${escapeHtml(lbl)}</span><span class="ffc-ok-tag">OK</span></div><span class="ffc-date">${escapeHtml(dl)}</span></div>`;
}

function ffcErrHtml(val) {
  if (val === null || val === undefined) return `<span class="sin-datos-txt">—</span>`;
  const n = Number(val);
  return `<span class="ffc-err-cell ${n === 0 ? 'ffc-err-ok' : 'ffc-err-bad'}">${n === 0 ? '0 ✓' : n + ' ⚠'}</span>`;
}

function renderPagination(pag, page, total, onPage) {
  pag.innerHTML = '';
  if (total <= 1) return;
  const btn = (label, dis, act, cb) => {
    const b = document.createElement('button');
    b.className = 'pb' + (act ? ' active' : '');
    b.textContent = label;
    b.disabled = dis;
    if (!dis) b.addEventListener('click', cb);
    return b;
  };
  pag.appendChild(btn('←', page === 1, false, () => onPage(page - 1)));
  const s = Math.max(1, page - 2), e = Math.min(total, page + 2);
  if (s > 1) {
    pag.appendChild(btn(1, false, false, () => onPage(1)));
    if (s > 2) {
      const d = document.createElement('span'); d.className = 'pi'; d.textContent = '…';
      pag.appendChild(d);
    }
  }
  for (let p = s; p <= e; p++) pag.appendChild(btn(String(p), false, p === page, () => onPage(p)));
  if (e < total) {
    if (e < total - 1) {
      const d = document.createElement('span'); d.className = 'pi'; d.textContent = '…';
      pag.appendChild(d);
    }
    pag.appendChild(btn(String(total), false, false, () => onPage(total)));
  }
  pag.appendChild(btn('→', page === total, false, () => onPage(page + 1)));
  const info = document.createElement('span');
  info.className = 'pi';
  info.textContent = `Pág. ${page} / ${total}`;
  pag.appendChild(info);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/view/components/vehicle-table.js
git commit -m "feat(view): vehicle table with documentfragment and html escaping"
```

---

### Task 4.6: Vehicle modal

**Files:**
- Create: `src/view/components/vehicle-modal.js`

- [ ] **Step 1: Modal con DOM construido por createElement (sin innerHTML para datos externos)**

```js
// src/view/components/vehicle-modal.js
import { P1_COLS, P2_COLS, P3_COLS, COMP_LABELS } from '../../domain/rules.js';
import { ageLbl, dateLbl, escapeHtml, getBadgeHtml } from '../format.js';

export function vehicleModalView() {
  const root = document.createElement('div');
  root.id = 'overlay';
  root.innerHTML = `
    <div class="modal">
      <div class="m-head">
        <div>
          <div class="m-veh" data-veh></div>
          <div class="m-guardian" data-guardian></div>
          <div class="m-meta" data-meta></div>
        </div>
        <button class="m-close" data-close>✕</button>
      </div>
      <div class="m-body">
        <div data-comm-box></div>
        <div data-ffc-box></div>
        <div data-general></div>
        <div data-components></div>
      </div>
    </div>
  `;
  root.querySelector('[data-close]').addEventListener('click', () => root.classList.remove('open'));
  root.addEventListener('click', e => { if (e.target === root) root.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') root.classList.remove('open'); });
  return root;
}

export function showVehicle(root, v) {
  root.querySelector('[data-veh]').textContent = v.vehicle;
  root.querySelector('[data-guardian]').textContent = 'Guardian: ' + (v.device_id || 'SIN GUARDIAN');
  root.querySelector('[data-meta]').textContent = `${v.account} · ${v.fleet}`;
  root.querySelector('[data-comm-box]').innerHTML = commBoxHtml(v);
  root.querySelector('[data-ffc-box]').innerHTML = ffcBoxHtml(v);
  root.querySelector('[data-general]').innerHTML = `<div class="mrow"><span class="mrow-l">Estado</span><span>${getBadgeHtml(v.status)}</span></div>`;
  root.querySelector('[data-components]').innerHTML = componentsHtml(v);
  root.classList.add('open');
}

function commBoxHtml(v) {
  const age = v.contact_age_days;
  if (age === null) {
    return `<div class="comm-box none"><div><div class="comm-big none">Sin Contacto</div><div class="comm-label">Guardian — sin registro de contacto</div></div></div>`;
  }
  const isCrit = age > 3, isWarn = age > 1 && !isCrit;
  const cls = isCrit ? 'crit' : isWarn ? 'warn' : 'ok';
  const lbl = ageLbl(age), dl = dateLbl(v.last_contact_utc);
  const badge = isCrit ? '<span class="badge b-sc b-sc-anim">📡 Sin Comunicación >72h</span>'
              : isWarn ? '<span class="badge b-p2">⚠ Contacto con retraso</span>'
                       : '<span class="badge b-ok">✓ Comunicación Normal</span>';
  return `<div class="comm-box ${cls}">
    <div>
      <div class="comm-big ${cls}">${escapeHtml(lbl)}</div>
      <div class="comm-label">Guardian — Antigüedad último contacto</div>
      <div class="comm-date">${escapeHtml(dl)}</div>
    </div>
    <div class="comm-status-badge">${badge}</div>
  </div>`;
}

function ffcBoxHtml(v) {
  const ffc = v.ffc;
  if (!ffc || ffc.days === null) {
    return `<div class="ffc-box"><div class="ffc-box-title">📷 FFC — Forward Facing Camera</div><div class="ffc-empty">SIN FFC — Sin datos de cámara frontal</div></div>`;
  }
  const isCrit = ffc.days > 3;
  const sdClass = ffc.sdErrors === 0 ? 'ok' : 'crit';
  const vidClass = ffc.videoErrors === 0 ? 'ok' : 'warn';
  return `<div class="ffc-box">
    <div class="ffc-box-title">📷 FFC — Forward Facing Camera</div>
    <div class="ffc-grid">
      <div>
        <div class="ffc-item-label">Último Contacto</div>
        <div class="ffc-item-val ${isCrit ? 'crit' : 'ok'}">${isCrit ? '📡 ' : ''}${escapeHtml(ageLbl(ffc.days))}${isCrit ? ' ⚠' : ''}</div>
        <div class="ffc-item-date">${escapeHtml(dateLbl(ffc.lastComms))}</div>
      </div>
      <div><div class="ffc-item-label">Error SD</div><div class="ffc-item-val ${sdClass}">${ffc.sdErrors === 0 ? '0 ✓' : ffc.sdErrors + ' ⚠'}</div></div>
      <div><div class="ffc-item-label">Error Video</div><div class="ffc-item-val ${vidClass}">${ffc.videoErrors === 0 ? '0 ✓' : ffc.videoErrors + ' ⚠'}</div></div>
    </div>
  </div>`;
}

function componentsHtml(v) {
  if (!v.device_id) return `<div class="m-empty">Sin Guardian asignado — sin datos de componentes.</div>`;
  if (v.flags.sin_info_con_com || (!v.flags.has_comps && !v.flags.sin_comunicacion))
    return `<div class="m-warn">⚠ Comunicación activa pero sin datos de componentes.</div>`;
  if (!v.flags.has_comps) return `<div class="m-empty">Sin datos de componentes disponibles.</div>`;

  const failMap = Object.fromEntries(v.failed_components.map(f => [f.component, f]));
  const groups = [
    { label: 'Prioridad 1 — Crítica',        tag: 'p1', cols: P1_COLS, color: 'var(--p1)' },
    { label: 'Prioridad 2 — Moderada',       tag: 'p2', cols: P2_COLS, color: 'var(--p2)' },
    { label: 'Otros Componentes (FFC / PSU)', tag: 'p3', cols: P3_COLS, color: 'var(--otra)' }
  ];

  return groups.map(g => `
    <div class="prio-section">
      <div class="prio-header"><span class="prio-tag ${g.tag}">${g.label}</span></div>
      ${g.cols.map(col => {
        const f = failMap[col];
        const failing = !!f;
        const pct = failing ? f.value : null;
        const color = failing ? g.color : 'var(--ok)';
        return `<div class="ccomp-row ${failing ? 'failing-' + g.tag : ''}">
          <span class="ccomp-name">${escapeHtml(COMP_LABELS[col] || col)}</span>
          <div class="ccomp-right">
            <div class="cbar"><div class="cbar-fill" style="width:${failing ? pct : 100}%;background:${color}"></div></div>
            <span class="cpct" style="color:${color}">${failing ? pct.toFixed(1) + '%' : 'OK'}</span>
            ${failing ? `<span class="badge b-${g.tag}">FALLA</span>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  `).join('');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/view/components/vehicle-modal.js
git commit -m "feat(view): vehicle detail modal"
```

---

### Task 4.7: Upload panel + Toast

**Files:**
- Create: `src/view/components/upload-panel.js`, `src/view/components/toast.js`

- [ ] **Step 1: Upload panel (para re-cargar CSVs cuando ya hay datos)**

```js
// src/view/components/upload-panel.js
export function uploadPanelView({ onPickPerf, onPickGraf, onApply }) {
  const root = document.createElement('div');
  root.className = 'upload-panel';
  root.innerHTML = `
    <div class="up-title">Reemplazar datos</div>
    <div class="up-row">
      <span class="up-label">Performance.csv</span>
      <span class="up-status" data-perf-status>Sin cargar</span>
      <button class="up-btn" data-pick-perf>Elegir</button>
    </div>
    <div class="up-row">
      <span class="up-label">Grafana.csv</span>
      <span class="up-status" data-graf-status>Sin cargar</span>
      <button class="up-btn" data-pick-graf>Elegir</button>
    </div>
    <button class="up-apply" data-apply disabled>Aplicar</button>
    <input type="file" accept=".csv" data-file-perf hidden>
    <input type="file" accept=".csv" data-file-graf hidden>
  `;
  const fp = root.querySelector('[data-file-perf]');
  const fg = root.querySelector('[data-file-graf]');
  root.querySelector('[data-pick-perf]').addEventListener('click', () => fp.click());
  root.querySelector('[data-pick-graf]').addEventListener('click', () => fg.click());
  fp.addEventListener('change', e => { if (e.target.files[0]) onPickPerf(e.target.files[0]); e.target.value=''; });
  fg.addEventListener('change', e => { if (e.target.files[0]) onPickGraf(e.target.files[0]); e.target.value=''; });
  root.querySelector('[data-apply]').addEventListener('click', onApply);
  return root;
}

export function setUploadStatus(root, kind, name, ready) {
  const sel = kind === 'perf' ? '[data-perf-status]' : '[data-graf-status]';
  const el = root.querySelector(sel);
  el.textContent = name ? '✓ ' + name : 'Sin cargar';
  el.classList.toggle('loaded', !!name);
  root.querySelector('[data-apply]').disabled = !ready;
}

export function toggleUploadPanel(root, force) {
  if (force === undefined) root.classList.toggle('open');
  else root.classList.toggle('open', force);
}
```

- [ ] **Step 2: Toast**

```js
// src/view/components/toast.js
export function toastView() {
  const root = document.createElement('div');
  root.className = 'toast';
  return root;
}

export function showToast(root, msg) {
  root.textContent = msg;
  root.classList.add('show');
  clearTimeout(root._t);
  root._t = setTimeout(() => root.classList.remove('show'), 3500);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/view/components/upload-panel.js src/view/components/toast.js
git commit -m "feat(view): upload panel and toast components"
```

---

### Task 4.8: `view/render.js` — orquestador

**Files:**
- Create: `src/view/render.js`

- [ ] **Step 1: Implementar**

```js
// src/view/render.js
import { emptyStateView } from './components/empty-state.js';
import { headerView, updateHeaderTs } from './components/header.js';
import { kpiStripView, updateKpis } from './components/kpi-strip.js';
import { filtersView, updateAccountOptions, updateCount } from './components/filters.js';
import { alertBannerView, updateAlertCount } from './components/alert-banner.js';
import { vehicleTableView, updateTable } from './components/vehicle-table.js';
import { vehicleModalView, showVehicle } from './components/vehicle-modal.js';
import { uploadPanelView, setUploadStatus, toggleUploadPanel } from './components/upload-panel.js';
import { toastView, showToast } from './components/toast.js';
import { getFilteredVehicles, getAccountStats } from '../app/controller.js';

export function mount(container, store, controller, exportFn) {
  const view = {
    mode: null,           // 'empty' | 'full'
    pendingPerf: null,    // { name, text }
    pendingGraf: null,
    refs: {}              // referencias a roots de componentes
  };

  const toast = toastView();
  container.appendChild(toast);

  function readFile(file) {
    return new Promise((res, rej) => {
      if (file.size > 50 * 1024 * 1024) return rej(new Error('Archivo > 50 MB'));
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error('No se pudo leer el archivo'));
      r.readAsText(file, 'utf-8');
    });
  }

  async function applyUpload() {
    if (!view.pendingPerf || !view.pendingGraf) {
      showToast(toast, '⚠ Cargá ambos archivos primero');
      return;
    }
    showToast(toast, '⏳ Procesando archivos…');
    try {
      await controller.handleApplyUpload(view.pendingPerf.text, view.pendingGraf.text);
      view.pendingPerf = null; view.pendingGraf = null;
      showToast(toast, '✅ Dashboard actualizado');
    } catch (err) {
      console.error(err);
      showToast(toast, '❌ ' + err.message);
    }
  }

  async function pickFile(kind, file) {
    try {
      const text = await readFile(file);
      const slot = { name: file.name, text };
      if (kind === 'perf') view.pendingPerf = slot; else view.pendingGraf = slot;
      const ready = !!(view.pendingPerf && view.pendingGraf);
      if (view.mode === 'empty') {
        const root = view.refs.empty;
        root.querySelector(kind === 'perf' ? '[data-perf-status]' : '[data-graf-status]').textContent = '✓ ' + file.name;
        root.querySelector('[data-apply]').disabled = !ready;
      } else if (view.refs.uploadPanel) {
        setUploadStatus(view.refs.uploadPanel, kind, file.name, ready);
      }
    } catch (err) {
      showToast(toast, '❌ ' + err.message);
    }
  }

  function buildEmpty() {
    container.replaceChildren(toast);
    const empty = emptyStateView({
      onPickPerf: f => pickFile('perf', f),
      onPickGraf: f => pickFile('graf', f),
      onApply: applyUpload,
      ready: false
    });
    container.appendChild(empty);
    view.refs = { empty };
    view.mode = 'empty';
  }

  function buildFull() {
    container.replaceChildren(toast);
    const uploadPanel = uploadPanelView({
      onPickPerf: f => pickFile('perf', f),
      onPickGraf: f => pickFile('graf', f),
      onApply: () => { applyUpload(); toggleUploadPanel(uploadPanel, false); }
    });
    const header = headerView({
      onUploadToggle: () => toggleUploadPanel(uploadPanel),
      onExport: () => exportFn(store.getState()),
      timestamp: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })
    });
    const kpi = kpiStripView({ onFilter: f => controller.setFilter(f) });
    const banner = alertBannerView({ onClick: () => controller.setFilter('sin_comunicacion') });
    const filters = filtersView({
      onSearch: v => controller.setSearch(v),
      onAccount: v => { controller.setAccount(v); },
      onComponent: v => controller.setComponent(v),
      onPriority: v => controller.setPriority(v)
    });
    const modal = vehicleModalView();
    const table = vehicleTableView({
      onSort: c => controller.setSort(c),
      onRowClick: v => showVehicle(modal, v),
      onPage: p => { controller.setPage(p); window.scrollTo(0, 300); }
    });

    container.append(header, uploadPanel, kpi, banner, filters, table, modal);
    view.refs = { header, kpi, banner, filters, table, modal, uploadPanel };
    view.mode = 'full';
  }

  function update(state) {
    const isEmpty = state.data.vehicles.length === 0;
    if (isEmpty && view.mode !== 'empty') buildEmpty();
    else if (!isEmpty && view.mode !== 'full') buildFull();

    if (view.mode === 'full') {
      const stats = getAccountStats(state);
      updateKpis(view.refs.kpi, stats);
      updateAlertCount(view.refs.banner, stats.sin_comunicacion || 0);
      updateAccountOptions(view.refs.filters, state.data.accounts);
      const filtered = getFilteredVehicles(state);
      updateCount(view.refs.filters, filtered.length);
      updateTable(view.refs.table, {
        vehicles: filtered,
        page: state.ui.page,
        sortCol: state.ui.sortCol,
        sortDir: state.ui.sortDir
      });
      updateHeaderTs(view.refs.header, new Date(state.data.loadedAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' }));
    }
  }

  store.subscribe(update);
  update(store.getState());
}
```

- [ ] **Step 2: Commit**

```bash
git add src/view/render.js
git commit -m "feat(view): render orchestrator with empty/full modes"
```

---

## FASE 5 — Export XLSX

### Task 5.1: `export/xlsx-styles.js`

**Files:**
- Create: `src/export/xlsx-styles.js`

- [ ] **Step 1: Implementar paleta y helpers**

```js
// src/export/xlsx-styles.js

export const C = {
  hxRed:'C0392B', hxDark:'1E293B', white:'FFFFFF',
  lightGray:'F5F7FA', midGray:'E2E8F0',
  headerBg:'1E293B', headerFg:'FFFFFF',
  p1Bg:'FECACA', p1Fg:'991B1B',
  p2Bg:'FDE68A', p2Fg:'92400E',
  scBg:'FCD34D', scFg:'78350F',
  okBg:'BBF7D0', okFg:'14532D',
  sdBg:'E5E7EB', sdFg:'374151',
  rowAlt:'F8FAFC'
};

export function cell(fg, bg, bold = false, sz = 10, wrap = false) {
  return {
    font: { bold, color: { rgb: fg || C.hxDark }, sz },
    fill: { fgColor: { rgb: bg || C.white } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: wrap },
    border: {
      top:    { style: 'thin', color: { rgb: C.midGray } },
      bottom: { style: 'thin', color: { rgb: C.midGray } },
      left:   { style: 'thin', color: { rgb: C.midGray } },
      right:  { style: 'thin', color: { rgb: C.midGray } }
    }
  };
}

export function header() {
  return {
    font: { bold: true, sz: 11, color: { rgb: C.white } },
    fill: { fgColor: { rgb: C.headerBg } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top:    { style: 'medium', color: { rgb: C.hxDark } },
      bottom: { style: 'medium', color: { rgb: C.hxDark } },
      left:   { style: 'thin',   color: { rgb: C.midGray } },
      right:  { style: 'thin',   color: { rgb: C.midGray } }
    }
  };
}

export function statusStyle(status) {
  const map = {
    ok:               { bg: C.okBg, fg: C.okFg },
    ok_con_otros:     { bg: C.okBg, fg: C.okFg },
    falla_p1:         { bg: C.p1Bg, fg: C.p1Fg },
    falla_p2:         { bg: C.p2Bg, fg: C.p2Fg },
    sin_comunicacion: { bg: C.scBg, fg: C.scFg },
    sin_datos:        { bg: C.sdBg, fg: C.sdFg }
  };
  const m = map[status] || { bg: C.white, fg: C.hxDark };
  return cell(m.fg, m.bg, true, 10);
}

export function contactStyle(days) {
  if (days === null || days === undefined) return cell(C.sdFg, C.sdBg, false, 10);
  if (days > 3) return cell(C.scFg, C.scBg, true, 10);
  return cell(C.okFg, C.okBg, false, 10);
}

export function errStyle(val) {
  if (val === null || val === undefined) return cell(C.sdFg, C.sdBg, false, 10);
  return val === 0 ? cell(C.okFg, C.okBg, false, 10) : cell(C.p1Fg, C.p1Bg, true, 10);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/export/xlsx-styles.js
git commit -m "feat(export): xlsx style palette and helpers"
```

---

### Task 5.2: Hojas individuales (summary, vehicles, accounts)

**Files:**
- Create: `src/export/sheets/summary.js`, `src/export/sheets/vehicles.js`, `src/export/sheets/accounts.js`

- [ ] **Step 1: `summary.js`**

```js
// src/export/sheets/summary.js
import * as XLSX from 'xlsx';
import { C, cell, header } from '../xlsx-styles.js';

function pct(v, t) { return t ? ((v/t)*100).toFixed(1) + '%' : '0%'; }
function applyStyle(ws, r, c, s) {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (ws[addr]) ws[addr].s = s; else ws[addr] = { v: '', t: 's', s };
}

export function buildSummarySheet({ stats, activeAcct, now, filteredLen }) {
  const ws = {};
  const rows = [
    ['HX PERFORMANCE — REPORTE DE MONITOREO DE COMPONENTES'],
    ['Generado:', now],
    ['Filtro aplicado:', activeAcct || 'Todas las cuentas'],
    ['Vehículos en reporte:', filteredLen],
    [],
    ['INDICADOR', 'CANTIDAD', '% DEL TOTAL'],
    ['Total Flota', stats.total, '100%'],
    ['Sin Comunicación >72h', stats.sin_comunicacion||0, pct(stats.sin_comunicacion||0, stats.total)],
    ['Falla Crítica P1', stats.falla_p1||0, pct(stats.falla_p1||0, stats.total)],
    ['Falla Moderada P2', stats.falla_p2||0, pct(stats.falla_p2||0, stats.total)],
    ['Operativos', stats.ok||0, pct(stats.ok||0, stats.total)],
    ['Sin Datos', stats.sin_datos||0, pct(stats.sin_datos||0, stats.total)],
  ];
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A1' });
  ws['!cols'] = [{ wch: 36 }, { wch: 32 }, { wch: 16 }];
  ws['!rows'] = [{ hpt: 28 }, { hpt: 16 }, { hpt: 16 }, { hpt: 16 }, { hpt: 8 }, { hpt: 18 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  // título
  applyStyle(ws, 0, 0, {
    font: { bold: true, sz: 14, color: { rgb: C.white } },
    fill: { fgColor: { rgb: C.hxDark } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  // metadatos
  [[1,0],[2,0],[3,0]].forEach(([r,c]) => applyStyle(ws, r, c, cell(C.hxDark, C.lightGray, true, 10)));
  [[1,1],[2,1],[3,1]].forEach(([r,c]) => applyStyle(ws, r, c, cell(C.hxDark, C.white, false, 10)));
  // header
  [0,1,2].forEach(c => applyStyle(ws, 5, c, header()));
  // filas data
  const sColors = [
    null,
    { bg: C.scBg, fg: C.scFg },
    { bg: C.p1Bg, fg: C.p1Fg },
    { bg: C.p2Bg, fg: C.p2Fg },
    { bg: C.okBg, fg: C.okFg },
    { bg: C.sdBg, fg: C.sdFg }
  ];
  sColors.forEach((sc, i) => {
    const r = 6 + i;
    const m = sc || { bg: C.lightGray, fg: C.hxDark };
    [0,1,2].forEach(c => applyStyle(ws, r, c, cell(m.fg, m.bg, c === 1, 10)));
  });
  return ws;
}
```

- [ ] **Step 2: `vehicles.js`**

```js
// src/export/sheets/vehicles.js
import * as XLSX from 'xlsx';
import { C, cell, header, statusStyle, contactStyle, errStyle } from '../xlsx-styles.js';
import { STATUS_LABELS, COMP_LABELS } from '../../domain/rules.js';
import { dateLbl } from '../../view/format.js';

function setVal(ws, r, c, val, style) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const t = typeof val === 'number' ? 'n' : 's';
  ws[addr] = { v: val ?? '', t, s: style };
}

export function buildVehiclesSheet({ vehicles }) {
  const ws = {};
  const headers = ['Vehículo','Guardian','Cuenta','Flota','Estado','Fallas de Componente',
                   'Contacto Guardian (días)','Fecha Contacto Guardian',
                   'Contacto FFC (días)','Fecha Contacto FFC',
                   'Error SD','Error Video FFC'];
  headers.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = { v: h, t: 's', s: header() };
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: vehicles.length, c: headers.length - 1 } });
  ws['!cols'] = [{wch:14},{wch:22},{wch:22},{wch:26},{wch:22},{wch:48},{wch:16},{wch:22},{wch:16},{wch:22},{wch:10},{wch:14}];
  ws['!rows'] = [{ hpt: 22 }];

  vehicles.forEach((v, i) => {
    const r = i + 1;
    const altBg = i % 2 === 1 ? C.rowAlt : C.white;
    const baseCell = (bold = false, wrap = false) => cell(C.hxDark, altBg, bold, 10, wrap);
    const noG = !v.device_id;
    const failDesc = noG || (!v.flags.has_contact && !v.flags.has_comps) || v.flags.sin_info_con_com
      ? 'SIN INFORMACIÓN'
      : v.failed_components.length > 0
        ? v.failed_components.map(fc => `${COMP_LABELS[fc.component] || fc.component} ${fc.value}%`).join(' | ')
        : '✓ Vehículo sin fallas';

    setVal(ws, r, 0, v.vehicle, cell(C.okFg, C.okBg, true, 10));
    setVal(ws, r, 1, noG ? 'SIN GUARDIAN' : v.device_id, noG ? cell(C.sdFg, C.sdBg, false, 10) : baseCell());
    setVal(ws, r, 2, v.account, baseCell());
    setVal(ws, r, 3, v.fleet, baseCell());
    setVal(ws, r, 4, STATUS_LABELS[v.status] || v.status, statusStyle(v.status));
    setVal(ws, r, 5, failDesc, cell(
      failDesc === 'SIN INFORMACIÓN' ? C.p1Fg : failDesc === '✓ Vehículo sin fallas' ? C.okFg : C.hxDark,
      failDesc === 'SIN INFORMACIÓN' ? C.p1Bg : altBg, false, 10, true));
    setVal(ws, r, 6, v.contact_age_days ?? 'Sin Contacto', contactStyle(v.contact_age_days));
    setVal(ws, r, 7, dateLbl(v.last_contact_utc) || 'Sin Contacto', contactStyle(v.contact_age_days));
    setVal(ws, r, 8, v.ffc?.days ?? 'SIN FFC', contactStyle(v.ffc?.days ?? null));
    setVal(ws, r, 9, dateLbl(v.ffc?.lastComms) || 'SIN FFC', contactStyle(v.ffc?.days ?? null));
    setVal(ws, r, 10, v.ffc?.sdErrors ?? '—', errStyle(v.ffc?.sdErrors ?? null));
    setVal(ws, r, 11, v.ffc?.videoErrors ?? '—', errStyle(v.ffc?.videoErrors ?? null));
    ws['!rows'].push({ hpt: 18 });
  });
  return ws;
}
```

- [ ] **Step 3: `accounts.js`**

```js
// src/export/sheets/accounts.js
import * as XLSX from 'xlsx';
import { C, cell, header } from '../xlsx-styles.js';

function setVal(ws, r, c, val, style) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = { v: val ?? '', t: typeof val === 'number' ? 'n' : 's', s: style };
}

export function buildAccountsSheet({ accounts }) {
  const ws = {};
  const headers = ['Cuenta','Total','Sin Comunicación','Falla P1','Falla P2','Operativos','Sin Datos'];
  headers.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = { v: h, t: 's', s: header() };
  });
  accounts.forEach((a, i) => {
    const r = i + 1;
    const altBg = i % 2 === 1 ? C.rowAlt : C.white;
    const styles = [
      cell(C.hxDark, altBg, true, 10),
      cell(C.hxDark, altBg, true, 10),
      cell(C.scFg, C.scBg, false, 10),
      cell(C.p1Fg, C.p1Bg, false, 10),
      cell(C.p2Fg, C.p2Bg, false, 10),
      cell(C.okFg, C.okBg, false, 10),
      cell(C.sdFg, C.sdBg, false, 10),
    ];
    [a.account, a.total, a.sin_comunicacion||0, a.falla_p1||0, a.falla_p2||0, a.ok||0, a.sin_datos||0]
      .forEach((v, c) => setVal(ws, r, c, v, styles[c]));
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: accounts.length, c: 6 } });
  ws['!cols'] = [{wch:32},{wch:10},{wch:18},{wch:12},{wch:12},{wch:14},{wch:12}];
  ws['!rows'] = [{ hpt: 22 }, ...accounts.map(() => ({ hpt: 18 }))];
  return ws;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/export/sheets/
git commit -m "feat(export): xlsx sheets (summary, vehicles, accounts)"
```

---

### Task 5.3: `export/xlsx.js` entry point

**Files:**
- Create: `src/export/xlsx.js`

- [ ] **Step 1: Implementar**

```js
// src/export/xlsx.js
import * as XLSX from 'xlsx';
import { buildSummarySheet } from './sheets/summary.js';
import { buildVehiclesSheet } from './sheets/vehicles.js';
import { buildAccountsSheet } from './sheets/accounts.js';
import { getFilteredVehicles, getAccountStats } from '../app/controller.js';

export function exportFleetXLSX(state) {
  const filtered = getFilteredVehicles(state);
  if (!filtered.length) throw new Error('No hay vehículos para exportar');

  const wb = XLSX.utils.book_new();
  const activeAcct = state.ui.account || '';
  const stats = getAccountStats(state);
  const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  const dateStr = new Date().toLocaleDateString('es-CL', { timeZone: 'America/Santiago' }).replace(/\//g, '-');

  XLSX.utils.book_append_sheet(wb, buildSummarySheet({ stats, activeAcct, now, filteredLen: filtered.length }), 'Resumen');
  XLSX.utils.book_append_sheet(wb, buildVehiclesSheet({ vehicles: filtered }), 'Vehículos');

  const accountsForSheet = activeAcct
    ? state.data.accounts.filter(a => a.account === activeAcct)
    : state.data.accounts.slice().sort((a, b) => a.account.localeCompare(b.account));
  XLSX.utils.book_append_sheet(wb, buildAccountsSheet({ accounts: accountsForSheet }), 'Por Cuenta');

  const fname = `HxPerformance_${activeAcct ? activeAcct.replace(/[^a-zA-Z0-9]/g, '_') + '_' : ''}${dateStr}.xlsx`;
  XLSX.writeFile(wb, fname);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/export/xlsx.js
git commit -m "feat(export): xlsx entry point"
```

---

## FASE 6 — Wire up + GH Pages

### Task 6.1: `src/main.js`

**Files:**
- Create: `src/main.js`

- [ ] **Step 1: Bootstrap**

```js
// src/main.js
import './styles/tokens.css';
import './styles/base.css';
import './styles/components/header.css';
import './styles/components/kpi-strip.css';
import './styles/components/filters.css';
import './styles/components/alert-banner.css';
import './styles/components/table.css';
import './styles/components/modal.css';
import './styles/components/upload-panel.css';
import './styles/components/toast.css';
import './styles/components/empty-state.css';

import { createStore, INITIAL_STATE } from './app/store.js';
import { createController } from './app/controller.js';
import { mount } from './view/render.js';
import { exportFleetXLSX } from './export/xlsx.js';

const store = createStore(INITIAL_STATE);
const controller = createController(store);
mount(document.getElementById('app'), store, controller, exportFleetXLSX);
```

- [ ] **Step 2: Probar dev server**

```bash
npm run dev
```
Expected: en `http://localhost:5173` se ve el empty state. Cargar `Performance.csv` + `Grafana.csv`, click "Cargar dashboard" → aparece el dashboard completo, sin errores en consola.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: wire store, controller, view and export"
```

---

### Task 6.2: GitHub Pages workflow

**Files:**
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: Crear workflow**

```yaml
# .github/workflows/pages.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Ajustar `vite.config.js`**

Reemplazar `<repo>` por el nombre real del repositorio en GitHub.

- [ ] **Step 3: Build local de verificación**

```bash
npm run build
npm run preview
```
Expected: build sin warnings, preview muestra el empty state.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pages.yml vite.config.js
git commit -m "chore: add github pages deploy workflow"
```

---

## FASE 7 — Limpieza final

### Task 7.1: Verificación funcional end-to-end

- [ ] **Step 1: Correr build + preview**

```bash
npm run build && npm run preview
```

- [ ] **Step 2: Smoke manual**

Abrir el preview y verificar:
1. Empty state visible al cargar.
2. Subir `Performance.csv` → status "✓ Performance.csv" en verde.
3. Subir `Grafana.csv` → status verde y botón "Cargar dashboard" habilitado.
4. Click → KPIs, tabla y filtros aparecen con datos reales.
5. KPI cards cambian filtro al hacer click.
6. Búsqueda filtra por vehicle/cuenta/guardian.
7. Selector de cuenta cambia KPIs.
8. Sort por columna alterna asc/desc.
9. Click en fila abre modal con detalle.
10. ESC cierra modal.
11. "Exportar XLSX" descarga archivo con tres hojas y estilos.
12. Botón "Cargar CSVs" del header abre panel y permite reemplazar datos.

- [ ] **Step 3: Tests finales**

```bash
npm test
```
Expected: todos los tests del dominio PASS.

### Task 7.2: Eliminar el HTML viejo

**Files:**
- Delete: `fleet_dashboard.html`, `Performance.csv`, `Grafana.csv`

- [ ] **Step 1: Verificar que no se referencian**

```bash
rg -n "fleet_dashboard|Performance\.csv|Grafana\.csv" src/ index.html 2>/dev/null || echo "ninguna referencia"
```

- [ ] **Step 2: Mover los CSVs a una carpeta de samples (opcional, fuera de repo)**

```bash
mkdir -p samples
mv Performance.csv Grafana.csv samples/ 2>/dev/null || true
echo "samples/" >> .gitignore
```

- [ ] **Step 3: Borrar HTML viejo**

```bash
rm -f fleet_dashboard.html
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove legacy monolithic html and sample csvs"
```

---

## Resumen de tasks

| Fase | Tasks | Output |
|---|---|---|
| 0 — Bootstrap | 0.1, 0.2 | Vite + estructura + logo + fixtures |
| 1 — Dominio | 1.1–1.5 | rules, csv-parse, merge, classify, aggregate (todos con tests) |
| 2 — App | 2.1, 2.2 | store, controller + selectores |
| 3 — Estilos | 3.1 | CSS dividido por componente |
| 4 — Vista | 4.1–4.8 | empty-state, format, header, kpi-strip, filters, alert-banner, table, modal, upload-panel, toast, render |
| 5 — Export | 5.1–5.3 | xlsx-styles, sheets, entry |
| 6 — Wire + Pages | 6.1, 6.2 | main.js + GH Pages workflow |
| 7 — Limpieza | 7.1, 7.2 | verificación + remove legacy |
