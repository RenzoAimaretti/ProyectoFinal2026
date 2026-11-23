# Finanzas Multi-Firma — facturación, cobros, cheques físicos y eCheqs

Sprint 4 / Fase 4. Alcance: contabilidad aislada por `Company` (firma), facturación de tareas del cliente, cobros facturados e informales, cheques físicos y eCheqs con conciliación. La cotización USD se consume del módulo `integrations/exchange-rate` que vive en `origin/APIs`.

Rama: `feat/finanzas-multifirma`, cortada de `dev` @ `23c4660`. PR contra `dev`.

## Specs

### S1 — Emisión e ingreso de facturas por cliente (R026)

> El sistema DEBE permitir que el administrativo emita e ingrese las facturas vinculadas a las tareas de cada cliente para llevar el control contable de los servicios prestados.

- GIVEN un administrativo autenticado
- WHEN emite e ingresa una factura vinculada a tareas de un cliente
- THEN el sistema registra la factura para el control contable

### S2 — Clasificación de cobros en facturados e informales (R027)

> El sistema DEBE diferenciar que el administrativo clasifique los cobros e ingresos en facturados e informales para mantener una contabilidad financiera real y ordenada.

- GIVEN un cobro o ingreso recibido
- WHEN el administrativo lo clasifica como facturado o informal
- THEN el sistema lo registra en su categoría correspondiente

### S3 — Control de cheques físicos (R028)

> El sistema DEBE permitir que el administrativo cargue y controle el flujo de cheques físicos (número, vencimiento, emisor) para evitar la pérdida o el traspaso involuntario de valores.

- GIVEN un cheque físico recibido
- WHEN el administrativo lo carga con número, vencimiento y emisor
- THEN el sistema controla el flujo y alerta eventos del mismo

### S4 — Conciliación de cheques electrónicos (R029)

> El sistema DEBE permitir que el administrativo gestione y concilie cheques electrónicos (eCheqs) para evitar omisiones en las fechas de acreditación o débito.

- GIVEN un eCheq emitido o recibido
- WHEN el administrativo gestiona su conciliación
- THEN el sistema evita omisiones en fechas de acreditación o débito

Decisión del cliente: R029 queda **dentro** del alcance, completo (registro + conciliación). Ver `L5`.

### S5 — Cotización del dólar del día en operaciones (R030)

> El sistema DEBE aplicar la cotización del dólar (Banco Nación) del día a cada operación financiera para calcular el valor real en pesos de los servicios convenidos.

- GIVEN una operación financiera de un servicio convenido
- WHEN se calcula su valor
- THEN el sistema aplica la cotización del dólar Banco Nación del día

La cotización se obtiene de `ExchangeRateProviderPort.fetchOfficialUsd()` (`packages/backend/src/integrations/exchange-rate/application/exchange-rate.ports.ts` en `origin/APIs`), que consume `dolarapi.com` variante "oficial". No se scrapea el sitio del BNA. Ver `L4`.

### S6 — Contabilidades aisladas por firma (R033)

> El sistema DEBE mantener contabilidades aisladas por cada firma o razón social para evitar el solapamiento de balances entre entidades del mismo grupo.

- GIVEN múltiples firmas dentro del grupo
- WHEN el sistema registra operaciones financieras
- THEN el sistema mantiene contabilidades separadas por firma o razón social

Decisión del cliente: `Company` es la firma; cada Company lleva su propia contabilidad. Ver `L3`. En este repo `firma` **no** significa firma criptográfica ni co-aprobación de varias personas.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | Modelo Prisma: `Invoice`, `InvoiceItem`, `Payment`, `Cheque`, `Echeq` + enums + migración; FK a `Company`/`Client`/`Task` | S1-S6 | inline | bbd1044 |
| T2 | Módulo hexagonal `invoice`: dominio (totales, transiciones), puertos, casos de uso, controller `@Roles`, scope por `firmaId` | S1, S6 | inline | — |
| T3 | Cobros: `Payment` facturado/informal, método, imputación a factura, cotización del día vía el módulo de integraciones | S2, S5 | inline | b598a60 |
| T4 | Cheques físicos: alta con número/vencimiento/emisor y máquina de estados (en cartera → depositado → cobrado / rechazado / endosado) | S3, S6 | inline | cf2b565 |
| T5 | eCheqs: registro emitido/recibido, fecha de acreditación/débito, conciliación y bandeja de pendientes | S4, S6 | inline | 1abf645 |
| T6 | UI Next.js `/dashboard/finanzas`: vistas de facturas, cheques y bandeja de eCheqs con conciliar/rechazar (slice de lectura + acciones) | S1, S3, S4 | inline | 8befb93 |
| T6b | UI Next.js: formularios de alta de factura y de cheque | S1, S3 | inline | 89478db |
| T6c | Sección de cobros en la UI | S2, S5 | inline | 024dd79 |
| T7 | Picker de tarea para los conceptos de factura: lote → tarea encadenados | S1 | inline | 0a011d2 |
| T8 | Vincular cheque/eCheq a un cobro con validación de firma y de método | S3, S4, S6 | inline | 484ac99 |

## Fuera de alcance

- R031 (indexación en kilos de cereal) y R032 (rentabilidad por lote): son la tarea hermana "Calculadora de Rentabilidad por Lote & Indexación a Cereal".
- R034 (exportación contable): el formato no está definido (`spec.md:101`).
- Co-firma criptográfica de varias personas: no está en ningún requisito del spec ni en CUU09.
- Retenciones impositivas: no aparecen en el spec.

## Log

**L1 — Pedido original del usuario (verbatim).**

> conectate al MCP de notion y busca la tarea que vamos a trabajar en este sprint https://app.notion.com/p/M-dulo-Multi-Firma-Facturaci-n-Control-de-Cheques-eCheqs-3c15961aad4681ff89b8c4b98ad44adc?v=4e3c495931864171855483e9d64d9476&source=copy_link
>
> Realizemos una exploracion de la tarea y planeemos como llevarla a cabo, la tarea por si sola no explica demasiado

**L2 — Exploración.** La página de Notion está en blanco: solo propiedades (Sprint 4, Fase 4, responsable Renzo, 17–25/11/2026, estado "Sin empezar"). Los requisitos reales están en `doc/specs/finanzas-administracion/spec.md` (R026–R034) y `doc/casos-de-uso/CUU09-registrar-facturacion-cobro.md`. No existía ninguna entidad financiera en `schema.prisma` ni en migraciones: el módulo es greenfield.

**L3 — Decisión del usuario (alcance "multi-firma").**

> vamos con A, cada Company/firma tiene su propia contabilidad.

**L4 — Corrección al usuario y decisión sobre la cotización.**

> Respecto a la tarea de ignacio, usemos el scraper que el implemento

Corrección: no hay scraper del BNA. Lo que Ignacio implementó es `dolarapi.exchange-rate.provider.ts`, un cliente HTTP de `dolarapi.com` ("oficial"), con puerto `ExchangeRateProviderPort`. Y no está en `dev`: vive solo en `origin/APIs`. Consulta de cotización del día: usar ese módulo cuando esté mergeado.

**L5 — Decisión del usuario (R029).**

> Dentro, completo: registro + conciliación

**L6 — Decisión del usuario (integración de `origin/APIs`).**

> Ignacio lo mergea a dev primero

Consecuencia: T3 queda bloqueada hasta que el merge aterrice en `dev`; T1, T2, T4, T5 y T6 no dependen de ella.

**L7 — Entorno de base de datos.** `docker compose up` falla: `freeclub-db` (otro proyecto) ocupa `0.0.0.0:5432`. Resolución sin tocar el compose ni el otro proyecto: contenedor `proyecto-final-postgres-dev` en `localhost:5434`, y `DATABASE_URL` inyectada por comando. Verificación de T1: 18 migraciones aplicadas sobre base limpia, `migrate status` al día y cero drift (`migrate diff --from-config-datasource --to-schema` vacío).

**L8 — T2 implementado.** Módulo `invoice` por un worker; el worker no pudo correr build ni lint (restricción de superficies), así que el padre corrió `nest build` (verde) y `eslint --fix` más dos correcciones a mano en los specs (`require-await` en fakes, `no-unsafe-assignment` en una aserción). Suite del módulo: 5 suites / 13 tests.

**L9 — Verificación independiente de T2 y T4 (risk item 2: frontera de permisos entre firmas).** Veredicto: S3 PASS, S6 FAIL. Causa: el alta de cheque aceptaba `paymentId` desde el body sin validarlo, y en el schema `companyId` y `paymentId` son FKs independientes, así que un cheque de la firma B podía apuntar a un pago de la firma A. La instrucción original al worker era justamente aceptarlo sin validar: el defecto fue del padre. **Corrección:** el alta rechaza `paymentId` con `InvalidInputError` hasta que T3 pueda resolver el pago dentro de la firma; test agregado (`refuses linking a payment until payments are resolved within the firma`). El resto del aislamiento dio PASS: lecturas y listados con `companyId` en el WHERE, id de otra firma → 404 (no 403), y transición de estado con `updateMany` condicionado a `{ id, companyId, status: from }`.

**L10 — Smoke contra PostgreSQL real.** Script desechable fuera de `src/`, 10/10 asserts PASS: factura y cheque de la firma A invisibles para la firma B por id y por listado, visibles para A, listados cruzados vacíos, duplicado `[number, issuer]` mapeado a conflicto, y fixture revertido a cero filas. Scratch eliminado después. Nota: los lectores de `Client`/`Task` no filtran por `companyId` y eso es correcto, porque `Client` pertenece al tenant, no a la firma.

**L11 — Verificación de T5.** S6 PASS: todas las rutas toman la firma de `req.user.firmaId`, `findFirst`/`findMany`/`updateMany` filtran por `companyId`, la escritura de conciliación es condicional al estado y `paymentId` se rechaza. S4: el verificador marcó FAIL por `new Date()` en `echeq/adapters/outbound/system-clock.ts:6-7`. **Hallazgo rechazado con evidencia**: los cinco adaptadores de reloj del repo (`daily-report`, `invoice`, `machine-activity`, `reception`) hacen exactamente `return new Date()`. El adapter es la frontera con el tiempo real; el defecto sería `new Date()` en dominio o aplicación, y la bandeja recibe el reloj por puerto. El criterio mal escrito era del padre, no un defecto del código.

**L12 — T6 dividido.** La UI de `/dashboard/finanzas` entró como slice de lectura más acciones (commit `8befb93`): facturas, cheques con sus transiciones, y la bandeja de eCheqs con conciliar/rechazar. Los formularios de alta van a T6b y la sección de cobros a T6c, que depende de T3. Verificado: build de Next.js verde con `/dashboard/finanzas` prerenderizada y `eslint` limpio en el archivo nuevo; el error de lint en `components/ui/reveal.tsx` es preexistente (último cambio `97c84a9`, diff cero).

**L13 — T6b cerrado (`89478db`).** Formularios de alta de factura y de cheque integrados en la pantalla existente; el total lo calcula el backend y el 409 de cheque duplicado se muestra tal cual. Verificado: build de Next.js verde, `eslint` limpio en ambos archivos, 8/8 del suite de `node --test`. Dos límites conocidos, registrados a propósito: (1) el concepto de factura toma la tarea **por id**, porque este slice no agrega picker — T7; (2) ninguno de los endpoints financieros se ejercitó a nivel HTTP con el backend levantado, así que guards y DTOs están probados solo por unitarios con fakes.

**L14 — `dev` mergeado y T3 cerrado (`b598a60`).** El merge de `origin/dev` trajo `integrations/exchange-rate` y `integrations/grain-price`; el build falló al principio porque faltaba `pnpm install` (dependencia `cheerio` nueva). Módulo `payment` con clasificación facturado/informal, imputación a factura y cotización del día; migración aditiva `usdRate`/`usdRateDate` (20 migraciones, sin drift).

La verificación independiente encontró **dos defectos reales**, ambos corregidos:
1. **Concurrencia (S2)**: bajo `READ COMMITTED` dos cobros simultáneos agregaban sin verse, los dos quedaban cortos y la factura quedaba `EMITIDA` con el total cubierto. Cerrado con `SELECT ... FOR UPDATE` sobre la fila de la factura dentro de la transacción. **Reproducido y probado contra PostgreSQL**: con lock, dos corridas terminan `COBRADA` con 110 cobrados sobre 100; sin lock (copia del adapter sin la línea), una corrida termina `EMITIDA` con 110 cobrados. Control negativo incluido, no solo el caso feliz.
2. **Cotización vieja (S5)**: el caché devuelve la cotización previa marcada `stale` cuando el proveedor falla, y el cobro la persistía como si fuera la del día. Ahora `stale` se descarta y queda `null` explícito. Test agregado.

**L15 — Decisión de producto pendiente de confirmación.** Política adoptada ante caída del proveedor de cotización: el cobro se registra igual con `usdRate = null`, en vez de rechazarse. Razón: perder el registro de plata que entró por una API caída es peor que un campo vacío explícito. La alternativa dura (rechazar el cobro) queda a un cambio de una línea si el cliente prefiere lo contrario.

**L16 — T8 y T6c cerrados (`484ac99`, `024dd79`).** El guard de `paymentId` en cheque y eCheq se reemplazó por validación real: el pago tiene que existir dentro de la firma y el método tiene que corresponder (cheque→`CHEQUE`, eCheq→`ECHEQ`). Cada módulo tiene su propio port de lectura de pagos con adapter Prisma scopeado por `companyId`; ninguno importa las entrañas del módulo `payment`. En la UI, la sección de cobros lista con filtro por tipo y muestra `usdRate` nulo como **"sin cotización"**, para no fingir un dato que no existe. Verificado: build verde, eslint limpio, **155 suites / 1442 tests**, y build de Next.js con `/dashboard/finanzas` prerenderizada.

**L17 — T7 cerrado (`0a011d2`), alternativa B elegida por el cliente.** El campo "Tarea (opcional)" que pedía un UUID se reemplazó por dos selects encadenados: lote del cliente de la factura y, dentro de ese lote, sus tareas rotuladas por tipo de labor. Los lotes se rotulan con su campo para que dos "Lote 7" de campos distintos no se confundan, que es exactamente el error que el cambio previene. Cambiar el cliente limpia lote y tarea de todas las líneas; cambiar el lote limpia su tarea. Antes de enviar se valida que la tarea pertenezca al lote de su propia línea. Sin backend nuevo: `GET /farms`, `/lots`, `/tasks` y `/labor-types` ya existían y la cadena cliente→campo→lote→tarea se resuelve del lado del front. Verificado: build de Next.js verde con `/dashboard/finanzas` prerenderizada, `eslint` limpio y 8/8 del suite de `node --test`.
