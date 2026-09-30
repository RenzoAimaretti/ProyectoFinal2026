# Apply Progress — Sprint 2: Motor de Sincronización Offline (Fase A — móvil)

**Change:** `sprint2-sync-offline-partes`
**Batch:** Fase A (móvil) — §1 a §6 de `tasks.md`
**Estado:** Completado (28/28 tareas). `flutter analyze` 0 errores/0 warnings; `flutter test` 156/156 verde.

---

# Apply Progress — Sprint 2: Fase B (backend)

**Change:** `sprint2-sync-offline-partes`
**Batch:** Fase B (backend) — §7 a §9 de `tasks.md`
**Estado:** Completado (8/8 tareas). `npx tsc --noEmit` limpio; `npx jest` 77 suites / 729 tests verde.

## Resumen

Se implementó el endpoint `DailyReport` en el backend reusando el hexágono completo de `daily-report`: (1) idempotencia por `id` cliente (campo opcional en input/data, P2002 → devuelve el existente), (2) errores 404 claros ante task/insumos faltantes (cambio de clase `InvalidRelationError` → `EntityNotFoundError`), y (3) un controller thin en `adapters/inbound/` que mapea el JWT a scope (`firmaId`→companyId, `id`→operatorId) y traduce errores de aplicación a HTTP. La Fase A (móvil) NO se tocó.

## Archivos creados

| Archivo | Qué |
|---|---|
| `adapters/inbound/daily-report.controller.ts` | Controller thin: `POST /daily-reports`, `GET /daily-reports`, `GET /daily-reports/:id`, todos `@UseGuards(JwtAuthGuard)`. DTO por selección explícita `{id, taskId, date, hectares, hours, items[]}` (nunca lee lotId/taskTypeId/companyId/operatorId del body). Traduce `EntityNotFoundError`→404, `InvalidInputError`/`InvalidRelationError`→400. |
| `adapters/inbound/daily-report.controller.spec.ts` | Tests de mapeo DTO→input (operator/company desde JWT, ignora extras), passthrough de `id` opcional, traducción de errores 404/400, GET filtrado por firma. |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `application/daily-report.types.ts` | `id?: string` en `CreateDailyReportInput` y `CreateDailyReportData`. |
| `application/use-cases/create-daily-report.use-case.ts` | Valida `id` si viene (`assertRequiredString`) y lo pasa al repo (sin pre-read); task inexistente e inputs faltantes → `EntityNotFoundError` (mismos messages); company faltante y cross-tenant siguen `InvalidRelationError`. |
| `adapters/outbound/prisma-daily-report.repository.ts` | Pasa `id: data.id` (undefined → default Prisma); atrapa `PrismaClientKnownRequestError` P2002 con `data.id` → `findByIdForCompany` → devuelve el existente (idempotente). |
| `daily-report.module.ts` | + `controllers: [DailyReportController]`. |
| `application/use-cases/daily-report.use-cases.spec.ts` | 2 asserts (task inexistente, inputs faltantes) → `EntityNotFoundError`; + casos `id` cliente viaja/omite y `id` vacío rechazado. |
| `adapters/outbound/prisma-daily-report.repository.spec.ts` | + `id` explícito persiste; P2002 con id → existente; sin id → default; P2002 sin id / no-P2002 → rethrow. |

## Desviaciones del design

- **Import de Prisma 7**: el design §2.3 asumía `Prisma.PrismaClientKnownRequestError` (namespace `Prisma` desde `@prisma/client`). En Prisma 7.x el namespace `Prisma` ya no se exporta desde `@prisma/client`; el error se importa como `PrismaClientKnownRequestError` desde `@prisma/client/runtime/client` (patrón ya usado por `prisma-user.repository.ts`). El catch usa `error instanceof PrismaClientKnownRequestError` en vez de `Prisma.PrismaClientKnownRequestError`. Sin cambio de comportamiento.

## Verificación

- `npx jest --testPathPattern=daily-report` → 8 suites / 99 tests verde.
- `npx jest` (suite completa) → 77 suites / 729 tests verde.
- `npx tsc --noEmit -p tsconfig.json` → limpio (0 errores de compilación).

## Riesgos / notas

- **Dependencias backend incompletas**: al arrancar, `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-jwt`, `argon2`, `bcrypt`, `ioredis`, `class-transformer`, `class-validator` no estaban materializadas en `node_modules` (sí en `package.json` y `pnpm-lock.yaml`). Se ejecutó `pnpm install` para materializarlas (47 paquetes agregados). Sin esto, el controller spec y el module spec fallaban por `Cannot find module '@nestjs/passport'`.
- **Advertencia de teardown**: la suite completa emite "A worker process has failed to exit gracefully" (pre-existente, por handles abiertos de ioredis/redis), no es un fallo.
- **`build scripts` ignorados** (argon2/bcrypt/prisma engines) por `pnpm approve-builds`: no afectan a los tests (PrismaService está mockeado).
- El E2E (§10.4) sigue pendiente: requiere ambas fases + NestJS corriendo con `JWT_SECRET` y Postgres.

## Resumen

Se implementó la infraestructura completa del motor de sincronización offline en el móvil: contrato de dominio puro (`SyncEngine` + puertos + excepciones sync), esquema drift (migración aditiva `refreshToken`), DAOs del outbox, boundary mapper de enums EN↔ES, `DailyReportApiService` con clasificación 401/4xx/5xx/red, adaptadores data (store, repo HTTP, delayer, refresher, handler), y el composition root en `main.dart` con gate/triggers de conectividad. El backend (Fase B) NO se tocó.

## Archivos creados

| Archivo | Qué |
|---|---|
| `lib/domain/models/sync_queue_item.dart` | Modelo de fila de outbox (id/entity/entityId/operation/attempts). |
| `lib/domain/repositories/sync_queue_repository.dart` | Puerto `SyncQueuePort` (FIFO, markProcessing, markDone, requeue, markFailed, recoverInterrupted). |
| `lib/domain/services/sync_entity_handler.dart` | `SyncEntityHandler.handle(SyncQueueItem)` abstracto. |
| `lib/domain/services/sync_delay_port.dart` | `SyncDelayPort.delay(Duration)` (backoff testeable). |
| `lib/domain/repositories/daily_report_remote_repository.dart` | Puerto `push(DailyReport, items, {token})`. |
| `lib/domain/services/sync_engine.dart` | `SyncEngine.runCycle()` + `SyncBackoffPolicy` (base 2s ×2 cap 30s máx 5). |
| `lib/data/models/enum_wire_mapper.dart` | Mapeo EN↔ES de los 5 enums; `fromWire` → null ante `ACTIVIDAD_MAQUINARIA`/`MANTENIMIENTO`/basura. |
| `lib/data/services/daily_report_api_service.dart` | POST/GET/GET:id + clasificación sync + `DailyReportWire`. |
| `lib/data/repositories/drift_sync_queue_store.dart` | `SyncQueuePort` sobre `SyncQueueDao`. |
| `lib/data/repositories/http_daily_report_repository.dart` | Impl de `push` → payload wire `{id, taskId, date, hectares, hours, items[]}`. |
| `lib/data/repositories/flutter_sync_delayer.dart` | `SyncDelayPort` → `Future.delayed`. |
| `lib/data/repositories/token_refresher.dart` | Refresh-on-401 + persistencia + clear-on-fail. |
| `lib/data/repositories/daily_report_sync_handler.dart` | Handler `DAILY_REPORT` (drift → payload → push; 401 → refresh → retry ×1). |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `lib/domain/errors.dart` | + `SyncRetriableException`, `SyncPermanentException`, `SyncUnauthorizedException`. |
| `lib/domain/models/session.dart` | + `refreshToken?`; `copyWith` gana `token`/`refreshToken`. |
| `lib/data/services/tables/session_tables.dart` | + columna `refreshToken` nullable. |
| `lib/data/services/app_database.dart` | `schemaVersion` 2→3 + `onUpgrade` `m.addColumn(sessions, sessions.refreshToken)`. |
| `lib/data/models/session_mapper.dart` | Mapea `refreshToken` en ambas direcciones. |
| `lib/data/services/daos/sync_queue_dao.dart` | + `nextPendingBatch`, `markProcessing`, `markDone` (DONE+delete), `requeue`, `markFailed`, `recoverInterrupted`. |
| `lib/data/services/daos/daily_reports_dao.dart` | + `getById`, `itemsByReportId`; accessor + `DailyReportItems`. |
| `lib/data/repositories/http_auth_repository.dart` | login mapea `refreshToken`; `logout({refreshToken})`; sin `_refreshToken` en memoria. |
| `lib/domain/repositories/auth_repository.dart` | `logout({String? refreshToken})`. |
| `lib/domain/usecases/logout_usecase.dart` | lee sesión y pasa `session?.refreshToken`. |
| `lib/main.dart` | Composition root del engine + triggers (arranque/reconexión/resume) + gate sesión+red; `with WidgetsBindingObserver`. |
| `pubspec.yaml` | + `connectivity_plus: ^6.1.0` (resolvió 6.1.5). |
| `test/domain/usecases/fakes.dart` | `FakeAuthRepository.logout({refreshToken})` + captura `logoutRefreshToken`. |
| `test/domain/usecases/logout_usecase_test.dart` | + test pasa refreshToken persistido. |
| `test/data/repositories/drift_session_repository_test.dart` | + test persiste `refreshToken`. |

## Archivos de test creados

| Archivo | Cobertura |
|---|---|
| `test/domain/services/sync_engine_test.dart` | FIFO, sin-handler PENDING, DONE borra, 4xx FAILED inmediato, 5xx → delays 2/4/8/16 + FAILED al 5º, recoverInterrupted. |
| `test/data/models/enum_wire_mapper_test.dart` | round-trip total + no-modelados → null. |
| `test/data/repositories/drift_sync_queue_store_test.dart` | lifecycle/FIFO/recover sobre drift in-memory. |
| `test/data/repositories/daily_report_sync_handler_test.dart` | resuelve payload desde drift; 401→refresh→retry ×1; parte inexistente → permanent. |
| `test/data/services/daily_report_api_service_test.dart` | 200/401/404/500/SocketException → excepción correcta; GET mapea status ES→EN. |
| `test/data/repositories/token_refresher_test.dart` | ok persiste sesión / sin token limpia / fallo limpia. |

## Desviaciones del design

- **Ninguna estructural.** Dos notas menores:
  1. `HttpDailyReportRepository.push` arma el payload wire (el design diagrama §3 sugiere el handler lo arma, pero el contrato del puerto `push(DailyReport, items, {token})` delega el mapeo wire al adaptador HTTP — más limpio y coherente con "naming espejo de http_auth_repository"). El handler resuelve drift → objetos de dominio → `push`.
  2. El handler convierte el segundo 401 (post-refresh) en `SyncPermanentException` para que el engine lo marque `FAILED`; el design dice "si vuelve 401 → FAILED" sin especificar el mecanismo. Sin esta conversión el engine (que solo conoce retriable/permanent) dejaría escapar `SyncUnauthorizedException`.

## Verificación

- `flutter analyze` → 0 errores / 0 warnings (42 `info` pre-existentes: `use_super_parameters` y `constant_identifier_names` de enums).
- `flutter test` → 156/156 verde (incluye `import_boundary_test` y `widget_test` smoke).
- `dart run build_runner build` regeneró los `.g.dart` tras el cambio de esquema.

## Riesgos / notas

- El gate de conectividad usa `connectivity_plus` como heurística; la sonda real es el intento HTTP (fallo de red → requeue).
- `widget_test` smoke sigue verde porque la restauración de sesión en un DB de memoria es `null` → el ciclo no dispara; el listener de conectividad se suscribe con `onError` y no emite en tests.
- Fase B (backend) pendiente; el E2E (§10.4) requiere ambas fases.
