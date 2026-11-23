# Archive Report — Sprint 3: APIs Externas

## Archived Change

`sprint3-apis-externas`

## Outcome

Sprint 3 queda completo y archivado. El backend incorpora una capa de integración saliente hexagonal (`packages/backend/src/integrations/`) con núcleo compartido (HTTP con timeout, cache en memoria con TTL y LRU, reloj inyectable) y tres hexágonos: `weather` (Open-Meteo + RainViewer, resolución por lote con tenant), `exchange-rate` (`dolarapi.com`) y `grain-price` (pizarra BCR parseada con `cheerio`). Expone cuatro endpoints con JWT, degrada a `stale` con el último valor y no usa ninguna API key. El dashboard Next.js suma cinco widgets, un mapa Leaflet con viento y radar, y un selector de lote. El móvil suma una tarjeta de clima en nudos, cache-first sobre drift.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `external-integrations` | **Created** | Primer spec principal de la capacidad: 13 requisitos (R-EXT-01 a R-EXT-13), con los escenarios agregados en el cierre (selector de lote, operario sin tareas locales, mensaje genérico en 503/502). |

No se modificó ningún spec existente.

## Source of Truth Updated

- `openspec/specs/external-integrations/spec.md` ← spec completo de las integraciones externas

## Implementation Summary

| Unidad | Alcance |
|--------|---------|
| 1 | Núcleo compartido + hexágono `weather` |
| 2 | `exchange-rate`, `grain-price`, controllers y wiring |
| 3 | Consumidor Next.js (widgets, mapa Leaflet) |
| 4 | Consumidor móvil (tarjeta, cache drift, migración 3→4) |
| 5 | Verificación global y cierre: selector de lote, seed con polígonos, zoom del radar, fallback de ubicación en el móvil, mensajes genéricos en 503/502, puerto de Docker |

## Verification Basis

| Checkpoint | Result |
|------------|--------|
| `npm test` (backend) | **111 suites, 971 tests** en verde |
| `flutter analyze` | 0 errores, 0 warnings (42 info preexistentes) |
| `flutter test` | **189** en verde |
| `npm run lint` (nextjs) | 0 errores |
| E2E manual | Cuatro endpoints con datos reales; web y móvil verificados en navegador |
| Degradación | `stale: true` con TTL vencido y sin red; `503` genérico sin cache |

Detalle completo en `verify-report.md`. Veredicto: **PASS**.

## Carried Forward

- **Down-sync de tareas/catálogos al móvil** (Sprint 2 → sigue abierto): planificar como change propio.
- **R011** (snapshot climático al pulverizar): requiere decisión de almacenamiento.
- **R030 / R031**: el dato de entrada está expuesto; la aplicación financiera es del Sprint 4.
- `coverageWarning` constante y frames del radar sin animación.
