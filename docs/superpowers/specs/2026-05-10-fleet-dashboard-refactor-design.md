# Hx Performance Dashboard — Refactor & Decoupling Design

**Fecha:** 2026-05-10
**Estado:** Aprobado para implementación
**Alcance:** Reescribir `fleet_dashboard.html` (monolito de 840 líneas con 3 MB de JSON inline) en una aplicación desacoplada, desplegable a GitHub Pages, que arranca vacía y carga datos vía upload manual de los dos CSV.

---

## 1. Objetivos

1. **Empezar vacío.** Sin datos embebidos. Empty state con CTA para subir `Performance.csv` y `Grafana.csv`.
2. **Eliminar duplicación de lógica.** Las reglas de clasificación viven en un único módulo de dominio, sin lógica server-side hardcodeada que se desincronice.
3. **Desacoplar** en tres capas (dominio puro → app → vista) con dependencias unidireccionales.
4. **Resolver problemas de seguridad** (XSS en template literals, CDN sin SRI).
5. **Mejorar rendimiento** (render incremental con `DocumentFragment`, parser CSV correcto).
6. **Mantener fidelidad visual** del dashboard actual (KPI strip, tabla, modal, exportador XLSX con estilos).
7. **Testeable.** Dominio cubierto con Vitest.
8. **Desplegable a GitHub Pages** como sitio estático sin backend.

## 2. Stack

| Pieza | Elección | Por qué |
|---|---|---|
| Lenguaje | Vanilla JS (ES modules) | Sin runtime de framework. Mínimo peso. |
| Bundler / dev | Vite | `vite build` produce estático para GH Pages. HMR en dev. |
| CSV parsing | PapaParse (npm) | Maneja quoting, BOM, encoding correctamente. |
| XLSX export | SheetJS (`xlsx` npm, no CDN) | Bundleado, sin riesgo de CDN. |
| Fuentes | `@fontsource/ibm-plex-{mono,sans}` | Sin tracking ni dependencia externa. |
| Tests | Vitest | Integración nativa con Vite. |
| Hosting | GitHub Pages | Estático. Configurar `base: '/<repo>/'` en `vite.config.js`. |

## 3. Arquitectura en capas

```
view  →  app  →  domain
                  ↑
            export/xlsx
```

Reglas:
- `domain/` no importa nada del navegador (sin `document`, `window`, `FileReader`).
- `app/` orquesta dominio y store. No toca DOM.
- `view/` se suscribe al store y renderiza. No conoce las reglas de negocio.
- `export/` consume dominio + estado. No toca el DOM.

## 4. Estructura de archivos

```
dashboard/
├─ index.html
├─ vite.config.js
├─ package.json
├─ src/
│  ├─ main.js
│  ├─ assets/logo.png
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ base.css
│  │  └─ components/{header,kpi-strip,filters,table,modal,upload-panel,empty-state,toast,alert-banner}.css
│  ├─ domain/
│  │  ├─ rules.js
│  │  ├─ csv-parse.js
│  │  ├─ merge.js
│  │  ├─ classify.js
│  │  └─ aggregate.js
│  ├─ app/
│  │  ├─ store.js
│  │  └─ controller.js
│  ├─ view/
│  │  ├─ render.js
│  │  ├─ format.js
│  │  └─ components/{empty-state,kpi-strip,filters,alert-banner,vehicle-table,vehicle-modal,upload-panel,toast}.js
│  └─ export/
│     ├─ xlsx.js
│     ├─ xlsx-styles.js
│     └─ sheets/{summary,vehicles,accounts}.js
├─ test/
│  ├─ domain/
│  │  ├─ csv-parse.test.js
│  │  ├─ merge.test.js
│  │  ├─ classify.test.js
│  │  └─ aggregate.test.js
│  └─ fixtures/{performance-sample.csv,grafana-sample.csv}
└─ docs/
   └─ csv-merge.md
```

## 5. Dominio (módulos puros)

### `domain/rules.js`
Única fuente de verdad de constantes y umbrales:

```js
export const FAILURE_THRESHOLD = 0.75;       // value < threshold => falla
export const STALE_CONTACT_DAYS = 3;          // age > 3 => sin_comunicacion
export const WARN_CONTACT_DAYS = 1;           // 1 < age <= 3 => warn (modal)
export const PAGE_SIZE = 50;

export const COMP_COLS = ['tracking','buzzer','camera','camera_detection',
  'ffc_data','ffc_detection','ffc_streaming','gps_detection','gps_coverage',
  'ir','psu','vib_motor'];
export const P1_COLS = ['tracking','ir','gps_detection','gps_coverage','camera_detection','camera'];
export const P2_COLS = ['vib_motor','buzzer'];
export const P3_COLS = COMP_COLS.filter(c => !P1_COLS.includes(c) && !P2_COLS.includes(c));

export const COMP_LABELS = { /* … */ };
export const STATUS_LABELS = { /* … */ };
export const STATUS_ORDER = { sin_comunicacion:0, falla_p1:1, falla_p2:2, ok_con_otros:3, sin_datos:4, ok:5 };

export function priorityOf(component) {
  if (P1_COLS.includes(component)) return 1;
  if (P2_COLS.includes(component)) return 2;
  return 3;
}
```

### `domain/csv-parse.js`
```js
import Papa from 'papaparse';

export function parsePerformance(text) { /* devuelve [{ vehicle, device_id, account, fleet, last_contact_utc, contact_age_days, comps:{...} }] */ }
export function parseGrafana(text)     { /* devuelve [{ guardianSerial, ffcLastComms, ffcLastCommsDays, ffcSdCriticalErrors, ffcVideoLossErrors }] */ }
```

- Maneja prefijo `sep=,` de Grafana.
- Quita prefijo `(SMLA) ` en account/fleet.
- Convierte numéricos con `parseFloat`, null si vacío.
- Errores se lanzan como `Error` con mensaje legible para el controller.

### `domain/merge.js`
```js
export function mergeFleetData(perfRows, grafRows) {
  // 1. Dedup perfRows por vehicle quedándose con el contact_age_days menor.
  // 2. Construir Map<guardianSerial, ffc> con menor ffcLastCommsDays.
  // 3. Join: para cada vehículo, lookup por device_id.toUpperCase() en el ffcMap.
  // Devuelve [{ vehicle, device_id, account, fleet, last_contact_utc, contact_age_days, comps, ffc:{ lastComms, days, sdErrors, videoErrors } | null }]
}
```

### `domain/classify.js`
```js
export function classifyVehicle(v) {
  // Reglas (en orden de evaluación):
  // 1. contact_age_days > STALE_CONTACT_DAYS → sin_comunicacion
  // 2. !hasContact && !hasComps                → sin_datos
  // 3. hasContact && !hasComps                  → falla_p1 (sin_info_con_com=true)
  // 4. Si algún comp value < FAILURE_THRESHOLD:
  //    - priority 1 presente → falla_p1
  //    - priority 2 presente → falla_p2
  //    - solo priority 3     → ok_con_otros
  // 5. else                                     → ok
  // Devuelve { status, failed_components: [{component, value, priority}], flags: {...} }
}
```

### `domain/aggregate.js`
```js
export function buildGlobalStats(vehicles) { /* total + counts por status */ }
export function buildAccountStats(vehicles) { /* [{account, total, ok, falla_p1, falla_p2, sin_comunicacion, sin_datos}] */ }
```

## 6. App layer

### `app/store.js`
Store mínimo pub/sub. Estado inicial = `vehicles: []` → dispara empty state.

```js
export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    getState: () => state,
    setState: (patch) => { state = deepMerge(state, patch); subs.forEach(fn => fn(state)); },
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); }
  };
}
```

### `app/controller.js`
Casos de uso (funciones que consumen store + dominio):
- `handleApplyUpload(perfText, grafText)`
- `setFilter(kind)`, `setSearch(s)`, `setAccount(a)`, `setComponent(c)`, `setPriority(p)`, `setSort(col)`, `setPage(p)`
- `getFilteredVehicles()` — selector derivado: filtra y ordena `state.data.vehicles` según `state.ui`.

## 7. View

- `view/render.js` se suscribe al store. Cuando `data.vehicles.length === 0` muestra empty state y oculta el resto.
- Cada componente exporta `{ mount(el), update(state) }`.
- `view/format.js` exporta `escapeHtml`, `ageLbl`, `dateLbl`, `pct`, `getBadge`. **Todos los textos provenientes de CSV pasan por `escapeHtml` antes de tocar `innerHTML`**, o mejor: se asignan vía `textContent` cuando es posible.
- `vehicle-table.js` arma filas con `DocumentFragment`, hace `tbody.replaceChildren(fragment)`.
- `vehicle-modal.js` construye el DOM con `createElement` + `textContent` (sin template literals para datos externos).

## 8. Export

`export/xlsx.js` expone `exportFleetXLSX(state)`. Internamente:
- `xlsx-styles.js`: paleta `C`, helpers `bold()`, `cell()`, `statusStyle()`, `contactStyle()`, `errStyle()`.
- `sheets/summary.js`, `sheets/vehicles.js`, `sheets/accounts.js`: cada uno exporta `buildSheet(state) → ws`.
- Mismo output visual que el actual.

## 9. Seguridad

| Riesgo | Mitigación |
|---|---|
| XSS via campos CSV en `innerHTML` | `escapeHtml` obligatorio, preferir `textContent`. |
| CDN comprometida (SheetJS, Google Fonts) | Dependencias npm bundleadas. |
| Archivos arbitrariamente grandes | Validar `file.size < 50 MB` antes de leer. |
| Parser ingenuo split(',') | PapaParse. |

## 10. Rendimiento

- Parse + merge + classify ejecutados una sola vez por upload.
- Filtrado/sort sobre array plano, en main thread (suficiente para ~6 K filas).
- Tabla renderiza solo la página activa (50 filas) con `DocumentFragment` + `replaceChildren`.
- Pies redibujados en `requestAnimationFrame`.

## 11. Testing

`test/domain/` con Vitest. Fixtures pequeñas (~10 filas cada CSV) cubriendo casos límite. Coverage objetivo de dominio ≥ 90%. Sin tests de vista en esta iteración.

## 12. Deployment

- `npm run build` → `dist/` estático.
- `vite.config.js` con `base: '/<repo-name>/'`.
- GitHub Action `pages.yml`: build + deploy a branch `gh-pages` o usar el flujo nativo de Pages con artifacts.

## 13. No-goals (fuera de alcance)

- No se agrega backend.
- No se agrega persistencia (localStorage).
- No se agregan vistas nuevas, rutas, ni autenticación.
- No se cambia el modelo de datos del CSV.
- No se hace virtualización de filas (paginación de 50 es suficiente).

## 14. Riesgos

| Riesgo | Mitigación |
|---|---|
| Diferencias visuales con el original | Migración CSS variable por variable, snapshot visual manual antes/después. |
| Lógica de clasificación distinta a la del preprocesado server-side | El dominio nuevo es la fuente de verdad. Si el server existe, debe alinearse. |
| Archivos CSV con formatos inesperados | PapaParse + validación de headers esperados + mensajes de error claros. |
