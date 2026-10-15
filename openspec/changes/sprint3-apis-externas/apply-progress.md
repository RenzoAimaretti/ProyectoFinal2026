# Apply Progress — Sprint 3: APIs Externas

> Registro de avance del apply. Una entrada por unidad de trabajo, con su commit y la evidencia observada.
> Base: `design.md`, `spec.md`, `tasks.md`, `docs/hexagonal-conventions.md`.

## Unidades de trabajo

| # | Unidad | Tareas | Commit | Estado |
|---|--------|--------|--------|--------|
| 1 | Núcleo compartido + hexágono `weather` | 1.1–1.9, 2.1–2.8, 3.1–3.5, 8.1, 8.2, 8.4, 8.5 | — | ✅ Cerrada |
| 2 | `exchange-rate` + `grain-price` + controllers + wiring | 4.1–4.6, 5.1–5.7, 6.1–6.6, 7.1–7.3, 8.3, 8.6 | — | ✅ Cerrada |
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

---

## Unidad 2 — `exchange-rate`, `grain-price`, controllers y wiring

### Archivos creados (26 nuevos, 6 modificados)

**`exchange-rate/`** — hexágono de dólar (dolarapi.com)
- `domain/exchange-rate.types.ts`, `application/exchange-rate.ports.ts`, `application/use-cases/get-usd-official.use-case.ts` (TTL 30 min, clave `exchange-rate:usd-oficial`, degradación a `stale`).
- `adapters/outbound/dolarapi.exchange-rate.provider.ts` + spec.
- `adapters/outbound/__fixtures__/dolarapi-oficial.json` (152 B).
- `adapters/inbound/exchange-rate.controller.ts` (`GET /exchange-rate/usd`) + spec.
- `exchange-rate.module.ts`.

**`grain-price/`** — hexágono de pizarra (BCR, scraping HTML)
- `domain/grain-price.types.ts`, `application/grain-price.ports.ts`, `application/use-cases/get-grain-prices.use-case.ts` (TTL 24 h, clave `grain-price:pizarra-bcr`).
- `adapters/outbound/bcr-pizarra.parser.ts` (`parsePizarra`, función pura con `cheerio`) + spec.
- `adapters/outbound/bcr-grain-price.provider.ts` + spec.
- `adapters/outbound/__fixtures__/pizarra-bcr.html` (47353 B, captura real).
- `adapters/inbound/grain-price.controller.ts` (`GET /grain-prices`) + spec.
- `grain-price.module.ts`.

**`weather/adapters/inbound/`** — los dos controllers del clima
- `weather.controller.ts` (`GET /weather/current?lat=&lon=`) + spec.
- `lot-weather.controller.ts` (`GET /lots/:lotId/weather`, tenant desde `req.user`) + spec.

**Modificados**
- `packages/backend/package.json` — `cheerio ^1.2.0` (única dependencia nueva del backend).
- `packages/backend/src/integrations/weather/weather.module.ts` — declara `[WeatherController, LotWeatherController]`.
- `packages/backend/src/app.module.ts` — importa `WeatherModule`, `ExchangeRateModule`, `GrainPriceModule`.
- `packages/backend/src/main.ts` — **sin cambios** (ver reversión de puerto, decisión 6).
- `.env.example` (raíz) — `EXTERNAL_HTTP_TIMEOUT_MS=8000` (sin `PORT`).
- `pnpm-lock.yaml` — árbol de `cheerio`.

### Evidencia observada

| Check | Comando | Resultado |
|---|---|---|
| Suite de integraciones | `npx jest src/integrations --silent` (en `packages/backend`) | `18 passed, 18 total` / `90 passed, 90 total`, exit 0 |
| Suite completa del backend | `npx jest --silent` | `110 passed, 110 total` / `965 passed, 965 total` (unidad 1 era 101/932 → delta exacto +9 suites / +33 tests, sin regresiones) |
| Typecheck | `npx tsc --noEmit -p tsconfig.json` | sin salida, exit 0 |
| Sin API keys | grep `api_key|API_KEY|apikey` en `src/integrations` | 0 coincidencias (7.2) |
| Sin config/ioredis | grep `@nestjs/config\|ConfigService\|ioredis` en `packages/backend/src` | 0 coincidencias (7.3); `ioredis` sigue declarado y sin importar |
| Superficie | `git status --short` (solo lectura) | 6 modificados + 4 árboles nuevos, todo dentro de las superficies permitidas |

### TDD (RED → GREEN)

RED observado antes de implementar: `18 total` suites, de las cuales **9 fallaban** con `TS2307: Cannot find module` y solo corrían los 57 tests preexistentes. GREEN por archivo:

| Spec | RED | GREEN |
|---|---|---|
| `bcr-pizarra.parser.spec.ts` | TS2307 | 4 tests |
| `bcr-grain-price.provider.spec.ts` | TS2307 | 2 tests |
| `dolarapi.exchange-rate.provider.spec.ts` | TS2307 | 4 tests |
| `get-usd-official.use-case.spec.ts` | TS2307 | 5 tests |
| `get-grain-prices.use-case.spec.ts` | TS2307 | 5 tests |
| `weather.controller.spec.ts` | TS2307 | 3 tests |
| `lot-weather.controller.spec.ts` | TS2307 | 4 tests |
| `exchange-rate.controller.spec.ts` | TS2307 | 3 tests |
| `grain-price.controller.spec.ts` | TS2307 | 3 tests |

El spec del parser incluye el caso negativo obligatorio: mutar el markup (`class="board "` y renombrar las cinco etiquetas) produce `UpstreamParseError`, **nunca ceros**.

### Decisiones tomadas durante el apply

1. **`publishedAt` con offset real**: se emite `2026-10-15T10:16:00-03:00` en vez de espejar el `.000Z` ilustrativo del diseño; el contrato solo fija `string | null` y así se evita inventar una conversión de zona horaria.
2. **Granos `S/C`**: Girasol y Sorgo se publican como `S/C` pero con estimado `(E)`. El tipo de dominio no tiene bandera de "estimado", así que el parser toma el número si existe y cae a `null` si no; no se inventó un campo extra.
3. **Validación de dolarapi más estricta** que el mínimo pedido: además de `compra`/`venta`, rechaza payloads cuyo `casa !== 'oficial'` o `moneda !== 'USD'`, para fallar ruidosamente si se apunta al endpoint equivocado.
4. **Constantes de TTL y clave dentro de los use cases** de estos dos módulos (el diseño §4 no lista `*-cache.policy.ts` para ellos, a diferencia de `weather`).
5. **Dos specs extra de provider** además de 8.3/8.6, para que los fixtures recién capturados queden efectivamente ejercitados (spec A13).
6. **Reversión de la alineación de puerto** (decisión del usuario, posterior a la unidad 2). `main.ts` volvió a `process.env.PORT ?? 3000` y `.env.example` quedó **sin** `PORT`: el puerto es configuración local de cada entorno, no una decisión del proyecto. La tarea 6.6 se descartó, la 7.1 se limitó a `EXTERNAL_HTTP_TIMEOUT_MS`, y el desalineamiento con los clientes (que apuntan a 3001) queda como **riesgo abierto y aceptado** en `proposal.md`. Se actualizaron `proposal.md` (alcance, áreas afectadas, riesgos, criterios de éxito), `design.md` (§2.8, §2.10, tabla de cambios y rollout) y `tasks.md` (6.6, 7.1, 12.6).

### Pendiente heredado

- El arranque real del servidor y el E2E HTTP (§12.5/§12.6) quedan para la unidad 5: acá la registración de rutas se verificó estructuralmente (controllers declarados, módulos importados, typecheck limpio) y no levantando el backend.
