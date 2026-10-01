# Design: Sprint 1 — App Flutter UI & Persistencia Local

## 1. Enfoque técnico

App Flutter **offline-first**: toda operación de CUU00/05/06/08 escribe primero en SQLite local (drift) y se refleja en UI vía streams; el backend se toca solo en login (`http`). Hexagonal según `docs/hexagonal-conventions.md` (layout Flutter): `domain/` (models, puertos, use cases) ← `data/` (adaptadores drift + http) ← `app/` (ViewModels + views). La cola `SyncQueue` se llena transaccionalmente ahora; el motor que la consume es Sprint 2 (contrato en §7, NO se implementa).

## 2. Arquitectura y reglas de dependencia

```text
packages/mobile/lib/
  domain/
    models/            # entidades puras Dart + enums de dominio
    repositories/      # PUERTOS (abstract): session, daily_report, reception,
                       #   stock, machine_activity, photo, auth + catalog readers
    usecases/          # 1 clase = 1 execute()
  data/
    models/            # mappers fila drift <-> modelo de dominio
    services/          # app_database.dart (drift), tables/, auth_api_service.dart
    repositories/      # implementaciones: drift_*.dart, http_auth_repository.dart
  app/
    auth/ home/ reports/ receptions/ machinery/   # view_model.dart + view.dart
  presentation/components/  # design system existente (sin cambios)
  core/                # theme, config (existente)
  main.dart            # COMPOSITION ROOT: crea AppDatabase, adapters, use cases, VMs
```

Reglas (verificables con grep en CI):

- `domain/**` NO importa `package:drift/*`, `package:flutter/*` (solo `dart:*`), ni `data/**` ni `app/**`.
- `data/repositories/**` implementa puertos de `domain/repositories/**`; es el único lugar con acceso a `AppDatabase`.
- ViewModels reciben **use cases** por constructor; nunca HTTP services ni `AppDatabase`.
- Widgets NO instancian repositorios/services; todo se cablea en `main.dart` (hoy `LoginViewModel` se auto-instancia `HttpAuthRepository` — se corrige en este sprint).

```text
View ─setState/ callbacks─► ViewModel ─execute()─► UseCase ─► Puerto (domain)
                                ▲                        │ implements
                                │ Stream (drift watch)   ▼
                                └──────── DriftAdapter ── AppDatabase ── SQLite
                                             │ (misma tx: entidad + SyncQueue)
```

Login (CUU00): `LoginView → LoginViewModel → LoginUseCase → AuthRepository(http) + SessionRepository(drift)`. La sesión persistida permite restaurar sesión offline (Sprint 1 guarda token; el uso completo es Sprint 2).

## 3. Base de datos local (drift) — 18 tablas

Convenciones (espejo del `contrato-esquema-prisma.md`, sin campos nuevos):

- PK: `text` uuid generado con `clientDefault(() => const Uuid().v4())` + `primaryKey => {id}`.
- Defaults: `createdAt/updatedAt: dateTime().withDefault(currentDateAndTime)`; `version = 1`; `deleted = false`; `active = true`; `attempts = 0`; `orderIndex = 0`. En UPDATE el adaptador setea `updatedAt` explícitamente (drift no lo auto-updaten).
- Enums: `TextColumn` con valores en mayúsculas; enums Dart en `domain/models/enums.dart`, mapeo por converter en `data/models/`.
- Row classes con nombre Prisma: `@DataClassName('Company') class Companies extends Table`.
- FKs con `text().references(Tabla, #id)`; `PRAGMA foreign_keys = ON` en `beforeOpen`.

Notación: `?` = nullable · `→` = FK references · índices vía `@TableIndex`.

### Catálogos (con `version` + `deleted`) — 7 tablas

| Tabla (drift) | Columnas | FK / Unique | Índices |
|---|---|---|---|
| `Companies` | id PK · name text · cuit text · active bool=true · createdAt · updatedAt · version int=1 · deleted bool=false | — | — |
| `Clients` | id PK · name text · cuit text? · active bool=true · createdAt · updatedAt · version=1 · deleted=false | — | — |
| `Farms` | id PK · clientId text → Clients.id · name text · location text? · surface real · createdAt · updatedAt · version=1 · deleted=false | clientId | `idx_farms_client_id` |
| `Lots` | id PK · farmId text → Farms.id · name text · coords text? · area real · active bool=true · createdAt · updatedAt · version=1 · deleted=false | farmId | `idx_lots_farm_id` |
| `LaborTypes` | id PK · name text · description text? · createdAt · updatedAt · version=1 · deleted=false | — | — |
| `Inputs` | id PK · name text · unit text (L\|KG\|UNIT) · active bool=true · createdAt · updatedAt · version=1 · deleted=false | — | — |
| `Machines` | id PK · companyId text → Companies.id · name text · brand text? · status text (MachineStatus) · entryDate dt? · maintenanceDate dt? · createdAt · updatedAt · version=1 · deleted=false | companyId | `idx_machines_company_id` |

### Sesión — 1 tabla

| Tabla | Columnas | FK | Índices |
|---|---|---|---|
| `Sessions` | id PK · userId text · email text · fullName text · role text (UserRole) · token text · companyId text? · lastAccessedAt dt | **sin FK** (D8) | — |

### Producción (CUU05) — 4 tablas

| Tabla | Columnas | FK | Índices |
|---|---|---|---|
| `Recipes` | id PK · lotId text → Lots.id · date dt · status text · observations text? · createdAt · updatedAt | lotId | `idx_recipes_lot_id` |
| `RecipeItems` | id PK · recipeId text → Recipes.id (cascade) · inputId text → Inputs.id · dose real · unit text? · loadOrder int | recipeId, inputId | `idx_recipe_items_recipe_id` |
| `DailyReports` | id PK · operatorId text (sin FK local) · companyId text → Companies.id · lotId text → Lots.id · laborTypeId text → LaborTypes.id · date dt · hectares real · hours real · status text (DailyReportStatus) · rejectionReason text? · approvedAt dt? · approvedBy text? · createdAt · updatedAt | companyId, lotId, laborTypeId | `idx_daily_reports_status_date` (status,date) · `idx_daily_reports_lot_id` |
| `DailyReportItems` | id PK · dailyReportId text → DailyReports.id (cascade) · inputId text → Inputs.id · quantity real · unit text | dailyReportId, inputId | `idx_daily_report_items_report_id` |

### Insumos / Stock (CUU06) — 3 tablas

| Tabla | Columnas | FK / Unique | Índices |
|---|---|---|---|
| `Receptions` | id PK · clientId text → Clients.id · date dt · status text (ReceptionStatus) · rejectionReason text? · validatedBy text? · validatedAt dt? · createdAt · updatedAt | clientId | `idx_receptions_client_id` · `idx_receptions_status` |
| `ReceptionItems` | id PK · receptionId text → Receptions.id (cascade) · inputId text → Inputs.id · quantity real · unit text | receptionId, inputId | `idx_reception_items_reception_id` |
| `Stocks` | id PK · clientId text → Clients.id · inputId text → Inputs.id · quantity real · updatedAt dt | **UNIQUE(clientId, inputId)** (índice único, SQLite lo materializa) | — |

### Maquinaria (CUU08) — 1 tabla

| Tabla | Columnas | FK | Índices |
|---|---|---|---|
| `MachineActivities` | id PK · machineId text → Machines.id · type text (MachineActivityType) · date dt · liters real? · receipt text? · cost real? · spareParts text? · usageHours real? · hectares real? · companyId text? → Companies.id · observations text? · createdAt · updatedAt | machineId, companyId? | `idx_machine_activities_machine_date` (machineId,date) |

### Infraestructura — 2 tablas

| Tabla | Columnas | FK | Índices |
|---|---|---|---|
| `Photos` | id PK · entityType text (PhotoEntityType) · entityId text (**polimórfico, sin FK**) · localPath text · orderIndex int=0 · createdAt | — | `idx_photos_entity` (entityType,entityId) |
| `SyncQueue` | id PK · entity text · entityId text (sin FK) · operation text (SyncOperation) · status text (SyncStatus)=PENDING · attempts int=0 · lastError text? · createdAt · updatedAt | — | `idx_sync_queue_status_created` (status,createdAt) |

Enums de dominio (`domain/models/enums.dart`): `DailyReportStatus {PENDING_APPROVAL, APPROVED, REJECTED}` · `ReceptionStatus {PENDING_VALIDATION, VALIDATED, REJECTED}` · `MachineActivityType {FUEL, MAINTENANCE, REPAIR, FIELD_USAGE}` · `MachineStatus {ACTIVE, OUT_OF_SERVICE}` · `PhotoEntityType {DAILY_REPORT, RECEPTION}` · `SyncOperation {CREATE, UPDATE, DELETE}` · `SyncStatus {PENDING, PROCESSING, DONE, FAILED}` · `UserRole` (texto tal cual llega del backend). `Recipe.status` queda text; valores a definir con backend (no inventar).

Patrón no obvio (representativo):

```dart
@TableIndex(name: 'idx_daily_reports_status_date', columns: {#status, #date})
@DataClassName('DailyReport')
class DailyReports extends Table {
  TextColumn get id => text().clientDefault(() => const Uuid().v4())();
  TextColumn get lotId => text().references(Lots, #id)();
  RealColumn get hectares => real()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  @override
  Set<Column> get primaryKey => {id};
}
```

`AppDatabase` (`data/services/app_database.dart`): `@DriftDatabase(tables: [ ...18 ])`, `schemaVersion = 1`, `beforeOpen` con `PRAGMA foreign_keys = ON`. Código generado con `build_runner` (drift_dev).

## 4. Puertos y casos de uso

**15 puertos** en `domain/repositories/` (un archivo por puerto, capacidades no tecnologías):

| Puerto | Métodos clave | Consumido por |
|---|---|---|
| `AuthRepository` (contrato movido desde data/) | `login(email, password)` | LoginUseCase |
| `SessionRepository` | `save(Session)`, `current()`, `clear()` | CUU00 |
| `DailyReportRepository` | `create(report, items)`, `watchPending()`, `watchByFilter(...)`, `updateStatus(id, status, ...)` | CUU05 |
| `ReceptionRepository` | `create(reception, items)`, `watchPending()`, `validateAndApplyStock(id, validatedBy)` (status→VALIDATED + incremento de Stock en la misma tx) | CUU06 |
| `StockRepository` | `upsertIncrement(clientId, inputId, delta)`, `watchByClient(clientId)` | CUU06 |
| `MachineActivityRepository` | `create(activity)`, `watchByMachine(machineId, from, to)` | CUU08 |
| `PhotoRepository` | `add(Photo)`, `watchByEntity(type, id)`, `delete(id)` | transversal |
| `ClientReader` / `CompanyReader` / `LaborTypeReader` / `InputReader` | `watchAll()`, `getById(id)` | selectores |
| `FarmReader` | `watchByClient(clientId)` | selectores |
| `LotReader` | `watchByFarm(farmId)`, `getById(id)` | CUU05 |
| `MachineReader` | `watchByCompany(companyId)`, `getById(id)` | CUU08 |
| `RecipeReader` | `watchByLot(lotId)`, `getById(id)` | precarga de items del parte |

**12 use cases** en `domain/usecases/` (uno por `execute`):

| Use case | CUU | Orquesta |
|---|---|---|
| `LoginUseCase` | 00 | AuthRepository.login → SessionRepository.save |
| `RestoreSessionUseCase` | 00 | SessionRepository.current |
| `LogoutUseCase` | 00 | AuthRepository.logout (best-effort) + SessionRepository.clear |
| `CreateDailyReportUseCase` | 05 | status inicial PENDING_APPROVAL; cabecera+items en una tx |
| `ListDailyReportsUseCase` | 05 | watch con filtro estado/fecha |
| `CreateReceptionUseCase` | 06 | status inicial PENDING_VALIDATION |
| `ListPendingReceptionsUseCase` | 06 | watchPending |
| `ValidateReceptionUseCase` | 06 | validateAndApplyStock (valida + Stock + SyncQueue atómico) |
| `RegisterMachineActivityUseCase` | 08 | create según type (campos nullable) |
| `ListMachineActivitiesUseCase` | 08 | watchByMachine |
| `AddPhotoUseCase` | 05/06 | copia archivo a app-docs + fila Photo |
| `WatchStockUseCase` | 06 | watchByClient para KPI |

## 5. Decisiones y tradeoffs

| # | Opción | Tradeoff | Decisión |
|---|---|---|---|
| D1 | **drift** vs sqflite / Hive / Isar | Tipado + migraciones + watch streams vs SQL crudo / KV sin joins | **drift**: ORM tipado, queries reactivas (`watch`) que reemplazan state-management complejo. Hive queda para cache futuro, no Sprint 1 |
| D2 | **setState + ChangeNotifier** vs Riverpod/Bloc | Menos boilerplate ahora, migración después vs potencia inmediata | **setState** (restricción del sprint); la reactividad real la dan streams de drift, así el swap a Riverpod en el futuro toca solo ViewModels |
| D3 | **MachineActivity tabla única** (campos nullable) vs tabla por tipo | Consultas simples + UI unificada vs NULLs semánticos | **Tabla única** (decisión del proposal); el enum `type` + validación en use case disciplina los campos |
| D4 | **Stock explícito** vs calcular on-the-fly desde recepciones | Lectura O(1) vs riesgo de divergencia | **Tabla explícita** con UNIQUE(clientId,inputId), actualizada en la misma tx que la validación |
| D5 | **Photo genérica** (entityType+entityId) vs tablas por entidad | 1 tabla polimórfica sin FK vs integridad referencial | **Genérica** (decisión del proposal); índice (entityType,entityId) compensa; sin FK por diseño |
| D6 | **version+deleted solo catálogos** vs en todas las entidades | Payload de sync liviano para catálogos; producción se sincroniza por cola | **Solo catálogos** (pull por versión); producción usa SyncQueue |
| D7 | **Naming inglés** espejando Prisma vs español | Consistencia móvil↔backend vs comentarios en español | **Inglés** para tablas/columnas/modelos (contrato §2); UI y docs en español |
| D8 | FKs: `Session.companyId` **sin FK**; producción con FK | Login ocurre antes del seed de catálogos → FK rompería el insert | Session sin FK (infra-local); FKs solo donde la UI garantiza el catálogo (selectores) |
| D9 | **Outbox transaccional en el adaptador drift** vs encolar desde use case | Atomicidad garantizada entidad+cola vs dominio contaminado de infra | El **adaptador** inserta SyncQueue en la misma transacción; el dominio no conoce la cola |
| D10 | Refactor auth: contrato `AuthRepository` → `domain/repositories`, impl → `data/repositories/http_auth_repository.dart`, `LoginViewModel` usa `LoginUseCase` | Toca código que funciona vs deuda de arquitectura | **Sí** — es el anti-patrón que prohíben las convenciones (VM no crea repos) |

## 6. Cambios de archivos

| Archivo | Acción | Descripción |
|---|---|---|
| `packages/mobile/pubspec.yaml` | Modify | + `drift`, `drift_flutter`, `path_provider`, `path`, `uuid`; dev: `drift_dev`, `build_runner` |
| `lib/data/services/app_database.dart` | Create | AppDatabase, 18 tablas, schemaVersion 1, FK pragma |
| `lib/data/services/tables/{catalog,session,production,stock,machine,infra}_tables.dart` | Create | Definiciones drift (6 archivos) |
| `lib/domain/models/{enums,session,daily_report,reception,stock,machine_activity,photo,catalogs}.dart` | Create | Entidades puras + enums |
| `lib/domain/repositories/*.dart` | Create | 15 puertos (abstract) |
| `lib/domain/usecases/*.dart` | Create | 12 use cases |
| `lib/data/repositories/drift_{session,daily_report,reception,stock,machine_activity,photo,catalog_readers}.dart` | Create | Adaptadores drift (tx entidad+SyncQueue) |
| `lib/data/repositories/http_auth_repository.dart` | Create | Impl http (extraída del archivo actual) |
| `lib/data/models/*.dart` | Create | Mappers fila↔dominio |
| `lib/app/reports/`, `lib/app/receptions/`, `lib/app/machinery/` | Create | `*_view_model.dart` + `*_view.dart` por pantalla |
| `lib/data/repositories/auth_repository.dart` | Modify | Queda solo el contrato → mover a `domain/repositories/auth_repository.dart` |
| `lib/app/auth/login_view_model.dart` | Modify | Depende de `LoginUseCase` inyectado |
| `lib/app/home/home_view.dart` | Modify | Dashboard con navegación CUU05/06/08 |
| `lib/main.dart` | Modify | Composition root completo (AppDatabase singleton → adapters → use cases → VMs) |

## 7. Preparación del sync (contrato Sprint 2 — NO implementar ahora)

- **Escritores (Sprint 1):** cada adaptador drift, en la misma transacción del write, inserta en `SyncQueue`: `(entity, entityId, operation, status=PENDING, attempts=0)`. Entities encoladas: `DAILY_REPORT`, `RECEPTION`, `MACHINE_ACTIVITY`, `PHOTO`, `STOCK`. Los items viajan **embebidos en el payload del padre** (no se encolan solos).
- **Lectores (Sprint 2 `SyncEngine`, data/services):** `SELECT * FROM sync_queue WHERE status IN (PENDING, FAILED) AND attempts < MAX ORDER BY createdAt ASC` → marcar `PROCESSING` → push al backend → éxito: `DONE` (se retiene para auditoría, purga posterior); fallo: `attempts+1`, `lastError`, vuelta a `PENDING`.
- **Payload:** no se persiste snapshot; el SyncEngine **reconstruye** la entidad + items por query (una sola fuente de verdad).
- **Catálogos:** nunca se encolan; se bajan por pull versionado (`GET ?sinceVersion=`) aplicando upsert + `deleted` (server-wins).
- **Conflictos producción:** propuesta last-write-wins por `updatedAt` — a confirmar en Sprint 2.
- **UI:** `watch` sobre `SyncQueue` habilita un badge "pendientes de sincronización" sin tocar el dominio.

## 8. Estrategia de testing

| Capa | Qué | Cómo |
|---|---|---|
| Unit | 12 use cases (éxito + fallo principal) | Fakes en memoria de los puertos |
| Adaptador | Repos drift: inserts, watch, UNIQUE Stock, tx entidad+SyncQueue | `NativeDatabase.memory()` |
| ViewModel | Login + nuevos VMs | Fake use cases, `flutter_test` |
| Widget | Formularios CUU05/06/08 | Happy path + errores de validación |
| Import-boundary | domain sin drift/flutter | grep en CI (`verification: flutter test`) |

## 9. Migración / rollout

`schemaVersion = 1`, `onCreate` solo (no hay datos productivos). Seed de catálogos en dev vía fixtures JSON (no hay sync hasta Sprint 2). El refactor de auth (D10) es el único cambio sobre código existente y preserva la UI de login.

## 10. Preguntas abiertas

- [ ] Relación multi-firma `Client ↔ Company` sin modelar en backend (contrato §3.5) — impacta el selector de firma del login (hoy `_selectedFirmaId` hardcodeado).
- [ ] Unificación enums español/inglés (§3.3): mapear en adaptador sync vs migrar backend.
- [ ] `TaskType` sin `version`/`deleted` en Prisma (§3.4).
- [ ] Valores concretos de `Recipe.status`.
- [ ] Estrategia definitiva de seed de catálogos pre-sync (fixtures vs carga manual).
