# Apply Progress — Sprint 3: APIs Externas

> Registro de avance del apply. Una entrada por unidad de trabajo, con su commit y la evidencia observada.
> Base: `design.md`, `spec.md`, `tasks.md`, `docs/hexagonal-conventions.md`.

## Unidades de trabajo

| # | Unidad | Tareas | Commit | Estado |
|---|--------|--------|--------|--------|
| 1 | Núcleo compartido + hexágono `weather` | 1.1–1.9, 2.1–2.8, 3.1–3.5, 8.1, 8.2, 8.4, 8.5 | — | ✅ Cerrada |
| 2 | `exchange-rate` + `grain-price` + controllers + wiring | 4.1–4.6, 5.1–5.7, 6.1–6.6, 7.1–7.3, 8.3, 8.6 | — | ✅ Cerrada |
| 3 | Consumidor Next.js | 9.1–9.7 | `e5a5840`, `8dc482a` (parciales) + pendientes | ✅ Cerrada |
| 4 | Consumidor móvil | 10.1–10.10, 11.1–11.3 | — | ✅ Cerrada |
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

---

## Unidad 3 — Consumidor Next.js

### Archivos

**Creados**
- `packages/nextjs/src/components/weather/weather-widgets.tsx` — los cinco widgets (`WeatherWidget`, `WindWidget`, `RadarWidget`, `UsdWidget`, `GrainPricesWidget`) sobre los tokens y primitivas existentes, con aviso compartido de `stale` + `fetchedAt`.
- `packages/nextjs/src/components/weather/leaflet-map.tsx` — componente `"use client"` con Leaflet vanilla (base OSM + overlay de radar desde `radar.tileTemplate` + capa de viento con el vector en nudos).

**Modificados**
- `packages/nextjs/src/api/client.ts` — tipos `WeatherResponse`, `UsdRateResponse`, `GrainPricesResponse` (+ subtipos) y las funciones `getWeather`, `getLotWeather`, `getUsdOfficial`, `getGrainPrices` sobre `apiGet`. Transporte sin tocar (9.1).
- `packages/nextjs/src/app/dashboard/page.tsx` — bloque superior de widgets + carga del mapa con `next/dynamic` y `{ ssr: false }` (9.5).
- `packages/nextjs/src/app/dashboard/mi-campo/page.tsx` — se quitó `"Clima y heladas"` de `ROADMAP_ITEMS` (9.6).
- `packages/nextjs/package.json` — `leaflet ^1.9.4` (dep) + `@types/leaflet ^1.9.20` (dev) (9.7).
- `pnpm-lock.yaml` — árbol de `leaflet`.

### Evidencia observada

| Check | Comando | Resultado |
|---|---|---|
| Typecheck | `npx tsc --noEmit -p tsconfig.json` (en `packages/nextjs`) | sin salida, exit 0 |
| Lint acotado a las superficies de la unidad 3 | `npx eslint src/components/weather src/api/client.ts src/app/dashboard/page.tsx src/app/dashboard/mi-campo/page.tsx` | 0 errores; 1 warning preexistente (`client.ts:99`) |
| Lint global (12.4) | `npm run lint` | **exit 1** — 1 error + 2 warnings, los tres **preexistentes** y fuera de la superficie (ver abajo) |
| Instalación | `pnpm install` (raíz) | `Packages: +3`, **sin warnings de peers** |

### Bloqueo de 12.4 — lint preexistente

`npm run lint` falla por `react-hooks/set-state-in-effect` en `packages/nextjs/src/components/ui/reveal.tsx:62`. **No lo introdujo este sprint**: el archivo no figura en el `git status`, su último commit es `97c84a9 feat(web): movimiento al scroll y modernizacion de la landing`, y está fuera de las superficies permitidas de la unidad. Los otros dos hallazgos (`@next/next/no-location-assign-relative-destination` en `client.ts:99` y `auth.tsx:26`) también son preexistentes. La tarea 12.4 queda **desmarcada** con esta nota; se resuelve arreglando ese archivo (cambio de una línea) o aceptando el fallo como preexistente y verificando solo que este sprint no agregue errores nuevos.

### Peer de React 19 (riesgo validado)

`leaflet@1.9.4` + `@types/leaflet@1.9.22` instalan limpio bajo React `19.2.8` + Next `16.3.4`, **sin warnings de peers**. Valida la decisión del diseño §2.11 de preferir `leaflet` vanilla sobre `react-leaflet`. Además, `@types/leaflet` toca `document` en la evaluación del módulo, así que el `import("leaflet")` real se difiere dentro de un `useEffect` — no alcanza con `ssr: false`.

### Decisiones tomadas durante el apply

1. **Origen de la ubicación del clima (pregunta abierta del diseño §6).** El Dashboard General no tiene contexto de lote y el backend se niega a inventar una ubicación (spec A4). El bloque resuelve el clima desde **el primer lote que tenga polígono** (`listLots()` → `getLotWeather(lot.id)`) y muestra un estado explícito ("cargá coordenadas en algún lote") cuando no hay ninguno. `getWeather(lat, lon)` existe según lo pedido pero la página no lo llama: no se inventó ninguna coordenada fija. **Queda como decisión abierta para el usuario.**
2. **`dynamic()` vive en `dashboard/page.tsx`**, no en el widget: `RadarWidget` recibe el mapa ya renderizado como `ReactNode`, así `weather-widgets.tsx` no importa leaflet. Mantiene 9.5 literal y deja la tarjeta con el layout.
3. **El fetching queda en la página**: los widgets son presentacionales; la página resuelve USD, granos, lotes y clima en un `Promise.allSettled`, consistente con el patrón existente de la página.
4. **Layout del bloque**: fila 1 = Clima · Viento · Dólar; fila 2 = Radar (ancho) · Pizarra. El diseño lista los cinco widgets sin prescribir grilla.
5. **`WindRose` recibe una rosa real**, no un vector suelto: la serie horaria de 48 h se agrupa en 8 sectores y se escala contra el dominante, más el valor numérico en `kn`/`°`. `WindRose` mapea índice→ángulo y no tiene modo de vector único.

### Pendientes heredados de esta unidad

- **Origen de la ubicación del clima del dashboard** (ver decisión 1) — requiere decisión del usuario.
- Los frames del radar **no están animados**: el mapa dibuja el frame más nuevo como overlay estático. Un play/pausa sobre `radar.frames` es el seguimiento natural.
- Sin `next build` y sin framework de tests en `packages/nextjs` (no-goals del workspace, respetados).

---

## Unidad 4 — Consumidor móvil

### Archivos

**Creados**
- `lib/domain/models/weather_reading.dart` — `WeatherReading` (viento en nudos, `stale`, `fetchedAt`, `resolvedFrom`).
- `lib/domain/repositories/weather_repository.dart` — puerto `WeatherRepository` + `WeatherReadingStore` (lectura/escritura de la caché local).
- `lib/domain/usecases/get_weather_usecase.dart` — orquestación cache-first + `WeatherLocationRequiredException`.
- `lib/data/services/weather_api_service.dart` — `WeatherApiService` (Bearer, endpoints por lat/lon y por lote, clasificación 401/4xx/5xx/socket).
- `lib/data/services/daos/weather_cache_dao.dart` (+ `.g.dart`) — DAO de fila única (upsert de la lectura vigente).
- `lib/data/repositories/http_weather_repository.dart` — adaptador remoto: token desde la sesión y persiste cada lectura.
- `lib/data/repositories/drift_weather_cache_repository.dart` — adaptador de caché local sobre el DAO.
- `lib/app/home/weather_view_model.dart` — estado de la tarjeta: lectura local inmediata + refresh.
- Tests: `test/data/services/weather_api_service_test.dart`, `test/data/services/daos/weather_cache_dao_test.dart`, `test/data/services/app_database_migration_test.dart`, `test/data/repositories/http_weather_repository_test.dart`, `test/domain/usecases/get_weather_usecase_test.dart`, `test/app/home/weather_card_test.dart`, `test/app/home/weather_view_model_test.dart`.

**Modificados**
- `lib/data/services/tables/infra_tables.dart` — tabla `WeatherCache` (`@DataClassName('WeatherCacheRow')`, PK fija `id`).
- `lib/data/services/app_database.dart` — `schemaVersion` 3 → **4**, tabla y DAO registrados, `if (from < 4) { await m.createTable(weatherCache); }`.
- `lib/data/services/app_database.g.dart` — regenerado con `build_runner`.
- `lib/app/home/dashboard_view.dart` — `WeatherCard` + `formatWeatherTimestamp` + la tarjeta en el cuerpo del dashboard.
- `lib/main.dart` — cableado en el composition root (`WeatherApiService` → repositorios → `GetWeatherUseCase` → `WeatherViewModel`).
- `pubspec.yaml` / `pubspec.lock` — **sin cambios**: no hizo falta ninguna dependencia nueva.

### Evidencia observada

| Check | Comando | Resultado |
|---|---|---|
| Análisis estático (12.2) | `flutter analyze` (Flutter 3.47.2) | `42 issues found` = **0 errores / 0 warnings**, 42 infos (baseline 41 infos; el único nuevo es `use_super_parameters` en `weather_cache_dao.dart:15`, idéntico a los 16 DAOs preexistentes) |
| Suite de tests (12.3) | `flutter test` | **`+185: All tests passed!`** — 185 tests (baseline **156**, delta **+29**), sin regresiones |
| Migración | `test/data/services/app_database_migration_test.dart` | 2 tests: 3→4 crea la tabla y es aditiva |
| Git | `git status` (solo lectura) | 10 archivos con diff real + 16 nuevos |

**Nota sobre el ruido de git:** 22 archivos más aparecen como `M` en `git status` (los `*_dao.g.dart` preexistentes y los `generated_*` de linux/macos/windows) pero tienen **diff de contenido vacío**: es el efecto de `core.autocrlf=true` sobre archivos que `build_runner`/`flutter` reescriben con LF. No generan contenido en el commit.

### TDD (RED → GREEN)

El RED fue de **carga/compilación**, no de aserción: los módulos y tipos objetivo todavía no existían. Primera corrida: `Failed to load … Result: Some tests failed`, `00:00 +0 -7`. GREEN por archivo:

| Spec | RED | GREEN |
|---|---|---|
| `weather_api_service_test.dart` | fallo de carga (`+0 -7`) | 8 tests |
| `weather_cache_dao_test.dart` | fallo de carga | 2 tests |
| `app_database_migration_test.dart` | fallo de carga | 2 tests |
| `http_weather_repository_test.dart` | fallo de carga | 3 tests |
| `get_weather_usecase_test.dart` | fallo de carga | 8 tests |
| `weather_card_test.dart` | fallo de carga | 3 tests |
| `weather_view_model_test.dart` | fallo de carga | 3 tests |

Hubo un **segundo RED de compilación** antes del GREEN en los tests de drift: `Method not found: 'test'/'expect'` (el helper de drift no re-exporta `flutter_test`) y `Undefined name 'WeatherCacheDao'` (importar `app_database.dart` no expone los DAOs). Se resolvió con imports explícitos.

**Gap honesto:** ningún ítem produjo un RED a nivel de aserción, porque todos los tests importaban un símbolo inexistente. No se inventó evidencia.

### Decisiones tomadas durante el apply

1. **Se agregó `WeatherReadingStore` junto a `WeatherRepository`.** El diseño §2.12 define un puerto único de 3 métodos, pero un adaptador puramente de caché no puede implementar los métodos remotos; separarlos deja cada adaptador con una sola responsabilidad y mantiene `WeatherRepository` exactamente como se especificó.
2. **`WeatherApiService` devuelve el modelo de dominio `WeatherReading`** en vez de un DTO en un archivo de mapper, porque `lib/data/models/**` queda fuera de la superficie permitida. El mapeo vive en el service (método privado `_parse`).
3. **`WeatherCard` es pública dentro de `dashboard_view.dart`** (no hay `weather_card.dart`): la tabla de archivos del diseño no lista un archivo de tarjeta y la tarea 10.9 dice literalmente "en `dashboard_view.dart`"; además así queda testeable como widget.
4. **`WeatherLocationRequiredException` vive en `get_weather_usecase.dart`** porque `lib/domain/errors.dart` está fuera de la superficie permitida.
5. **El DAO es a nivel de fila** (`save(WeatherCacheCompanion)` / `get()`), y el `save(WeatherReading)` de dominio queda en `DriftWeatherCacheRepository`: todos los DAOs existentes del repo son a nivel de fila y el mapeo de dominio vive en los repositorios.
6. **La tarjeta resuelve el lote desde la primera tarea asignada del operario logueado** (pregunta abierta del diseño §6). `fetchCurrent(lat, lon)` existe y está testeado pero no está cableado por defecto; sin tareas, la tarjeta queda en modo caché con estado vacío explícito.

### Pendientes heredados de esta unidad

- **Selección de lote para la tarjeta del móvil** (diseño §6, sigue abierto): hoy es la primera tarea del operario; no hay camino por coordenadas cableado en la app real.
- La entrada de esta unidad en `apply-progress.md` la escribió el orquestador: `openspec/**` está fuera de la superficie permitida de la unidad.
