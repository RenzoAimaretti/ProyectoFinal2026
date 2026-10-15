# Delta Spec — Sprint 3: APIs Externas (Clima, Radar de Lluvia, Dólar y Pizarra de Cereales)

**Change:** `sprint3-apis-externas`
**Alcance:** primera capa de integración saliente del backend (Open-Meteo, RainViewer, `dolarapi.com` y pizarra BCR), sus cuatro endpoints, la cache con TTL por fuente, la degradación a `stale`, y los dos consumidores (dashboard Next.js y móvil Flutter). Ninguna tabla nueva; nada se persiste server-side.

## Purpose

Exponer datos externos normalizados —clima actual y pronóstico, viento en nudos, radar de lluvia, cotización oficial del dólar y pizarra de cereales— a través de una API propia que cachea por fuente con TTL y degrada con gracia. El backend es el único que habla con el exterior; Next.js y Flutter consumen solo la API propia. Cubre R003, R004, R005 y R006, y expone el dato de entrada de R030 y R031 sin aplicarlo a ninguna operación financiera (Sprint 4). Deja **R011 fuera de alcance** por requerir un snapshot persistido.

## Requirements

### Requirement: R-EXT-01 — Clima actual y pronóstico en tiempo real (A1)

El sistema DEBE presentar datos meteorológicos actuales y pronósticos climáticos para planificar las jornadas laborales (R003). El backend DEBE obtenerlos de Open-Meteo y DEBE exponerlos tanto en la variante por coordenadas como en la variante por lote. El pronóstico DEBE incluir la serie horaria de viento y precipitación y el pronóstico diario de 7 días en la zona horaria `America/Argentina/Cordoba`.

#### Scenario: Consulta de clima por coordenadas

- GIVEN un usuario autenticado y el backend con `OPEN-METEO` alcanzable
- WHEN consulta `GET /weather/current?lat=-33.13&lon=-61.00`
- THEN el sistema responde la temperatura actual, la serie horaria de viento y precipitación, y el pronóstico diario de 7 días
- AND la respuesta incluye `source`, `location`, `stale` y `fetchedAt`

#### Scenario: Consulta de clima por lote

- GIVEN un usuario autenticado con un lote de su tenant que tiene coordenadas cargadas
- WHEN consulta `GET /lots/:lotId/weather`
- THEN el sistema responde el clima para la ubicación resuelta de ese lote
- AND `location.resolvedFrom` indica el origen de la resolución

### Requirement: R-EXT-02 — Viento en nudos y dirección (A2)

El sistema DEBE permitir controlar la velocidad y la dirección del viento **en nudos** para validar las condiciones regulatorias antes de fumigar (R005). El proveedor DEBE solicitar el viento en nudos de forma nativa (`wind_speed_unit=kn`) y DEBE exponer tanto la velocidad como la dirección en grados.

#### Scenario: Validación de condiciones antes de fumigar

- GIVEN un operario o contratista previo a una fumigación
- WHEN consulta el clima de la ubicación de trabajo
- THEN el sistema presenta la velocidad del viento en nudos y su dirección en grados
- AND ambos valores están disponibles sin conversión en el cliente

### Requirement: R-EXT-03 — Radar de lluvia con fallback de precipitación (A3)

El sistema DEBE alertar sobre radares de lluvia para anticipar interrupciones por tormentas (R004). El backend DEBE exponer los frames del radar público de RainViewer y la plantilla de tiles para que el cliente los consuma directamente, NO DEBE proxear los tiles, y DEBE registrar explícitamente cuándo la cobertura del compuesto sobre la zona objetivo es imperfecta. Cuando la cobertura sea insuficiente, el sistema DEBE poder satisfacer R004 con la precipitación y la probabilidad de precipitación de Open-Meteo.

#### Scenario: Frames de radar disponibles

- GIVEN el backend con RainViewer alcanzable
- WHEN el cliente consulta el clima
- THEN el sistema responde `host`, los frames del radar y una plantilla de tile con la forma `<host><path>/256/{z}/{x}/{y}/2/1_1.png`

#### Scenario: Cobertura de radar pobre sobre la zona objetivo

- GIVEN una ubicación cuya cobertura de radar es insuficiente
- WHEN el sistema arma la respuesta de clima
- THEN marca la advertencia de cobertura
- AND la precipitación y la probabilidad de precipitación de Open-Meteo quedan disponibles como información de reemplazo

### Requirement: R-EXT-04 — Resolución de ubicación por lote con fallback al campo (A4)

El sistema DEBE resolver la ubicación meteorológica por lote calculando el **centroide** de `Lot.coords`. Cuando el lote no tiene polígono DEBE intentar resolverla por el campo del lote, y DEBE exponer además una variante por coordenadas explícitas. El parser de coordenadas NO DEBE asumir un único formato y DEBE rechazar un polígono inválido o vacío en lugar de devolver una ubicación inventada.

#### Scenario: Lote con polígono

- GIVEN un lote con `coords` cargadas
- WHEN el sistema resuelve su ubicación
- THEN usa el centroide del polígono como `lat`/`lon`
- AND `location.resolvedFrom` es `lot`

#### Scenario: Lote sin polígono

- GIVEN un lote cuya `coords` es nula o vacía
- WHEN el sistema resuelve su ubicación
- THEN intenta resolverla por el campo del lote
- AND marca `usedFarmFallback` cuando la resolución provino del campo

#### Scenario: Ubicación irresoluble

- GIVEN un lote sin polígono cuyo campo tampoco tiene ningún lote con coordenadas
- WHEN el sistema resuelve su ubicación
- THEN responde un error de entrada clara (400) en lugar de una ubicación arbitraria

### Requirement: R-EXT-05 — Cotización del dólar oficial (A5)

El sistema DEBE permitir consultar la cotización actualizada del dólar oficial para la toma de decisiones comerciales (R006) y DEBE exponer la cotización del **Banco Nación** del día (R030) desde una fuente externa gratuita. El sistema NO DEBE aplicar la cotización a ninguna operación financiera en este sprint: solo la expone.

#### Scenario: Consulta de la cotización del dólar oficial

- GIVEN un usuario autenticado
- WHEN consulta `GET /exchange-rate/usd`
- THEN el sistema responde la casa `oficial`, el nombre, la compra, la venta y la fecha de actualización de la fuente
- AND la respuesta incluye `source`, `stale` y `fetchedAt`

### Requirement: R-EXT-06 — Pizarra de cereales (A6)

El sistema DEBE permitir consultar la pizarra de cereales actualizada para la toma de decisiones comerciales (R006) y DEBE exponer el dato de entrada que la indexación en kilos de cereal necesita (R031). La fuente DEBE ser la pizarra de la Cámara Arbitral de Cereales BCR, y la respuesta DEBE incluir Trigo, Maíz, Girasol, Soja y Sorgo en pesos por tonelada y en dólares por tonelada, más la cotización usada para la conversión y la fecha de la pizarra. El sistema NO DEBE hacer la conversión a kilos de cereal en este sprint.

#### Scenario: Consulta de la pizarra

- GIVEN un usuario autenticado y la pizarra de BCR alcanzable
- WHEN consulta `GET /grain-prices`
- THEN el sistema responde Trigo, Maíz, Girasol, Soja y Sorgo con sus precios por tonelada en pesos y en dólares
- AND informa la fecha de la pizarra y la cotización usada para la conversión

#### Scenario: Markup de la fuente cambió

- GIVEN que el proveedor cambió el markup de la pizarra y el parser ya no reconoce las filas
- WHEN el sistema procesa la respuesta
- THEN responde un error de gateway (502) en lugar de devolver precios en cero

### Requirement: R-EXT-07 — Cache con TTL por fuente y refresco lazy (A7)

El sistema DEBE cachear en memoria el resultado de cada fuente con un TTL propio — clima 15 minutos, dólar 30 minutos y pizarra 24 horas — y DEBE refrescar el valor de forma **lazy**, únicamente cuando llega una consulta con el TTL vencido. El sistema NO DEBE usar Redis ni un planificador. Cada fuente DEBE tener una clave de cache propia y un modo de fallo independiente.

#### Scenario: TTL vigente no consulta al proveedor

- GIVEN un valor de clima cacheado hace menos de 15 minutos
- WHEN el cliente consulta el clima
- THEN el sistema responde desde la cache
- AND no se realiza ninguna llamada al proveedor externo

#### Scenario: TTL vencido refresca

- GIVEN un valor de clima cacheado hace más de 15 minutos
- WHEN el cliente consulta el clima
- THEN el sistema consulta al proveedor y actualiza la cache
- AND la respuesta indica `stale: false` y el nuevo `fetchedAt`

#### Scenario: Independencia entre fuentes

- GIVEN que la fuente de la pizarra está caída
- WHEN el cliente consulta el clima y el dólar
- THEN ambas consultas responden con normalidad

### Requirement: R-EXT-08 — Degradación con último valor marcado como stale (A8)

Ante un fallo del proveedor externo, el sistema DEBE responder el último valor cacheado marcado con `stale: true` y su `fetchedAt`, en lugar de fallar, siempre que exista un valor previo. Si nunca hubo valor, DEBE responder un error claro (503 cuando el proveedor estuvo inalcanzable, 502 cuando respondió mal). El sistema NO DEBE presentar un valor viejo como fresco.

#### Scenario: Proveedor caído con valor previo

- GIVEN un valor de dólar cacheado y el proveedor inaccesible
- WHEN el cliente consulta la cotización
- THEN el sistema responde el último valor con `stale: true` y su `fetchedAt`
- AND no expone el error del proveedor al cliente

#### Scenario: Proveedor caído sin valor previo

- GIVEN que nunca se obtuvo un valor de la fuente
- WHEN el cliente consulta esa fuente
- THEN el sistema responde un error claro de servicio no disponible o de gateway

### Requirement: R-EXT-09 — Autenticación y scope multi-tenant (A9)

Todos los endpoints nuevos DEBEN exigir un JWT válido. La consulta de clima por lote DEBE resolver el lote dentro del tenant del caller, derivando el scope del token y NO de datos enviados por el cliente. Un lote inexistente o de otro tenant DEBE responder 404. Las consultas de dólar y de pizarra son datos de mercado globales y NO DEBEN scopearse por tenant, pero SÍ DEBEN exigir JWT.

#### Scenario: Lote de otro tenant

- GIVEN un lote que pertenece a otro tenant
- WHEN el caller consulta `GET /lots/:lotId/weather`
- THEN el sistema responde 404 sin revelar la existencia del lote

#### Scenario: Endpoint sin token

- GIVEN una request sin `Authorization: Bearer`
- WHEN invoca cualquiera de los cuatro endpoints nuevos
- THEN el sistema responde 401

#### Scenario: Dato global compartido

- GIVEN dos usuarios de tenants distintos
- WHEN ambos consultan `GET /exchange-rate/usd`
- THEN ambos reciben la misma cotización, sin filtrado por tenant

### Requirement: R-EXT-10 — Salida HTTP con timeout y sin API keys (A10)

Toda llamada saliente DEBE usar un timeout explícito que cancele la request (`AbortController`). El sistema NO DEBE requerir API key para ninguna de las fuentes (Open-Meteo, RainViewer, dolarapi.com y la pizarra BCR son gratuitas y sin clave). El timeout DEBE ser configurable por entorno con un valor por defecto, y una variable de entorno inválida DEBE hacer fallar el arranque de forma ruidosa.

#### Scenario: Proveedor que no responde

- GIVEN un proveedor que no responde antes del timeout configurado
- WHEN el sistema consulta al proveedor
- THEN la request se cancela y el sistema aplica la degradación de R-EXT-08

#### Scenario: Configuración inválida

- GIVEN `EXTERNAL_HTTP_TIMEOUT_MS` con un valor no numérico o no positivo
- WHEN el backend arranca
- THEN falla de forma explícita en lugar de asumir un valor silencioso

### Requirement: R-EXT-11 — Consumidor web: widgets y mapa (A11)

El dashboard web DEBE presentar el bloque de widgets superiores de la Visión §5.1 —Clima local, Radar de Lluvia, Dirección/Velocidad del viento, Dólar Banco Nación y Pizarra de Cereales— alimentado solo por la API propia. El mapa DEBE ser propio (Leaflet) con una capa de viento y el overlay del radar, y DEBE cargarse solo en el cliente. Cada widget DEBE indicar cuándo el dato está `stale`.

#### Scenario: Bloque de widgets visible

- GIVEN un usuario autenticado en el Dashboard General
- WHEN carga la página
- THEN ve los widgets de clima, viento, radar, dólar y pizarra con datos de la API propia

#### Scenario: Mapa con capa de viento y radar

- GIVEN el widget de mapa renderizado en el navegador
- WHEN el usuario lo observa
- THEN ve un mapa interactivo con la capa de viento y el overlay del radar sobre la ubicación consultada

#### Scenario: Dato degradado visible

- GIVEN que el backend respondió con `stale: true`
- WHEN el widget renderiza
- THEN indica que el dato no es fresco e informa su `fetchedAt`

### Requirement: R-EXT-12 — Consumidor móvil: tarjeta con cache local (A12)

El móvil DEBE presentar una tarjeta de clima y viento —con la velocidad en nudos y la dirección— alimentada por la API propia. La última lectura DEBE quedar cacheada localmente con su timestamp y DEBE poder mostrarse sin señal. Los widgets NO DEBEN instanciar repositorios ni servicios: el cableado vive en el composition root.

#### Scenario: Tarjeta con señal

- GIVEN un operario autenticado con conectividad
- WHEN abre el dashboard
- THEN ve la tarjeta de clima/viento con datos frescos y el timestamp de la lectura

#### Scenario: Tarjeta sin señal

- GIVEN un operario sin conectividad que ya había obtenido una lectura antes
- WHEN abre el dashboard
- THEN ve la última lectura cacheada localmente junto a su timestamp

### Requirement: R-EXT-13 — Pruebas con fixtures reales capturados (A13)

Las pruebas del backend DEBEN usar **fixtures con payloads y HTML reales capturados** de cada fuente, y NO DEBEN depender de la red. El parser de la pizarra DEBE estar cubierto por una prueba contra su fixture HTML, de modo que un cambio de markup falle de forma explícita. La lógica de TTL y de degradación DEBE ser testeable mediante un reloj inyectable. El paquete Next.js NO DEBE recibir un framework de tests en este sprint.

#### Scenario: Fixture de pizarra

- GIVEN el fixture HTML real de la pizarra guardado en el repositorio
- WHEN corre la suite del parser
- THEN valida los cinco granos, los precios en pesos y en dólares, la cotización de conversión y la fecha

#### Scenario: TTL con reloj inyectable

- GIVEN un `ClockPort` falso que puede avanzar en el tiempo
- WHEN la suite evalúa una lectura cacheada antes y después de su TTL
- THEN verifica que solo la lectura con TTL vencido consulta al proveedor

## Pendientes / Fuera de alcance

- **R011** (registrar las condiciones climáticas del momento de la pulverización): **no cubierto**. Exige persistir un snapshot y este sprint no persiste nada server-side. Es el próximo paso natural una vez que exista una decisión de almacenamiento.
- **R030** queda **parcialmente cubierto**: se expone la cotización del Banco Nación, pero aplicarla a una operación financiera pertenece al Sprint 4 (no existe modelo financiero).
- **R031** queda cubierto **solo en su dato de entrada**: se expone la pizarra; la conversión a kilos de cereal pertenece al Sprint 4.
- **Windy** queda fuera: descartado por su key de testing con respuestas modificadas, su costo (990 €/año) y sus términos que prohíben el almacenamiento a largo plazo de sus datos.
- Sin tablas nuevas ni migración Prisma; sin Redis ni scheduler; sin `@nestjs/config`.
- Sin framework de tests en `packages/nextjs`.
- Histórico de cotizaciones (`api.argentinadatos.com`, ~3 MB) fuera de alcance; opción futura para gráficos.
- `packages/web` (scaffold Flutter ajeno) no se toca.
