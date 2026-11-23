# Verification Report

**Change**: `sprint3-apis-externas`
**Version**: N/A
**Mode**: Standard
**Date**: 2026-11-18

---

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 83 (incluye 9.8 y 13.1–13.6, agregadas en el cierre) |
| Tasks complete | 83 |
| Tasks incomplete | 0 |

La tarea 6.6 quedó descartada por decisión del usuario (el puerto es configuración local) y figura tachada como completada.

---

### Build & Tests Execution

**Backend** (`packages/backend`):
```
npx tsc --noEmit -p tsconfig.json → limpio
npx jest → Test Suites: 111 passed, 111 total · Tests: 971 passed, 971 total
npx eslint <archivos tocados en el cierre> → 0 problemas
```

**Web** (`packages/nextjs`):
```
npx tsc --noEmit → limpio
npm run lint → 0 errors, 2 warnings (preexistentes: client.ts:99, auth.tsx:26)
```

**Móvil** (`packages/mobile`):
```
flutter analyze → 0 errors, 0 warnings (42 info preexistentes: 25 constant_identifier_names, 17 use_super_parameters)
flutter test → +189: All tests passed!
```

---

### Spec Compliance

| Requisito | Estado | Evidencia |
|-----------|--------|-----------|
| R-EXT-01 Clima actual y pronóstico | ✅ | `GET /weather/current` y `/lots/:id/weather` con datos reales: 48 h horarias, 7 días, zona Córdoba |
| R-EXT-02 Viento en nudos | ✅ | `windSpeedKnots` 5,6 kn, dirección 236°; widget "Nudos" sin conversión en el cliente |
| R-EXT-03 Radar con fallback | ✅ | 13 frames + `tileTemplate`; tiles visibles tras la tarea 13.3; nota de cobertura y precipitación de Open-Meteo como reemplazo |
| R-EXT-04 Ubicación por lote | ✅ | `resolvedFrom: "lot"`, centroide `-33.38, -62.3` del seed corregido (13.2) |
| R-EXT-05 Dólar oficial | ✅ | 1530 / 1580 desde `dolarapi.com` |
| R-EXT-06 Pizarra | ✅ | 5 granos en $/Tn y US$/Tn, BNA 1543, fecha 17/11 |
| R-EXT-07 Cache con TTL | ✅ | El clima por lote reutilizó el `fetchedAt` del de coordenadas; la pizarra se sirvió desde cache sin red |
| R-EXT-08 Degradación stale | ✅ | Sin red: dólar y clima con TTL vencido → `stale: true` + `fetchedAt` original; sin cache → `503` con mensaje genérico (13.5) |
| R-EXT-09 Auth y multi-tenant | ✅ | Sin JWT → `401`; tests de controller cubren `tenantId` desde el JWT |
| R-EXT-10 Timeout y sin API keys | ✅ | Ninguna key configurada; `EXTERNAL_HTTP_TIMEOUT_MS` con guard |
| R-EXT-11 Consumidor web | ✅ | Cinco widgets, mapa Leaflet con viento y radar, badges "Al día"; selector de lote (9.8) |
| R-EXT-12 Consumidor móvil | ✅ | Tarjeta `4.8 kn · 240°` con timestamp en Chrome; fallback a `GET /lots` sin tareas locales (13.4) |
| R-EXT-13 Fixtures reales | ✅ | Suites del parser, providers y TTL con reloj fake, todas en verde |

---

### Issues Found

**CRITICAL**: ninguno pendiente.

**Corregidos durante la verificación** (detalle en `tasks.md` §13 y `apply-progress.md` unidad 5):
- El seed guardaba coordenadas en texto y el clima por lote daba 400 en todos los lotes.
- El radar mostraba "Zoom Level Not Supported" porque RainViewer sirve tiles hasta z7.
- La tarjeta móvil quedaba vacía con un login real porque el móvil no descarga tareas.
- El `503` exponía la URL del proveedor al cliente.

**WARNING**:
- El móvil sigue sin down-sync de tareas (heredado del Sprint 2); la tarjeta depende del fallback.
- `coverageWarning` es constante `true`.

**SUGGESTION**:
- Animar los frames del radar.
- Normalizar fin de línea (CRLF) en el backend para que `eslint` global quede limpio.

---

### Verdict

**PASS** — implementación completa, verificación automática en verde en los tres paquetes y E2E/degradación verificados contra datos reales.
