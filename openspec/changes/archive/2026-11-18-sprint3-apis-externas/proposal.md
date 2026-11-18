# Proposal — Sprint 3: APIs Externas (Clima, Radar de Lluvia, Dólar y Pizarra de Cereales)

## Intent

Introducir la primera capa de **integración saliente** del backend: consultar fuentes externas públicas por HTTP, normalizarlas y exponerlas en endpoints propios, para alimentar el bloque de **widgets superiores** del dashboard definido en Visión §5.1 y una **tarjeta de clima/viento** en el móvil. Las tres fuentes de datos elegidas (**Open-Meteo**, **RainViewer** y **dolarapi.com**) y la **pizarra de la Cámara Arbitral de Cereales BCR** son **gratuitas y no requieren API key**, lo que permite cerrar R003, R004, R005 y R006, y exponer el dato de entrada de R030/R031, sin costo operativo ni secretos que administrar. El backend es el único dueño de las llamadas, la cache, los timeouts y la normalización; Next.js y Flutter consumen exclusivamente la API propia.

## Scope

Responsable: **Ignacio — Dev 1 (Mobile & Sync)**, según el Roadmap & Gantt de Sprint 3.

### En alcance

- Primera capa de integración saliente del backend: tres hexágonos nuevos (`weather`, `exchange-rate`, `grain-price`) bajo `packages/backend/src/integrations/`, más un núcleo compartido (`integrations/shared`) con puerto HTTP saliente, cache in-memory con TTL y `ClockPort`.
- Fuente meteorológica **Open-Meteo** (actual + horaria + pronóstico diario de 7 días), con el viento **en nudos** nativo (`wind_speed_unit=kn`), que satisface R005 literalmente.
- Radar de lluvia **RainViewer** (tiles públicos sin key) y **fallback** a la precipitación de Open-Meteo para R004.
- **Pizarra de cereales BCR** (scraping HTML) — reemplaza a "Pizarra AGD" del roadmap original.
- **Cotización del dólar oficial (Banco Nación)** vía `dolarapi.com`.
- Endpoints nuevos protegidos con `JwtAuthGuard`: `GET /weather/current?lat=&lon=`, `GET /lots/:lotId/weather`, `GET /exchange-rate/usd`, `GET /grain-prices`.
- Resolución de ubicación **por lote** (centroide de `Lot.coords`) con **fallback al campo** cuando el lote no tiene polígono, y variante **por coordenadas** para el widget general del dashboard.
- Cache **in-memory con TTL por fuente** (clima 15 min, dólar 30 min, pizarra 24 h) con refresco **lazy** al vencer el TTL. Sin Redis ni scheduler.
- Degradación ante fallo upstream: se devuelve el **último valor cacheado marcado como `stale`** con `fetchedAt`; si nunca hubo valor, error claro.
- Bloque de widgets del dashboard Next.js + **mapa Leaflet propio** con capa de viento y radar RainViewer.
- Tarjeta de clima/viento en el móvil con **cache local en drift** y su timestamp (última lectura visible sin señal).
- Tests con **mocks y fixtures reales capturados**: Jest en backend, `MockClient` en Flutter. Fixture HTML obligatorio para la pizarra.

### Fuera de alcance

- **R011** (registro de las condiciones climáticas del momento de la pulverización): requiere **persistir un snapshot** y este sprint no persiste nada server-side. Se documenta como el próximo paso natural una vez que exista una decisión de almacenamiento.
- **Finanzas (Sprint 4)**: facturas, cobros, cheques/eCheqs y la **indexación en kilos de cereal** (R031 se cubre solo en su dato de entrada, la pizarra).
- **Windy**: evaluado y **descartado** del stack (ver Decisions 3).
- **Histórico** de cotizaciones (`api.argentinadatos.com`, ~3 MB): fuera de alcance; queda como opción para gráficos históricos en un sprint futuro.
- Capas de tiles de **Open-Meteo**: `tiles.open-meteo.com` fue sondeado y no devolvió metadata usable, por lo que no se promete ese servicio.
- Redis, scheduler, cron y `@nestjs/config`/`ConfigService`: no se introducen.
- Framework de tests en `packages/nextjs`: no se agrega en este sprint.
- **Alineación del puerto del backend**: `main.ts` queda como estaba (`process.env.PORT ?? 3000`) y `.env.example` no gana `PORT`. El puerto es configuración local de cada entorno, no una decisión del proyecto. El desalineamiento con los clientes (que apuntan a 3001) queda como riesgo abierto y se resuelve seteando `PORT` en el `.env` local.
- `packages/web`: scaffold Flutter ajeno al proyecto; se ignora.

## Approach

**Fase A — núcleo compartido de integración (backend).** `integrations/shared`: puerto `HttpClientPort` + adapter `FetchHttpClient` sobre `fetch` global con `AbortController` (timeout), puerto `CachePort` + adapter `InMemoryTtlCache` (con LRU acotado), `ClockPort` espejo del `system-clock` de `auth`, errores de integración (`UpstreamError`, `UpstreamUnavailableError`, `UpstreamParseError`) y el módulo compartido que cablea `HTTP_CLIENT`/`CACHE`/`CLOCK`. Nace de aquí toda la infraestructura saliente del repo, que hoy es inexistente.

**Fase B — módulos por fuente.** Cada módulo es un hexágono completo: `domain/` con tipos de negocio, `application/` con ports y use cases, `adapters/outbound/` con el cliente HTTP concreto. `weather` consulta Open-Meteo y RainViewer y resuelve la ubicación del lote; `exchange-rate` consulta `dolarapi.com`; `grain-price` descarga y parsea la pizarra BCR con `cheerio`. Cada use case aplica su política de TTL y su degradación a `stale`.

**Fase C — endpoints.** Un controller inbound por fuente, thin, que mapea query/params al input del use case y traduce errores a HTTP. El controller de clima por lote resuelve el lote **dentro del tenant del caller**.

**Fase D — consumidores.** En Next.js, DTOs y funciones en `src/api/client.ts` + un bloque de widgets superiores en el dashboard + un componente de mapa Leaflet cargado dinámicamente. En Flutter, modelo/repositorio/use case/API service + tabla `WeatherCache` en drift (migración aditiva) + tarjeta en el dashboard, con wiring en `main.dart`.

## Decisions

1. **La integración vive en el backend.** Mobile y web llaman solo a la API propia; el backend posee las llamadas, la cache, los timeouts y la normalización. Racional: los clientes no deben conocer formatos de terceros ni repetir lógica de fallback; Centralizar habilita cachear una sola vez. Tradeoff: el backend pasa a ser un punto de fallo para datos que antes no dependían de él, mitigado por la degradación a `stale`.
2. **Fuente meteorológica: Open-Meteo.** Gratuita, sin key, con viento **nativo en nudos** (`current_units.wind_speed_10m: "kn"`), serie horaria y pronóstico diario de 7 días con `timezone=America/Argentina/Cordoba`. Tradeoff: la capa gratuita está licenciada para uso **no comercial**; es un proyecto final universitario, pero comercializarlo exigiría plan pago o cambio de fuente.
3. **Windy descartado.** El endpoint existe (`POST https://api.windy.com/api/point-forecast/v2`), pero la key gratuita es de *testing* y sus respuestas vienen **barajadas/modificadas**, el plan profesional cuesta **990 €/año**, y sus términos **prohíben el almacenamiento a largo plazo** de los datos — lo que choca de frente con R011, que exige *registrar* las condiciones del momento de la pulverización. Tradeoff: se pierde el *branding* y la capa de viento "premium" del roadmap; Open-Meteo (datos) + un mapa Leaflet propio (visualización) cubren el widget y no crean deuda con un proveedor que prohíbe guardar sus datos.
4. **Radar: RainViewer + fallback de precipitación.** `GET https://api.rainviewer.com/public/weather-maps.json` devuelve `host` + frames `past[]`, y los tiles se arman como `<host><path>/256/{z}/{x}/{y}/2/1_1.png`. Gratuito y sin key. Tradeoff: es un **compuesto global** y su cobertura sobre Argentina es imperfecta; se registra la mitigación de caer a `precipitation` / `precipitation_probability_max` de Open-Meteo para satisfacer R004 cuando los tiles sean pobres en la zona objetivo.
5. **Pizarra: Cámara Arbitral de Cereales BCR en lugar de AGD.** La página `https://www.cac.bcr.com.ar/es/precios-de-pizarra` es alcanzable y publica la pizarra del día (Trigo, Maíz, Girasol, Soja, Sorgo en `$/Tn` y `US$/Tn`), la cotización BNA usada para la conversión y un timestamp. Evidencia de la sustitución: `https://www.agd.com.ar/` **no tiene página pública de pizarra** (`/pizarra` y `/cotizaciones` devuelven 404) y `https://portalmant.agd.com.ar/precios` está **detrás de login de cliente**; además `datos.magyp.gob.ar` es un portal CKAN y `package_search?q=pizarra` devolvió **0 resultados**, es decir **no existe API JSON oficial** para la pizarra diaria. Tradeoff: se depende de **scraping HTML** de un sitio que puede cambiar su markup, mitigado con parser robusto + fixture versionado.
6. **Dólar: `dolarapi.com`.** `GET https://dolarapi.com/v1/dolares/oficial` devuelve exactamente la cotización **Banco Nación** que pide R030 (`compra`/`venta` + `fechaActualizacion`), gratis y sin key. Tradeoff: es un tercero sin SLA ni contrato; por eso la respuesta propia siempre viaja con `source`, `fetchedAt` y `stale`.
7. **Parsing de la pizarra con `cheerio` + fixture HTML guardado.** Se comparó un parseo por regex/string contra un parser HTML pequeño: `cheerio` gana porque tolera cambios de whitespace y de estructura mejor que una regex, y porque permite escribir el test contra un **fixture real guardado**, de modo que un cambio de markup **falle fuerte** en lugar de devolver ceros silenciosos. Tradeoff: `cheerio` es la **única dependencia nueva del backend**.
8. **Ubicación por lote con fallback al campo, y variante por coordenadas.** Se calcula el **centroide** de `Lot.coords` (nullable, `String?`) y, si el lote no tiene polígono, se resuelve por el campo; además se expone una variante por `lat`/`lon` para el widget general. Tradeoff: `Farm.location` es `String?` y es un **nombre de texto, no coordenadas**, así que el fallback "por campo" no puede geolocalizar por sí solo y depende de que exista un polígono de algún lote de ese campo o de la variante por coordenadas.
9. **Cache in-memory con TTL, refresco lazy.** Un único `InMemoryTtlCache` compartido, con **claves y TTL por fuente** (clima 15 min, dólar 30 min, pizarra 24 h); al vencer el TTL se refresca en la próxima request. Sin Redis (hoy `ioredis` está declarado en `package.json` pero nunca se importa) y sin scheduler. Tradeoff: la cache se pierde al reiniciar y no se comparte entre instancias; aceptable en el despliegue actual y suficiente para el volumen de este sprint.
10. **Sin tablas nuevas, nada persistido server-side.** No hay delta en `schema.prisma`. Tradeoff: no hay histórico de clima ni de cotizaciones; queda explícitamente como espacio para un sprint futuro que decida el almacenamiento (y es la razón por la que R011 queda fuera de alcance).
11. **Degradación explícita.** Ante fallo upstream se responde el último valor cacheado con `stale: true` y `fetchedAt`; si nunca hubo valor, se responde un error claro. Racional: los widgets degradan con gracia (dato viejo es mejor que pantalla rota) sin mentir sobre la frescura. Tradeoff: el cliente **debe** mirar `stale` para no presentar un dato viejo como actual.
12. **Un endpoint por fuente.** `weather`, `exchange-rate` y `grain-prices` son rutas independientes, con claves de cache, TTL y modos de fallo independientes. Tradeoff: el cliente hace tres llamadas en lugar de una agregada, a cambio de que el fallo de una fuente no tumbe las otras dos.
13. **Sin API key en ninguna fuente.** Open-Meteo, RainViewer y dolarapi.com son gratuitos y keyless; la pizarra BCR es HTML público. Es el titular del sprint: no hay secretos nuevos que administrar ni rotar. Tradeoff: no hay SLA, cuota garantizada ni soporte de proveedor.
14. **Sin `@nestjs/config`.** El repo no lo tiene (`src/main.ts` hace `import 'dotenv/config'` y lee `process.env` directo). Las variables nuevas se leen con un helper guard estilo `requireJwtSecret()` y se documentan en el `.env.example` de la raíz. Tradeoff: se mantiene la consistencia del repo a costa de no tener validación centralizada de entorno.
15. **Scoping multi-tenant asimétrico.** `GET /lots/:lotId/weather` resuelve el lote **dentro del tenant del caller** (lote → campo → cliente → `tenantId`, conforme a `openspec/specs/multi-tenant-enforcement/spec.md`); `GET /exchange-rate/usd` y `GET /grain-prices` son **datos de mercado globales** y no se scopean por tenant, aunque sí exigen JWT. Tradeoff: las rutas globales son idénticas para todos los tenants (caché compartida, máxima eficiencia) pero no se pueden personalizar por firma.
16. **Consumidores: dashboard Next.js + móvil Flutter.** El widget general y el mapa van al dashboard; el móvil recibe una tarjeta de clima/viento para el trabajo a campo. Tradeoff: dos implementaciones de UI distintas sobre el mismo contrato, con el riesgo de divergir en la interpretación de `stale`.
17. **Tests con fixtures reales y sin framework nuevo en Next.js.** Jest en backend con payloads/HTML **realmente capturados**, `MockClient` en Flutter; Next.js no recibe framework de tests en este sprint. Tradeoff: el frontend web queda sin cobertura automatizada (verificación manual), que es el estado actual del paquete.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/backend/src/integrations/shared/**` | New | Puerto HTTP saliente, cache TTL in-memory, `ClockPort`, errores de integración y módulo compartido |
| `packages/backend/src/integrations/weather/**` | New | Hexágono de clima: Open-Meteo, RainViewer, resolución de ubicación por lote, use cases |
| `packages/backend/src/integrations/exchange-rate/**` | New | Hexágono del dólar oficial sobre `dolarapi.com` |
| `packages/backend/src/integrations/grain-price/**` | New | Hexágono de la pizarra BCR: provider HTTP + parser `cheerio` + fixture HTML |
| `packages/backend/src/app.module.ts` | Modified | Registrar `WeatherModule`, `ExchangeRateModule`, `GrainPriceModule` |
| `packages/backend/src/main.ts` | Unchanged | Se evaluó alinear el default de `PORT` a 3001; se descartó por ser configuración local (ver Fuera de alcance) |
| `packages/backend/package.json` | Modified | Dependencia nueva: `cheerio` |
| `.env.example` | Modified | Documentar `EXTERNAL_HTTP_TIMEOUT_MS` en la sección del backend (sin `PORT`, por ser configuración local) |
| `packages/nextjs/src/api/client.ts` | Modified | DTOs + `getWeather`, `getLotWeather`, `getUsdOfficial`, `getGrainPrices` |
| `packages/nextjs/src/components/weather/weather-widgets.tsx` | New | Widgets superiores: clima, viento, radar, dólar y pizarra |
| `packages/nextjs/src/components/weather/leaflet-map.tsx` | New | Mapa Leaflet propio (client-only, import dinámico) con capa de viento y radar |
| `packages/nextjs/src/app/dashboard/page.tsx` | Modified | Montar el bloque de widgets superiores (Visión §5.1) |
| `packages/nextjs/src/app/dashboard/mi-campo/page.tsx` | Modified | Retirar "Clima y heladas" de `ROADMAP_ITEMS` (ya disponible) |
| `packages/nextjs/package.json` | Modified | `leaflet` + `@types/leaflet` |
| `packages/mobile/lib/domain/models/weather_reading.dart` | New | Modelo de lectura meteorológica |
| `packages/mobile/lib/domain/repositories/weather_repository.dart` | New | Puerto de clima (cache-first) |
| `packages/mobile/lib/domain/usecases/get_weather_usecase.dart` | New | Orquestación cache local → remoto |
| `packages/mobile/lib/data/services/weather_api_service.dart` | New | HTTP contra la API propia (patrón `auth_api_service.dart`) |
| `packages/mobile/lib/data/services/tables/infra_tables.dart` | Modified | Tabla `WeatherCache` (lectura vigente + timestamp) |
| `packages/mobile/lib/data/services/daos/weather_cache_dao.dart` | New | DAO de la lectura vigente |
| `packages/mobile/lib/data/services/app_database.dart` | Modified | `schemaVersion` 3 → 4, migración aditiva y registro del DAO |
| `packages/mobile/lib/data/repositories/http_weather_repository.dart` | New | Adaptador remoto del puerto de clima |
| `packages/mobile/lib/data/repositories/drift_weather_cache_repository.dart` | New | Cache local drift del puerto de clima |
| `packages/mobile/lib/app/home/dashboard_view.dart` | Modified | Tarjeta de clima/viento con timestamp |
| `packages/mobile/lib/main.dart` | Modified | Wiring del clima (composition root) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mismatch de puerto: `main.ts` default 3000 vs 3001 en `api_config.dart` y `src/api/client.ts` | High | **Riesgo abierto y aceptado** (decisión del usuario: el puerto es configuración local). Mitigación operativa: setear `PORT=3001` en el `packages/backend/.env` de cada entorno; el sprint no toca `main.ts` ni documenta `PORT` en `.env.example` |
| Scraping de BCR frágil ante cambios de markup | High | `cheerio` + fixture HTML real versionado; el test falla fuerte en vez de devolver ceros |
| Cobertura pobre de RainViewer sobre Argentina | Med | Fallback documentado a `precipitation`/`precipitation_probability_max` de Open-Meteo (R004) |
| Open-Meteo free tier para uso no comercial | Med | Proyecto universitario sin fines de lucro; revisar términos antes de comercializar (open question) |
| `leaflet` necesita `window` y rompe el SSR de Next | Med | Componente cliente con `next/dynamic` y `ssr: false` |
| React 19 vs peers de `leaflet`/`react-leaflet` | Med | Usar `leaflet` vanilla (sin `react-leaflet`); validar peers en apply |
| `Lot.coords` con formato inesperado → centroide inválido | Med | Parser tolerante (GeoJSON Polygon y array de pares) + validación de rango lat/lon |
| Cache in-memory se pierde al reiniciar y no se comparte entre instancias | Low | Aceptable: refresco lazy + degradación a `stale`; Redis queda para un sprint futuro |
| Crecimiento sin límite de claves de cache por coordenada | Low | Redondeo de coordenadas a 2 decimales + LRU acotado en `InMemoryTtlCache` |
| Divergencia de interpretación de `stale` entre web y móvil | Low | `stale` y `fetchedAt` son parte del contrato (spec A8) y se muestran explícitamente en ambas UIs |

## Open Questions

- Open-Meteo gratuito es para uso **no comercial**: ¿alcanza la declaración de proyecto universitario o hay que planificar un plan pago antes de una eventual comercialización?
- ¿Cuál es la cobertura real de RainViewer sobre la zona objetivo? Definir el umbral (¿precipitación pronosticada > 0? ¿tiles vacíos?) que fuerza el fallback de precipitación en la UI.
- `Farm.location` es texto libre, no coordenadas: ¿se agrega `lat`/`lon` a `Farm` en un sprint futuro para que el fallback "por campo" sea geolocalizable sin depender de los lotes?
- ¿Qué lote usa el móvil para la tarjeta de clima (el lote de la tarea/parte del día, el último seleccionado, o un lote por defecto de la firma)?
- ¿`GET /exchange-rate/usd` debe poder consultarse sin JWT para un widget público, o se mantiene protegido como el resto?
- Formato real de `Lot.coords` en datos de producción (¿GeoJSON `Polygon` o array de pares `[[lat,lon],…]`?): el parser debe tolerar ambos, pero conviene confirmarlo con datos reales.
- ¿El histórico de cotizaciones (`api.argentinadatos.com/v1/cotizaciones/dolares/`, ~3 MB) entra en un sprint de Finanzas para gráficos, o queda descartado?

## Rollback Plan

Todo el sprint es **aditivo y aislado**: revertir equivale a (1) quitar `WeatherModule`, `ExchangeRateModule` y `GrainPriceModule` de `app.module.ts` — los tres endpoints desaparecen y **ninguna ruta existente cambia**; (2) revertir los widgets y el mapa en `packages/nextjs` (borrar `components/weather/` y la llamada en `dashboard/page.tsx`); (3) des-cablear la tarjeta en `main.dart` y, si se quiere limpiar, mantener la tabla `WeatherCache` vacía (la migración drift es aditiva y no destructiva). No hay migración Prisma que revertir y no hay tablas nuevas que dropear. El `cheerio` y `leaflet` quedan como dependencias huérfanas si se revierte el código, removibles sin impacto.

## Dependencies

- Backend NestJS 11 corriendo con `JWT_SECRET` configurado (ya requerido).
- **Ninguna API key**: Open-Meteo, RainViewer y `dolarapi.com` son gratuitos y keyless.
- Dependencia nueva del backend: **`cheerio`** (parsing HTML de la pizarra BCR). Es la **única** dependencia nueva del backend.
- Dependencias nuevas del frontend web: **`leaflet`** (+ `@types/leaflet`); `react-leaflet` queda evaluado pero no adoptado por defecto.
- Sin dependencias nuevas en `packages/mobile` (usa `package:http` y `drift`, ya presentes).
- Node con `fetch` global disponible: no hace falta cliente HTTP adicional en el backend.
- `docker-compose.yml` sigue teniendo solo PostgreSQL (no se necesita Redis).

## Success Criteria

- [ ] `GET /weather/current?lat=&lon=` devuelve temperatura, viento **en nudos** y dirección, pronóstico horario y diario de 7 días, y los frames del radar.
- [ ] `GET /lots/:lotId/weather` resuelve el centroide de `Lot.coords` y cae al campo cuando el lote no tiene polígono; un lote de otro tenant responde 404.
- [ ] `GET /exchange-rate/usd` devuelve la cotización oficial (compra/venta + `fechaActualizacion`) de `dolarapi.com`.
- [ ] `GET /grain-prices` devuelve Trigo, Maíz, Girasol, Soja y Sorgo en `$/Tn` y `US$/Tn` desde la pizarra BCR.
- [ ] La cache respeta los TTL por fuente (15 min / 30 min / 24 h) y solo refresca cuando vencen.
- [ ] Con una fuente caída, la respuesta es el último valor con `stale: true` y `fetchedAt`; sin valor previo, error claro.
- [ ] Los cuatro endpoints exigen JWT; `GET /lots/:lotId/weather` respeta el scope de tenant.
- [ ] El dashboard web muestra el bloque de widgets superiores con mapa Leaflet, capa de viento y radar.
- [ ] El móvil muestra la tarjeta de clima/viento con timestamp y la conserva visible sin señal (cache drift).
- [ ] Tests verdes: Jest backend con fixtures reales, `flutter test` en móvil; `flutter analyze` sin errores.
- [ ] El backend arranca en el puerto configurado localmente (`PORT` en `packages/backend/.env`) y los cuatro endpoints responden desde ahí.

## Artifacts

- `design.md`, `spec.md`, `tasks.md` (fases siguientes).
