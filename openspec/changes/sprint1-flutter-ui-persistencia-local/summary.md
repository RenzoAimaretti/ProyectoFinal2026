# Sprint 1: App Flutter UI & Persistencia Local — Resumen de implementación (Fases 1-4)

> Change: `sprint1-flutter-ui-persistencia-local` · Branch: `UI-PersistenciaLocal` · Fecha: 2026-08-26

## Objetivo

App Flutter **offline-first** para el SaaS Agro-Trazabilidad: interfaz de usuario + persistencia local (SQLite vía `drift`) para los casos de uso **CUU00, CUU05, CUU06, CUU08**. Arquitectura hexagonal (ports & adapters) según `docs/hexagonal-conventions.md`, naming en inglés espejando Prisma.

## Estado general

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Project setup (drift + build.yaml) | ✅ |
| 2 | DB foundation (18 tablas + AppDatabase + 14 DAOs) | ✅ |
| 3 | Domain layer (enums + modelos + 15 puertos + 12 use cases) | ✅ |
| 4 | Data layer (adaptadores drift + refactor auth) | ✅ |
| 5-8 | Outbox/badge · Fotos · UI · Tests | ⏳ pendientes |

**Codegen drift:** ✅ OK (drift 2.34, build_runner 2.16).
**`flutter analyze`:** ✅ **0 errores / 0 warnings** (36 infos aceptables) — tras fix batch, ver §Verificación.

---

## Fase 1 — Project setup

- `packages/mobile/pubspec.yaml`: `drift ^2.32.1` (resolvió a **2.34.x**), `drift_flutter ^0.3.0`, `path`, `uuid`; dev: `drift_dev`, `build_runner`.
- `packages/mobile/build.yaml`: codegen de `drift_dev` habilitado.

## Fase 2 — DB foundation

- **18 tablas drift** en `lib/data/services/tables/` (6 archivos):
  - `catalog_tables.dart` → Companies, Clients, Farms, Lots, LaborTypes, Inputs, Machines
  - `production_tables.dart` → Recipes, RecipeItems, DailyReports, DailyReportItems
  - `stock_tables.dart` → Receptions, ReceptionItems, Stocks (UNIQUE `unique_stocks_client_input`)
  - `machine_tables.dart` → MachineActivities
  - `session_tables.dart` → Sessions (sin FK — D8)
  - `infra_tables.dart` → Photos (polimórfica, sin FK), SyncQueue (row class `SyncQueueEntry`)
- `app_database.dart`: `@DriftDatabase(18 tablas)`, `schemaVersion = 1`, `PRAGMA foreign_keys = ON`, apertura `driftDatabase(name: 'agrolify')`, constructor `forTesting()`.
- **14 DAOs** en `lib/data/services/daos/` con queries `watch*`.

## Fase 3 — Domain layer (puro, sin framework)

- `domain/models/enums.dart`: 7 enums UPPERCASE + `UserRole` (string constants).
- `domain/models/`: 7 archivos / 17 clases puras (session, daily_report + item, reception + item, stock, machine_activity, photo, catalogs).
- `domain/repositories/`: **15 puertos** (7 writers + 8 readers).
- `domain/usecases/`: **12 use cases** (1 clase = 1 `execute`).
- `errors.dart`: `LotWithoutRecipeException` (R009), `InvalidMachineActivityException` (R018-R021).
- **Import-boundary verificado:** cero imports de drift/flutter/data/app en `domain/**`.

## Fase 4 — Data layer + refactor auth

- `data/models/`: 8 mappers (fila↔dominio) + `enum_converters.dart` (14 converters).
- `data/repositories/`: 8 repos drift + `sync_queue_writer.dart` (outbox D9) + `stock_upsert.dart`.
- Refactor auth (D10): contrato movido a `domain/repositories/auth_repository.dart`; `http_auth_repository.dart` (impl); **eliminado** `data/repositories/auth_repository.dart` viejo.
- `LoginViewModel` → depende de `LoginUseCase` inyectado; `main.dart` → composition root.
- `data/repositories/` es el único consumidor de `AppDatabase` (verificado por grep).

---

## Decisiones / desviaciones (a tener en cuenta)

1. **`fullName` no existe en el backend** (login trae `id`, `email`, `role`, `firmaId`). Se deriva del prefijo del email. → desajuste a sumar al contrato de Renzo.
2. **`refreshToken` no se persiste** → `logout()` best-effort (solo revoca en el proceso actual).
3. **Outbox transaccional (D9) implementado en Fase 4** (cada write inserta `SyncQueue` en la misma tx). Cubre las tareas 5.1/5.2.
4. **`drift_catalog_readers.dart` = 8 clases** (no 1): Dart prohíbe una clase implementando dos interfaces con el mismo nombre de método.
5. **`updateStatus` no encola SyncQueue** (aprobación/rechazo es web-side, Sprint 2).
6. **STOCK** se encola en `upsertIncrement` con `entityId` compuesto `clientId:inputId`.
7. **`UserRole` como string constants** (no enum cerrado) para tolerar valores nuevos del backend.
8. **`AppDatabase.forTesting()`** aditivo para tests con `NativeDatabase.memory()`.

---

## Verificación

### Codegen
`dart run build_runner build` → ✅ sin errores (`.g.dart` generados).

### `flutter analyze`

**Primera corrida (pre-fix):** 66 issues — 31 errores de compilación + 35 info/warnings. Errores: `Uuid` no importado (18, en código generado), colisión `Session` (1, row class drift vs dominio en `main.dart`), tests de auth desactualizados (12, API vieja del refactor D10).

**Fix batch aplicado (post-analyze):**

1. **Uuid:** `import 'package:uuid/uuid.dart';` en `app_database.dart` — el `.g.dart` es `part of` ese archivo y resolvía `Uuid` contra sus imports (los table files ya lo tenían, pero no alcanzaba).
2. **Session:** row class drift renombrada `Session` → `SessionRow` (`@DataClassName` en `session_tables.dart` + `session_mapper.dart`). `main.dart` quedó sin ambigüedad; `SessionsCompanion` no cambió (se nombra por la tabla).
3. **Tests auth:** `login_view_model_test.dart` y `login_view_test.dart` actualizados a la nueva API — `FakeLoginUseCase implements LoginUseCase`, constructor `LoginViewModel(loginUseCase: ...)`, asserts `loggedUser` → `session`. Cobertura preservada: 7 unit + 4 widget. `auth_api_service_test.dart` intacto.
4. **Codegen regenerado:** 178 outputs, sin errores.

**Resultado final:** 36 issues — **0 errores, 0 warnings**. Solo infos aceptables:
- `constant_identifier_names` (21): enums UPPERCASE **intencionales** por design.
- `use_super_parameters` (15): style opcional (DAOs + app_database).

---

## Issues abiertos

- [x] ~~Errores de compilación~~ → **resueltos** en fix batch (uuid import, `SessionRow`, tests auth actualizados). `flutter analyze`: 0 errores.
- [ ] `fullName` ausente del backend (derivado del email) → elevar a Renzo.
- [ ] `refreshToken` no persistido (logout best-effort).
- [ ] Enums UPPERCASE generan lints `constant_identifier_names` (intencional, evaluar suprimir lint).
- [ ] `use_super_parameters` en DAOs (opcional, style).

---

## Siguientes pasos

1. Fases 5-8: badge de sync · fotos (`image_picker` + `AddPhotoUseCase`) · UI de los 4 CUU · tests.
2. `flutter test` al cierre (Fase 8).
3. Elevar a Renzo: `fullName` ausente en el login del backend (desajuste del contrato).
