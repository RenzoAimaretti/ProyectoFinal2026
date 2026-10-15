# Apply Progress — Sprint 3: APIs Externas

> Registro de avance del apply. Una entrada por unidad de trabajo, con su commit y la evidencia observada.
> Base: `design.md`, `spec.md`, `tasks.md`, `docs/hexagonal-conventions.md`.

## Unidades de trabajo

| # | Unidad | Tareas | Commit | Estado |
|---|--------|--------|--------|--------|
| 1 | Núcleo compartido + hexágono `weather` | 1.1–1.9, 2.1–2.8, 3.1–3.5, 8.1, 8.2, 8.4, 8.5 | — | ✅ Cerrada |
| 2 | `exchange-rate` + `grain-price` + controllers + wiring | 4.1–4.6, 5.1–5.7, 6.1–6.6, 7.1–7.3, 8.3, 8.6 | — | Pendiente |
| 3 | Consumidor Next.js | 9.1–9.7 | — | Pendiente |
| 4 | Consumidor móvil | 10.1–10.10, 11.1–11.3 | — | Pendiente |
| 5 | Verificación global | 12.1–12.6 | — | Pendiente |

---

## Unidad 1 — Núcleo compartido y hexágono `weather`

### Archivos creados (33, todos bajo `packages/backend/src/integrations/`)

**`shared/`** — núcleo de integración
- `application/ports/http-client.ports.ts` — token `HTTP_CLIENT` + `HttpClientPort`/`HttpRequest`/`HttpResponse`.
- `application/ports/cache.ports.ts` — token `CACHE` + `CachePort`/`CachedEntry<T>` con `storedAt`.
- `application/ports/clock.ports.ts` — token `CLOCK` + `ClockPort`.
- `domain/errors.ts` — `UpstreamError`, `UpstreamUnavailableError`, `UpstreamParseError`, `EntityNotFoundError`, `InvalidInputError`.
- `integrations.config.ts` — `readExternalHttpTimeoutMs()`, default 8000, guard ruidoso.
- `adapters/outbound/fetch-http.adapter.ts` — `FetchHttpClient` sobre `fetch` global + `AbortController`, `clearTimeout` en `finally`.
- `adapters/outbound/in-memory-ttl-cache.ts` — `InMemoryTtlCache`, LRU acotado a 200, `get` no expira.
- `adapters/outbound/system-clock.ts` — `SystemClock` (espejo del de `auth`, sin importarlo).
- `integrations-shared.module.ts` — exporta `HTTP_CLIENT`, `CACHE`, `CLOCK` (módulo normal).

**`weather/`** — hexágono completo
- `domain/weather.types.ts`, `domain/weather-location.ts` (`centroidOfCoords` tolerante), `domain/errors.ts`.
- `application/weather.ports.ts` (`WEATHER_PROVIDER`, `RADAR_PROVIDER`, `LOT_LOCATION_READER`), `weather.types.ts`, `weather.validation.ts`, `weather-cache.policy.ts` (TTL 15 min, clave a 2 decimales).
- `application/use-cases/get-weather.use-case.ts` (read-through + degradación a `stale`), `get-lot-weather.use-case.ts` (centroide del lote → fallback al campo).
- `adapters/outbound/open-meteo.weather.provider.ts`, `rainviewer.radar.provider.ts`, `prisma-lot-location.reader.ts`.
- `weather.module.ts`.
- Fixtures reales capturados: `__fixtures__/open-meteo-forecast.json` (48 h horarias + 7 días, 2516 B), `__fixtures__/rainviewer-weather-maps.json` (818 B).

### Corrección al diseño durante el apply

El `design.md` y la tarea 3.1 pedían `forecast_days=2` para la serie horaria **y** `forecast_days=7` para la diaria en la misma URL. Es inválido: `forecast_days` es un parámetro único de la request y, repetido, Open-Meteo se queda con el último valor. Verificado contra la API real:

| Query | Horas devueltas | Días devueltos |
|---|---|---|
| `forecast_days=2&forecast_days=7` | **168** ❌ | 7 |
| `forecast_hours=48&forecast_days=7` | **48** ✅ | 7 |

Se implementó `forecast_hours=48&forecast_days=7`, se re-capturó el fixture con la query real y se corrigieron `design.md` (§2.5) y `tasks.md` (3.1).

### Evidencia observada

| Check | Comando | Resultado |
|---|---|---|
| Suite de integraciones | `npx jest src/integrations --silent` (en `packages/backend`) | `9 passed, 9 total` / `57 passed, 57 total`, exit 0 |
| Suite completa del backend | `npx jest --silent` | `101 passed, 101 total` / `932 passed, 932 total` (baseline previo: 92 suites / 875 tests → delta exacto +9 suites / +57 tests, sin regresiones) |
| Typecheck | `npx tsc --noEmit -p tsconfig.json` | sin salida, exit 0 |
| Superficie de escritura | `git status --short` | solo `packages/backend/src/integrations/` y `openspec/changes/sprint3-apis-externas/` |

### TDD (RED → GREEN)

RED observado antes de implementar: 6 spec files presentes, `Test Suites: 6 failed`, `Tests: 0 total`, todos fallando con `TS2307: Cannot find module` (el módulo aún no existía). GREEN posterior por archivo:

| Spec | RED | GREEN |
|---|---|---|
| `in-memory-ttl-cache.spec.ts` | TS2307 | 4 tests |
| `fetch-http.adapter.spec.ts` | TS2307 | 5 tests |
| `integrations.config.spec.ts` | TS2307 | 7 tests |
| `weather-location.spec.ts` | TS2307 | 13 tests |
| `open-meteo.weather.provider.spec.ts` | TS2307 | 5 tests |
| `get-weather.use-case.spec.ts` | TS2307 | 9 tests |

**Gap honesto:** tres specs se agregaron *después* de que su unidad existía, así que no tienen RED capturado — `rainviewer.radar.provider.spec.ts`, `get-lot-weather.use-case.spec.ts`, `prisma-lot-location.reader.spec.ts`. Son extras deliberados sobre la lista 8.x: sin el primero, el fixture capturado de RainViewer quedaría sin uso y A13 quedaría a medias; sin los otros dos, A4/A9 (centroide + fallback + scope de tenant) no tendrían cobertura.

### Decisiones tomadas durante el apply

1. **`forecast_hours=48` en lugar de `forecast_days=2`** (ver arriba).
2. **`shared/domain/errors.ts` contiene cinco errores, no tres**: §2.4 atribuye toda la tabla error→HTTP a ese archivo y §4 solo lista los tres `Upstream*`. Se siguió §2.4 (comportamiento) para que los controllers de la unidad 2 importen un único vocabulario.
3. **`GetWeatherInput = GetWeatherByCoordinatesInput & { location?: WeatherLocationResolution }`**: el input wire `{lat, lon}` queda igual; el caso de uso acepta además la procedencia para que el camino por lote delegue.
4. **Degradación del radar**: `UpstreamError`/`UpstreamUnavailableError` del radar → `radar: null` + `source: 'open-meteo'` (requerido por A3). `UpstreamParseError` sí propaga como 502: romper el contrato debe ser ruidoso.
5. **`WeatherLocationUnresolvedError extends InvalidInputError`**, así el `translate()` del controller no necesita una rama extra.
6. **Centroide**: los pares sueltos se leen como `[lat, lon]` y GeoJSON como `[lon, lat]`; el vértice de cierre de un `Polygon` se deduplica para no sesgar el centroide.

### Pendientes / abiertos heredados

- `coverageWarning` del radar es una constante `true`: `RadarProviderPort.fetchRadar()` no recibe coordenadas, así que el provider no puede evaluar la zona objetivo. El umbral real sigue siendo pregunta abierta (design §6).
- `Farm.location` es texto, no coordenadas: un campo cuyos lotes no tengan polígono sigue dando 400, tal como pide el diseño.
- `WeatherModule` no declara `controllers` todavía — la unidad 2 (§6) los agrega junto con el import en `app.module.ts`.
