# Tasks — Sprint 3: APIs Externas (Clima, Radar de Lluvia, Dólar y Pizarra de Cereales)

> Orden por dependencia: núcleo compartido (§1) → módulos por fuente (§2–§5) → controllers y wiring (§6) → entorno (§7) → tests backend (§8) → consumidores (§9 web, §10–§11 móvil) → verificación global (§12). Los consumidores web y móvil NO dependen entre sí y pueden avanzarse en paralelo una vez que §6 expone los endpoints. Base: `design.md` y `docs/hexagonal-conventions.md`.

## 1. Núcleo compartido de integración (backend)

- [x] 1.1 Crear `src/integrations/shared/application/ports/http-client.ports.ts`: `HTTP_CLIENT`, `HttpClientPort`, `HttpRequest`, `HttpResponse` (design §2.2, spec A10).
- [x] 1.2 Crear `src/integrations/shared/application/ports/cache.ports.ts`: `CACHE`, `CachePort`, `CachedEntry<T>` con `storedAt` (entradas que sobreviven al TTL) (design §2.3, spec A7–A8).
- [x] 1.3 Crear `src/integrations/shared/application/ports/clock.ports.ts`: `CLOCK`, `ClockPort` (design §2.3).
- [x] 1.4 Crear `src/integrations/shared/domain/errors.ts`: `UpstreamError`, `UpstreamUnavailableError`, `UpstreamParseError` (design §2.4).
- [x] 1.5 Crear `src/integrations/shared/integrations.config.ts`: `readExternalHttpTimeoutMs()` con default 8000 y guard que falla ruidosamente ante un valor inválido (estilo `requireJwtSecret()`) (design §2.10, spec A10).
- [x] 1.6 Crear `src/integrations/shared/adapters/outbound/fetch-http.adapter.ts`: `FetchHttpClient` con `fetch` global + `AbortController`, `clearTimeout` en `finally`, y traducción `AbortError`/red → `UpstreamUnavailableError`, `status >= 400` → `UpstreamError`; el body siempre se devuelve como `string` (design §2.2).
- [x] 1.7 Crear `src/integrations/shared/adapters/outbound/in-memory-ttl-cache.ts`: `InMemoryTtlCache` sobre `Map` con LRU acotado (máx. 200 entradas) y `get` que NO expira (design §2.3).
- [x] 1.8 Crear `src/integrations/shared/adapters/outbound/system-clock.ts`: `SystemClock implements ClockPort`, espejo de `src/auth/adapters/outbound/system-clock.ts` (sin importar de `auth`) (design §2.3).
- [x] 1.9 Crear `src/integrations/shared/integrations-shared.module.ts`: composition root compartido que provee y **exporta** `HTTP_CLIENT` (`FetchHttpClient`), `CACHE` (`InMemoryTtlCache`, instancia única) y `CLOCK` (`SystemClock`); módulo normal, NO `@Global()` (design §2.1–§2.3).

## 2. Módulo `weather` — dominio y aplicación

- [x] 2.1 Crear `src/integrations/weather/domain/weather.types.ts`: `WeatherSnapshot` (`current` con `windSpeedKnots`, `hourly`, `daily`) y `RadarSnapshot` (`host`, `frames`, `tileTemplate`, `coverageWarning`) (design §2.5, spec A1–A3).
- [x] 2.2 Crear `src/integrations/weather/domain/weather-location.ts`: `centroidOfCoords(coords: string)` **puro y tolerante** (GeoJSON `Polygon` y array de pares `[[lat,lon],…]`), que rechaza polígono vacío o inválido en lugar de inventar una ubicación (design §2.5, spec A4).
- [x] 2.3 Crear `src/integrations/weather/domain/errors.ts`: `WeatherLocationUnresolvedError` (traducible a `InvalidInputError` → 400) (design §2.4).
- [x] 2.4 Crear `src/integrations/weather/application/weather.ports.ts`: `WEATHER_PROVIDER`, `RADAR_PROVIDER`, `LOT_LOCATION_READER` + `WeatherProviderPort`, `RadarProviderPort`, `LotLocationReaderPort` (`findByLotAndTenant`, `centroidByFarmAndTenant`) (design §2.5, spec A9).
- [x] 2.5 Crear `src/integrations/weather/application/weather.types.ts`: `GetWeatherByCoordinatesInput`, `GetWeatherByLotInput` y `WeatherOutput` (con `source`, `location`, `current`, `hourly`, `daily`, `radar`, `stale`, `fetchedAt`) (design §2.5/§2.8).
- [x] 2.6 Crear `src/integrations/weather/application/weather.validation.ts`: aserciones de `lat`/`lon` (rango y finitud) y de `lotId` no vacío, como helpers **hand-rolled** (NO class-validator, que en este repo solo vive en `auth/dto/`) (design §2.8, spec A4).
- [x] 2.7 Crear `src/integrations/weather/application/weather-cache.policy.ts`: TTL de **15 min** y clave `weather:<lat2dp>,<lon2dp>` (redondeo a 2 decimales) (design §2.5, spec A7).
- [x] 2.8 Crear `src/integrations/weather/application/use-cases/get-weather.use-case.ts`: read-through con `ClockPort` (TTL vigente → cache; TTL vencido → provider + `set`; fallo upstream con entrada → `stale: true` + `fetchedAt`; sin entrada → propaga) y `get-lot-weather.use-case.ts`: resuelve el lote (centroide → fallback de campo) y delega en el anterior (design §2.3–§2.5, spec A4/A7/A8).

## 3. Módulo `weather` — adaptadores outbound y fixtures

- [x] 3.1 Crear `src/integrations/weather/adapters/outbound/open-meteo.weather.provider.ts`: builder de query (`current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation`, `hourly=wind_speed_10m,wind_direction_10m,precipitation&forecast_hours=48`, `daily=precipitation_sum,precipitation_probability_max&forecast_days=7`, `wind_speed_unit=kn`, `timezone=America/Argentina/Cordoba`) y mapeo del payload a `WeatherSnapshot`. **Nota (corregido en apply):** `forecast_days` repetido NO acota la serie horaria — Open-Meteo se queda con el último valor y devuelve 168 h; la ventana horaria se acota con `forecast_hours=48` (design §2.5, spec A1–A2).
- [x] 3.2 Crear `src/integrations/weather/adapters/outbound/rainviewer.radar.provider.ts`: `GET https://api.rainviewer.com/public/weather-maps.json` → `host` + frames `radar.past[]` + `tileTemplate` con forma `<host><path>/256/{z}/{x}/{y}/2/1_1.png`; NO proxear tiles (design §2.5, spec A3).
- [x] 3.3 Crear `src/integrations/weather/adapters/outbound/prisma-lot-location.reader.ts`: implementa `LotLocationReaderPort` sobre `PrismaModule`, resolviendo lote → campo → cliente → `tenantId` y calculando el centroide del campo con `centroidOfCoords` (design §2.5/§2.9, spec A9).
- [x] 3.4 Guardar los fixtures reales capturados: `src/integrations/weather/adapters/outbound/__fixtures__/open-meteo-forecast.json` y `__fixtures__/rainviewer-weather-maps.json` (design §2.13, spec A13).
- [x] 3.5 Crear `src/integrations/weather/weather.module.ts`: composition root que importa `IntegrationsSharedModule` y `PrismaModule` y cablea `WEATHER_PROVIDER`, `RADAR_PROVIDER`, `LOT_LOCATION_READER` con `useExisting` y los use cases con `useFactory` + `inject` (patrón `input.module.ts`) (design §2.1).

## 4. Módulo `exchange-rate`

- [x] 4.1 Crear `src/integrations/exchange-rate/domain/exchange-rate.types.ts`: `UsdRateSnapshot` (`source: 'dolarapi.com'`, `casa`, `moneda`, `nombre`, `compra`, `venta`, `fechaActualizacion`) (design §2.6, spec A5).
- [x] 4.2 Crear `src/integrations/exchange-rate/application/exchange-rate.ports.ts`: `EXCHANGE_RATE_PROVIDER` + `ExchangeRateProviderPort.fetchOfficialUsd()` (design §2.6).
- [x] 4.3 Crear `src/integrations/exchange-rate/application/use-cases/get-usd-official.use-case.ts`: read-through con TTL de **30 min** y clave `exchange-rate:usd-oficial`, con degradación a `stale` (design §2.4/§2.6, spec A7–A8).
- [x] 4.4 Crear `src/integrations/exchange-rate/adapters/outbound/dolarapi.exchange-rate.provider.ts`: `GET https://dolarapi.com/v1/dolares/oficial` y validación de la forma del payload (sin `compra`/`venta` → `UpstreamParseError`) (design §2.6).
- [x] 4.5 Guardar el fixture real `src/integrations/exchange-rate/adapters/outbound/__fixtures__/dolarapi-oficial.json` (spec A13).
- [x] 4.6 Crear `src/integrations/exchange-rate/exchange-rate.module.ts`: composition root del módulo (design §2.1).

## 5. Módulo `grain-price`

- [x] 5.1 Crear `src/integrations/grain-price/domain/grain-price.types.ts`: `PizarraSnapshot` (`source: 'cac.bcr.com.ar'`, `date`, `publishedAt`, `bnaRate`, `prices`) y `GrainPriceRow` (`grain`, `label`, `pricePerTonArs`, `pricePerTonUsd`) (design §2.7, spec A6).
- [x] 5.2 Crear `src/integrations/grain-price/application/grain-price.ports.ts`: `GRAIN_PRICE_PROVIDER` + `GrainPriceProviderPort.fetchPizarra()` (design §2.7).
- [x] 5.3 Crear `src/integrations/grain-price/application/use-cases/get-grain-prices.use-case.ts`: read-through con TTL de **24 h** y clave `grain-price:pizarra-bcr`, con degradación a `stale` (design §2.4/§2.7, spec A7–A8).
- [x] 5.4 Agregar `cheerio` a `packages/backend/package.json` (única dependencia nueva del backend) (design §2.7).
- [x] 5.5 Crear `src/integrations/grain-price/adapters/outbound/bcr-pizarra.parser.ts`: `parsePizarra(html: string): PizarraSnapshot`, **función pura** con `cheerio`, que extrae los cinco granos en `$/Tn` y `US$/Tn`, la cotización BNA de conversión y la fecha; sin filas reconocibles lanza `UpstreamParseError` (nunca ceros silenciosos) (design §2.7, spec A6/A13).
- [x] 5.6 Guardar el fixture HTML real `src/integrations/grain-price/adapters/outbound/__fixtures__/pizarra-bcr.html` capturado de `https://www.cac.bcr.com.ar/es/precios-de-pizarra` (spec A13).
- [x] 5.7 Crear `src/integrations/grain-price/adapters/outbound/bcr-grain-price.provider.ts` (fetch de BCR + delega en el parser) y `src/integrations/grain-price/grain-price.module.ts` (composition root) (design §2.1/§2.7).

## 6. Controllers inbound y wiring

- [x] 6.1 Crear `src/integrations/weather/adapters/inbound/weather.controller.ts`: `@Controller('weather')` + `GET current` con `@UseGuards(JwtAuthGuard)`, DTO por selección explícita de `lat`/`lon` y `translate(error)` (`EntityNotFoundError`→404, `InvalidInputError`→400, `UpstreamUnavailableError`→503, `UpstreamError`/`UpstreamParseError`→502) (design §2.4/§2.8).
- [x] 6.2 Crear `src/integrations/weather/adapters/inbound/lot-weather.controller.ts`: `@Controller('lots')` + `GET :lotId/weather`; `tenantId` sale de `req.user.tenantId` y **nunca** del body/query; un lote de otro tenant → 404 (design §2.8/§2.9, spec A9).
- [x] 6.3 Crear `src/integrations/exchange-rate/adapters/inbound/exchange-rate.controller.ts`: `@Controller('exchange-rate')` + `GET usd` con `JwtAuthGuard`; dato global, sin scope de tenant (design §2.8/§2.9, spec A5/A9).
- [x] 6.4 Crear `src/integrations/grain-price/adapters/inbound/grain-price.controller.ts`: `@Controller('grain-prices')` + `GET` con `JwtAuthGuard`; dato global, sin scope de tenant (design §2.8/§2.9, spec A6/A9).
- [x] 6.5 `src/app.module.ts`: agregar `WeatherModule`, `ExchangeRateModule` y `GrainPriceModule` al array `imports` (design §2.8).
- [x] 6.6 ~~`src/main.ts`: cambiar `process.env.PORT ?? 3000` por `process.env.PORT ?? 3001`~~ — **descartado en apply**: el puerto es configuración local de cada entorno, no una decisión del proyecto (proposal, Fuera de alcance). `main.ts` queda en `?? 3000`.

## 7. Entorno e infraestructura

- [x] 7.1 `.env.example` (raíz): agregar **solo** `EXTERNAL_HTTP_TIMEOUT_MS=8000` a la sección "backend"; **no** agregar `PORT` (es configuración local, ver proposal Fuera de alcance); recordar que **no existe** `packages/backend/.env.example` (el `.env.example` de la raíz indica copiar las variables a `packages/backend/.env`) (design §2.10).
- [x] 7.2 Confirmar que ninguna fuente requiere API key: no se agrega ningún secreto nuevo al `.env.example` (design §2.10, spec A10).
- [x] 7.3 Verificar que no se introdujo `@nestjs/config`, `ConfigService` ni un uso de `ioredis` (que sigue declarado pero sin importar) (proposal Decisions 9 y 14, design §2.3).

## 8. Tests — backend

- [x] 8.1 Unit del núcleo: `InMemoryTtlCache` (`get`/`set`, LRU acotado, entradas que sobreviven al TTL) y `FetchHttpClient` (timeout → `UpstreamUnavailableError`; `status >= 400` → `UpstreamError`) con `fetch` stubbeado (design §2.13).
- [x] 8.2 Unit de aplicación con **`ClockPort` fake**: TTL vigente NO llama al provider; TTL vencido sí; fallo upstream **con** entrada cacheada → `stale: true` + `fetchedAt` original; fallo upstream **sin** entrada → propaga (design §2.4/§2.13, spec A7–A8).
- [x] 8.3 Unit del parser de la pizarra contra el fixture HTML real: cinco granos, `$/Tn` y `US$/Tn`, `bnaRate` y fecha; markup alterado → `UpstreamParseError` (design §2.7/§2.13, spec A6/A13).
- [x] 8.4 Unit del provider de Open-Meteo contra su fixture JSON: verifica `wind_speed_unit=kn`, `timezone=America/Argentina/Cordoba` y `forecast_days`, y el mapeo a `WeatherSnapshot` (design §2.5/§2.13, spec A1–A2).
- [x] 8.5 Unit del dominio de ubicación: centroide en GeoJSON `Polygon` y en array de pares; polígono vacío o inválido → error (design §2.5/§2.13, spec A4).
- [x] 8.6 Tests de controller de los cuatro endpoints: DTO/query → input del use case; `tenantId` sale del JWT e ignora extras del cliente; traducción 404/400/503/502 (design §2.4/§2.13, spec A9).

## 9. Consumidor Next.js

- [ ] 9.1 `src/api/client.ts`: agregar `WeatherResponse`, `UsdRateResponse` y `GrainPricesResponse` (espejo del contrato de design §2.8) y las funciones `getWeather(lat, lon)`, `getLotWeather(lotId)`, `getUsdOfficial()` y `getGrainPrices()` sobre `apiGet` — sin tocar el transporte (Bearer + `cache: "no-store"` ya existen) (design §2.11).
- [ ] 9.2 Crear `src/components/weather/weather-widgets.tsx`: `WeatherWidget`, `WindWidget`, `RadarWidget`, `UsdWidget` y `GrainPricesWidget`, con badge de `stale` y `fetchedAt` visible (design §2.11, spec A11).
- [ ] 9.3 Reutilizar `WindRose` de `src/components/ui/charts.tsx` como lectura visual del vector viento dentro del `WindWidget` (design §2.11).
- [ ] 9.4 Crear `src/components/weather/leaflet-map.tsx`: componente `"use client"` con Leaflet **vanilla** (sin `react-leaflet`), capa de viento y overlay de radar armado con el `tileTemplate` del backend (design §2.11, spec A11).
- [ ] 9.5 Montar el bloque de widgets superiores en `src/app/dashboard/page.tsx` (Dashboard General), cargando el mapa con `next/dynamic` y `{ ssr: false }` (design §2.11, spec A11).
- [ ] 9.6 `src/app/dashboard/mi-campo/page.tsx`: quitar `"Clima y heladas"` de `ROADMAP_ITEMS` (deja de ser "próximamente") (design §2.11).
- [ ] 9.7 `packages/nextjs/package.json`: agregar `leaflet` y `@types/leaflet` (dev) y validar los peers bajo React 19 / Next 16 (design §2.11, proposal Risks).

## 10. Consumidor móvil

- [ ] 10.1 Crear `lib/domain/models/weather_reading.dart`: `WeatherReading` (temperatura, `windSpeedKnots`, `windDirectionDeg`, precipitación, probabilidad, `fetchedAt`, `stale`, `resolvedFrom`) (design §2.12, spec A12).
- [ ] 10.2 Crear `lib/domain/repositories/weather_repository.dart`: puerto `WeatherRepository` con `lastReading()`, `fetchCurrent({lat, lon})` y `fetchForLot({lotId})` (design §2.12).
- [ ] 10.3 Crear `lib/domain/usecases/get_weather_usecase.dart`: `GetWeatherUseCase` cache-first (devuelve lo local al instante y refresca si hay red) (design §2.12).
- [ ] 10.4 Crear `lib/data/services/weather_api_service.dart`: `WeatherApiService({http.Client? client, String? baseUrl})` con `_baseUrl = baseUrl ?? ApiConfig.baseUrl` (patrón `auth_api_service.dart`), `GET /weather/current?lat=&lon=` y `GET /lots/:lotId/weather` con `Authorization: Bearer` (design §2.12).
- [ ] 10.5 `lib/data/services/tables/infra_tables.dart`: agregar la tabla `WeatherCache` (`@DataClassName('WeatherCacheRow')`, PK fija `id = 'current'`, columnas de lectura + `fetchedAt` + `stale` + `resolvedFrom`) (design §2.12, spec A12).
- [ ] 10.6 Crear `lib/data/services/daos/weather_cache_dao.dart`: `save(reading)` (upsert de la fila vigente) y `get()` (design §2.12).
- [ ] 10.7 `lib/data/services/app_database.dart`: `schemaVersion` **3 → 4**, `if (from < 4) { await m.createTable(weatherCache); }`, registrar `WeatherCache` en `tables:` y `WeatherCacheDao` en `daos:`; correr `dart run build_runner build` (design §2.12/§5).
- [ ] 10.8 Crear `lib/data/repositories/http_weather_repository.dart` (adaptador remoto del puerto) y `lib/data/repositories/drift_weather_cache_repository.dart` (cache local sobre el DAO) (design §2.12).
- [ ] 10.9 Crear `lib/app/home/weather_view_model.dart` (estado de la tarjeta: lectura local inmediata + refresh) y agregar la tarjeta de clima/viento **en nudos** con timestamp en `lib/app/home/dashboard_view.dart` (design §2.12, spec A12).
- [ ] 10.10 `lib/main.dart`: wiring en el composition root (`WeatherApiService` → repositorios → `GetWeatherUseCase` → `WeatherViewModel`); los widgets NO instancian repositorios ni servicios (design §2.12).

## 11. Tests — móvil

- [ ] 11.1 Crear `test/data/services/weather_api_service_test.dart` con `MockClient` (patrón `daily_report_api_service_test.dart`): 200/401/500 y `SocketException` → resultado o excepción correcta (design §2.13).
- [ ] 11.2 Test de adaptador drift con `AppDatabase.forTesting(NativeDatabase.memory())`: `WeatherCacheDao` guarda y lee la última lectura con su `fetchedAt`; migración 3→4 crea la tabla (design §2.13, spec A12).
- [ ] 11.3 Test de `GetWeatherUseCase` con fakes in-memory y widget test de la tarjeta: muestra el viento en nudos y el timestamp de la lectura (design §2.13, spec A12).

## 12. Verificación global

- [ ] 12.1 `npm test` verde en `packages/backend` (suite de integraciones: núcleo, providers, parser y controllers) (design §2.13).
- [ ] 12.2 `flutter analyze` → 0 errores / 0 warnings en `packages/mobile`.
- [ ] 12.3 `flutter test` verde en `packages/mobile`.
- [ ] 12.4 `npm run lint` verde en `packages/nextjs`.
- [ ] 12.5 E2E manual con el backend y el frontend levantados: los cuatro endpoints responden con datos reales y **sin ninguna API key**; el dashboard muestra el bloque de widgets con mapa y radar; el móvil muestra la tarjeta con timestamp (Success Criteria del proposal).
- [ ] 12.6 Verificación de degradación: con una fuente inalcanzable (red cortada al proveedor), los endpoints responden `stale: true` con `fetchedAt`; sin valor previo, responden 503/502. Verificar además que el backend levantado en el `PORT` local configurado sirve los cuatro endpoints.

## Explicit Non-Goals

- [ ] No persistencia server-side: sin modelos ni columnas nuevas en `schema.prisma`, sin migración Prisma.
- [ ] No R011 (snapshot de las condiciones climáticas al momento de pulverizar); requiere decisión de almacenamiento.
- [ ] No Finanzas (Sprint 4): facturas, cobros, cheques/eCheqs y conversión a kilos de cereal.
- [ ] No Windy (descartado por key de testing, costo y términos que prohíben almacenar sus datos).
- [ ] No Redis, no scheduler, no cron; no uso de `ioredis`.
- [ ] No `@nestjs/config` ni `ConfigService`; las variables se leen con un guard estilo `requireJwtSecret()`.
- [ ] No API keys: las tres fuentes de datos y la pizarra BCR son gratuitas y keyless.
- [ ] No capas de tiles de Open-Meteo (`tiles.open-meteo.com` no devolvió metadata usable).
- [ ] No framework de tests en `packages/nextjs`.
- [ ] No histórico de cotizaciones (`api.argentinadatos.com`, ~3 MB) ni gráficos históricos.
- [ ] No `flutter build` ni `next build` (regla del workspace).
- [ ] No tocar `packages/web` (scaffold Flutter ajeno al proyecto).
