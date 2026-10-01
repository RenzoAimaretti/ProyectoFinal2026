# Tasks — Sprint 2: Motor de Sincronización Offline & Endpoint API de Partes

> Orden por dependencia: dominio (§1) → esquema/DAO (§2) → mapper+API (§3) → adaptadores (§4) → wiring (§5) → tests móvil (§6). La Fase B backend (§7–§9) NO depende de la Fase A: puede avanzarse en paralelo. El E2E (§10.4) requiere ambas fases. Base: `design.md` y `docs/hexagonal-conventions.md`.

## 1. Dominio — contratos del motor (móvil, sin drift/http)

- [x] 1.1 Crear `lib/domain/models/sync_queue_item.dart`: fila leída de la cola (`id` de fila, `entity`, `entityId`, `operation`, `attempts`) (design §2.1).
- [x] 1.2 Crear puerto `lib/domain/repositories/sync_queue_repository.dart` (`SyncQueuePort`): `nextPendingBatch({limit})` FIFO por `createdAt` asc, `markProcessing`, `markDone`, `requeue(id, lastError)`, `markFailed(id, lastError)`, `recoverInterrupted` (design §2.1).
- [x] 1.3 Crear `lib/domain/services/sync_entity_handler.dart` (abstracto `SyncEntityHandler.handle(SyncQueueItem)`) y `lib/domain/services/sync_delay_port.dart` (`SyncDelayPort.delay(Duration)`) (design §2.1).
- [x] 1.4 Agregar `SyncRetriableException`, `SyncPermanentException` y `SyncUnauthorizedException` a `lib/domain/errors.dart` (design §2.1).
- [x] 1.5 Crear puerto `lib/domain/repositories/daily_report_remote_repository.dart`: `push(DailyReport, items, {token})` que lanza las excepciones sync (design §2.1).
- [x] 1.6 Crear `lib/domain/services/sync_engine.dart`: `SyncEngine.runCycle()` con guard `_running`, `recoverInterrupted()` al inicio, loop por batches (limit 10); fila sin handler → skip (queda PENDING); éxito → `markDone`; `SyncPermanentException` → `markFailed` y sigue; `SyncRetriableException` → `requeue` + delay + retry in-place hasta 5 intentos. `SyncBackoffPolicy`: base 2 s, factor 2, cap 30 s (design §2.1–§2.2).

## 2. Esquema drift — refreshToken + métodos de DAO

- [x] 2.1 `Session` (`lib/domain/models/session.dart`): + `refreshToken?`; `copyWith` gana `token`/`refreshToken` (además de `companyId`) (design §2.6).
- [x] 2.2 `Sessions` (`lib/data/services/tables/session_tables.dart`): + `refreshToken` nullable; `app_database.dart`: `schemaVersion` 2 → 3 + `onUpgrade` con `m.addColumn(sessions, sessions.refreshToken)` (design §6). Correr `dart run build_runner build`.
- [x] 2.3 `lib/data/models/session_mapper.dart`: mapear `refreshToken` en ambas direcciones.
- [x] 2.4 `SyncQueueDao` (`lib/data/services/daos/sync_queue_dao.dart`): + `nextPendingBatch(limit)`, `markProcessing`, `markDone` (DONE + delete en una transacción), `requeue` (PENDING + attempts+1 + lastError), `markFailed` (FAILED + attempts+1 + lastError), `recoverInterrupted` (PROCESSING → PENDING) (design §2.1).
- [x] 2.5 `DailyReportsDao` (`lib/data/services/daos/daily_reports_dao.dart`): + `getById(id)` y `itemsByReportId(id)` (agregar `DailyReportItems` al accessor) (design §4).

## 3. Boundary mapper + API service (data)

- [x] 3.1 Crear `lib/data/models/enum_wire_mapper.dart` (plano, junto a `enum_converters.dart`): `toWire` total y `fromWire → enum?` (null ante desconocidos) para DailyReportStatus, ReceptionStatus, MachineActivityType, MachineStatus, PhotoEntityType según tabla design §2.5 — `MANTENIMIENTO` y `ACTIVIDAD_MAQUINARIA` → null (spec D).
- [x] 3.2 Crear `lib/data/services/daily_report_api_service.dart` (pattern `auth_api_service.dart`): `POST /daily-reports`, `GET /daily-reports`, `GET /daily-reports/:id`; clasifica 401 → `SyncUnauthorizedException`, 4xx → `SyncPermanentException`, 5xx/SocketException → `SyncRetriableException`; deserializa `status` ES→EN con el mapper (design §2.5/§3).

## 4. Adaptadores data — store, repo, token, handler

- [x] 4.1 Crear `lib/data/repositories/drift_sync_queue_store.dart`: `SyncQueuePort` sobre `SyncQueueDao` (design §4).
- [x] 4.2 Crear `lib/data/repositories/http_daily_report_repository.dart`: impl del puerto `push` sobre `DailyReportApiService`.
- [x] 4.3 Crear `lib/data/repositories/flutter_sync_delayer.dart`: `SyncDelayPort` → `Future.delayed`.
- [x] 4.4 Crear `lib/data/repositories/token_refresher.dart` (deps `AuthApiService` + `SessionRepository`): sin `refreshToken` → clear + `SyncPermanentException`; refresh ok → `copyWith(token, refreshToken)` + `save`; refresh falla (`AuthException`) → clear + `SyncPermanentException('Sesión expirada…')` (design §2.6, spec C2).
- [x] 4.5 Crear `lib/data/repositories/daily_report_sync_handler.dart` (para `SyncEntity.dailyReport`): resuelve `DailyReport` + items desde drift (`getById`/`itemsByReportId`), arma payload `{id, taskId, date, hectares, hours, items[{inputId, quantity, unit}]}` (sin lotId/taskTypeId/companyId/operatorId); `push(token)` → 401 → `refreshAccessToken()` → UN solo retry; el resto propaga (design §2.6/§3, spec C2).
- [x] 4.6 `http_auth_repository.dart`: login mapea `response.refreshToken` al `Session`; `logout({String? refreshToken})`; eliminar el campo `_refreshToken` en memoria (fuente única: SQLite) (design §2.6).
- [x] 4.7 Puerto `auth_repository.dart`: `logout({String? refreshToken})`; `LogoutUseCase` lee la sesión actual y pasa `session?.refreshToken` (design §2.6).

## 5. Wiring — conectividad + triggers

- [x] 5.1 `pubspec.yaml`: + `connectivity_plus: ^6.x` (confirmar versión menor compatible con el SDK — open question design §7).
- [x] 5.2 `lib/main.dart`: composition root del sync — `SyncEngine` (store + registry `{'DAILY_REPORT': DailyReportSyncHandler}` + delayer); triggers: arranque post-restauración de sesión, `Connectivity().onConnectivityChanged` (paso a wifi/mobile) y resume (`WidgetsBindingObserver`); gate por ciclo: sesión con token no vacío (demo `''` no dispara) + `checkConnectivity() != none` (design §2.7).

## 6. Tests — móvil

- [x] 6.1 Unit `SyncEngine` con fakes in-memory (estilo `test/domain/usecases/fakes.dart`): FIFO drena la más antigua; entidad sin handler queda PENDING; DONE borra; 4xx → FAILED inmediato y sigue con la siguiente; 5xx/red → requeue + delays 2/4/8/16 s (cap 30 s) → FAILED al 5º intento; `recoverInterrupted` corre al inicio (spec A1–A3).
- [x] 6.2 Crear `test/data/models/enum_wire_mapper_test.dart`: round-trip EN↔ES total; `MANTENIMIENTO`, `ACTIVIDAD_MAQUINARIA` y basura → null (spec D).
- [x] 6.3 Adaptador drift (`AppDatabase.forTesting(NativeDatabase.memory())` + `drift_test_helper.dart`): `DriftSyncQueueStore` lifecycle/FIFO/recover; `Session` persiste `refreshToken`; el handler resuelve el payload `{id, taskId, date, hectares, hours, items[]}` desde drift (design §5).
- [x] 6.4 Adaptador http (mock `http.Client`, pattern `auth_api_service_test.dart`): `DailyReportApiService` 200/401/404/500/SocketException → excepción correcta; `TokenRefresher` ok persiste sesión nueva / falla limpia sesión (design §5).
- [x] 6.5 Actualizar tests rotos por `Session.refreshToken` y `logout(refreshToken)`: `login_usecase_test`, `logout_usecase_test`, `drift_session_repository_test` (y `widget_test` si el wiring lo rompe).
- [x] 6.6 `test/import_boundary_test.dart` sigue verde (domain sin drift/http/flutter) (design §5).

## 7. Backend — idempotencia + errores 404

- [x] 7.1 `application/daily-report.types.ts`: `id?: string` en `CreateDailyReportInput` y `CreateDailyReportData` (design §2.3).
- [x] 7.2 `create-daily-report.use-case.ts`: valida `id` si viene y lo pasa al repo (sin pre-read); task inexistente e inputs faltantes → `EntityNotFoundError` (mismos messages); company faltante y task cross-tenant SIGUEN `InvalidRelationError` (design §2.4, spec B3). Helper en `daily-report.validation.ts` solo si hace falta.
- [x] 7.3 `adapters/outbound/prisma-daily-report.repository.ts`: pasa `id: data.id` (undefined → default de Prisma) y atrapa P2002 con `data.id` → `findByIdForCompany` → devuelve existente (design §2.3, spec B2).

## 8. Backend — controller + módulo

- [x] 8.1 Crear `adapters/inbound/daily-report.controller.ts`: `POST /daily-reports`, `GET /daily-reports`, `GET /daily-reports/:id`, todos `@UseGuards(JwtAuthGuard)`; scope `req.user.firmaId` → companyId y `req.user.id` → operatorId; DTO por selección explícita de campos `{id, taskId, date, hectares, hours, items[]}` (nunca lee lotId/taskTypeId/companyId/operatorId del body); traduce `EntityNotFoundError`→404, `InvalidInputError`/`InvalidRelationError`→400 (design §2.4, spec B1).
- [x] 8.2 `daily-report.module.ts`: + `controllers: [DailyReportController]` (los use cases ya son providers) (design §2.4).

## 9. Tests — backend

- [x] 9.1 Actualizar `application/use-cases/daily-report.use-cases.spec.ts`: asserts de task inexistente e inputs faltantes pasan a `EntityNotFoundError` (company faltante y cross-tenant siguen `InvalidRelationError`); + `id` cliente viaja al `repository.create`; deriva lot/taskType de la task y status inicial se mantienen (spec B4).
- [x] 9.2 Actualizar `adapters/outbound/prisma-daily-report.repository.spec.ts`: `id` explícito persiste; P2002 con `id` → devuelve el existente; sin `id` → default (spec B2).
- [x] 9.3 Crear `adapters/inbound/daily-report.controller.spec.ts`: DTO→input mapea operatorId/companyId del JWT e ignora extras del body; `EntityNotFoundError` → 404, `InvalidInputError`/`InvalidRelationError` → 400; GET filtra por firma del caller (spec B1–B4).

## 10. Verificación global

- [ ] 10.1 `flutter analyze` → 0 errores / 0 warnings (`packages/mobile`).
- [ ] 10.2 `flutter test` → verde (`packages/mobile`).
- [ ] 10.3 `npm test` → verde (`packages/backend`, suite daily-report).
- [ ] 10.4 E2E manual (requiere §1–§9 + Nest con `JWT_SECRET`): parte creado offline aparece en Postgres al reconectar, sin duplicados ante retry; 401 refresca y reintenta una vez (Success Criteria del proposal).

## Explicit Non-Goals

- [x] No UI de diagnóstico para filas FAILED (locked Option A — sprint futuro).
- [x] No endpoints de reception/stock/photo/machine-activity/client/input/recipe.
- [x] No migración de enums del backend ni delta de `schema.prisma` (`id` ya es PK con default).
- [x] No `flutter build` (regla del workspace).
- [x] No down-sync de catálogos (change futuro).
