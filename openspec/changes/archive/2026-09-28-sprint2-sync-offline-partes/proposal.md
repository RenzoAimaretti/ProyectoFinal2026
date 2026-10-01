# Proposal — Sprint 2: Motor de Sincronización Offline & Endpoints API de Partes

## Intent

Conectar la base local drift del móvil (Sprint 1) con el backend Prisma/Postgres: un **motor de sync offline-first** que drena la `SyncQueue` (outbox) hacia la API, empezando por el **parte diario** (CUU05), única entidad con endpoint nuevo de backend en este sprint.

## Scope

Responsable: **Ignacio — Dev 1 (Mobile & Sync)**.

### En alcance

- Motor de sync genérico en `packages/mobile`: dispatcher por entidad sobre la `SyncQueue`, con retry/backoff, estados PENDING/PROCESSING/DONE/FAILED y gate de conectividad.
- Endpoint backend de **DailyReport** (POST idempotente + GET): `packages/backend/src/entities/daily-report/` ya tiene el hexágono completo; falta el `adapters/inbound` (controller).
- Handler `DAILY_REPORT` end-to-end: drift → payload wire → API → confirmación.
- Boundary mapper de enums EN (móvil) ↔ ES (backend) en la capa `data` del móvil.
- Persistencia del `refreshToken` en la sesión local + refresh-on-401.

### Fuera de alcance

- Endpoints de reception, stock, photo, machine-activity, client, input, recipe.
- Aprobación/rechazo web del parte (Sprint 2 web, otro dev).
- Migración de enums del backend (se resuelve con mapping en el móvil).
- Down-sync de catálogos (tareas/lotes/recetas): siguen con seed demo (ver Open Questions).

## Approach

**Fase A — infraestructura de sync (móvil, sin backend).** `SyncEngine` en `domain/` (sin imports drift/http) orquesta: lee filas PENDING en FIFO vía puerto `SyncQueuePort`, las marca PROCESSING, despacha por `entity` a un registry de handlers (solo `DAILY_REPORT` registrado; entidades desconocidas quedan PENDING para sprints futuros), y marca DONE/FAILED según resultado. Retry: backoff exponencial, máx. 5 intentos; **4xx → FAILED inmediato** (poison message no reintenta ni bloquea la cola); 5xx/red → reintenta. Gate con `connectivity_plus` (la reconexión dispara sync). Wiring en `main.dart`.

**Fase B — endpoint DailyReport + E2E.** Controller fino siguiendo el patrón `task.controller.ts`: `JwtAuthGuard`, scope `req.user.firmaId` (companyId), `operatorId` de `req.user.id`; delega en los use cases ya exportados por `DailyReportModule`. POST idempotente vía id cliente.

## Decisions

1. **Push-only outbox con dispatcher genérico**: el engine no conoce entidades; los handlers se registran por string (`SyncEntity`). Extensión futura sin tocar el engine.
2. **Wire contract = contrato del backend**: el payload es `{id, taskId, date, hectares, hours, items[]}` — **sin** `lotId/taskTypeId/companyId/operatorId` (`CreateDailyReportInput` deriva lot/taskType de la task; company es el scope del caller). El snapshot móvil (lotId/laborTypeId/companyId) queda **solo local** para display offline. Tradeoff: si la task cambió server-side, la deriva del backend manda (autoridad).
3. **Idempotencia por id cliente**: el uuid local viaja como `id`; el repositorio trata unique-violation (P2002) como éxito y devuelve el existente. Sin columnas nuevas ni `Idempotency-Key`. Tradeoff: exige PK generada en cliente en toda entidad sync futura (ya es la convención drift).
4. **Enums en boundary mapper** (`data/models/mappers/`): `PENDING_APPROVAL↔PENDIENTE_APROBACION`, etc. No se toca el backend.
5. **`refreshToken` en tabla Session** (migración drift aditiva) + refresh-on-401 con un único retry; refresh inválido → sesión limpia → re-login. Tradeoff: token en SQLite plano (MVP) vs `flutter_secure_storage` (hardening futuro).
6. **`connectivity_plus`** como gate/trigger (nueva dep). Tradeoff: dependencia extra vs sync inmediato al recuperar señal (crítico a campo); los fallos de red igual dejan la fila PENDING.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/mobile/lib/domain/services/sync_engine.dart` | New | Orquestador outbox (puertos, sin drift/http) |
| `packages/mobile/lib/domain/repositories/sync_queue_repository.dart`, `daily_report_remote_repository.dart` | New | Puertos del engine |
| `packages/mobile/lib/data/services/daos/sync_queue_dao.dart` | Modified | Updates de status/attempts/lastError |
| `packages/mobile/lib/data/services/daily_report_api_service.dart` | New | HTTP POST/GET de partes |
| `packages/mobile/lib/data/models/mappers/enum_wire_mapper.dart` | New | Boundary EN↔ES |
| `packages/mobile/lib/domain/models/session.dart`, tabla Sessions, `http_auth_repository.dart` | Modified | Persistir refreshToken + refresh |
| `packages/mobile/lib/main.dart` | Modified | Wiring engine + handlers |
| `packages/backend/src/entities/daily-report/daily-report.controller.ts` (+ dto) | New | POST idempotente + GET, JwtAuthGuard |
| `packages/backend/src/entities/daily-report/daily-report.module.ts` | Modified | Registrar controller |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tasks demo-seed inexistentes en backend → 4xx al crear parte | Med | FAILED con `lastError` claro; down-sync de catálogos en sprint futuro |
| Poison message traba la cola | Med | FAILED no bloquea: se salta y sigue el siguiente PENDING |
| Expiración de token mid-sync | Med | Refresh-on-401 con un retry; sesión limpia si falla |
| Duplicados por retry | Low | Create idempotente por id cliente (P2002 → 200) |
| Divergencia snapshot local vs deriva server | Low | Backend es autoridad; snapshot local es solo display |

## Open Questions

- ¿En qué sprint entra el down-sync de catálogos (tasks/lots/inputs/recipes)? `GET /tasks` ya existe; planear pull como change aparte.
- ¿Filas DONE se borran o se retienen como auditoría? (recomendado: borrar; el badge solo cuenta PENDING).
- ¿Pull del estado del parte (aprobado/rechazado en web) hacia el móvil? Futuro.
- Parámetros exactos de backoff (defer a design).

## Rollback Plan

Todo es aditivo: el engine se revierte des-cableando `main.dart`; el controller se quita del módulo; la migración drift es una columna aditiva (no destructiva). La `SyncQueue` no cambia de esquema: las filas PENDING quedan intactas.

## Dependencies

- Backend NestJS corriendo con `JWT_SECRET` configurado.
- `POST /auth/refresh` ya existe (`auth.controller.ts`); el móvil solo persiste y usa el token.
- Nueva dep móvil: `connectivity_plus`.

## Success Criteria

- [ ] Parte creado offline aparece en Postgres al recuperar conexión, sin duplicarse ante retries.
- [ ] La cola avanza FIFO; un 4xx marca FAILED sin frenar el resto.
- [ ] Token renovado transparentemente (401 → refresh → retry).
- [ ] Tests: engine con fakes in-memory; mapper EN↔ES; controller thin.

## Artifacts

- `design.md`, `spec.md`, `tasks.md` (fases siguientes).
