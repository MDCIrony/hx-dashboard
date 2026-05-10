# Hx Performance — Fleet Component Monitoring Dashboard

> Dashboard de monitoreo de componentes de telemática para flota de vehículos.

## Tabla de contenidos
- [Qué hace](#qué-hace)
- [Stack](#stack)
- [Requisitos](#requisitos)
- [Levantar el proyecto](#levantar-el-proyecto)
- [Estructura](#estructura)
- [Usar el dashboard](#usar-el-dashboard)
- [Datos de entrada](#datos-de-entrada)
- [Testing](#testing)
- [Build de producción](#build-de-producción)
- [Despliegue en GitHub Pages](#despliegue-en-github-pages)
- [Arquitectura](#arquitectura)
- [Reglas de negocio](#reglas-de-negocio)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

## Qué hace

Monitorea aproximadamente 6.300 vehículos equipados con dispositivos Guardian, cámara FFC y GPS. Cada vehículo emite señales de salud de 12 componentes con valores normalizados entre 0 y 1; el dashboard combina ese feed con los datos de la cámara (Grafana export) para obtener una visión unificada por flota.

A partir de la fusión se clasifica cada vehículo en uno de cuatro estados (Sin Comunicación, P1 crítica, P2 moderada, OK) según el último contacto del Guardian y la severidad de los componentes en falla. P1 contiene componentes críticos para la operación (tracking, IR, GPS, cámara), P2 cubre indicadores de soporte (motor de vibración, buzzer) y P3 cubre el resto.

La interfaz permite filtrar por estado, cuenta, componente fallando y texto libre; ordenar la tabla; abrir un modal con el detalle por vehículo; y exportar el estado actual a XLSX con tres hojas estilizadas (Resumen, Vehículos, Por Cuenta).

## Stack

| Capa | Tecnología |
|---|---|
| Lenguaje | Vanilla JavaScript (ES modules) |
| Build | Vite 5 |
| Parsing CSV | PapaParse 5 |
| Export XLSX | SheetJS (`xlsx` 0.18) |
| Testing | Vitest 2 |
| Tipografía | `@fontsource/ibm-plex-sans` + `@fontsource/ibm-plex-mono` |
| Deploy | Estático en GitHub Pages |

Sin framework de UI, sin runtime de servidor, sin estado persistente.

## Requisitos

- Node.js >= 20
- npm
- (Para deploy) cuenta de GitHub con Pages habilitado en el repo

## Levantar el proyecto

```bash
git clone <repo-url>
cd dashboard
npm install
npm run dev
```

Abre http://localhost:5173. Verás la pantalla de empty-state pidiendo los dos CSV.

## Estructura

```
dashboard/
├─ .github/
│  └─ workflows/
│     └─ pages.yml             # CI: test + build + deploy a GH Pages
├─ docs/
│  ├─ csv-merge.md             # Pipeline de transformación de los CSV
│  └─ superpowers/             # Specs y plan del refactor
├─ samples/                    # CSV de ejemplo (gitignored)
├─ src/
│  ├─ main.js                  # Bootstrap (store + controller + view + export)
│  ├─ assets/
│  │  └─ logo.png
│  ├─ domain/                  # Capa pura (sin DOM)
│  │  ├─ rules.js              # Umbrales, prioridades P1/P2, constantes
│  │  ├─ csv-parse.js          # Parser Performance + Grafana
│  │  ├─ merge.js              # Join por device_id
│  │  ├─ classify.js           # Estado por vehículo
│  │  └─ aggregate.js          # KPIs globales y por cuenta
│  ├─ app/
│  │  ├─ store.js              # Pub/sub minimalista
│  │  └─ controller.js         # Casos de uso + selectores
│  ├─ view/
│  │  ├─ render.js             # Orquestador empty/full
│  │  ├─ format.js             # Helpers de formato + escape HTML
│  │  └─ components/
│  │     ├─ empty-state.js
│  │     ├─ header.js
│  │     ├─ kpi-strip.js
│  │     ├─ filters.js
│  │     ├─ alert-banner.js
│  │     ├─ vehicle-table.js
│  │     ├─ vehicle-modal.js
│  │     ├─ upload-panel.js
│  │     └─ toast.js
│  ├─ export/
│  │  ├─ xlsx.js               # Entry point del export
│  │  ├─ xlsx-styles.js        # Paleta y helpers de estilo
│  │  └─ sheets/
│  │     ├─ summary.js
│  │     ├─ vehicles.js
│  │     └─ accounts.js
│  └─ styles/
│     ├─ tokens.css            # Variables CSS (color, espaciado, tipos)
│     ├─ base.css
│     └─ components/           # 1 archivo por componente
├─ test/
│  ├─ domain/                  # 25 tests sobre la capa pura
│  └─ fixtures/                # CSV mínimos reproducibles
├─ index.html                  # Shell + <div id="app">
├─ vite.config.js              # base path para GH Pages
└─ package.json
```

## Usar el dashboard

### Carga inicial
1. Click "Elegir" en la fila Performance.csv → subir tu archivo.
2. Click "Elegir" en la fila Grafana.csv → subir tu archivo.
3. Click "Cargar dashboard".

### Filtros y navegación
- **KPI cards**: click para filtrar por estado (Sin Comunicación, P1, P2, OK).
- **Buscar**: por placa de vehículo, cuenta, guardian (device_id) o flota.
- **Cuenta**: filtrar por una cuenta específica; los KPIs se recalculan.
- **Componente fallando**: filtrar vehículos donde ese componente esté fallando.
- **Estado**: filtro adicional de estado.
- **Headers de tabla**: click para ordenar; segundo click invierte la dirección.
- **Fila**: click para abrir modal con detalle por componente.
- **Tecla ESC**: cierra el modal.

### Re-cargar datos
Botón "Cargar CSVs" en el header → panel para reemplazar Performance + Grafana sin recargar la página.

### Exportar
Botón "Exportar XLSX" → descarga `HxPerformance_[Cuenta_]YYYY-MM-DD.xlsx` con 3 hojas (Resumen, Vehículos, Por Cuenta) con estilos.

## Datos de entrada

Ver `docs/csv-merge.md` para el pipeline completo de transformación.

### Performance.csv

Una fila por vehículo. Columnas clave:

| Columna | Tipo | Notas |
|---|---|---|
| `vehicle` | string | Placa / identificador del vehículo |
| `device_id` | string | Serial del Guardian — clave de join con Grafana |
| `account` | string | Cuenta dueña del vehículo |
| `fleet` | string | Flota |
| `last_contact_utc` | ISO datetime | Último contacto del Guardian |
| `contact_age_days` | number | Días desde el último contacto |
| `tracking`, `ir`, `gps_detection`, `gps_coverage`, `camera_detection`, `camera` | 0–1 | Componentes P1 |
| `vib_motor`, `buzzer` | 0–1 | Componentes P2 |
| `ffc_data`, `ffc_detection`, `ffc_streaming`, `psu` | 0–1 | Componentes P3 |

### Grafana.csv

El archivo empieza con la línea `sep=,` (se ignora en el parser). Una fila por dispositivo. Columnas clave:

| Columna | Notas |
|---|---|
| `guardianSerial` | Coincide con `device_id` de Performance |
| `ffcLastComms` | Último contacto de la cámara |
| `ffcLastCommsDays` | Días desde el último contacto de la cámara |
| `ffcSdCriticalErrors` | Conteo de errores críticos de SD |
| `ffcVideoLossErrors` | Conteo de pérdida de video |

### Tamaño máximo
50 MB por archivo (validado en el cliente).

## Testing

```bash
npm test           # corre la suite completa una vez
npm run test:watch # modo watch
```

Cobertura: capa de dominio (parsing, merge, clasificación, agregación) — **25 tests** en `test/domain/`. La capa de vista no tiene tests automatizados; se valida manualmente con el smoke test descrito en el plan.

### Estructura de tests
```
test/
├─ domain/
│  ├─ csv-parse.test.js
│  ├─ merge.test.js
│  ├─ classify.test.js
│  └─ aggregate.test.js
└─ fixtures/
   ├─ performance-sample.csv
   └─ grafana-sample.csv
```

## Build de producción

```bash
npm run build      # genera dist/
npm run preview    # sirve dist/ en http://localhost:4173
```

Salida: HTML/CSS/JS estático en `dist/`. No requiere servidor en runtime.

## Despliegue en GitHub Pages

### Setup inicial
1. En GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Verificar `vite.config.js`: `base: '/hx-dashboard/'` debe coincidir con el nombre del repo en GitHub. Si renombrás el repo, actualizar acá.
3. Push a `main`.

El workflow `.github/workflows/pages.yml`:
- Corre en cada push a `main`.
- Ejecuta `npm ci`, `npm test` y `npm run build`.
- Publica `dist/` a GitHub Pages mediante `actions/deploy-pages@v4`.

### Verificación
Tras un push exitoso, el dashboard estará en `https://<usuario>.github.io/<repo>/`.

## Arquitectura

Tres capas con dependencias unidireccionales:

```
view  →  app  →  domain  ←  export/xlsx
```

- **domain/** (puro): reglas, parsing CSV, merge, clasificación, agregación. Sin DOM. Testeable.
- **app/**: store pub/sub + controller (casos de uso). Orquesta dominio y estado UI.
- **view/**: componentes DOM. Se suscribe al store. Sin lógica de negocio.
- **export/**: consume estado para generar XLSX. Sin DOM.

Detalle en `docs/superpowers/specs/2026-05-10-fleet-dashboard-refactor-design.md`.

## Reglas de negocio

Todas las reglas viven en `src/domain/rules.js`:

| Constante | Valor | Significado |
|---|---|---|
| `FAILURE_THRESHOLD` | 0.75 | Un componente con value < 0.75 se considera fallando |
| `STALE_CONTACT_DAYS` | 3 | Más de 3 días sin contacto → Sin Comunicación |
| `WARN_CONTACT_DAYS` | 1 | Entre 1 y 3 días → advertencia |
| `PAGE_SIZE` | 50 | Filas por página en la tabla |

Prioridades de componentes:
- **P1 (crítica):** tracking, ir, gps_detection, gps_coverage, camera_detection, camera
- **P2 (moderada):** vib_motor, buzzer
- **P3 (otros):** ffc_data, ffc_detection, ffc_streaming, psu

Para detalles de la clasificación de estado y el pipeline de merge, ver `docs/csv-merge.md`.

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| Tras subir los CSV, el dashboard no carga | Headers faltantes en el CSV | Verificar que las columnas esperadas estén presentes; abrir consola del navegador para ver el error |
| Toast "❌ CSV inválido (Performance)" | Comillas mal balanceadas o separador no es coma | Re-exportar el CSV con UTF-8 y separador `,` |
| Toast "❌ Archivo > 50 MB" | CSV demasiado grande | Dividir o pre-procesar |
| Página en blanco tras build | `base` incorrecto en `vite.config.js` para GH Pages | Ajustar a `'/<nombre-real-del-repo>/'` |
| Tests fallan tras `npm install` | Versión de Node | Usar Node >= 20 |
| GitHub Pages 404 en assets | Branch o config de Pages | Verificar Settings → Pages → Source = "GitHub Actions" |

## Roadmap

Posibles mejoras futuras (fuera del alcance actual):
- Persistencia en localStorage (re-abrir y mantener datos).
- Web Worker para parsing/filtrado.
- Virtualización de tabla.
- Tests E2E con Playwright.
- Histórico de cargas + comparación entre periodos.
