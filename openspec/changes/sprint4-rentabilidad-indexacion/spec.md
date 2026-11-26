# Delta Spec — Sprint 4: Calculadora de Rentabilidad por Lote & Indexación a Cereal

**Change:** `sprint4-rentabilidad-indexacion`
**Alcance:** tarifario por firma y labor con indexación a kilos de cereal, valorización de partes diarios aprobados (snapshot y "valor a hoy"), gastos manuales por lote con flujo de sugerencias, y calculadora de rentabilidad por lote y campaña; backend NestJS + Prisma y la sección web `/dashboard/finanzas`. Móvil sin cambios. Modelos nuevos y migración aditiva.

## Purpose

Permitir que el dueño de una firma conozca el **margen bruto y la rentabilidad de cada lote y de cada campaña**, cruzando el trabajo aprobado (valorizado con un tarifario propio, indexable a kilos de cereal) contra los costos operativos (costo estándar por labor + gastos manuales). Cubre R030 (dólar BNA del día) y R031 (indexación en kilos de cereal) **aplicados** sobre los datos de entrada del Sprint 3, R032 (rentabilidad por lote/campaña) y R033 (contabilidades aisladas por firma). Deriva de CUU05, cuya aprobación "genera costos para el cálculo de rentabilidad (R032)" y que dejaba pendiente "confirmar el origen del costo por parte (tarifario por firma)"; este change resuelve ese pendiente con un tarifario por firma. CUU09 (facturación/cobro) queda fuera.

## Requirements

### Requirement: R-FIN-01 — Tarifario por firma y tipo de labor (R031, R032, CUU05)

El sistema DEBE permitir a un ADMIN definir **una tarifa por par firma (`companyId`) + tipo de labor (`laborTypeId`)**. Cada tarifa DEBE contener un **precio** y un **costo estándar**, ambos obligatorios (el valor 0 es válido y representa una decisión consciente). El sistema NO DEBE permitir dos tarifas para el mismo par. El sistema NO DEBE soportar precio por cliente en este sprint. La firma DEBE derivarse del token (`req.user.firmaId`), nunca del body ni del query. Las tarifas se editan **sin versionado**: editar una tarifa solo afecta valorizaciones futuras.

#### Scenario: Alta de tarifa

- GIVEN un ADMIN autenticado y un tipo de labor del tenant
- WHEN guarda una tarifa con precio y costo estándar completos para ese tipo de labor
- THEN el sistema persiste la tarifa asociada a su firma de sesión
- AND una segunda alta para el mismo par actualiza la tarifa existente en lugar de crear otra

#### Scenario: Precio o costo faltante

- GIVEN un ADMIN que envía una tarifa sin precio o sin costo estándar
- WHEN el sistema valida la entrada
- THEN responde 400 y no persiste nada

#### Scenario: Precio 0 explícito

- GIVEN una tarifa para "Traslado" con precio 0 y un costo estándar positivo
- WHEN el ADMIN la guarda
- THEN el sistema la acepta

#### Scenario: Edición no retroactiva

- GIVEN un parte ya valorizado con una tarifa
- WHEN el ADMIN edita luego esa tarifa
- THEN el snapshot del parte conserva los importes aplicados originalmente

### Requirement: R-FIN-02 — Moneda y base del precio y del costo estándar (R031)

El **precio** y el **costo estándar** de una tarifa DEBEN tener, cada uno, su propia **base** (`POR_HECTAREA` o `POR_HORA`) y su propia **moneda**: `ARS`, `USD` o kilos de uno de los cinco granos de la pizarra (`TRIGO`, `MAIZ`, `GIRASOL`, `SOJA`, `SORGO`). El grano DEBE ser obligatorio cuando la moneda es kilos de cereal y NO DEBE enviarse en otro caso. Se DEBE multiplicar por `DailyReport.hectares` (base `POR_HECTAREA`) o `DailyReport.hours` (base `POR_HORA`; horas de jornada del operario, no horas máquina). El sistema NO DEBE soportar tarifas por viaje o por unidad. Se acepta que un parte con horas y 0 hectáreas pueda generar costo sin ingreso (precio y costo tienen bases independientes).

#### Scenario: Precio en kg de soja por hectárea y costo en ARS por hora

- GIVEN una tarifa con precio 12 kg de `SOJA` `POR_HECTAREA` y costo 8000 `ARS` `POR_HORA`
- WHEN se valoriza un parte con 50 ha y 6 h
- THEN la cantidad pactada del ingreso es 600 kg de soja
- AND el costo es 48000 ARS

#### Scenario: Kg sin grano

- GIVEN un ADMIN que envía una moneda en kilos de cereal sin grano
- WHEN el sistema valida
- THEN responde 400

#### Scenario: Grano con moneda ARS

- GIVEN un ADMIN que envía grano junto con la moneda `ARS`
- WHEN el sistema valida
- THEN responde 400

### Requirement: R-FIN-03 — Política única de tasa y conversión a ARS (R030, R031)

El sistema DEBE convertir toda cantidad a **ARS** para calcular el margen: los kilos de un grano con el **precio ARS por tonelada de la pizarra** (R031) dividido 1000 por kilo, y los USD con la cotización del dólar (R030). La tasa USD por defecto DEBE ser la cotización **oficial venta** de `GET /exchange-rate/usd`. La elección del tipo de tasa DEBE estar centralizada en **una única política de valuación**, de modo que cambiarla (oficial compra, o "TC BNA Divisas Comprador" de la pizarra) sea un cambio en un solo lugar. **Toda valorización DEBE registrar el tipo de tasa usado.** El sistema DEBE reutilizar `GetGrainPricesUseCase` y `GetUsdOfficialUseCase` (T4) y NO DEBE persistir un histórico de precios.

#### Scenario: Conversión de kg a ARS

- GIVEN la soja a 310000 ARS por tonelada en la pizarra
- WHEN se convierten 600 kg de soja
- THEN el resultado es 186000 ARS

#### Scenario: Conversión de USD a ARS

- GIVEN una cotización oficial venta de 1580
- WHEN se convierten 100 USD
- THEN el resultado es 158000 ARS
- AND la valorización registra el tipo de tasa `OFICIAL_VENTA`

#### Scenario: Cambio de política

- GIVEN la política configurada para otro tipo de tasa
- WHEN se valoriza un monto en USD
- THEN se usa la tasa de ese tipo y se registra el tipo correspondiente, sin tocar casos de uso ni adapters

#### Scenario: Grano sin precio ("S/C")

- GIVEN un grano cuyo precio ARS por tonelada es nulo en la pizarra
- WHEN se intenta convertir kilos de ese grano
- THEN el sistema informa "precio no disponible" para ese grano
- AND no inventa un valor ni usa 0

### Requirement: R-FIN-04 — Equivalente en kilos de cereal en la pantalla de tarifas (R031)

La pantalla de tarifas DEBE mostrar el **equivalente en kilos de un grano elegido** (por defecto soja) de los importes en ARS y USD de cada tarifa. La selección de grano DEBE ser exclusivamente de interfaz y NO DEBE persistirse. El cálculo DEBE usar la misma política de valuación que R-FIN-03.

#### Scenario: Equivalente por defecto

- GIVEN una tarifa de 186000 ARS por hectárea y soja a 310000 ARS por tonelada
- WHEN el ADMIN abre el Tarifario
- THEN ve el equivalente de 600 kg de soja por hectárea

#### Scenario: Cambio de grano en pantalla

- GIVEN el Tarifario abierto
- WHEN el ADMIN selecciona otro grano
- THEN los equivalentes se recalculan con el precio de ese grano
- AND no se escribe ninguna preferencia en el servidor

#### Scenario: Grano sin precio

- GIVEN un grano sin precio disponible
- WHEN el ADMIN lo selecciona
- THEN la pantalla muestra "—" para los equivalentes

### Requirement: R-FIN-05 — Snapshot de valorización al aprobar un parte (R030, R031, R032, CUU05)

Al aprobarse un parte diario, el sistema DEBE valorizarlo y persistir **un snapshot** con: el precio y el costo estándar aplicados (monto, moneda, grano y base), las cantidades pactadas en la unidad original (kg, USD o ARS), el precio por tonelada y/o la tasa usados con su fuente y tipo de tasa, el momento de obtención del precio, los resultados en **ARS** (ingreso y costo) y la fecha de valorización. La valorización DEBE ejecutarse **después** de que la transacción de aprobación (descuento de stock, R017) se confirme y **nunca dentro** de ella. El contrato del endpoint `POST /daily-reports/:id/approve` NO DEBE cambiar. Los **insumos** NO DEBEN formar parte del costo del lote.

#### Scenario: Aprobación con tarifa y precios disponibles

- GIVEN un parte pendiente cuya firma y labor tienen tarifa, y precios de mercado disponibles
- WHEN un ADMIN o SUPERVISOR lo aprueba
- THEN el parte queda `APROBADO` y se persiste el snapshot con ingreso y costo en ARS
- AND el snapshot registra el tipo de tasa, la fuente de precios y la fecha de valorización

#### Scenario: Tarifa solo en ARS

- GIVEN una tarifa con precio y costo en `ARS`
- WHEN se aprueba un parte
- THEN se valoriza sin consultar ningún precio de mercado

#### Scenario: Insumos fuera del costo

- GIVEN un parte aprobado que consumió insumos del cliente
- WHEN se valoriza
- THEN el costo del snapshot no incluye el valor de esos insumos

#### Scenario: Precio desactualizado de la cache (D26)

- GIVEN que la fuente de precios falla y existe un valor previo servido como `stale`
- WHEN se valoriza un parte o un gasto que necesita ese precio
- THEN el sistema valoriza con el último precio conocido
- AND la valorización registra `stale = true` y el momento de obtención del precio
- AND el detalle de la calculadora lo muestra como valorizado con un precio desactualizado y su fecha

### Requirement: R-FIN-06 — La valorización nunca bloquea la aprobación; partes "sin valorizar" (CUU05)

La valorización DEBE ser **best-effort**: cualquier error (sin tarifa, precio no disponible, proveedor caído, error de persistencia) NO DEBE hacer fallar la aprobación ni alterar su respuesta; DEBE registrarse en el log y el parte DEBE quedar **"sin valorizar"**. Un parte queda sin valorizar cuando su firma+labor no tiene tarifa o cuando el precio o la tasa que la tarifa requiere no está disponible (grano "S/C", proveedor caído sin cache). La valorización de un parte es **todo o nada**: si el precio o el costo no se pueden resolver, no se persiste un snapshot parcial.

#### Scenario: Aprobación sin tarifa

- GIVEN un parte pendiente cuya firma y labor no tienen tarifa
- WHEN se aprueba
- THEN la aprobación responde exitosamente con el parte `APROBADO`
- AND el parte queda sin valorizar

#### Scenario: Proveedor caído sin cache

- GIVEN una tarifa en USD y el proveedor de dólar inaccesible sin valor previo
- WHEN se aprueba un parte
- THEN la aprobación responde exitosamente
- AND no se persiste un snapshot parcial

#### Scenario: Fallo del propio gancho de valorización

- GIVEN un error inesperado dentro de la valorización
- WHEN se aprueba un parte
- THEN el error se registra en el log
- AND el cliente recibe la misma respuesta que sin este sprint

### Requirement: R-FIN-07 — Reintento de valorizaciones pendientes e idempotencia (CUU05)

El sistema DEBE reintentar la valorización de partes aprobados sin snapshot (a) al **guardar una tarifa**, para los partes pendientes de esa firma y labor, y (b) al **abrir la calculadora**, para los pendientes de la firma. NO DEBE existir un scheduler ni un script de backfill: los partes anteriores a este sprint se cubren con el mismo reintento. Una valorización tardía DEBE usar los precios del día en que finalmente se valoriza, registrar esa fecha y quedar **marcada como valorización tardía**. DEBE existir **exactamente una valorización por parte diario** garantizada por unicidad en la base de datos, de modo que reintentos concurrentes sean idempotentes. La calculadora DEBE informar cuántos partes y cuántas hectáreas siguen sin valorizar.

#### Scenario: Tarifa cargada después de aprobar

- GIVEN tres partes aprobados sin valorizar de una firma y labor
- WHEN el ADMIN guarda la tarifa de ese par
- THEN los tres partes se valorizan con los precios de ese día
- AND cada snapshot queda marcado como valorización tardía con su fecha

#### Scenario: Reintentos concurrentes

- GIVEN dos reintentos simultáneos sobre el mismo parte
- WHEN ambos intentan persistir el snapshot
- THEN existe una única valorización para ese parte
- AND ninguno de los dos reintentos falla

#### Scenario: Partes anteriores al sprint

- GIVEN partes aprobados antes de este sprint
- WHEN se abre la calculadora y hay tarifa para su firma y labor
- THEN se valorizan en ese reintento sin ejecutar ningún script adicional

#### Scenario: Pendientes visibles

- GIVEN partes aprobados que siguen sin valorizar tras el reintento
- WHEN se muestra la calculadora
- THEN se informa la cantidad de partes y de hectáreas sin valorizar

### Requirement: R-FIN-08 — Valor a hoy (R031, R032)

El sistema DEBE ofrecer, además del snapshot, una valorización **"a valor de hoy"** que toma la **cantidad pactada** del snapshot (kg de grano o USD) y la multiplica por el precio o la tasa **vigentes hoy**. Los importes pactados en ARS NO DEBEN ajustarse (sin inflación ni fuente de ajuste), por lo que son iguales en ambas valorizaciones. El valor a hoy DEBE aplicarse al ingreso, al costo estándar del snapshot y a los gastos manuales. Los montos en USD DEBEN revalorizarse con el tipo de tasa de la **política vigente hoy**, no con el que registró el snapshot (D28), para que toda la columna use un único criterio y sus totales sean sumables. Si el precio de hoy no está disponible para algún componente, el sistema DEBE responder un error claro para el modo "a valor de hoy" y NO DEBE mezclar valores.

#### Scenario: Revalorización de kg

- GIVEN un snapshot con 600 kg de soja pactados al aprobar a 310000 ARS por tonelada
- WHEN hoy la soja cotiza 330000 ARS por tonelada
- THEN el valor a hoy del ingreso es 198000 ARS
- AND el snapshot original no se modifica

#### Scenario: Monto en ARS

- GIVEN un snapshot con costo de 48000 ARS
- WHEN se calcula el valor a hoy
- THEN el costo sigue siendo 48000 ARS

#### Scenario: Cambio de política de tasa (D28)

- GIVEN un snapshot de 1000 USD valorizado con `OFICIAL_VENTA` a 1530
- AND la política vigente pasó a `OFICIAL_COMPRA`, que hoy cotiza 1500
- WHEN se calcula el valor a hoy
- THEN el resultado es 1500000 ARS
- AND el snapshot conserva 1530000 ARS y su tipo de tasa original

#### Scenario: Mercado no disponible

- GIVEN el proveedor de precios inaccesible sin cache
- WHEN se pide la calculadora en modo "a valor de hoy"
- THEN el sistema responde un error de servicio no disponible
- AND el modo "al aprobar" sigue respondiendo con normalidad

### Requirement: R-FIN-09 — Categorías de gasto (R032)

El sistema DEBE gestionar **categorías de gasto** con las reglas de `InputCategory`: compartidas por todas las firmas del tenant, **nombre único por tenant**, gestionadas por ADMIN y SUPERVISOR, con un flag `active` para retirar una categoría, y **borrado rechazado con 409** cuando está en uso por algún gasto. El seed DEBE cargar: Combustible, Reparación, Mantenimiento, Flete, Mano de obra y Otros.

#### Scenario: Nombre duplicado

- GIVEN una categoría "Flete" en el tenant
- WHEN un usuario crea otra "Flete"
- THEN el sistema responde 409

#### Scenario: Borrado de categoría en uso

- GIVEN una categoría con gastos asociados
- WHEN un ADMIN intenta borrarla
- THEN el sistema responde 409 y la categoría se mantiene
- AND puede marcarla como inactiva

#### Scenario: Categoría inactiva

- GIVEN una categoría inactiva
- WHEN se crea un gasto nuevo
- THEN la categoría inactiva no se acepta
- AND los gastos existentes que la usan se conservan

### Requirement: R-FIN-10 — Gastos manuales por lote (R032)

El sistema DEBE permitir registrar **gastos manuales** imputados a **exactamente un lote**, con fecha, categoría, descripción libre y un monto en `ARS`, `USD` o kilos de uno de los cinco granos (mismo objeto `Money` y servicio de valuación que las tarifas). El gasto DEBE valorizarse en ARS con los precios del **día de carga**, registrando monto, moneda, grano, precio/tasa usados, fuente, tipo de tasa y fecha de valorización; DEBE revalorizarse "a valor de hoy" según R-FIN-08. Un gasto compartido entre lotes DEBE cargarse partido a mano: NO existe tabla de prorrateo. Los gastos DEBEN guardar `createdBy` y `updatedBy` y pertenecer a la firma de sesión. El lote DEBE pertenecer al tenant del caller. **D25:** si el gasto es USD o kg y el precio no está disponible al cargarlo, el sistema lo rechaza con error de servicio no disponible (no hay reintento posterior, a diferencia de los partes).

#### Scenario: Gasto en ARS

- GIVEN un SUPERVISOR autenticado y un lote del tenant
- WHEN carga un gasto de 90000 ARS de categoría "Flete"
- THEN el sistema lo persiste imputado a ese lote y a su firma, con `createdBy`

#### Scenario: Gasto en kg de grano

- GIVEN un gasto de 300 kg de `MAIZ` con el maíz a 195000 ARS por tonelada
- WHEN se guarda
- THEN el sistema persiste el monto en ARS equivalente (58500)
- AND registra el precio usado, su fuente y la fecha de valorización

#### Scenario: Lote de otro tenant

- GIVEN un lote que pertenece a otro tenant
- WHEN se intenta cargar un gasto sobre ese lote
- THEN el sistema responde 404 sin revelar su existencia

#### Scenario: Resumen de confirmación previo (D24)

- GIVEN el formulario de gasto completo
- WHEN el usuario pide guardar
- THEN el sistema muestra un resumen con la valorización en ARS antes de confirmar
- AND no persiste nada hasta la confirmación

#### Scenario: Precio no disponible al cargar (D25)

- GIVEN un gasto en USD y la cotización inaccesible sin valor previo
- WHEN se intenta guardar
- THEN el sistema responde un error de servicio no disponible y no persiste el gasto
- AND el aviso indica reintentar en unos minutos o cargar el gasto en ARS

### Requirement: R-FIN-11 — Edición y baja de gastos; sugerencias del supervisor (R032)

El **ADMIN** DEBE poder editar y borrar gastos directamente. El **SUPERVISOR** DEBE poder crear gastos pero NO DEBE poder editarlos ni borrarlos directamente: toda modificación posterior —incluso de un gasto que él acaba de crear— DEBE ser una **sugerencia** de edición o de baja que el ADMIN aprueba o rechaza. Las sugerencias DEBEN copiar las reglas del parte diario: estados `PENDIENTE`, `APROBADA`, `RECHAZADA`; el rechazo DEBE exigir un motivo; una sugerencia resuelta es **final**. DEBE haber **a lo sumo una sugerencia pendiente por gasto**. El ADMIN NO DEBE poder editar ni borrar directamente un gasto con una sugerencia pendiente (debe resolverla primero). Hasta que se apruebe, el gasto cuenta con su valor actual. El SUPERVISOR DEBE ver el estado y el motivo de rechazo de **sus** sugerencias. Al editar (directo o por sugerencia aprobada) el gasto se revaloriza con los precios del día **solo si cambian monto, moneda o grano**; cambiar lote, fecha, categoría o descripción conserva la valorización original. DEBEN guardarse `updatedBy` y, en la sugerencia, quién la propuso y quién la resolvió.

#### Scenario: El supervisor sugiere una edición

- GIVEN un gasto de la firma sin sugerencias pendientes
- WHEN un SUPERVISOR envía una sugerencia de edición
- THEN la sugerencia queda `PENDIENTE` y el gasto no cambia
- AND el gasto sigue contando con su valor actual

#### Scenario: Supervisor intenta editar directo

- GIVEN un SUPERVISOR autenticado
- WHEN invoca la edición o el borrado directo de un gasto
- THEN el sistema responde 403

#### Scenario: Segunda sugerencia con una pendiente

- GIVEN un gasto con una sugerencia `PENDIENTE`
- WHEN se envía otra sugerencia sobre el mismo gasto
- THEN el sistema responde 409

#### Scenario: ADMIN con sugerencia pendiente

- GIVEN un gasto con una sugerencia `PENDIENTE`
- WHEN un ADMIN intenta editarlo o borrarlo directamente
- THEN el sistema responde 409 indicando que primero debe resolver la sugerencia

#### Scenario: Aprobación de la sugerencia

- GIVEN una sugerencia de edición `PENDIENTE` que cambia el monto
- WHEN el ADMIN la aprueba
- THEN el gasto adopta los valores propuestos y se revaloriza con los precios de ese día
- AND la sugerencia queda `APROBADA` y final

#### Scenario: Edición que no cambia monto, moneda ni grano

- GIVEN una sugerencia aprobada que solo cambia la categoría
- WHEN se aplica
- THEN el gasto conserva su valorización original

#### Scenario: Rechazo sin motivo

- GIVEN una sugerencia `PENDIENTE`
- WHEN el ADMIN la rechaza sin motivo
- THEN el sistema responde 400 y la sugerencia sigue `PENDIENTE`

#### Scenario: Sugerencia resuelta es final

- GIVEN una sugerencia `APROBADA` o `RECHAZADA`
- WHEN se intenta aprobarla o rechazarla otra vez
- THEN el sistema responde 409

#### Scenario: Visibilidad para el supervisor

- GIVEN un SUPERVISOR con sugerencias rechazadas
- WHEN consulta sus sugerencias
- THEN ve el estado y el motivo de rechazo de las suyas
- AND no ve las de otros supervisores

#### Scenario: Baja aprobada visible para el supervisor

- GIVEN una sugerencia de baja de un SUPERVISOR
- WHEN el ADMIN la aprueba
- THEN el gasto queda dado de baja (lógica) y deja de contar en la calculadora
- AND el SUPERVISOR sigue viendo su sugerencia como `APROBADA`

### Requirement: R-FIN-12 — Campaña agrícola y rango personalizado (R032)

El sistema DEBE ofrecer un selector de **campaña agrícola "AAAA/AA"** que cubre **del 1 de julio al 30 de junio** (la campaña `2025/26` es 2025-07-01 a 2026-06-30), y además un **rango personalizado** desde/hasta. NO existe un modelo `Campaign`. La inclusión DEBE decidirse por `DailyReport.date` y por la fecha del gasto, sobre días calendario completos e inclusivos en ambos extremos, en la zona horaria `America/Argentina/Cordoba`. Se acepta que labores de borde puedan caer en la campaña anterior salvo que se use el rango personalizado. Un identificador de campaña inválido DEBE responder 400.

#### Scenario: Campaña 2025/26

- GIVEN el identificador de campaña `2025/26`
- WHEN el sistema resuelve el rango
- THEN el rango es 2025-07-01 a 2026-06-30 inclusive

#### Scenario: Identificador inconsistente

- GIVEN el identificador `2025/28`
- WHEN el sistema valida
- THEN responde 400 (el sufijo debe ser el año siguiente)

#### Scenario: Rango personalizado

- GIVEN un rango desde 2026-01-01 hasta 2026-03-31
- WHEN se consulta la calculadora
- THEN solo se incluyen partes y gastos con fecha dentro del rango

#### Scenario: Rango invertido

- GIVEN un rango con `desde` posterior a `hasta`
- WHEN el sistema valida
- THEN responde 400

### Requirement: R-FIN-13 — Calculadora de rentabilidad por lote: ingresos, costos y métricas (R032, CUU05)

El sistema DEBE calcular, por lote y para el rango pedido, el **ingreso** (suma de los ingresos en ARS de los partes aprobados valorizados), el **costo** (costo estándar de esos partes más los gastos manuales del lote) y las métricas: **margen bruto** = ingreso − costo; **margen bruto por hectárea** = margen bruto / `Lot.area` (la superficie del lote, no las hectáreas trabajadas); **rentabilidad** = margen bruto / costo total, que DEBE presentarse como "—" cuando el costo total es 0. Los resultados DEBEN estar disponibles en ambas valorizaciones: `AL_APROBAR` (snapshot) y `A_VALOR_HOY` (R-FIN-08). Se DEBE devolver también una **fila de totales de la firma**. La tabla DEBE listar **solo los lotes con actividad de la firma en el rango**: partes valorizados, partes pendientes de valorizar o gastos vigentes (D27); un lote sin nada de eso NO DEBE aparecer. **Registro de la desviación:** R032 se cubre con **ingreso devengado**, no con "ingresos cobrados" (D1); el sistema NO DEBE modelar cobranzas en este sprint.

#### Scenario: Margen y rentabilidad de un lote

- GIVEN un lote de 100 ha con ingreso de 600000, costo estándar de 150000 y gastos manuales de 50000 ARS
- WHEN se consulta la calculadora en modo `AL_APROBAR`
- THEN el margen bruto es 400000
- AND el margen por hectárea es 4000
- AND la rentabilidad es 2 (200 %)

#### Scenario: Lote sin actividad en el rango (D27)

- GIVEN un lote del tenant sin partes ni gastos de la firma en el rango
- WHEN se consulta la calculadora
- THEN ese lote no aparece en la tabla ni suma a los totales

#### Scenario: Costo total cero

- GIVEN un lote con ingreso pero costo total 0
- WHEN se calculan las métricas
- THEN el margen bruto se calcula con normalidad
- AND la rentabilidad se presenta como "—"

#### Scenario: Costo sin ingreso

- GIVEN un parte con horas y 0 hectáreas con precio `POR_HECTAREA` y costo `POR_HORA`
- WHEN se valoriza y se calcula
- THEN el lote muestra costo sin ingreso y margen bruto negativo

#### Scenario: Totales de firma

- GIVEN varios lotes de la firma con resultados
- WHEN se consulta la lista
- THEN la fila de totales suma ingresos, costos y margen, y calcula las métricas sobre esas sumas

#### Scenario: Ambas valorizaciones

- GIVEN el mismo rango consultado en los dos modos
- WHEN se comparan las respuestas
- THEN los importes pactados en ARS coinciden
- AND difieren solo los componentes en kg o USD

### Requirement: R-FIN-14 — Detalle de lote y partes sin valorizar (R032)

El sistema DEBE exponer el **detalle de un lote**: partes valorizados (labor, fecha, cantidad, tarifa aplicada, ingreso, costo estándar), gastos agrupados por categoría y partes **pendientes** (aprobados sin valorizar) con su cantidad y hectáreas. El detalle DEBE respetar el mismo rango y modo que la lista.

#### Scenario: Detalle completo

- GIVEN un lote con partes valorizados, gastos y partes pendientes
- WHEN el ADMIN abre el detalle
- THEN ve cada parte con labor, fecha, cantidad, tarifa aplicada, ingreso y costo estándar
- AND ve los gastos agrupados por categoría con su subtotal
- AND ve los partes pendientes y sus hectáreas

#### Scenario: Lote de otra firma

- GIVEN un lote sin partes ni gastos de la firma de sesión
- WHEN se pide su detalle
- THEN el detalle no contiene datos de otras firmas

### Requirement: R-FIN-15 — Aislamiento por firma y roles (R033, CUU05)

Todos los endpoints nuevos DEBEN exigir JWT y DEBEN derivar la firma de `req.user.firmaId`; NO DEBEN aceptar `companyId` del body ni del query. La consolidación de grupo y el "selector de razón social" quedan **fuera de alcance**. DEBE aplicarse `@Roles` en **cada** endpoint (el gating de la web es solo de interfaz): **ADMIN** accede a tarifas, calculadora, gastos, categorías y a la bandeja de sugerencias; **SUPERVISOR** accede únicamente a gastos, categorías y a la creación y consulta de **sus** sugerencias, y NO DEBE acceder a tarifas ni a la calculadora. Los demás roles NO DEBEN acceder a ningún endpoint nuevo.

#### Scenario: Supervisor sin acceso a tarifas ni calculadora

- GIVEN un SUPERVISOR autenticado
- WHEN invoca cualquier endpoint de tarifas o de la calculadora
- THEN el sistema responde 403

#### Scenario: Operario sin acceso

- GIVEN un OPERARIO autenticado
- WHEN invoca cualquier endpoint nuevo
- THEN el sistema responde 403

#### Scenario: Sin token

- GIVEN una request sin `Authorization: Bearer`
- WHEN invoca cualquier endpoint nuevo
- THEN el sistema responde 401

#### Scenario: Firma enviada por el cliente

- GIVEN un `companyId` ajeno enviado en el body o en el query
- WHEN el sistema procesa la request
- THEN lo ignora y usa la firma del token

#### Scenario: Aislamiento entre firmas

- GIVEN dos firmas del mismo tenant con partes y gastos propios
- WHEN el ADMIN de una consulta la calculadora
- THEN solo ve datos de su firma

### Requirement: R-FIN-16 — Consumidor web: sección Finanzas (R030, R031, R032)

La sección `/dashboard/finanzas` DEBE reemplazar el `EmptyState` "Próximamente" por pestañas **Tarifario**, **Gastos**, **Categorías**, **Sugerencias** y **Calculadora**. El gating por pestaña DEBE ocultar al SUPERVISOR las pestañas Tarifario, Calculadora y la bandeja de aprobación, sin sustituir la autorización del backend. La calculadora DEBE incluir filtro de campaña, toggle "Al aprobar / A valor de hoy" (no columnas duplicadas), tabla ordenable (campo, cliente, superficie, ingreso, costo, margen bruto, margen/ha, rentabilidad) con fila de totales, y detalle al hacer clic en un lote. El formulario de gasto DEBE mostrar el resumen de confirmación de R-FIN-10. La web NO DEBE recibir un framework de tests nuevo; la lógica de cálculo y formato DEBE vivir en funciones puras testeables con `node:test`. El móvil NO se modifica.

#### Scenario: Pestañas para el ADMIN

- GIVEN un ADMIN en `/dashboard/finanzas`
- WHEN carga la página
- THEN ve las cinco pestañas

#### Scenario: Pestañas para el SUPERVISOR

- GIVEN un SUPERVISOR en `/dashboard/finanzas`
- WHEN carga la página
- THEN ve Gastos, Categorías y sus sugerencias
- AND no ve Tarifario ni Calculadora

#### Scenario: Ordenar la tabla

- GIVEN la tabla de la calculadora
- WHEN el ADMIN hace clic en el encabezado "Margen/ha"
- THEN las filas se ordenan por esa columna
- AND la fila de totales permanece fija

#### Scenario: Alternar valorización

- GIVEN la calculadora en "Al aprobar"
- WHEN el ADMIN alterna a "A valor de hoy"
- THEN la tabla muestra los importes de esa valorización
- AND no aparecen columnas duplicadas

### Requirement: R-FIN-17 — Pruebas y datos de demostración

El backend DEBE tener pruebas unitarias Jest de dominio y casos de uso con fakes in-memory, pruebas de controller por rol y un e2e **sin base de datos** (patrón `machine-report.e2e-spec.ts`, que sobrescribe `PrismaService` y `JwtAuthGuard`). La web DEBE probar las funciones puras con `node:test` en archivos `.mjs` (sin Jest/Vitest). El seed DEBE cargar las categorías de gasto y **tarifas de ejemplo** para las labores del seed (Pulverización, Fertilización, Siembra, Arranque de equipo, Traslado y Pesaje), de modo que la calculadora muestre números en una demo.

#### Scenario: E2E sin base de datos

- GIVEN el e2e con `PrismaService` y `JwtAuthGuard` sobrescritos
- WHEN corre la suite
- THEN valida rutas, roles y traducción de errores de los endpoints nuevos sin una base real

#### Scenario: Demo con datos

- GIVEN la base recién sembrada
- WHEN un ADMIN aprueba un parte y abre la calculadora
- THEN ve ingresos, costos y márgenes calculados con las tarifas de ejemplo

## Pendientes / Fuera de alcance

- **R032 con ingreso devengado**, no cobrado: desviación deliberada (D1). El camino futuro es agregar **cobranzas** (CUU09) encima, sin reemplazar el devengado.
- **Gastos generales de firma** (administración, seguros) prorrateados entre lotes: estacionado para discusión posterior.
- **Consolidación de grupo** y "selector de razón social" (Visión §5.1): change propio (cambian reglas de acceso).
- **Precios por cliente** (override opcional futuro) y tarifas por viaje/unidad (requieren un campo nuevo de captura móvil).
- **Histórico de precios e inflación**: el valor a hoy no ajusta pesos; no hay fuente de ajuste.
- **Costos reales de maquinaria** (combustible, mantenimiento): datos no capturados por móvil/web; el costo estándar de la tarifa los reemplaza.
- Campos propios/arrendados de la firma Eliggi; R026–R029 y R034; cambios en `packages/mobile`.
- **R030 y R031** quedan cubiertos con la política de tasa vigente (oficial venta, sujeta a cambio) y con la pizarra BCR; la tasa final está en Open Questions.
