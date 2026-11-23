# Design: Sprint 3 — APIs Externas (Clima, Radar de Lluvia, Dólar y Pizarra de Cereales)

## 1. Enfoque

Tres **hexágonos de integración** en el backend — `weather`, `exchange-rate` y `grain-price` — más un **núcleo compartido** (`integrations/shared`) que provee lo que hoy no existe en el repo: un puerto HTTP saliente con timeout, una cache in-memory con TTL y un `ClockPort`. Cada módulo sigue el layout canónico de `packages/backend/src/entities/input/` (`domain/` · `application/` · `adapters/inbound` · `adapters/outbound` · `<modulo>.module.ts`), pero vive bajo `src/integrations/` porque **no son entidades persistentes**: sus adaptadores outbound son **clientes HTTP**, no repositorios Prisma. El backend es el único que habla con el mundo exterior; Next.js y Flutter consumen la API propia. La resolución de ubicación usa el **centroide de `Lot.coords`** con fallback al campo y una variante por `lat`/`lon` (design §2.5). La cache es **in-memory, con TTL por fuente y refresco lazy**, y ante fallo upstream se degrada al último valor cacheado marcado `stale` (design §2.3–§2.4), lo que satisface R003–R006 sin persistir nada server-side y sin introducir Redis ni scheduler. Corresponde a las Fases A–D del proposal.

## 2. Decisiones de arquitectura

### 2.1 Ubicación de los módulos: `src/integrations/` vs `src/entities/`

`docs/hexagonal-conventions.md` §"Backend Module Layout" dice "Use a hexagon per NestJS feature module under `packages/backend/src/entities/{module}` **or** `packages/backend/src/auth`". Es decir, la propia convención ya admite un hexágono fuera de `entities/`: **`auth` es el precedente**.

| Opción | Tradeoff | Decisión |
|---|---|---|
| Bajo `src/entities/` | consistencia literal con la convención; pero `entities/` hoy significa "entidad Prisma con repositorio" — un cliente HTTP ahí se lee como entidad persistente que no existe | **No** |
| Bajo `src/integrations/` (nuevo) | carpeta nueva en la raíz de `src/`; requiere justificar la excepción | **Sí** — el eje es "consumo de servicios externos", no "entidad"; y `auth` ya sentó el precedente de un hexágono fuera de `entities/` |
| Un solo módulo `integrations` con los tres providers | una carpeta, menos ceremonia | **No** — caches, TTL y modos de fallo son independientes (proposal Decision 12); un módulo único acopla lo que debe fallar por separado |

Estructura resultante:

```text
packages/backend/src/integrations/
  shared/
    application/ports/{http-client.ports.ts,cache.ports.ts,clock.ports.ts}
    domain/errors.ts
    integrations.config.ts
    adapters/outbound/{fetch-http.adapter.ts,in-memory-ttl-cache.ts,system-clock.ts}
    integrations-shared.module.ts
  weather/
    domain/{weather.types.ts,weather-location.ts,errors.ts}
    application/{weather.ports.ts,weather.types.ts,weather.validation.ts,weather-cache.policy.ts}
    application/use-cases/{get-weather.use-case.ts,get-lot-weather.use-case.ts}
    adapters/inbound/{weather.controller.ts,lot-weather.controller.ts}
    adapters/outbound/{open-meteo.weather.provider.ts,rainviewer.radar.provider.ts,prisma-lot-location.reader.ts}
    weather.module.ts
  exchange-rate/
    domain/exchange-rate.types.ts
    application/{exchange-rate.ports.ts,use-cases/get-usd-official.use-case.ts}
    adapters/inbound/exchange-rate.controller.ts
    adapters/outbound/dolarapi.exchange-rate.provider.ts
    exchange-rate.module.ts
  grain-price/
    domain/grain-price.types.ts
    application/{grain-price.ports.ts,use-cases/get-grain-prices.use-case.ts}
    adapters/inbound/grain-price.controller.ts
    adapters/outbound/{bcr-pizarra.parser.ts,bcr-grain-price.provider.ts,__fixtures__/pizarra-bcr.html}
    grain-price.module.ts
```

`integrations/shared` es un **módulo compartido normal que exporta tokens**, no un `@Global()`: la convención anti-service-locator pide wiring visible (design §2.2).

### 2.2 Puerto HTTP saliente + adapter sobre `fetch`

Hoy el backend tiene **cero HTTP saliente**. Se introduce un único puerto de capacidad y un adapter con `fetch` global (disponible en Node; no hace falta cliente HTTP).

| Opción | Tradeoff | Decisión |
|---|---|---|
| `HttpClientPort` propio sobre `fetch` global | cero dependencias nuevas; obliga a escribir el mapeo de errores nosotros | **Sí** — `@types/node` ya expone `fetch`; una dep HTTP nueva es innecesaria |
| `@nestjs/axios` / `axios` | interceptores y cancelación listos | **No** — dependencia nueva sin necesidad concreta; la convención dice "no new dependency unless there is a concrete need" |
| `fetch` con timeout por `Promise.race` | sin `AbortController` | **No** — deja la request viva en red; `AbortController` cancela de verdad |

Contrato (`integrations/shared/application/ports/http-client.ports.ts`):

```ts
export const HTTP_CLIENT = Symbol('HTTP_CLIENT');

export type HttpRequest = {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
};

export type HttpResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export interface HttpClientPort {
  /** Red/timeout -> UpstreamUnavailableError. status >= 400 -> UpstreamError. */
  request(input: HttpRequest): Promise<HttpResponse>;
}
```

Adapter `FetchHttpClient` (`adapters/outbound/fetch-http.adapter.ts`): `AbortController` con `setTimeout`, `clearTimeout` en `finally`, y traducción de errores:

- `AbortError` / `TypeError` de red → `UpstreamUnavailableError`.
- `status >= 400` → `UpstreamError(status, url)`; el body se descarta (nunca se filtra HTML de terceros al cliente).
- El body se devuelve **siempre como `string`**; el parseo JSON/HTML vive en cada provider, no en el adapter (los adapters outbound mapean, el HTTP no interpreta).

### 2.3 Cache in-memory con TTL y `ClockPort`

| Opción | Tradeoff | Decisión |
|---|---|---|
| `CachePort` con entradas que **sobreviven** al TTL (guardan `storedAt`) | habilita servir `stale` (proposal Decision 11) | **Sí** — el TTL es una decisión del use case, no una evacuación del store |
| Cache que **evacúa** al vencer el TTL | más simple; pero pierde el último valor y hace imposible degradar | **No** — rompería spec A8 |
| `@nestjs/cache-manager` | interceptor y TTL declarativo | **No** — dependencia nueva + `CacheInterceptor` opera a nivel HTTP y no puede expresar "devolver viejo si el upstream falla" |
| Redis (`ioredis` ya declarado pero nunca importado) | compartible entre instancias | **No** — `docker-compose.yml` solo tiene PostgreSQL; no hay infra para Redis y el volumen no lo pide |
| `ClockPort` reutilizado de `auth` | menos código | **No** — importar de `auth` acopla dos hexágonos; se **copia** el patrón de `src/auth/adapters/outbound/system-clock.ts` |

Contratos:

```ts
// application/ports/cache.ports.ts
export const CACHE = Symbol('CACHE');
export type CachedEntry<T> = { value: T; storedAt: Date };
export interface CachePort {
  get<T>(key: string): Promise<CachedEntry<T> | null>;
  set<T>(key: string, value: T, storedAt: Date): Promise<void>;
}

// application/ports/clock.ports.ts
export const CLOCK = Symbol('CLOCK');
export interface ClockPort { now(): Date; }
```

`InMemoryTtlCache` (`adapters/outbound/in-memory-ttl-cache.ts`): `Map<string, CachedEntry<unknown>>` con **LRU acotado** (máx. 200 entradas) porque las claves de clima incluyen coordenadas y de otro modo crecerían sin techo (proposal Risks). `get` no expira: devuelve la entrada con su `storedAt` y el **use case** decide. Cableado en `IntegrationsSharedModule` con `{ provide: CACHE, useClass: InMemoryTtlCache }` (instancia única compartida por los tres módulos).

### 2.4 Degradación, errores y contrato de respuesta

Algoritmo común de todo use case de lectura (pseudocódigo del read-through):

```text
entry = cache.get(key)
if entry && clock.now() - entry.storedAt < ttl:
    return { ...entry.value, stale: false, fetchedAt: entry.storedAt }

try:
    fresh = await provider.fetch(...)          # puede lanzar UpstreamError / UpstreamUnavailableError
    cache.set(key, fresh, clock.now())
    return { ...fresh, stale: false, fetchedAt: clock.now() }
catch (UpstreamError | UpstreamUnavailableError):
    if entry:
        return { ...entry.value, stale: true, fetchedAt: entry.storedAt }   # spec A8
    throw error                                                              # nunca hubo valor
```

Errores del núcleo (`integrations/shared/domain/errors.ts`) y su traducción a HTTP en el controller (la convención `docs/hexagonal-conventions.md` §Error Handling aplica "unless a specific contract says otherwise"; este es ese contrato):

| Error de aplicación/dominio | HTTP | Cuándo |
|---|---|---|
| `UpstreamUnavailableError` | `503 Service Unavailable` | red/timeout del upstream y **sin** valor cacheado |
| `UpstreamError` (status 4xx/5xx del tercero) | `502 Bad Gateway` | el tercero respondió mal y **sin** valor cacheado |
| `UpstreamParseError` | `502 Bad Gateway` | el HTML/JSON del tercero no matchea la forma esperada |
| `EntityNotFoundError` | `404 Not Found` | lote inexistente o fuera del tenant del caller |
| `InvalidInputError` | `400 Bad Request` | `lat`/`lon` fuera de rango, `lotId` vacío |

Todos los módulos traducen con el mismo helper privado `translate(error)` del controller (patrón de `input.controller.ts`).

### 2.5 Módulo `weather` — Open-Meteo + RainViewer

**Open-Meteo (verificado funcionando, sin key).** Viento en **nudos** nativo, que satisface R005 "en nudos" sin conversión:

| Necesidad | Query | Evidencia |
|---|---|---|
| Clima actual + viento | `GET https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation&wind_speed_unit=kn` | `current_units.wind_speed_10m: "kn"`; `current: {temperature_2m: 18.4, wind_speed_10m: 5.3, wind_direction_10m: 156, precipitation: 0.10}` |
| Serie horaria | `&hourly=wind_speed_10m,wind_direction_10m,precipitation&forecast_hours=48&wind_speed_unit=kn` | arrays horarios devueltos (48 entradas) |
| Pronóstico 7 días (R003) | `&daily=precipitation_sum,precipitation_probability_max&timezone=America/Argentina/Cordoba&forecast_days=7` | arrays `precipitation_sum` y `precipitation_probability_max` |

> ⚠️ **Corregido durante el apply:** este diseño pedía originalmente `forecast_days=2` para la serie horaria y `forecast_days=7` para la diaria en la misma URL. Es incorrecto: `forecast_days` es un parámetro único de la request y, repetido, Open-Meteo se queda con el **último** valor (verificado contra la API real: `forecast_days=2&forecast_days=7` devuelve **168** horas, no 48). El parámetro correcto para acotar la ventana horaria es `forecast_hours=48`, que devuelve **48** horas junto con 7 días diarios. Implementado así en `open-meteo.weather.provider.ts`.

**RainViewer (verificado funcionando, sin key).** `GET https://api.rainviewer.com/public/weather-maps.json` → `{host, radar: {past: [{time, path}, …]}}`; el tile se arma como `<host><path>/256/{z}/{x}/{y}/2/1_1.png`. Caveat honesto: es un **compuesto global** y su cobertura sobre Argentina es imperfecta; el fallback de R004 es la precipitación de Open-Meteo (proposal Decision 4).

| Opción | Tradeoff | Decisión |
|---|---|---|
| Radar de terceros con tiles propios (**RainViewer**) | cobertura global imperfecta sobre AR | **Sí** — gratis, sin key, capa overlay real |
| Tiles de Open-Meteo | `tiles.open-meteo.com` fue sondeado y **no devolvió metadata usable** | **No** — no se promete |
| Componer el tile server-side y servirlo por el backend | un origen, sin CORS | **No** — el backend solo entrega la **plantilla**; los tiles los pide el cliente al CDN, no se proxean |
| Sin radar: solo precipitación numérica | cero dependencia de cobertura | **No** — R004 pide explícitamente "radares de lluvia" |

**Resolución de ubicación (`domain/weather-location.ts` + `adapters/outbound/prisma-lot-location.reader.ts`).** `Lot.coords` es `String?` y `Farm.location` es `String?` (un nombre de texto, **no** coordenadas — verificado en `prisma/schema.prisma` líneas 208 y 225).

| Opción | Tradeoff | Decisión |
|---|---|---|
| Por lote: **centroide** de `Lot.coords` | una ubicación representativa del polígono real que se trabaja | **Sí** — es la unidad de trabajo real |
| Por lote: primer vértice | más barato | **No** — sesga la ubicación a un borde del lote |
| Fallback a `Farm.location` como texto | `Farm.location` **no tiene coordenadas** | **Sí, pero** solo puede resolver si algún lote del campo tiene polígono; si no, responde `InvalidInputError` claro. Se registra como open question agregar `lat`/`lon` a `Farm` |
| Solo por coordenadas (el cliente resuelve el lote) | el móvil no tiene GPS | **No** — obliga al cliente a conocer los polígonos |

Contrato de puertos (`application/weather.ports.ts`):

```ts
export const WEATHER_PROVIDER = Symbol('WEATHER_PROVIDER');
export const RADAR_PROVIDER = Symbol('RADAR_PROVIDER');
export const LOT_LOCATION_READER = Symbol('LOT_LOCATION_READER');

export interface WeatherProviderPort {
  fetchCurrent(input: { lat: number; lon: number }): Promise<WeatherSnapshot>;
}

export interface RadarProviderPort {
  fetchRadar(): Promise<RadarSnapshot>;
}

export interface LotLocationReaderPort {
  /** Resuelve el lote DENTRO del tenant del caller (spec A9). */
  findByLotAndTenant(lotId: string, tenantId: string):
    Promise<{ coords: string | null; farmId: string; farmLocation: string | null } | null>;
  /** Centroide de los lotes con polígono del campo, para el fallback. */
  centroidByFarmAndTenant(farmId: string, tenantId: string):
    Promise<{ lat: number; lon: number } | null>;
}
```

Tipos de aplicación:

```ts
// domain/weather.types.ts
export type WeatherSnapshot = {
  current: {
    temperatureC: number;
    windSpeedKnots: number;         // R005: nudos nativos de Open-Meteo
    windDirectionDeg: number;
    precipitationMm: number;
  };
  hourly: Array<{ time: string; windSpeedKnots: number; windDirectionDeg: number; precipitationMm: number }>;
  daily: Array<{ date: string; precipitationSumMm: number; precipitationProbabilityMax: number | null }>;
};

export type RadarSnapshot = {
  host: string;
  frames: Array<{ time: string; path: string }>;
  tileTemplate: string;            // `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`
  coverageWarning: boolean;        // true cuando la zona objetivo cae fuera del compuesto
};
```

```ts
// application/weather.types.ts
export type GetWeatherByCoordinatesInput = { lat: number; lon: number };
export type GetWeatherByLotInput = { lotId: string; tenantId: string };
export type WeatherOutput = {
  source: 'open-meteo' | 'open-meteo+rainviewer';
  location: {
    lat: number;
    lon: number;
    resolvedFrom: 'coordinates' | 'lot' | 'farm';
    lotId: string | null;
    usedFarmFallback: boolean;
  };
  current: WeatherSnapshot['current'];
  hourly: WeatherSnapshot['hourly'];
  daily: WeatherSnapshot['daily'];
  radar: RadarSnapshot | null;
  stale: boolean;
  fetchedAt: string;               // ISO 8601
};
```

Parámetros de la política de cache (`application/weather-cache.policy.ts`):

| Parámetro | Valor | Justificación |
|---|---|---|
| TTL | **15 min** | proposal Decision 9; el clima actual cambia en esa escala |
| Clave | `weather:<lat2dp>,<lon2dp>` | redondeo a 2 decimales (~1 km) para acotar el espacio de claves (proposal Risks) |
| Claves afectadas | `lat`, `lon` **redondeados** | mismo tile para lotes vecinos; evita una entrada por lote |

### 2.6 Módulo `exchange-rate` — `dolarapi.com`

`GET https://dolarapi.com/v1/dolares/oficial` → `{"moneda":"USD","casa":"oficial","nombre":"Oficial","compra":1485,"venta":1535,"fechaActualizacion":"2026-10-15T15:00:00.000Z"}`. Es la cotización **Banco Nación** que pide R030; el sprint solo **expone el dato**, no lo aplica a ninguna operación financiera (eso es Sprint 4, proposal Scope).

| Opción | Tradeoff | Decisión |
|---|---|---|
| `dolarapi.com` | payload mínimo, casa "oficial" = BNA, gratis, sin key | **Sí** |
| `api.argentinadatos.com/v1/cotizaciones/dolares/` | serie histórica completa, pero **~3 MB por request** | **No en alcance** — se registra como opción futura para gráficos históricos |
| Scraping de BNA | control total | **No** — HTML de un sitio estatal, más frágil que una API ya normalizada |

```ts
export const EXCHANGE_RATE_PROVIDER = Symbol('EXCHANGE_RATE_PROVIDER');
export interface ExchangeRateProviderPort {
  fetchOfficialUsd(): Promise<UsdRateSnapshot>;
}
export type UsdRateSnapshot = {
  source: 'dolarapi.com';
  casa: 'oficial';
  moneda: 'USD';
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
};
```

| Parámetro | Valor |
|---|---|
| TTL | **30 min** |
| Clave de cache | `exchange-rate:usd-oficial` |
| Scoping | global (sin tenant), con JWT (proposal Decision 15) |

### 2.7 Módulo `grain-price` — pizarra BCR con `cheerio`

Evidencia que sostiene la sustitución de AGD por BCR (proposal Decision 5):

| Fuente | Resultado | Uso |
|---|---|---|
| `https://www.cac.bcr.com.ar/es/precios-de-pizarra` | HTML (Drupal) alcanzable con la pizarra del día: Trigo, Maíz, Girasol, Soja y Sorgo en `$/Tn` y `US$/Tn`, la cotización BNA de conversión y un timestamp | **Elegida** |
| `https://www.bolsadecereales.com/precios-oficiales` | alternativa viable | fallback documentado, **no implementado** |
| `magyp.gob.ar/.../Precios Cámara - Diario/...` | alternativa viable | fallback documentado, **no implementado** |
| `datos.magyp.gob.ar` (CKAN, `package_search?q=pizarra`) | **0 resultados** → no hay API JSON oficial de la pizarra diaria | descarta la vía "API oficial" |
| `https://www.agd.com.ar/` | `/pizarra` y `/cotizaciones` → **404**; no hay página pública | descarta AGD |
| `https://portalmant.agd.com.ar/precios` | **login de cliente** | descarta AGD |

| Opción | Tradeoff | Decisión |
|---|---|---|
| Parseo por regex/string sobre el HTML | cero dependencias | **No** — un cambio de whitespace o de anidado devuelve ceros **en silencio**; imposible de detectar sin fixture |
| **`cheerio`** (parser HTML pequeño) | +1 dependencia en el backend | **Sí** — selectores estables por texto/label, y el fixture permite que el test **falle fuerte** ante un cambio de markup |
| `jsdom` completo | soporte DOM total | **No** — pesado para leer una tabla; `cheerio` alcanza |
| Leer la pizarra desde una fuente con API (`argentinadatos`) | sin scraping | **No** — no cubre la pizarra oficial de cereales, solo dólar |

```ts
export const GRAIN_PRICE_PROVIDER = Symbol('GRAIN_PRICE_PROVIDER');
export interface GrainPriceProviderPort {
  fetchPizarra(): Promise<PizarraSnapshot>;
}
export type GrainPriceRow = {
  grain: 'trigo' | 'maiz' | 'girasol' | 'soja' | 'sorgo';
  label: string;
  pricePerTonArs: number | null;
  pricePerTonUsd: number | null;
};
export type PizarraSnapshot = {
  source: 'cac.bcr.com.ar';
  date: string;                 // fecha de pizarra publicada
  publishedAt: string | null;   // timestamp publicado por BCR, si está disponible
  bnaRate: number | null;       // cotización BNA usada para la conversión
  prices: GrainPriceRow[];
};
```

`bcr-pizarra.parser.ts` es una función **pura** `parsePizarra(html: string): PizarraSnapshot` (testeable sin red, spec A13); `bcr-grain-price.provider.ts` solo hace el `fetch` y delega en el parser. Si el parser no encuentra filas → `UpstreamParseError` (nunca ceros silenciosos).

| Parámetro | Valor |
|---|---|
| TTL | **24 h** |
| Clave de cache | `grain-price:pizarra-bcr` |
| Scoping | global (sin tenant), con JWT |

### 2.8 Endpoints y contrato wire

| Método y ruta | Controller | Input | Respuesta | Guards |
|---|---|---|---|---|
| `GET /weather/current?lat=&lon=` | `weather/adapters/inbound/weather.controller.ts` | `lat`, `lon` (numbers, validados) | `WeatherOutput` | `JwtAuthGuard` |
| `GET /lots/:lotId/weather` | `weather/adapters/inbound/lot-weather.controller.ts` (`@Controller('lots')`) | `lotId` (path), `tenantId` de `req.user` | `WeatherOutput` | `JwtAuthGuard` |
| `GET /exchange-rate/usd` | `exchange-rate/adapters/inbound/exchange-rate.controller.ts` | — | `UsdRateResponse` | `JwtAuthGuard` |
| `GET /grain-prices` | `grain-price/adapters/inbound/grain-price.controller.ts` | — | `GrainPricesResponse` | `JwtAuthGuard` |

`@Controller('lots')` en un controller propio del módulo `weather` **no colisiona** con el `LotController` existente: las rutas completas (`GET /lots/:lotId/weather` vs `GET /lots/:id`) son distintas; Nest permite dos controllers con el mismo prefijo.

Formas JSON de respuesta (`fetch` del cliente, `cache: "no-store"`):

```json
// GET /weather/current?lat=-33.13&lon=-61.00
{
  "source": "open-meteo+rainviewer",
  "location": { "lat": -33.13, "lon": -61.0, "resolvedFrom": "coordinates", "lotId": null, "usedFarmFallback": false },
  "current": { "temperatureC": 18.4, "windSpeedKnots": 5.3, "windDirectionDeg": 156, "precipitationMm": 0.1 },
  "hourly": [ { "time": "2026-10-15T15:00", "windSpeedKnots": 5.3, "windDirectionDeg": 156, "precipitationMm": 0.1 } ],
  "daily": [ { "date": "2026-10-15", "precipitationSumMm": 0.0, "precipitationProbabilityMax": 10 } ],
  "radar": {
    "host": "https://tilecache.rainviewer.com",
    "frames": [ { "time": "2026-10-15T14:50:00.000Z", "path": "/v2/radar/1760..." } ],
    "tileTemplate": "https://tilecache.rainviewer.com/v2/radar/1760.../256/{z}/{x}/{y}/2/1_1.png",
    "coverageWarning": true
  },
  "stale": false,
  "fetchedAt": "2026-10-15T15:00:00.000Z"
}
```

```json
// GET /exchange-rate/usd
{
  "source": "dolarapi.com",
  "casa": "oficial",
  "moneda": "USD",
  "nombre": "Oficial",
  "compra": 1485,
  "venta": 1535,
  "fechaActualizacion": "2026-10-15T15:00:00.000Z",
  "stale": false,
  "fetchedAt": "2026-10-15T15:00:02.000Z"
}
```

```json
// GET /grain-prices
{
  "source": "cac.bcr.com.ar",
  "date": "2026-10-15",
  "publishedAt": "2026-10-15T13:40:00.000Z",
  "bnaRate": 1535,
  "prices": [
    { "grain": "trigo",   "label": "Trigo",   "pricePerTonArs": 210000, "pricePerTonUsd": 137 },
    { "grain": "maiz",    "label": "Maíz",    "pricePerTonArs": 195000, "pricePerTonUsd": 127 },
    { "grain": "girasol", "label": "Girasol", "pricePerTonArs": 330000, "pricePerTonUsd": 215 },
    { "grain": "soja",    "label": "Soja",    "pricePerTonArs": 310000, "pricePerTonUsd": 202 },
    { "grain": "sorgo",   "label": "Sorgo",   "pricePerTonArs": 180000, "pricePerTonUsd": 117 }
  ],
  "stale": false,
  "fetchedAt": "2026-10-15T15:00:03.000Z"
}
```

Cableado en `app.module.ts`: se agregan `WeatherModule`, `ExchangeRateModule` y `GrainPriceModule` al array `imports` (hoy 22 módulos). El default de `PORT` en `main.ts` **no se toca**: el puerto es configuración local de cada entorno (ver proposal, Fuera de alcance).

### 2.9 Scoping multi-tenant

Conforme a `openspec/specs/multi-tenant-enforcement/spec.md` ("tenantId es la clave de tenant… el backend MUST NOT tratar client-supplied `companyId` ni la identidad de tenant/firma como autoritativas"):

| Endpoint | Scope | Racional |
|---|---|---|
| `GET /lots/:lotId/weather` | **tenant** (`req.user.tenantId`), lote → campo → cliente → `tenantId` | el lote es un recurso tenant-owned; un lote de otro tenant responde **404** (no revela existencia) |
| `GET /weather/current?lat=&lon=` | global (con JWT) | coordenadas explícitas del caller; no hay recurso que scopear |
| `GET /exchange-rate/usd` | global (con JWT) | dato de mercado público, idéntico para todos |
| `GET /grain-prices` | global (con JWT) | dato de mercado público, idéntico para todos |

El `tenantId` **nunca** se lee del body/query: sale de `req.user` (patrón `input.controller.ts` → `req.user.tenantId`). Los tres endpoints globales siguen exigiendo JWT para no abrir superficie no autenticada (proposal Decision 15).

### 2.10 Env vars e infraestructura

El repo **no tiene `@nestjs/config`**: `src/main.ts` hace `import 'dotenv/config'` y lee `process.env` directo; existe el helper guard `src/auth/jwt-secret.ts` (`requireJwtSecret()`) que **falla ruidosamente** si falta la variable. Se imita ese patrón.

| Variable | Obligatoria | Default | Cómo se lee |
|---|---|---|---|
| `JWT_SECRET` | sí (ya existía) | — | `requireJwtSecret()` existente |
| `EXTERNAL_HTTP_TIMEOUT_MS` | no | `8000` | `integrations.config.ts` con guard estilo `requireJwtSecret()` que solo valida el número si viene |
| `PORT` | no | 3000 (default del código, sin tocar) | `main.ts` |
| API keys de terceros | **ninguna** | — | no aplica: las tres fuentes son keyless |

`integrations.config.ts`:

```ts
export function readExternalHttpTimeoutMs(): number {
  const raw = process.env.EXTERNAL_HTTP_TIMEOUT_MS;
  if (raw === undefined || raw.trim() === '') return 8000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('EXTERNAL_HTTP_TIMEOUT_MS must be a positive number.');
  }
  return parsed;
}
```

Documentación: el `.env.example` de **la raíz** (que ya existe con las secciones `docker-compose` y `backend`) gana `EXTERNAL_HTTP_TIMEOUT_MS` en su sección backend. **No** se agrega `PORT`: el puerto es configuración local de cada entorno, no del proyecto. Nota: **no existe `packages/backend/.env.example`** — el `.env.example` de la raíz indica "place these in `packages/backend/.env`".

### 2.11 Consumidor Next.js — widgets + Leaflet

`packages/nextjs/src/api/client.ts` ya expone `API_BASE` (default `http://localhost:3001`), `apiGet` con `Authorization: Bearer <token>` desde `localStorage` y `cache: "no-store"`. Se agregan solo tipos y funciones; no se toca el transporte.

```ts
export type WeatherResponse = { /* espejo de WeatherOutput (design §2.8) */ };
export type UsdRateResponse = { /* espejo (design §2.8) */ };
export type GrainPricesResponse = { /* espejo (design §2.8) */ };

export function getWeather(lat: number, lon: number): Promise<WeatherResponse> {
  return apiGet<WeatherResponse>(`/weather/current?lat=${lat}&lon=${lon}`);
}
export function getLotWeather(lotId: string): Promise<WeatherResponse> {
  return apiGet<WeatherResponse>(`/lots/${encodeURIComponent(lotId)}/weather`);
}
export function getUsdOfficial(): Promise<UsdRateResponse> {
  return apiGet<UsdRateResponse>("/exchange-rate/usd");
}
export function getGrainPrices(): Promise<GrainPricesResponse> {
  return apiGet<GrainPricesResponse>("/grain-prices");
}
```

| Opción | Tradeoff | Decisión |
|---|---|---|
| `leaflet` **vanilla** en un componente cliente con `useEffect` | una dep; control total; sin acoplamiento al ciclo de React | **Sí** — `react-leaflet` agrega una capa más y arrastra el riesgo de peers con React 19 |
| `leaflet` + `react-leaflet` | API declarativa | **No por defecto** — React 19 + Next 16 puede romper peers; se reevalúa si aparece necesidad |
| Reusar `SatelliteMap` de `src/components/ui/charts.tsx` | cero dependencias | **No** — es un SVG decorativo, no un mapa con tiles/zoom/overlay |
| Reusar `WindRose` existente | ya está | **Sí, complementario** — la rosa de los vientos sigue siendo la lectura visual del vector viento |

`leaflet-map.tsx`: `"use client"`, importado con `next/dynamic` y `{ ssr: false }` (Leaflet toca `window`), overlay de radar RainViewer (usando `tileTemplate` del backend) y un marcador con la dirección/velocidad del viento. El bloque superior se monta en `src/app/dashboard/page.tsx` (Dashboard General). En `src/app/dashboard/mi-campo/page.tsx` se retira `"Clima y heladas"` de `ROADMAP_ITEMS` porque deja de ser "próximamente".

### 2.12 Consumidor móvil — tarjeta + cache drift

Capas conforme al layout del repo (`domain/` · `data/services` · `data/repositories` · `app/`), con `main.dart` como composition root ("Los widgets NO instancian repositorios ni servicios").

| Opción | Tradeoff | Decisión |
|---|---|---|
| Puerto `WeatherRepository` con método **cache-first** en `domain/` | la política (leer cache local, mostrar timestamp, pedir remoto) queda en el dominio y es testeable | **Sí** |
| El ViewModel llame directo al `WeatherApiService` | menos archivos | **No** — rompe la regla del repo ("ViewModels dependen de use cases o repositorios, nunca de HTTP services") |
| Tabla drift nueva `WeatherCache` | persistencia real de la última lectura + timestamp (proposal Decision 14 / spec A12) | **Sí** — migración **aditiva**, no destructiva |
| Guardar el clima en `shared_preferences` | sin migración drift | **No** — el repo ya usa drift como única base local; dos mecanismos de persistencia es deuda |

Contratos:

```dart
// domain/models/weather_reading.dart
class WeatherReading {
  final double temperatureC;
  final double windSpeedKnots;   // R005: nudos
  final double windDirectionDeg;
  final double precipitationMm;
  final double? precipitationProbabilityMax;
  final DateTime fetchedAt;
  final bool stale;
  final String resolvedFrom;     // 'coordinates' | 'lot' | 'farm'
}

// domain/repositories/weather_repository.dart
abstract class WeatherRepository {
  /// Última lectura local (sin red) con su timestamp — se muestra sin señal.
  Future<WeatherReading?> lastReading();
  /// Lectura remota; en éxito persiste localmente y devuelve el valor.
  Future<WeatherReading> fetchCurrent({required double lat, required double lon});
  /// Lectura remota por lote (resuelta y scopeada en el backend).
  Future<WeatherReading> fetchForLot({required String lotId});
}

// domain/usecases/get_weather_usecase.dart
class GetWeatherUseCase {
  GetWeatherUseCase(this._repository);
  /// cache-first: devuelve lo local al instante y refresca si hay red.
  Future<WeatherReading?> execute({double? lat, double? lon, String? lotId});
}
```

```dart
// data/services/weather_api_service.dart — patrón de auth_api_service.dart
class WeatherApiService {
  WeatherApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? ApiConfig.baseUrl;
  // GET /weather/current?lat=&lon= y GET /lots/:lotId/weather con Bearer
}
```

Cambio de esquema drift (`lib/data/services/tables/infra_tables.dart` gana la tabla; `app_database.dart` la registra):

```dart
/// Última lectura meteorológica (R003/R005 offline). Una sola fila vigente.
@DataClassName('WeatherCacheRow')
class WeatherCache extends Table {
  TextColumn get id => text()();                       // clave fija 'current'
  RealColumn get temperatureC => real()();
  RealColumn get windSpeedKnots => real()();
  RealColumn get windDirectionDeg => real()();
  RealColumn get precipitationMm => real()();
  RealColumn get precipitationProbabilityMax => real().nullable()();
  TextColumn get resolvedFrom => text()();
  BoolColumn get stale => boolean().withDefault(const Constant(false))();
  DateTimeColumn get fetchedAt => dateTime()();
  @override
  Set<Column> get primaryKey => {id};
}
```

`app_database.dart`: `schemaVersion` **3 → 4** y `if (from < 4) { await m.createTable(weatherCache); }` (aditivo, las filas existentes no se tocan), más el registro de `WeatherCacheDao` en `daos:`.

**Selección del lote en el móvil**: abierta (proposal Open Questions). El diseño asume que la tarjeta usa `fetchForLot` cuando hay contexto de lote y, si no, el widget por coordenadas; el `lat`/`lon` del caso sin lote queda como decisión de apply.

### 2.13 Testing

| Capa | Qué | Cómo |
|---|---|---|
| Unit (núcleo) | `InMemoryTtlCache`: `get`/`set`, LRU acotado, entradas que sobreviven al TTL | Jest, sin mocks |
| Unit (núcleo) | `FetchHttpClient`: timeout → `UpstreamUnavailableError`; `status>=400` → `UpstreamError` | `fetch` stubbeado + `ClockPort`/timers fake |
| Unit (aplicación) | Los tres use cases con `ClockPort` fake: **TTL vigente no llama al provider**; TTL vencido sí; fallo upstream con cache → `stale: true`; fallo upstream sin cache → propaga | `Test.createTestingModule` con providers fake (patrón `docs/hexagonal-conventions.md` §Testing Rules) |
| Unit (parser) | `parsePizarra` sobre el **fixture HTML real** (`__fixtures__/pizarra-bcr.html`): 5 granos, `$/Tn` y `US$/Tn`, `bnaRate`, fecha; markup alterado → `UpstreamParseError` | Jest puro, sin red (spec A13) |
| Adaptador (provider) | `open-meteo.weather.provider`: query builder correcto (`wind_speed_unit=kn`, `timezone=America/Argentina/Cordoba`, `forecast_hours=48`, `forecast_days=7`) y mapeo del payload a dominio, contra **fixture JSON real** | `HttpClientPort` fake que devuelve el fixture |
| Dominio (ubicación) | Centroide de `Lot.coords` en GeoJSON `Polygon` y en array de pares; polígono vacío/ inválido → error | Jest puro |
| Controller | DTO/query → input del use case; `tenantId` sale del JWT; traducción `EntityNotFoundError`→404, `InvalidInputError`→400, `UpstreamUnavailableError`→503, `UpstreamError`→502 | `adapters/inbound/*.controller.spec.ts` |
| Móvil (data) | `WeatherApiService` 200/401/500/`SocketException` con `MockClient` (patrón `daily_report_api_service_test.dart`) | `flutter test` |
| Móvil (drift) | `WeatherCacheDao`: guardar/leer la última lectura con `fetchedAt`; migración 3→4 | `AppDatabase.forTesting(NativeDatabase.memory())` |
| Móvil (domain) | `GetWeatherUseCase`: con cache local devuelve al instante; sin red deja el valor previo | fakes in-memory |
| Móvil (UI) | Tarjeta muestra viento en nudos y el timestamp de la lectura | widget test |
| Web | **Sin framework**: verificación manual del bloque de widgets y del mapa (proposal Fuera de alcance) | — |

Verificación: `npm test` (backend), `flutter analyze` + `flutter test` (móvil), `npm run lint` (nextjs). Sin builds (regla del workspace).

## 3. Flujo de datos

```text
Next.js (dashboard)                          Flutter (móvil)
  getWeather(lat,lon) / getLotWeather(lotId)   GetWeatherUseCase (cache-first)
  getUsdOfficial() / getGrainPrices()            │ 1) drift lastReading() → tarjeta con timestamp
        │  Bearer <token>, cache: no-store        └ 2) WeatherApiService ──┐
        └──────────────┬───────────────────────────────────────────────────┘
                       ▼
        NestJS  GET /weather/current | /lots/:lotId/weather | /exchange-rate/usd | /grain-prices
                       │  JwtAuthGuard → req.user.tenantId (solo weather-by-lot)
                       ▼
        WeatherController / LotWeatherController / ExchangeRateController / GrainPriceController
                       │  translate(error): 404 | 400 | 503 | 502
                       ▼
        Use case (uno por fuente) ── ClockPort ──┐
          entry = CACHE.get(key)                 │  TTL vigente → responder cache
          if vigente → {…, stale:false}          │  TTL vencido → provider
          else provider.fetch(...)               │  fallo upstream + entry → {…, stale:true, fetchedAt}
          CACHE.set(key, value, clock.now())     └  fallo upstream sin entry → 503/502
                       ▼
        LOT_LOCATION_READER (Prisma, tenant-scoped)   WEATHER_PROVIDER          RADAR_PROVIDER        EXCHANGE_RATE_PROVIDER   GRAIN_PRICE_PROVIDER
        Lot.coords → centroide / campo fallback       Open-Meteo (fetch)        RainViewer (fetch)    dolarapi.com (fetch)     BCR HTML → cheerio
                       │                                  │                        │                     │                        │
                       └──────────────────────────────────┴────────────────────────┴─────────────────────┴────────────────────────┘
                                              FetchHttpClient (global fetch + AbortController timeout)
```

Cuatro fuentes externas, **cero API keys**, un único cliente HTTP saliente, una única cache in-memory con TTL por fuente.

## 4. Cambios de archivos

### Backend (`packages/backend/`)

| Archivo | Acción | Qué |
|---|---|---|
| `src/integrations/shared/application/ports/http-client.ports.ts` | Create | `HTTP_CLIENT`, `HttpClientPort`, `HttpRequest`, `HttpResponse` (design §2.2) |
| `src/integrations/shared/application/ports/cache.ports.ts` | Create | `CACHE`, `CachePort`, `CachedEntry` (design §2.3) |
| `src/integrations/shared/application/ports/clock.ports.ts` | Create | `CLOCK`, `ClockPort` (design §2.3) |
| `src/integrations/shared/domain/errors.ts` | Create | `UpstreamError`, `UpstreamUnavailableError`, `UpstreamParseError` (design §2.4) |
| `src/integrations/shared/integrations.config.ts` | Create | `readExternalHttpTimeoutMs()` con guard (design §2.10) |
| `src/integrations/shared/adapters/outbound/fetch-http.adapter.ts` | Create | `FetchHttpClient` con `fetch` global + `AbortController` (design §2.2) |
| `src/integrations/shared/adapters/outbound/in-memory-ttl-cache.ts` | Create | `InMemoryTtlCache` con LRU acotado (design §2.3) |
| `src/integrations/shared/adapters/outbound/system-clock.ts` | Create | `SystemClock` espejo de `src/auth/adapters/outbound/system-clock.ts` |
| `src/integrations/shared/integrations-shared.module.ts` | Create | Composition root compartido: exporta `HTTP_CLIENT`, `CACHE`, `CLOCK` |
| `src/integrations/weather/domain/weather.types.ts` | Create | `WeatherSnapshot`, `RadarSnapshot` (design §2.5) |
| `src/integrations/weather/domain/weather-location.ts` | Create | `centroidOfCoords(coords: string)` puro, tolerante a formatos (design §2.5) |
| `src/integrations/weather/domain/errors.ts` | Create | Errores específicos del módulo (p. ej. `WeatherLocationUnresolvedError` → `InvalidInputError`) |
| `src/integrations/weather/application/weather.ports.ts` | Create | `WEATHER_PROVIDER`, `RADAR_PROVIDER`, `LOT_LOCATION_READER` + interfaces (design §2.5) |
| `src/integrations/weather/application/weather.types.ts` | Create | `GetWeatherByCoordinatesInput`, `GetWeatherByLotInput`, `WeatherOutput` (design §2.5) |
| `src/integrations/weather/application/weather.validation.ts` | Create | Aserciones de `lat`/`lon` y `lotId` (helpers, **no** class-validator) (design §2.8) |
| `src/integrations/weather/application/weather-cache.policy.ts` | Create | TTL 15 min + clave redondeada a 2 decimales (design §2.5) |
| `src/integrations/weather/application/use-cases/get-weather.use-case.ts` | Create | Read-through: cache → provider → `stale` (design §2.3–§2.4) |
| `src/integrations/weather/application/use-cases/get-lot-weather.use-case.ts` | Create | Resuelve ubicación del lote (centroide → campo) y delega (design §2.5) |
| `src/integrations/weather/adapters/inbound/weather.controller.ts` | Create | `GET /weather/current?lat=&lon=`, `JwtAuthGuard`, `translate` (design §2.8) |
| `src/integrations/weather/adapters/inbound/lot-weather.controller.ts` | Create | `@Controller('lots')` + `GET :lotId/weather`, tenant de `req.user` (design §2.9) |
| `src/integrations/weather/adapters/outbound/open-meteo.weather.provider.ts` | Create | Query builder Open-Meteo + mapeo a dominio (design §2.5) |
| `src/integrations/weather/adapters/outbound/rainviewer.radar.provider.ts` | Create | `weather-maps.json` → host/frames/tileTemplate (design §2.5) |
| `src/integrations/weather/adapters/outbound/prisma-lot-location.reader.ts` | Create | `LotLocationReaderPort` sobre Prisma, tenant-scoped (design §2.5/§2.9) |
| `src/integrations/weather/weather.module.ts` | Create | Composition root: importa `IntegrationsSharedModule` y `PrismaModule` |
| `src/integrations/exchange-rate/domain/exchange-rate.types.ts` | Create | `UsdRateSnapshot` (design §2.6) |
| `src/integrations/exchange-rate/application/exchange-rate.ports.ts` | Create | `EXCHANGE_RATE_PROVIDER` + interface (design §2.6) |
| `src/integrations/exchange-rate/application/use-cases/get-usd-official.use-case.ts` | Create | TTL 30 min + degradación (design §2.4/§2.6) |
| `src/integrations/exchange-rate/adapters/inbound/exchange-rate.controller.ts` | Create | `GET /exchange-rate/usd` (design §2.8) |
| `src/integrations/exchange-rate/adapters/outbound/dolarapi.exchange-rate.provider.ts` | Create | Provider sobre `dolarapi.com` (design §2.6) |
| `src/integrations/exchange-rate/exchange-rate.module.ts` | Create | Composition root |
| `src/integrations/grain-price/domain/grain-price.types.ts` | Create | `PizarraSnapshot`, `GrainPriceRow` (design §2.7) |
| `src/integrations/grain-price/application/grain-price.ports.ts` | Create | `GRAIN_PRICE_PROVIDER` + interface (design §2.7) |
| `src/integrations/grain-price/application/use-cases/get-grain-prices.use-case.ts` | Create | TTL 24 h + degradación (design §2.4/§2.7) |
| `src/integrations/grain-price/adapters/inbound/grain-price.controller.ts` | Create | `GET /grain-prices` (design §2.8) |
| `src/integrations/grain-price/adapters/outbound/bcr-pizarra.parser.ts` | Create | `parsePizarra(html)` con `cheerio`, función pura (design §2.7) |
| `src/integrations/grain-price/adapters/outbound/bcr-grain-price.provider.ts` | Create | `fetch` de BCR + delega en el parser |
| `src/integrations/grain-price/adapters/outbound/__fixtures__/pizarra-bcr.html` | Create | Fixture HTML **real** capturado (spec A13) |
| `src/integrations/weather/adapters/outbound/__fixtures__/open-meteo-forecast.json` | Create | Fixture JSON real capturado |
| `src/integrations/weather/adapters/outbound/__fixtures__/rainviewer-weather-maps.json` | Create | Fixture JSON real capturado |
| `src/integrations/exchange-rate/adapters/outbound/__fixtures__/dolarapi-oficial.json` | Create | Fixture JSON real capturado |
| `src/app.module.ts` | Modify | + `WeatherModule`, `ExchangeRateModule`, `GrainPriceModule` |
| `src/main.ts` | Unchanged | El default de `PORT` (3000) no se toca: el puerto es configuración local (ver proposal, Fuera de alcance) |
| `package.json` | Modify | + `cheerio` |

### Web (`packages/nextjs/`)

| Archivo | Acción | Qué |
|---|---|---|
| `src/api/client.ts` | Modify | DTOs y funciones `getWeather` / `getLotWeather` / `getUsdOfficial` / `getGrainPrices` (design §2.11) |
| `src/components/weather/weather-widgets.tsx` | Create | `WeatherWidget`, `WindWidget`, `RadarWidget`, `UsdWidget`, `GrainPricesWidget` (+ badge `stale`) |
| `src/components/weather/leaflet-map.tsx` | Create | Mapa Leaflet propio, capa de viento + overlay de radar (design §2.11) |
| `src/app/dashboard/page.tsx` | Modify | Bloque de widgets superiores (Visión §5.1) |
| `src/app/dashboard/mi-campo/page.tsx` | Modify | Quitar `"Clima y heladas"` de `ROADMAP_ITEMS` |
| `package.json` | Modify | + `leaflet`, + `@types/leaflet` (dev) |

### Móvil (`packages/mobile/`)

| Archivo | Acción | Qué |
|---|---|---|
| `lib/domain/models/weather_reading.dart` | Create | `WeatherReading` (design §2.12) |
| `lib/domain/repositories/weather_repository.dart` | Create | Puerto `WeatherRepository` (cache-first) |
| `lib/domain/usecases/get_weather_usecase.dart` | Create | Orquestación cache local → remoto |
| `lib/data/services/weather_api_service.dart` | Create | `WeatherApiService` con `http.Client` inyectable (patrón `auth_api_service.dart`) |
| `lib/data/services/tables/infra_tables.dart` | Modify | + tabla `WeatherCache` |
| `lib/data/services/daos/weather_cache_dao.dart` | Create | DAO de la lectura vigente |
| `lib/data/services/app_database.dart` | Modify | `schemaVersion` 4 + `createTable(weatherCache)` + DAO; correr `dart run build_runner build` |
| `lib/data/repositories/http_weather_repository.dart` | Create | Adaptador remoto del puerto |
| `lib/data/repositories/drift_weather_cache_repository.dart` | Create | Cache local del puerto |
| `lib/app/home/weather_view_model.dart` | Create | Estado de la tarjeta (lectura local al instante + refresh) |
| `lib/app/home/dashboard_view.dart` | Modify | Tarjeta de clima/viento con timestamp |
| `lib/main.dart` | Modify | Wiring del clima en el composition root |

### Raíz

| Archivo | Acción | Qué |
|---|---|---|
| `.env.example` | Modify | + `EXTERNAL_HTTP_TIMEOUT_MS=8000` en la sección backend (design §2.10); sin `PORT` |

## 5. Migración / Rollout

- **Drift 3 → 4** (aditiva, no destructiva — tabla nueva, ningún dato existente se toca):

```dart
if (from < 4) {
  await m.createTable(weatherCache);
}
```

- **Backend**: **sin migración Prisma**. No hay delta para `schema.prisma`: el sprint no agrega modelos ni columnas. Tampoco hay migración de datos ni backfill.
- **Rollout aditivo**: la capa saliente nace apagada en el sentido de que solo la activan sus cuatro rutas nuevas; ninguna ruta existente cambia de contrato. **Ningún comportamiento existente se modifica**: el sprint es estrictamente aditivo, porque el default de `PORT` de `main.ts` no se toca (el puerto es configuración local de cada entorno).
- **Reversión**: quitar los tres módulos de `app.module.ts` deja el backend exactamente como estaba (más las dependencias huérfanas `cheerio`). En web, borrar `src/components/weather/` y la llamada en `dashboard/page.tsx`. En móvil, des-cablear la tarjeta en `main.dart` y dejar `WeatherCache` vacía.

## 6. Preguntas abiertas

- [ ] ¿Open-Meteo gratuito (no comercial) es aceptable a largo plazo o hay que presupuestar un plan pago si el proyecto se comercializa?
- [ ] Umbral exacto que activa el fallback de precipitación cuando la cobertura del radar RainViewer es pobre sobre la zona objetivo (`coverageWarning` es una heurística a definir en apply).
- [ ] ¿Se agrega `lat`/`lon` a `Farm` para que el fallback "por campo" no dependa de que exista algún lote con polígono?
- [ ] Selección del lote en el móvil para la tarjeta (lote de la tarea/parte del día vs. último seleccionado vs. lote por defecto de la firma).
- [ ] Formato real de `Lot.coords` en datos de producción: el parser tolera GeoJSON `Polygon` y array de pares, pero conviene confirmarlo con datos reales antes de confiar en el centroide.
- [ ] ¿`GET /exchange-rate/usd` y `GET /grain-prices` deben admitir un modo público sin JWT para widgets de terceros?
- [ ] ¿El histórico de cotizaciones (`api.argentinadatos.com`, ~3 MB) se adopta en un sprint de Finanzas para gráficos, o se descarta?
- [ ] Verificar los peers de `leaflet` bajo React 19 / Next 16 en apply; si aparece fricción, **ya** se decidió el camino sin `react-leaflet`.
