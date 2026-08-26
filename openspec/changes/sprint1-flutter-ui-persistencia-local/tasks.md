# Tasks — Sprint 1: App Flutter UI & Persistencia Local

> Orden por dependencia: setup → DB → domain → data → outbox → fotos → UI → tests (los formularios CUU05/06 consumen fotos y outbox, por eso van antes). Base: design.md §3–§8 y `docs/hexagonal-conventions.md`.

## 1. Project setup (drift)

- [ ] 1.1 En `packages/mobile/pubspec.yaml` agregar `drift`, `drift_flutter` (ya incluye `sqlite3_flutter_libs`), `path_provider`, `path`, `uuid`; dev: `drift_dev`, `build_runner`.
- [ ] 1.2 Crear `packages/mobile/build.yaml` habilitando el codegen de `drift_dev` para el package `mobile`.
- [ ] 1.3 Correr `dart run build_runner build` y verificar que genera los part files `*.g.dart` sin errores.

## 2. DB foundation (AppDatabase + 18 tablas, schema v1)

- [ ] 2.1 Crear `lib/data/services/tables/catalog_tables.dart`: `Companies`, `Clients`, `Farms`, `Lots`, `LaborTypes`, `Inputs`, `Machines` — PK uuid `clientDefault`, defaults `version=1`/`deleted=false`/`active=true`, `@TableIndex` según design §3.
- [ ] 2.2 Crear `lib/data/services/tables/production_tables.dart`: `Recipes`, `RecipeItems`, `DailyReports`, `DailyReportItems` — FKs + `idx_daily_reports_status_date`, `idx_daily_reports_lot_id`.
- [ ] 2.3 Crear `lib/data/services/tables/stock_tables.dart` (`Receptions`, `ReceptionItems`, `Stocks` con UNIQUE(clientId,inputId)) y `machine_tables.dart` (`MachineActivities`, campos nullable por `type`).
- [ ] 2.4 Crear `lib/data/services/tables/session_tables.dart` (`Sessions` sin FK — D8) e `infra_tables.dart` (`Photos` polimórfica sin FK, `SyncQueue` con `status=PENDING`/`attempts=0`).
- [ ] 2.5 Crear `lib/data/services/app_database.dart`: `@DriftDatabase` con las 18 tablas, `schemaVersion = 1` (solo `onCreate`), `beforeOpen` con `PRAGMA foreign_keys = ON`, apertura vía `driftDatabase` + `path_provider`.
- [ ] 2.6 Crear DAOs en `lib/data/services/daos/` con queries `watch*` (por status/fecha, lote, máquina, cliente), registrarlos en `AppDatabase` y regenerar codegen.

## 3. Domain layer

- [ ] 3.1 Crear `lib/domain/models/enums.dart`: `DailyReportStatus`, `ReceptionStatus`, `MachineActivityType`, `MachineStatus`, `PhotoEntityType`, `SyncOperation`, `SyncStatus`, `UserRole` (valores UPPERCASE).
- [ ] 3.2 Crear modelos puros en `lib/domain/models/`: `session`, `daily_report`, `reception`, `stock`, `machine_activity`, `photo`, `catalogs` (solo imports `dart:*`).
- [ ] 3.3 Crear los 15 puertos en `lib/domain/repositories/` (design §4): `AuthRepository`, `SessionRepository`, `DailyReportRepository`, `ReceptionRepository`, `StockRepository`, `MachineActivityRepository`, `PhotoRepository` + 8 readers (Client, Company, LaborType, Input, Farm, Lot, Machine, Recipe).
- [ ] 3.4 Crear los 12 use cases en `lib/domain/usecases/` (1 clase = 1 `execute()`), según design §4.

## 4. Data layer (adaptadores drift + refactor auth)

- [ ] 4.1 Crear mappers fila drift ↔ modelo de dominio y converters de enums en `lib/data/models/`.
- [ ] 4.2 Crear `lib/data/repositories/drift_session_repository.dart` (`save`/`current`/`clear`).
- [ ] 4.3 Crear `lib/data/repositories/drift_daily_report_repository.dart`: create cabecera+items en una tx, `watchPending`, `watchByFilter`, `updateStatus`.
- [ ] 4.4 Crear `drift_reception_repository.dart` + `drift_stock_repository.dart`: `validateAndApplyStock` = status→VALIDATED + incremento de `Stock` en la misma tx.
- [ ] 4.5 Crear `drift_machine_activity_repository.dart`, `drift_photo_repository.dart` y `drift_catalog_readers.dart` (implementan los 8 readers).
- [ ] 4.6 Refactor auth (D10, orden mobile de `hexagonal-conventions.md`): mover contrato a `lib/domain/repositories/auth_repository.dart`, crear `lib/data/repositories/http_auth_repository.dart` (impl, usa `AuthApiService`), eliminar contrato de `data/repositories/auth_repository.dart`.
- [ ] 4.7 Crear `LoginUseCase` (login → `SessionRepository.save`) e inyectarlo en `LoginViewModel` por constructor — sin default `HttpAuthRepository()`; UI de login intacta.
- [ ] 4.8 Convertir `lib/main.dart` en composition root: `AppDatabase` singleton → adapters → use cases → ViewModels (widgets no instancian repos/services).

## 5. SyncQueue outbox (escritura transaccional)

- [ ] 5.1 Helper en `lib/data/repositories/` para que cada write drift inserte `(entity, entityId, operation, status=PENDING, attempts=0)` en `SyncQueue` en la MISMA transacción (D9 — el dominio no conoce la cola).
- [ ] 5.2 Encolar `DAILY_REPORT`, `RECEPTION`, `MACHINE_ACTIVITY`, `PHOTO`, `STOCK`; los items van embebidos en el padre (no se encolan solos).
- [ ] 5.3 Badge "pendientes de sincronización" en home vía `watch` sobre `SyncQueue` (sin tocar dominio).

## 6. Photos (filesystem + Photo)

- [ ] 6.1 Agregar `image_picker` a `pubspec.yaml` y capturar desde cámara/galería en los formularios.
- [ ] 6.2 `AddPhotoUseCase`: copiar archivo a app-docs (`path_provider` + `path`) y persistir fila `Photo` (`entityType`, `entityId`, `localPath`, `orderIndex`).
- [ ] 6.3 Máximo 5 fotos por entidad (R008): rechazar la 6.ª con feedback en UI; `delete(id)` también elimina el archivo del filesystem.

## 7. App / UI (ViewModels + views, setState)

- [ ] 7.1 CUU00: extender `lib/app/auth/` con restauración de sesión offline (`RestoreSessionUseCase`) y logout (`LogoutUseCase`).
- [ ] 7.2 `lib/app/home/home_view.dart`: dashboard con navegación a CUU05/06/08 + KPI de stock (`WatchStockUseCase`).
- [ ] 7.3 CUU05 lista en `lib/app/reports/`: `daily_reports_view_model.dart` + `daily_reports_view.dart` (watch filtro estado/fecha; reusar `parte_diario_item.dart`, `status_badge.dart`).
- [ ] 7.4 CUU05 form: `daily_report_form_view_model.dart` + `daily_report_form_view.dart` (firma/lote/labor/hectáreas/horas + ítems de consumo; bloquear si el lote no tiene `Recipe` — R009).
- [ ] 7.5 CUU06 lista en `lib/app/receptions/`: `receptions_view_model.dart` + `receptions_view.dart` (pendientes `PENDING_VALIDATION` + acción validar vía `ValidateReceptionUseCase`).
- [ ] 7.6 CUU06 form: `reception_form_view_model.dart` + `reception_form_view.dart` (ítems insumo/cantidad/unidad, sin remito, hasta 5 fotos).
- [ ] 7.7 CUU08 en `lib/app/machinery/`: `machine_activities_view_model.dart` + lista/historial por máquina y form por tipo (`FUEL` exige `companyId` — R019; acumular horas/hectáreas — R021).
- [ ] 7.8 Reusar `presentation/components` existentes (cards, buttons, inputs, dropdowns, selectors); no duplicar el design system.

## 8. Tests (reglas de `hexagonal-conventions.md`)

- [ ] 8.1 Unit de los 12 use cases: éxito + fallo principal con fakes en memoria (`test/domain/usecases/`).
- [ ] 8.2 Adaptadores drift con `NativeDatabase.memory()`: inserts, watch, UNIQUE de `Stock`, tx entidad+SyncQueue (`test/data/repositories/`).
- [ ] 8.3 ViewModels con fake use cases (`test/app/`), incluido Login refactor.
- [ ] 8.4 Widget tests de formularios CUU05/06/08: happy path, bloqueo R009, máximo 5 fotos.
- [ ] 8.5 Import-boundary: grep verificando `lib/domain/**` sin imports de `package:drift` ni `package:flutter`.

## Explicit Non-Goals For This Sprint

- [ ] No ejecutar build (regla del workspace).
- [ ] No implementar el motor de sync (SyncEngine, push/pull, resolución de conflictos) — Sprint 2.
- [ ] No cambiar el schema del backend (Prisma).
- [ ] No agregar state management (Riverpod/Bloc): queda `setState` + streams de drift.
