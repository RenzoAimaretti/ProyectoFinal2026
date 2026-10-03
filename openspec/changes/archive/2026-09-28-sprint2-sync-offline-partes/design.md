# Design: Sprint 2 — Motor de Sincronización Offline & Endpoint API de Partes

## 1. Enfoque

Outbox **push-only** en tres capas: (1) `SyncEngine` en `domain/` del móvil — genérico, sin drift/http — drena la `SyncQueue` FIFO y despacha por string a handlers registrados; (2) handler concreto `DAILY_REPORT` en `data/` que resuelve el registro desde drift y hace HTTP vía un puerto de dominio; (3) endpoint idempotente `POST /daily-reports` en NestJS reusando el hexágono completo de `daily-report` (solo falta el inbound). Enums EN↔ES se mapean en el boundary del móvil (el backend no cambia su schema); `refreshToken` pasa a la tabla `Sessions` (migración drift aditiva) con refresh-on-401 de un solo retry. Corresponde a la Fase A (motor, sin backend) y Fase B (endpoint + E2E) del proposal.

## 2. Decisiones de arquitectura

### 2.1 Composición del motor

| Opción | Tradeoff | Decisión |
|---|---|---|
| Engine en `domain/` vs `data/` | domain exige puertos para todo; data acoplaría orquestación a drift | **domain** — FIFO/estados/backoff son regla de negocio; drift/http quedan atrás de puertos |
| Handler abstracto (domain) + concreto (data) vs handler concreto en domain | concreto en domain = dominio conoce wire/HTTP | **abstracto en domain, `DailyReportSyncHandler` en data** |
| Registry `Map<String, SyncEntityHandler>` vs switch por entidad | switch toca el engine por cada entidad nueva | **map** — extensión sin tocar engine (spec A1) |
| Fila sin handler → FAILED vs queda PENDING | FAILED la excluye para siempre; PENDING habilita sprint futuro | **queda PENDING** y el ciclo la salta (spec A1) |
| Retry in-place por fila vs requeue y re-leer batch | in-place serializa (una fila lenta demora las siguientes) | **in-place** — simple y determinista; colas de campo son chicas (≤ decena de filas/día) |

Contratos (todos verificados contra el layout actual `domain/{models,repositories,usecases}`):

```dart
// domain/models/sync_queue_item.dart — fila leída de la cola
class SyncQueueItem {
  final String id;         // id de la FILA de cola
  final String entity;     // 'DAILY_REPORT' | ...
  final String entityId;   // id del registro drift (uuid clientDefault)
  final SyncOperation operation;
  final int attempts;
}

// domain/repositories/sync_queue_repository.dart
abstract class SyncQueuePort {
  Future<List<SyncQueueItem>> nextPendingBatch({int limit}); // FIFO por createdAt asc
  Future<void> markProcessing(String id);
  Future<void> markDone(String id);                   // DONE + delete (spec A2)
  Future<void> requeue(String id, String lastError);  // → PENDING, attempts+1 (spec A3/A5)
  Future<void> markFailed(String id, String lastError); // → FAILED, attempts+1
  Future<void> recoverInterrupted();                   // PROCESSING huérfanas → PENDING
}

// domain/services/sync_entity_handler.dart
abstract class SyncEntityHandler {
  /// Lanza SyncRetriableException (5xx/red) o SyncPermanentException (4xx).
  Future<void> handle(SyncQueueItem item);
}

// domain/services/sync_delay_port.dart — abstracción de backoff (testeable)
abstract class SyncDelayPort {
  Future<void> delay(Duration duration);
}

// domain/services/sync_engine.dart
class SyncEngine {
  SyncEngine({
    required SyncQueuePort queue,
    required Map<String, SyncEntityHandler> handlers,
    required SyncDelayPort delayer,
    SyncBackoffPolicy backoff = const SyncBackoffPolicy(),
  });
  Future<void> runCycle();
}
```

`runCycle()` es la única API pública (guard `_running` contra reentrancia; sin timers — los disparadores son wiring, §2.7, lo que mantiene al engine puro y determinista en tests):

1. `recoverInterrupted()` — un crash a mitad de push deja filas PROCESSING inaccesibles; al arrancar vuelven a PENDING.
2. Loop por batches (`nextPendingBatch(limit: 10)`): fila sin handler → skip (queda PENDING); con handler → `markProcessing` → `handle`.
3. Éxito → `markDone` (setea DONE y borra en la misma transacción — DONE es efímero, spec A2). `SyncPermanentException` → `markFailed` (conserva, `lastError`; poison: sigue con la siguiente PENDING). `SyncRetriableException` → `requeue(attempts+1)` + `delay(backoff)` + reintenta la misma fila in-place hasta `maxAttempts`.
4. El ciclo termina cuando un batch no progresa (solo filas sin handler) o la cola está vacía.

`markDone` se define "DONE + delete" en un solo método del DAO para que la transición sea verificable en tests con drift in-memory sin retener filas.

Excepciones nuevas en `domain/errors.dart` (junto a las existentes): `SyncRetriableException`, `SyncPermanentException`, `SyncUnauthorizedException` (401 — la maneja el handler, no el engine).

### 2.2 Backoff — parámetros concretos

| Parámetro | Valor | Justificación (spec A3) |
|---|---|---|
| Base | **2 s** | reintento temprano (un blip 5xx típico dura <1 min) |
| Factor | **2** (exponencial) | spec: "backoff exponencial" |
| Delay máx | **30 s** | acota el peor caso del ciclo: 2+4+8+16 = 30 s |
| Intentos máx | **5** (totales, contando el primero) | spec: "máx. 5 intentos" |
| 4xx | **FAILED inmediato, sin retry** | spec: poison message "no reintenta ni bloquea la cola" |

La cuenta de intentos vive en la columna `attempts` (incrementada por el DAO en cada requeue/markFailed); el engine calcula el delay como `min(base·2^(attempt−1), 30 s)` a partir del `attempts` de la fila.

### 2.3 Idempotencia por id cliente (backend)

Verificado: `CreateDailyReportUseCase` **no** maneja duplicados, `PrismaDailyReportRepository.create` **no** pasa `id` ni atrapa P2002 (hoy Prisma genera el uuid con `@default(uuid())`), y `CreateDailyReportInput` no tiene `id`. Cambio mínimo:

1. `application/daily-report.types.ts`: `id?: string` en `CreateDailyReportInput` y `CreateDailyReportData`.
2. `application/use-cases/create-daily-report.use-case.ts`: valida el id si viene (`assertRequiredString`) y lo pasa al repo. **Sin pre-read**: insert-first evita TOCTOU y un round-trip extra.
3. `adapters/outbound/prisma-daily-report.repository.ts`: pasa `id: data.id` (undefined → aplica el default de Prisma) y atrapa P2002:

```ts
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' && data.id) {
    const existing = await this.findByIdForCompany(data.id, data.companyId);
    if (existing) return existing; // duplicado = éxito (200 con el existente, spec B2)
  }
  throw error;
}
```

La única unique constraint de `DailyReport` es el PK (verificado en `schema.prisma`) → P2002 ≡ id duplicado. El catch vive en el **repo**: traduce error de infraestructura a resultado de aplicación y el use case sigue sin Prisma (convenciones §Error Handling). Sin header `Idempotency-Key` ni columnas nuevas — exige PK generada en cliente, que ya es la convención drift (`clientDefault`).

### 2.4 Controller thin — `adapters/inbound/daily-report.controller.ts`

| Aspecto | Decisión |
|---|---|
| Ubicación | `adapters/inbound/` (layout hexagonal del repo); NO en la raíz del módulo como los `task.controller.ts` legacy |
| Delegación | injecta los 4 use cases ya provistos por el módulo — sin `*Service` intermedio: el módulo es hexagonal completo y las convenciones dicen "controllers thin → use cases" |
| Rutas | `POST /daily-reports`, `GET /daily-reports`, `GET /daily-reports/:id`, todas `@UseGuards(JwtAuthGuard)` |
| Scope | `req.user.firmaId` → `companyId`; `req.user.id` → `operatorId` (verificado en `jwt.strategy.ts`) |
| DTO | `{ id, taskId, date, hectares, hours, items[{inputId, quantity, unit}] }` — el input al use case se construye por selección explícita de campos: `lotId/taskTypeId/companyId/operatorId` del body **nunca se leen** (spec B1) |
| Errores | traducción en el controller (convenciones): `EntityNotFoundError`→404, `InvalidInputError`/`InvalidRelationError`→400 |

**Cambio en el use case** para cumplir spec B3 (404 claro ante catálogo faltante): task inexistente e inputs inexistentes pasan de `InvalidRelationError` (→400) a **`EntityNotFoundError`** (→404). Racional: distingue "referencia inexistente" (data del cliente → FAILED permanente en el sync, no reintentable) de "violación de scope" (tenant cruzado → sigue 400). El message actual ya es claro; solo cambia la clase. Company faltante sigue `InvalidRelationError` (proviene del JWT, no del body).

Registro: `daily-report.module.ts` agrega `controllers: [DailyReportController]` (los use cases ya son providers del módulo, injectables por clase).

### 2.5 Boundary mapper de enums — `data/models/enum_wire_mapper.dart`

Ubicación: **plano en `data/models/`, junto a `enum_converters.dart`** (misma familia: converters enum↔texto). Desviación del proposal (`data/models/mappers/`): el repo no tiene subcarpeta `mappers/` — crearla para un solo archivo inventa estructura.

| Enum (EN móvil) | Wire (ES backend, verif. `schema.prisma`) | Incoming sin contraparte EN |
|---|---|---|
| DailyReportStatus | PENDING_APPROVAL↔PENDIENTE_APROBACION · APPROVED↔APROBADO · REJECTED↔RECHAZADO | — |
| ReceptionStatus | PENDING_VALIDATION↔PENDIENTE_VALIDACION · VALIDATED↔VALIDADA · REJECTED↔RECHAZADA | — |
| MachineActivityType | FUEL↔COMBUSTIBLE · MAINTENIMIENTO↔MANTENIMIENTO · REPAIR↔REPARACION · FIELD_USAGE↔USO_CAMPO | — |
| MachineStatus | ACTIVE↔ACTIVA · OUT_OF_SERVICE↔FUERA_SERVICIO | `MANTENIMIENTO` |
| PhotoEntityType | DAILY_REPORT↔PARTE_DIARIO · RECEPTION↔RECEPCION | `ACTIVIDAD_MAQUINARIA` |

Contrato espejo de `enum_converters.dart`: `toWire(e)` es total (enum cerrado, nunca falla); `fromWire(String) → enum?` devuelve **null** ante valor desconocido y el caller lo ignora (spec D: "valor extra que el móvil no modela y debe ignorar en el mapeo"). Ojo: **dos** valores incoming no modelados, no uno — `ACTIVIDAD_MAQUINARIA` (PhotoEntityType) y `MANTENIMIENTO` (MachineStatus, que el móvil no tiene en `MachineStatus`).

Consumidores este sprint: el POST no viaja `status` (el backend fuerza `PENDIENTE_APROBACION` al crear), así que el mapper se ejercita en los GET de reconciliación del `DailyReportApiService` (status ES→EN) y en sus tests; `RECEPTION`/`MACHINE_ACTIVITY`/`PHOTO` lo consumen en sprints próximos.

### 2.6 refreshToken: persistencia + refresh-on-401

**Persistencia** (verificado: hoy `HttpAuthRepository` retiene el refresh **en memoria** — comentario explícito en el archivo — y se pierde al reiniciar la app; `AuthApiService.refresh()` ya existe):

- `Sessions` (drift) + `TextColumn get refreshToken => text().nullable()()` — nullable porque `DemoLoginUseCase` crea sesión sin tokens (`token: ''`).
- `Session` (domain) + `String? refreshToken`; `copyWith` gana `token`/`refreshToken` (para persistir los renovados).
- `session_mapper.dart` mapea en ambas direcciones; migración `schemaVersion 2 → 3` (§6).
- `AuthRepository.logout()` → `logout({String? refreshToken})`; `LogoutUseCase` lee la sesión actual y pasa `session?.refreshToken`; `HttpAuthRepository.login` mapea `response.refreshToken` al `Session` (y `LoginUseCase` lo persiste sin cambios); se elimina el campo `_refreshToken` en memoria (fuente única: SQLite).

**Refresh-on-401 — retry explícito en el handler**:

| Opción | Tradeoff | Decisión |
|---|---|---|
| Interceptor `http.Client` global | cubre servicios futuros automáticamente | **No** — hoy hay un solo servicio autenticado; abstracción especulativa (anti-patrón en convenciones). Extraer cuando RECEPTION & co. tengan endpoint |
| Retry explícito en `DailyReportSyncHandler` | visible, un solo lugar | **Sí** — coincide literal con spec C2 ("refrescar una vez y reintentar") |

`TokenRefresher` (`data/repositories/token_refresher.dart`; deps `AuthApiService` + `SessionRepository`): lee sesión → si no hay `refreshToken` → clear + `SyncPermanentException`; `api.refresh(refreshToken)` → `copyWith(token, refreshToken)` + `save` → devuelve el access nuevo. Si el refresh falla (`AuthException`): `sessionRepository.clear()` + `SyncPermanentException('Sesión expirada…')` → la fila queda FAILED y el próximo arranque va a login (spec C2).

Handler: `push(token: session.token)` → `SyncUnauthorizedException` → `refreshAccessToken()` → **un** retry con el token nuevo. Solo un retry — si vuelve 401, el refresh ya falló o el token nuevo es inválido: FAILED.

**Gate demo**: si la sesión persistida no tiene token real (`token == ''`, modo demo) el wiring no dispara ciclos; las filas quedan PENDING (el sync es backend-only por definición).

### 2.7 Conectividad — `connectivity_plus`

| Opción | Tradeoff | Decisión |
|---|---|---|
| `connectivity_plus` (stream de red) | dep +1; "conectado" ≠ internet alcanzable | **Sí** — spec A5 exige disparar al recuperar señal: sin stream no existe el evento de reconexión, y un poller quemaría `attempts` estando offline |
| Timer periódico / solo manual | sin dep nueva | **No** — no cumple "dispara al recuperar conexión" a mitad de sesión y castiga batería |

Wiring **en `main.dart`** (la plataforma NO toca el dominio — el engine no sabe de conectividad):

- **Gate + triggers**: `Connectivity().onConnectivityChanged` (dispara ciclo al pasar a wifi/mobile), resume del app (`WidgetsBindingObserver`) y arranque post-restauración de sesión. Antes de cada ciclo: hay sesión con token no vacío y `Connectivity().checkConnectivity() != none` (evita quemar `attempts` offline).
- La conectividad es **heurística de trigger**: la sonda real sigue siendo el intento HTTP (falla de red → requeue, spec A5).
- Versión: `connectivity_plus: ^6.x` — única dep nueva del sprint (flaggeada en el proposal).

## 3. Flujo de datos

```
guardado local (repos drift) ──enqueueSync──▶ SyncQueue [PENDING]
                                                │
main.dart: arranque | reconexión | resume ──(gate sesión+red)──▶ SyncEngine.runCycle()
                                                │
               ┌────────────────────────────────┤
               │ recoverInterrupted() → PROCESSING huérfanas → PENDING
               │ nextPendingBatch() (FIFO) ──▶ markProcessing
               │        │
               │  handlers['DAILY_REPORT'] ──▶ DailyReportSyncHandler (data)
               │        │   drift: DailyReport + items (getById/itemsByReportId)
               │        │   payload {id, taskId, date, hectares, hours, items[]}
               │        │   HttpDailyReportRepository ──▶ POST /daily-reports (Bearer)
               │        │      401 ──▶ TokenRefresher ──▶ retry ×1 ──▶ sesión actualizada
               │        │      4xx ──▶ SyncPermanentException
               │        │      5xx/red ──▶ SyncRetriableException
               │        ▼
               │ NestJS: DailyReportController (firmaId→companyId, id→operatorId)
               │        └──▶ CreateDailyReportUseCase (deriva lot/taskType de la task)
               │                 └──▶ PrismaDailyReportRepository: P2002 ──▶ 200 existente
               ▼
  éxito ──▶ markDone (borra)   retriable ──▶ requeue + backoff (≤5)   4xx ──▶ markFailed (lastError)
```

## 4. Cambios de archivos

### Móvil (`packages/mobile/`)

| Archivo | Acción | Qué |
|---|---|---|
| `lib/domain/models/sync_queue_item.dart` | Create | modelo de fila de cola |
| `lib/domain/repositories/sync_queue_repository.dart` | Create | `SyncQueuePort` |
| `lib/domain/repositories/daily_report_remote_repository.dart` | Create | `push(DailyReport, items, {token})` — lanza excepciones sync |
| `lib/domain/services/sync_engine.dart` | Create | `SyncEngine` + `SyncBackoffPolicy` |
| `lib/domain/services/sync_entity_handler.dart` | Create | abstracto `SyncEntityHandler` |
| `lib/domain/services/sync_delay_port.dart` | Create | puerto de delay (backoff testeable) |
| `lib/domain/errors.dart` | Modify | + `SyncRetriableException` / `SyncPermanentException` / `SyncUnauthorizedException` |
| `lib/domain/models/session.dart` | Modify | + `refreshToken?`; `copyWith(token/refreshToken)` |
| `lib/domain/repositories/auth_repository.dart` | Modify | `logout({String? refreshToken})` |
| `lib/domain/usecases/logout_usecase.dart` | Modify | pasa `session?.refreshToken` |
| `lib/data/services/daos/sync_queue_dao.dart` | Modify | + `nextPendingBatch` / `markProcessing` / `markDone` / `requeue` / `markFailed` / `recoverInterrupted` |
| `lib/data/services/daos/daily_reports_dao.dart` | Modify | + `getById` / `itemsByReportId` (no existen hoy — verificado) |
| `lib/data/services/tables/session_tables.dart` | Modify | + columna `refreshToken` (nullable) |
| `lib/data/services/app_database.dart` | Modify | schemaVersion 3 + migración |
| `lib/data/models/session_mapper.dart` | Modify | mapea `refreshToken` en ambas direcciones |
| `lib/data/models/enum_wire_mapper.dart` | Create | EN↔ES (§2.5) |
| `lib/data/repositories/drift_sync_queue_store.dart` | Create | `SyncQueuePort` sobre el DAO |
| `lib/data/repositories/daily_report_sync_handler.dart` | Create | handler `DAILY_REPORT`: drift→payload→push; 401→refresh→retry ×1 |
| `lib/data/repositories/http_daily_report_repository.dart` | Create | impl del puerto remoto (naming espejo de `http_auth_repository.dart`) |
| `lib/data/repositories/token_refresher.dart` | Create | refresh + persistencia + clear-on-fail |
| `lib/data/repositories/http_auth_repository.dart` | Modify | login mapea refreshToken; `logout(refreshToken)`; sin estado en memoria |
| `lib/data/services/daily_report_api_service.dart` | Create | POST/GET/GET:id + clasificación 401/4xx/5xx/red |
| `lib/data/services/flutter_sync_delayer.dart` | Create | `SyncDelayPort` → `Future.delayed` |
| `lib/main.dart` | Modify | wiring engine + handler + triggers (conectividad/resume/arranque) |
| `pubspec.yaml` | Modify | + `connectivity_plus: ^6.x` |

### Backend (`packages/backend/src/entities/daily-report/`)

| Archivo | Acción | Qué |
|---|---|---|
| `adapters/inbound/daily-report.controller.ts` | Create | POST idempotente + GET/GET:id, JwtAuthGuard, traducción de errores (§2.4) |
| `application/daily-report.types.ts` | Modify | `id?` en `CreateDailyReportInput` / `CreateDailyReportData` |
| `application/use-cases/create-daily-report.use-case.ts` | Modify | pasa `id`; task/inputs faltantes → `EntityNotFoundError` (404) |
| `adapters/outbound/prisma-daily-report.repository.ts` | Modify | pasa `id`; P2002 → devuelve existente (§2.3) |
| `daily-report.module.ts` | Modify | `controllers: [DailyReportController]` |

## 5. Testing

| Capa | Qué | Cómo |
|---|---|---|
| Unit (domain móvil) | `SyncEngine`: FIFO; sin-handler → PENDING; DONE borra; 4xx → FAILED inmediato; 5xx → requeue+backoff → FAILED a los 5; `recoverInterrupted` al inicio | fakes in-memory (estilo `test/domain/usecases/fakes.dart`) |
| Unit (mapper) | round-trip EN↔ES total; `ACTIVIDAD_MAQUINARIA`, `MANTENIMIENTO` y basura → null | table-driven, `test/data/models/enum_wire_mapper_test.dart` |
| Adaptador (drift) | `DriftSyncQueueStore`: lifecycle, FIFO, recover; `Session` persiste `refreshToken`; handler resuelve payload `{id, taskId, date, hectares, hours, items[]}` desde drift | `AppDatabase.forTesting(NativeDatabase.memory())` + `drift_test_helper.dart` |
| Adaptador (http) | `DailyReportApiService`: 200/401/404/500/SocketException → excepción correcta; `TokenRefresher`: ok persiste sesión nueva, fail limpia sesión | `http.Client` mockeado (pattern `auth_api_service_test.dart`) |
| Unit (backend) | id cliente → persiste; P2002 → devuelve existente; task inexistente → `EntityNotFoundError`; inputs faltantes → `EntityNotFoundError`; items vacíos → `InvalidInputError`; deriva lot/taskType de la task; operario/company del scope | actualiza `daily-report.use-cases.spec.ts` + `prisma-daily-report.repository.spec.ts` (los asserts actuales de `InvalidRelationError` para task/inputs cambian de clase) |
| Controller (backend) | DTO→input mapea `operatorId`/`companyId` del JWT e ignora extras del body; 404/400 según error; GET por firma | nuevo `adapters/inbound/daily-report.controller.spec.ts` |
| Boundary | `import_boundary_test.dart` sigue verde (domain sin drift/http/flutter) | existente |

Verificación: `flutter analyze` (0 errores) + `flutter test` + `npm test` (backend). Sin builds (regla del workspace).

## 6. Migración / Rollout

- **Drift 2 → 3** (aditiva, no destructiva — nullable, las filas existentes quedan en null):

```dart
if (from < 3) {
  await m.addColumn(sessions, sessions.refreshToken);
}
```

- **Backend**: sin migración Prisma — `id` ya es PK con `@default(uuid())` y pasarlo explícito no toca el schema (no hay delta para `contrato-esquema-prisma.md`).
- **Rollout aditivo**: revertir = des-cablear engine/triggers en `main.dart` + quitar `controllers:` del módulo; la `SyncQueue` no cambia de esquema y las filas PENDING sobreviven intactas.

## 7. Preguntas abiertas

- [ ] ¿Dónde se inspeccionan las filas FAILED (`lastError`)? Hoy quedan invisibles (el badge cuenta solo PENDING) — pantalla de diagnóstico, sprint futuro.
- [ ] ¿Disparar ciclo además tras cada guardado local (post-enqueue)? Evaluado y diferido: los 3 triggers (arranque/reconexión/resume) cubren el caso real; un callback data→engine cruzaría capas.
- [ ] Confirmar versión menor de `connectivity_plus` compatible con el SDK (^3.9.2) en apply.
- [ ] Down-sync de catálogos (tasks/lots/inputs): qué sprint — `GET /tasks` ya existe (open question del proposal).
