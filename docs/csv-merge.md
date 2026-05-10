# Cómo se mergean `Performance.csv` y `Grafana.csv`

Este documento describe el pipeline de transformación que convierte los dos CSV de entrada en la lista de vehículos que consume el dashboard.

---

## 1. Los dos archivos

### `Performance.csv`
Una fila por vehículo (con posibles duplicados si fue muestreado más de una vez en la ventana).

Columnas clave:

| Columna | Tipo | Rol |
|---|---|---|
| `vehicle` | string | **clave del vehículo** |
| `device_id` | string | serial del Guardian (ej. `P1002260-S00060937`) — clave de join con Grafana |
| `account` | string | cuenta (a veces prefijada `(SMLA) `) |
| `fleet` | string | flota (a veces prefijada `(SMLA) `) |
| `last_contact_utc` | datetime | último contacto del Guardian |
| `contact_age_days` | float | antigüedad del último contacto en días |
| `tracking`, `buzzer`, `camera`, `camera_detection`, `ffc_data`, `ffc_detection`, `ffc_streaming`, `gps_detection`, `gps_coverage`, `ir`, `psu`, `vib_motor` | float 0–1 | porcentaje de tiempo el componente estuvo OK (1.0 = 100%) |

### `Grafana.csv`
Una fila por dispositivo Guardian. Empieza con la línea `sep=,` que hay que **saltar**.

Columnas clave para el merge:

| Columna | Tipo | Rol |
|---|---|---|
| `guardianSerial` | string | **clave de join** (= `device_id` de Performance, en mayúsculas) |
| `ffcLastComms` | datetime | último contacto de la cámara FFC |
| `ffcLastCommsDays` | float | antigüedad en días |
| `ffcSdCriticalErrors` | int | errores críticos de SD card |
| `ffcVideoLossErrors` | int | errores de pérdida de video |

Aporta exclusivamente los datos del subsistema **FFC** (Forward Facing Camera). El resto de columnas de Grafana no se usan en la vista actual.

---

## 2. Pipeline de transformación

```
Performance.csv ─┐
                 ├─► [1] parse  ─► [2] dedup por vehicle  ─┐
Grafana.csv ─────┤                                         ├─► [4] join ─► [5] classify ─► [6] aggregate
                 └─► [1] parse  ─► [3] dedup por serial ───┘
```

### Paso 1 — Parse
- Usar PapaParse con `header: true`, `skipEmptyLines: true`.
- En Grafana, eliminar la primera línea si es `sep=,`.
- Normalizar texto: `trim()`, quitar comillas envolventes si quedaron.
- Limpiar prefijos: `account` y `fleet` pueden venir con `(SMLA) ` — se quita.
- Convertir numéricos con `parseFloat`; valores vacíos → `null` (NO `0` ni `NaN`).
- Para `guardianSerial`: `trim().toUpperCase()`, descartar `''` y `'NAN'`.

### Paso 2 — Dedup de Performance por `vehicle`
Un mismo vehículo puede aparecer varias veces. Se conserva **la fila con menor `contact_age_days`** (la más reciente). Las filas con `contact_age_days === null` quedan solo si no hay alternativa con valor.

```pseudo
byVehicle = {}
for r in performanceRows:
  if !byVehicle[r.vehicle]
     or (r.contact_age_days < byVehicle[r.vehicle].contact_age_days):
    byVehicle[r.vehicle] = r
```

### Paso 3 — Dedup de Grafana por `guardianSerial`
Idéntico criterio: gana la fila con menor `ffcLastCommsDays`.

```pseudo
ffcByGuardian = {}
for r in grafanaRows:
  if !ffcByGuardian[r.guardianSerial]
     or (r.ffcLastCommsDays < ffcByGuardian[r.guardianSerial].days):
    ffcByGuardian[r.guardianSerial] = {
      lastComms: r.ffcLastComms,
      days:      r.ffcLastCommsDays,
      sdErrors:  r.ffcSdCriticalErrors,
      videoErrors: r.ffcVideoLossErrors
    }
```

### Paso 4 — Join
Para cada vehículo único, buscar su FFC en `ffcByGuardian` por **`device_id.trim().toUpperCase()`**.

- Si **match**: se asigna `ffc = ffcByGuardian[key]`.
- Si **no match** (o el vehículo no tiene `device_id`): `ffc = null` y la vista mostrará `SIN FFC`.

> El join es **left** desde Performance. Filas de Grafana sin contraparte en Performance se descartan (no hay un vehículo donde colgarlas).

### Paso 5 — Clasificación por vehículo
Cada vehículo se evalúa en orden estricto:

| # | Condición | Status resultante |
|---|---|---|
| 1 | `contact_age_days > 3` (días) | `sin_comunicacion` |
| 2 | sin contacto Y sin ningún componente con valor | `sin_datos` |
| 3 | con contacto pero sin componentes (`sin_info_con_com`) | `falla_p1` |
| 4 | algún componente con `value < 0.75` Y al menos uno es **P1** | `falla_p1` |
| 5 | algún componente con `value < 0.75` Y al menos uno es **P2** | `falla_p2` |
| 6 | algún componente con `value < 0.75` solo en **P3** | `ok_con_otros` |
| 7 | resto | `ok` |

**Componentes y prioridad** (única fuente de verdad — `domain/rules.js`):

- **P1 (crítica):** `tracking`, `ir`, `gps_detection`, `gps_coverage`, `camera_detection`, `camera`
- **P2 (moderada):** `vib_motor`, `buzzer`
- **P3 (otros):** `ffc_data`, `ffc_detection`, `ffc_streaming`, `psu`

**Umbral de falla:** `FAILURE_THRESHOLD = 0.75`. Un componente con `value < 0.75` se considera fallando.
**Umbral de comunicación:** `STALE_CONTACT_DAYS = 3`.

Por cada componente fallando se genera:
```js
{ component, value: round(value * 1000) / 10, priority }  // value como % con un decimal
```
Y la lista resultante se ordena por `priority` ascendente.

### Paso 6 — Agregaciones
- **Stats globales:** `{ total, ok, falla_p1, falla_p2, sin_comunicacion, sin_datos }`.
  - `ok` agrupa `ok` + `ok_con_otros`.
- **Stats por cuenta:** misma estructura, agrupado por `account`.

---

## 3. Esquema final del vehículo

Lo que termina en el store y consume la vista:

```ts
type Vehicle = {
  // Identificación
  vehicle: string,
  device_id: string | null,        // null = "SIN GUARDIAN"
  account: string,
  fleet: string,

  // Contacto Guardian
  last_contact_utc: string | null,
  contact_age_days: number | null,

  // Flags derivados (clasificación)
  sin_comunicacion: boolean,        // age > 3
  has_contact: boolean,
  has_comps: boolean,
  sin_contacto_total: boolean,
  sin_info_con_com: boolean,

  // Estado final
  status: 'ok' | 'ok_con_otros' | 'falla_p1' | 'falla_p2' | 'sin_comunicacion' | 'sin_datos',

  // Componentes con falla (value < 0.75)
  failed_components: Array<{ component: string, value: number /* % */, priority: 1|2|3 }>,

  // Datos FFC (del merge con Grafana)
  ffcLastComms: string | null,
  ffcLastCommsDays: number | null,
  ffcSdCriticalErrors: number | null,
  ffcVideoLossErrors: number | null
};
```

---

## 4. Casos límite y decisiones explícitas

| Caso | Decisión |
|---|---|
| Vehículo en Performance sin `device_id` | `ffc = null`, mostrar como **SIN GUARDIAN** en la tabla. |
| `guardianSerial` con valor `'NaN'` o vacío | Se ignora la fila de Grafana. |
| Mismo vehículo en varias filas de Performance | Gana la fila con menor `contact_age_days`. |
| Mismo `guardianSerial` en varias filas de Grafana | Gana la fila con menor `ffcLastCommsDays`. |
| Vehículo presente en Grafana pero no en Performance | Se descarta — el catálogo de vehículos lo define Performance. |
| `contact_age_days` vacío | `null`. La clasificación lo trata como sin contacto. |
| Componente vacío | `null`. NO cuenta como falla (no se evalúa `< 0.75` sobre `null`). |
| Cuenta con prefijo `(SMLA) ` | Se quita en el parse. |

---

## 5. Rendimiento

- Una sola pasada de parse por archivo (PapaParse en modo `header: true`).
- Dedup con `Map<string, row>` — O(n).
- Join con lookup en `Map` — O(1) por vehículo.
- Clasificación y agregación — O(n × |COMP_COLS|), con |COMP_COLS| = 12.

Para ~6.300 vehículos el pipeline completo corre en main thread en menos de 200 ms en hardware modesto. No requiere Web Worker.
