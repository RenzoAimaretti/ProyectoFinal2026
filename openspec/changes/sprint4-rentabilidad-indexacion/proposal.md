# Proposal — Sprint 4: Calculadora de Rentabilidad por Lote & Indexación a Cereal

## Intent

Cerrar la brecha de **Finanzas** que el Sprint 3 dejó abierta: hoy el sistema sabe cuánto trabajo se aprobó (partes diarios, CUU05) y conoce la cotización del dólar y la pizarra de cereales (R030/R031 como dato de entrada), pero **no puede decir cuánto rinde cada lote**. Este sprint agrega, **solo en la web** (`/dashboard/finanzas`), cuatro capacidades encadenadas: (1) un **tarifario por firma y tipo de labor** con indexación a kilos de cereal (R031), (2) la **valorización** de cada parte aprobado con un snapshot de lo aplicado (R030, R032), (3) **gastos manuales por lote** con un flujo de sugerencia/aprobación para el supervisor, y (4) la **calculadora de rentabilidad por lote y campaña** (R032) con margen bruto, margen por hectárea y rentabilidad, aislada por firma (R033).

**Desviación deliberada de R032 (decisión D1):** el requisito original dice "cruzar los **ingresos cobrados** contra los costos operativos". Este sprint cubre R032 con **ingreso devengado** (partes aprobados valorizados con el tarifario de la firma), porque el sistema no tiene facturación ni cobros (CUU09). Si más adelante se exige ingreso cobrado, el camino es **agregar cobranzas encima** del devengado, nunca reemplazarlo.

## Scope

Responsable: por definir en el Roadmap & Gantt de Sprint 4. El trabajo se organiza en **cuatro unidades de trabajo** (una por bloque), cada una con sus pruebas y su documentación.

### En alcance

- **Unidad 1 — Tarifario + indexación (R030, R031).** Objeto de valor `Money` (`ARS` | `USD` | `KG_CEREAL` + grano), política única de tasa de valuación, puerto consumidor de precios sobre las integraciones del Sprint 3, modelo `Tariff` (una tarifa por firma + tipo de labor) con CRUD solo ADMIN, endpoint de equivalente en kg de cereal y pestaña **Tarifario** en la web con selector de grano.
- **Unidad 2 — Valorización de partes (R030, R031, R032, CUU05).** Modelo `DailyReportValuation` (snapshot por parte), gancho posterior a la aprobación (best-effort, nunca falla la aprobación), reintento de partes "sin valorizar" al guardar una tarifa y al abrir la calculadora, y cómputo de **"valor a hoy"**.
- **Unidad 3 — Gastos manuales por lote (R032).** `ExpenseCategory` (copia las reglas de `InputCategory`), `Expense` con valorización, flujo `ExpenseSuggestion` (el SUPERVISOR sugiere edición/baja, el ADMIN aprueba o rechaza) y pestañas web **Gastos**, **Categorías** y **Sugerencias** con resumen de confirmación previo al guardado.
- **Unidad 4 — Calculadora (R032, R033, CUU05).** Selector de campaña agrícola "AAAA/AA" (1 de julio al 30 de junio) y rango personalizado, endpoints de lectura (lista + detalle por lote), métricas (margen bruto, margen/ha de `Lot.area`, rentabilidad), pestaña web **Calculadora** con tabla ordenable, detalle por lote y toggle "Al aprobar / A valor de hoy", y datos de seed para la demo.
- Alcance **por firma de sesión** (`req.user.firmaId`), conforme a R033.
- Migración Prisma **aditiva** (tablas y enums nuevos), escrita a mano como las existentes.

### Fuera de alcance

- **CUU09 (facturación y cobro)** y todo ingreso **cobrado**: R032 se cubre con ingreso devengado (ver Intent).
- **Gastos generales de firma** (administración, seguros, otros gastos de estructura) prorrateados entre lotes: **estacionado** a pedido del usuario para una discusión posterior (ver Open Questions).
- Campos propios o arrendados de la firma Eliggi (el ingreso sería venta de granos, no servicios).
- **Histórico de precios e inflación**: el "valor a hoy" no ajusta los pesos; los importes en ARS son iguales en ambas valorizaciones.
- **Costos reales de maquinaria**: `MachineUsage.initialFuel/finalFuel` existen pero ni el móvil ni la web los capturan, el costo de compra de combustible es opcional y el mantenimiento es por máquina, no por lote (ver Decisions 10).
- **Precios por cliente** (futuro: override opcional) y tarifas **por viaje / por unidad** (requerirían un campo nuevo de captura móvil).
- **Consolidación de grupo** y "selector de razón social" (Visión §5.1): cambian reglas de acceso y van en su propio change.
- R026–R029 y R034 (resto de Finanzas/Administración).
- **Móvil**: no se toca (`packages/mobile`). `packages/web` es un scaffold ajeno y se ignora.
- Insumos como costo del lote (Recepción/Stock pertenecen al cliente, no a la firma).
- Framework de tests en `packages/nextjs` (se mantiene la decisión del Sprint 3).

## Approach

**Unidad 1 — Tarifario.** Se crea el núcleo de valuación (`Money`, política de tasa, puerto de precios de mercado) y el modelo `Tariff`. La tarifa guarda **precio** y **costo estándar**, cada uno con su moneda y su base (por hectárea / por hora), ambos obligatorios (0 permitido). La pantalla muestra el equivalente en kg de un grano elegido solo en UI.

**Unidad 2 — Valorización.** Tras confirmarse la aprobación de un parte (transacción de descuento de stock ya cerrada), un gancho invoca el caso de uso de valorización por un puerto. Si hay tarifa y los precios están disponibles, persiste un `DailyReportValuation` con todo lo aplicado; si no, el parte queda "sin valorizar". El reintento se dispara al guardar una tarifa y al abrir la calculadora (sin scheduler). Una restricción única por parte vuelve idempotentes los reintentos concurrentes.

**Unidad 3 — Gastos.** Categorías por tenant, gastos con una sola imputación a lote, valorizados con el mismo servicio que las tarifas. El ADMIN edita y borra directo; el SUPERVISOR crea, pero toda modificación posterior es una **sugerencia** que el ADMIN resuelve con las mismas reglas del parte diario (PENDIENTE → APROBADA/RECHAZADA, rechazo con motivo, estado final).

**Unidad 4 — Calculadora.** Un caso de uso de lectura agrega por lote ingresos y costos del rango pedido, en una de las dos valorizaciones, y calcula las métricas. La web consume la lista y el detalle.

## Decisions

Decisiones de producto acordadas con el usuario (2026-11-23), trazables a `spec.md`:

1. **D1 — Ingreso devengado.** Partes aprobados valorizados con el tarifario por firma; sin registro de cobranzas. Desviación explícita de R032 ("ingresos cobrados"). Tradeoff: la rentabilidad refleja lo trabajado, no lo cobrado; el camino a futuro es agregar cobranzas sobre el devengado.
2. **D2 — Base del precio.** `POR_HECTAREA` o `POR_HORA`; se multiplica por `DailyReport.hectares` o `DailyReport.hours` (horas de jornada del operario, no horas máquina). Por viaje/unidad queda fuera.
3. **D3 — Clave de tarifa.** Firma (`companyId`) + tipo de labor (`laborTypeId`); una tarifa por par. Sin precio por cliente.
4. **D4 — Moneda.** `ARS`, `USD` o kg de uno de los 5 granos de la pizarra (grano obligatorio en kg). El margen se calcula en ARS: kg con el precio ARS por tonelada de la pizarra (R031) y USD con la cotización del dólar (R030).
5. **D5 — Tasa USD.** Cotización `oficial` **venta** de `dolarapi.com`. **Probable de cambiar** (alternativas: oficial compra o "TC BNA Divisas Comprador" de la pizarra): por eso existe **una única política de tasa** y cada valorización registra qué tipo de tasa usó (Decisions técnicas T2).
6. **D6 — Equivalente en kg.** Selector de grano solo en la UI (default soja); no se persiste.
7. **D7 — Dos valorizaciones.** (a) **Snapshot al aprobar**: persiste lo aplicado y los resultados en ARS; corre **después** de que la transacción de aprobación se confirma y **nunca** hace fallar la aprobación. (b) **Valor a hoy**: la cantidad pactada del snapshot (kg o USD) por el precio de hoy; los ARS no se ajustan. Las tarifas se editan sin versionado porque el snapshot congela lo aplicado.
8. **D8 — Sin valorizar.** Parte sin tarifa o sin precio disponible queda "sin valorizar"; la aprobación nunca se bloquea. Reintento al guardar tarifa y al abrir la calculadora; se usa el precio del día en que finalmente se valoriza, con esa fecha registrada y marcada como **valorización tardía**. Cubre los partes anteriores al sprint sin script de backfill. Una valorización por parte (unicidad en BD).
9. **D9 — Alcance por firma.** Solo la firma de sesión (R033); la consolidación de grupo es otro change.
10. **D10 — Costo operativo del lote.** (a) **Costo estándar** por tarifa, congelado en el snapshot y revalorizado en "valor a hoy", más (b) **gastos manuales** por lote. Costos de maquinaria reales descartados (datos no capturados).
11. **D11 — Costo con moneda y base propias**, independientes del precio. Aceptado: un parte con horas y 0 ha puede generar costo sin ingreso.
12. **D12 — Precio y costo obligatorios** en toda tarifa; 0 permitido como decisión consciente (p. ej. precio 0 en Traslado).
13. **D13 — Gastos multimoneda.** ARS, USD o kg de grano con el mismo objeto `Money` y servicio de valuación; se valúan con los precios del día de carga y se revalorizan en "valor a hoy".
14. **D14 — Un gasto, un lote.** Los gastos compartidos se parten a mano; sin tabla de prorrateo.
15. **D15 — Categoría + descripción libre** por gasto.
16. **D16 — Categorías.** Copian `InputCategory`: compartidas por todas las firmas del tenant, nombre único por tenant, gestionadas por ADMIN y SUPERVISOR, borrado rechazado con 409 si están en uso, flag `active`. Seed: Combustible, Reparación, Mantenimiento, Flete, Mano de obra, Otros.
17. **D17 — Campaña.** Selector "AAAA/AA" (1/jul a 30/jun) + rango personalizado; sin modelo `Campaign`; inclusión por `DailyReport.date` y fecha del gasto. Aceptado: labores de borde pueden caer en la campaña anterior salvo que se use el rango personalizado.
18. **D18 — Solo web**, dentro de `/dashboard/finanzas`.
19. **D19 — Roles.** ADMIN: tarifas, calculadora, gastos, categorías y bandeja de sugerencias. SUPERVISOR: solo gastos y categorías. Precios y márgenes son información del dueño (precedente: costos consolidados de maquinaria, ADMIN-only). Gating por pestaña en la web **y** `@Roles` en cada endpoint.
20. **D20 — Métricas.** Margen bruto = ingreso − (costo estándar + gastos manuales); total y por hectárea de **`Lot.area`** (no hectáreas trabajadas). Rentabilidad = margen bruto / costo total, "—" si el costo es 0. Ambas valorizaciones las tienen.
21. **D21 — UI de la calculadora.** Filtro de campaña + toggle "Al aprobar / A valor de hoy" (no columnas duplicadas); tabla ordenable con fila de totales de la firma; detalle por lote con partes valorizados, gastos agrupados por categoría y partes pendientes.
22. **D22 — Edición/baja de gastos.** El ADMIN edita y borra directo; el SUPERVISOR solo **sugiere**. Se revaloriza el gasto con los precios del día solo si cambian monto, moneda o grano. Se guardan `createdBy`/`updatedBy`.
23. **D23 — Reglas de sugerencias.** Copian el parte diario: PENDIENTE → APROBADA/RECHAZADA, rechazo con motivo, resolución final; **una** sugerencia pendiente por gasto; el ADMIN no puede editar/borrar directo con una pendiente; hasta aprobarse, el gasto cuenta con su valor actual; el SUPERVISOR ve estado y motivo de sus sugerencias.
24. **D24 — Todo cambio del supervisor pasa por aprobación**, incluidos los gastos que acaba de crear; el formulario muestra un resumen de confirmación con la valorización en ARS antes de guardar.
25. **D25 — Gasto USD/kg sin precio al cargar.** Se rechaza con un aviso claro ("no hay cotización disponible; reintentar en unos minutos o cargarlo en ARS") y no se persiste. Todo gasto guardado tiene siempre su valor en ARS, y el resumen de confirmación (D24) siempre puede mostrarlo. Los gastos en ARS no dependen del mercado.
26. **D26 — Precio `stale` de la cache.** Se acepta para valorizar partes y gastos (misma degradación que R-EXT-08 del Sprint 3) y queda registrado: `stale = true` y el momento de obtención del precio. El detalle de la calculadora lo muestra como "valorizado con precio desactualizado" con su fecha. Tradeoff aceptado: si la fuente se cae varios días, se valoriza con un precio de varios días atrás, a la vista.
27. **D27 — Lotes de la calculadora.** La tabla lista solo los lotes con actividad de la firma en el rango (partes valorizados, pendientes o gastos vigentes). Los lotes sin actividad ya se ven en Mi Campo y Producción; aquí ensuciarían totales y ordenamiento.
28. **D28 — Dólar del "valor a hoy".** Se usa el tipo de tasa de la política vigente hoy, no el que registró cada snapshot. Así la vista "a valor de hoy" usa un único criterio y sus totales son sumables aunque la política cambie (D5); el snapshot conserva su valor y su tipo de tasa originales.

Decisiones técnicas (detalle en `design.md`):

- **T1** Montos nuevos como `Decimal` de Prisma (no `Float`); las columnas `Float` existentes no se tocan. Tradeoff: el repo hoy tiene 0 campos `Decimal`; se acepta la inconsistencia por exactitud monetaria.
- **T2** Una única política de tasa de valuación (cambiarla es un cambio de una línea).
- **T3** Una valorización por parte, garantizada por restricción única.
- **T4** Reutilizar `GetGrainPricesUseCase` y `GetUsdOfficialUseCase` detrás de un **puerto consumidor + adapter**, en lugar de inyectarlos en dominio.
- **T5** Módulos hexagonales nuevos bajo `src/entities/`: `tariff`, `valuation`, `expense-category`, `expense`, `profitability`.
- **T6** Gancho de aprobación vía puerto, best-effort; el contrato del endpoint `approve` no cambia.
- **T7** Tests: Jest + e2e sin BD (patrón `machine-report`) en backend; `node:test` `.mjs` para funciones puras en web.
- **T8** Seed: categorías de gasto y tarifas de ejemplo.
- **T9** Migración aditiva escrita a mano.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/backend/prisma/schema.prisma` + migración nueva | New | Modelos `Tariff`, `DailyReportValuation`, `ExpenseCategory`, `Expense`, `ExpenseSuggestion`; enums nuevos; índice único parcial escrito a mano |
| `packages/backend/src/entities/valuation/**` | New | `Money`, política de tasa, puerto de precios + adapter, valorización de partes, valor a hoy, reintento |
| `packages/backend/src/entities/tariff/**` | New | CRUD ADMIN-only y equivalentes en kg |
| `packages/backend/src/entities/expense-category/**` | New | CRUD con 409 si está en uso |
| `packages/backend/src/entities/expense/**` | New | Gastos y flujo de sugerencias |
| `packages/backend/src/entities/profitability/**` | New | Lectura de calculadora (lista + detalle) y métricas |
| `packages/backend/src/entities/daily-report/**` | **Modified** | `ApproveDailyReportUseCase` gana un puerto de gancho post-aprobación (best-effort) |
| `packages/backend/src/app.module.ts` | Modified | Registrar los cinco módulos nuevos |
| `packages/backend/prisma/seed.ts` | Modified | Categorías de gasto y tarifas de ejemplo |
| `packages/nextjs/src/api/client.ts` | Modified | DTOs y funciones de tarifas, gastos, sugerencias y calculadora |
| `packages/nextjs/src/app/dashboard/finanzas/**` | Modified / New | Reemplaza el `EmptyState` "Próximamente" por pestañas Tarifario, Gastos, Categorías, Sugerencias y Calculadora con gating por rol |
| `packages/nextjs/src/app/dashboard/finanzas/{campaign,metrics,format,access}.ts` + `test/finance-*.test.mjs` | New | Funciones puras de cálculo y formato con `node:test` (junto a la página, como `maquinaria/metrics.ts`) |
| `packages/mobile/**` | Unchanged | No se toca |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Alto riesgo — migración** (tablas y enums nuevos; el índice único parcial no es expresable en Prisma) | Med | Migración aditiva y manual; el índice parcial va en SQL y se documenta en el esquema; rollback = `DROP` de objetos nuevos |
| **Alto riesgo — permisos** (`@Roles` nuevos; el gating web es solo cliente) | Med | `@Roles` en **cada** endpoint nuevo y tests de controller por rol; la `firmaId` sale siempre del JWT, nunca del body/query |
| **Alto riesgo — concurrencia** (reintentos de valorización simultáneos) | Med | Restricción única `dailyReportId`; inserción tolerante a conflicto → idempotente |
| **Alto riesgo — cambio del caso de uso `approve` existente** | Med | El gancho es un puerto opcional invocado **después** del commit y envuelto en `try/catch`; test de regresión que prueba que un fallo del gancho no altera el resultado |
| La tasa USD elegida (venta) puede cambiar | High | Política única + registro del tipo de tasa por valorización; ver Open Questions |
| Precios no disponibles (grano "S/C", proveedor caído sin cache) dejan partes sin valorizar | Med | Estado "sin valorizar" visible con conteo de partes y hectáreas; reintento al abrir la calculadora |
| Valor a hoy no disponible con el proveedor caído | Med | El modo `A_VALOR_HOY` responde error claro; el modo `AL_APROBAR` no depende del mercado |
| Edición de tarifa no afecta lo ya valorizado (puede sorprender) | Med | Documentado: el snapshot congela lo aplicado; la UI lo indica en la pantalla de tarifas |
| Campaña por fecha de parte: labores de borde caen en la campaña anterior | Low | Aceptado (D17); rango personalizado disponible |
| `Decimal` convive con `Float` en el esquema; serialización JSON de `Decimal` | Med | Los montos viajan como strings decimales y la aritmética de dominio es exacta (`BigInt`); ver design §2.1 |
| Datos de demo sin tarifas muestran la calculadora vacía | Low | Seed con tarifas de ejemplo (T8) |

## Open Questions

- **Tasa USD (D5):** ¿se mantiene **oficial venta**, o se pasa a oficial compra o al "TC BNA Divisas Comprador" de la pizarra? El usuario avisó que probablemente cambie.
- **Gastos generales de firma** (administración, seguros) prorrateados entre lotes: **estacionado** para discusión posterior.
- ¿Se agregarán **cobranzas** (CUU09) sobre el devengado en un sprint próximo, y con qué granularidad?
- ¿Precio por cliente como override opcional de la tarifa de la firma?
- Redondeo (**Supuesto**): los resultados en ARS se redondean a 2 decimales (mitad hacia arriba) al persistir; confirmar con el usuario.
- ¿Debe existir un límite al lote de reintentos al abrir la calculadora (**Supuesto:** hasta 200 partes por apertura)?

## Rollback Plan

El sprint es **aditivo**. Revertir equivale a: (1) quitar los cinco módulos nuevos de `app.module.ts` y el puerto de gancho de `ApproveDailyReportUseCase` (volviendo a su constructor original); (2) restaurar el `EmptyState` de `/dashboard/finanzas` y borrar las pestañas nuevas; (3) opcionalmente `DROP` de `ExpenseSuggestion`, `Expense`, `ExpenseCategory`, `DailyReportValuation`, `Tariff` y los enums nuevos con una migración inversa (ninguna tabla existente se altera, por lo que no hay datos previos que restaurar). La aprobación de partes no depende de este sprint en ningún punto del camino crítico.

## Dependencies

- Sprint 3 mergeado: `GetGrainPricesUseCase` (`grain-price.module.ts`) y `GetUsdOfficialUseCase` (`exchange-rate.module.ts`) exportados.
- `DailyReport` con estado `APROBADO` final (`assertPendingApproval`) y `approveWithStockDeduction` (R017).
- `LaborType` por tenant, `InputCategory` como precedente de categorías, `Roles` + `RolesGuard`.
- Sin dependencias nuevas de paquetes (Prisma ya soporta `Decimal`; no se agrega librería de decimales en el backend — ver design §2.1).
- Sin dependencias nuevas en `packages/nextjs`.

## Success Criteria

- [ ] Un ADMIN guarda una tarifa (precio y costo estándar, cada uno con moneda y base) por tipo de labor; un SUPERVISOR recibe 403 en cualquier endpoint de tarifas.
- [ ] Al aprobar un parte con tarifa y precios disponibles, se persiste un snapshot con los importes aplicados, el tipo de tasa y la fecha; sin tarifa o sin precio, el parte aprobado queda "sin valorizar" y la aprobación **no falla**.
- [ ] Guardar una tarifa valoriza los partes pendientes de esa firma y labor; abrir la calculadora reintenta el resto; no existe doble valorización de un parte.
- [ ] La calculadora lista los lotes de la firma de sesión con ingreso, costo, margen bruto, margen/ha y rentabilidad, en ambas valorizaciones, y nunca expone datos de otra firma.
- [ ] El selector de campaña "2025/26" cubre 2025-07-01 a 2026-06-30 y existe el rango personalizado.
- [ ] El SUPERVISOR crea gastos y solo puede sugerir ediciones/bajas; el ADMIN las aprueba o rechaza (con motivo); no hay más de una sugerencia pendiente por gasto.
- [ ] Un gasto en USD o kg de grano se valúa en ARS al guardarse y el formulario muestra el resumen de confirmación previo.
- [ ] El detalle de un lote muestra partes valorizados, gastos por categoría y partes pendientes; la vista indica cuántos partes y hectáreas siguen sin valorizar.
- [ ] Tests verdes: Jest backend (unit + e2e sin BD) y `node --test` en `packages/nextjs/test`.
- [ ] El móvil y `packages/web` quedan sin cambios.

## Artifacts

- `spec.md`, `design.md`, `tasks.md` (este change).
