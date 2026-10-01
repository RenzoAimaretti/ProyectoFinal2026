# Delta Spec — Sprint 2: Motor de Sincronización Offline & API de Partes

**Change:** `sprint2-sync-offline-partes`
**Alcance:** conectar la base local drift (Sprint 1) con el backend: motor de sync offline-first sobre la outbox, endpoint `DailyReport` y persistencia del `refreshToken`. Solo `DAILY_REPORT` queda cableado end-to-end.

## Propósito

Drenar la `SyncQueue` local hacia la API con un motor **genérico** (dispatcher por `entity`, sin conocer entidades), estados `PENDING → PROCESSING → DONE | FAILED`, retry con backoff y gate de conectividad. El backend deriva lote/labor/operario/firma; el móvil mapea enums EN↔ES y refresca el token ante 401.

## ADDED Requirements

### Área A — Motor de sync offline (móvil)

#### Requirement: Drenado FIFO genérico por entidad
El motor MUST drenar la outbox en orden FIFO: lee filas `PENDING` vía `SyncQueuePort`, las marca `PROCESSING` y despacha por `entity` a un registry de handlers. El engine NO conoce entidades concretas (dispatcher por string `SyncEntity`).

- **GIVEN** dos filas PENDING de entidades distintas
- **WHEN** el motor corre un ciclo de sync
- **THEN** procesa la más antigua primero y la despacha al handler registrado para su `entity`.
- **WHEN** una entidad no tiene handler registrado
- **THEN** queda PENDING sin procesarse (habilitación futura sin tocar el engine).

#### Requirement: Ciclo de vida de la cola
Una fila de outbox MUST transicionar `PENDING → PROCESSING → DONE | FAILED`. Las filas `DONE` se **borran** (sin retención de auditoría). Las filas `FAILED` se **conservan** con `attempts+1` y `lastError`. El badge de sync cuenta **solo** `PENDING`.

- **GIVEN** una fila PENDING enviada con éxito
- **WHEN** el backend confirma la creación
- **THEN** la fila se elimina y no aparece en el badge.
- **GIVEN** una fila con error permanente (4xx)
- **WHEN** el motor la marca FAILED
- **THEN** se conserva con `attempts+1` y `lastError` descriptivo, y no cuenta en el badge.

#### Requirement: Retry con backoff y poison message
El motor MUST distinguir errores retriables de permanentes: **5xx/red** reintenta con backoff exponencial (máx. 5 intentos); **4xx** marca `FAILED` inmediato (poison message: no reintenta ni bloquea la cola).

- **GIVEN** una fila cuyo POST devuelve 500 o falla por red
- **WHEN** el motor procesa
- **THEN** reintenta con backoff exponencial hasta 5 intentos.
- **GIVEN** una fila cuyo POST devuelve 4xx
- **WHEN** el motor procesa
- **THEN** la marca FAILED sin reintentar y continúa con la siguiente PENDING.

#### Requirement: Push idempotente por id cliente
El push MUST ser idempotente: el uuid local del registro viaja como `id`; una violación de unicidad (P2002) en el backend se trata como éxito.

- **GIVEN** una fila ya confirmada que se reenvía (retry tras respuesta perdida)
- **WHEN** el backend recibe un `id` duplicado
- **THEN** devuelve éxito (el registro existente) y el móvil marca DONE sin duplicar.

#### Requirement: Gate de conectividad
El motor MUST gatear el sync por conectividad (`connectivity_plus`) y disparar sync al recuperar señal; un fallo de red deja la fila PENDING.

- **GIVEN** el dispositivo pierde la señal durante el envío
- **WHEN** el envío falla por red
- **THEN** la fila queda PENDING y el sync se dispara automáticamente al recuperar conexión.

### Área B — Endpoint DailyReport (backend)

#### Requirement: Contrato wire del POST
`POST /daily-reports` MUST aceptar solo `{ id, taskId, date, hectares, hours, items[] }`. El backend MUST derivar `lotId` y `taskTypeId` de la task referenciada, `operatorId` de `req.user.id` y `companyId` de `req.user.firmaId`, y MUST NOT aceptar esos campos desde el cliente.

- **GIVEN** un parte enviado con `id`, `taskId`, fecha, hectáreas, horas e ítems
- **WHEN** el backend lo recibe
- **THEN** deriva lote, tipo de labor, operario y firma desde la task y el JWT, ignorando cualquier valor del cliente.

#### Requirement: Idempotencia y lecturas de reconciliación
El POST MUST ser idempotente por `id` (P2002 → 200 con el existente). MUST existir `GET /daily-reports` y `GET /daily-reports/:id` para reconciliar.

- **GIVEN** un `id` ya persistido
- **WHEN** se reenvía el POST
- **THEN** el backend responde 200 con el parte existente, sin crear duplicado.
- **GIVEN** el móvil quiere reconciliar
- **WHEN** consulta `GET /daily-reports` o `/:id`
- **THEN** obtiene los partes de la firma del caller.

#### Requirement: Errores claros ante catálogos faltantes
Si la task, el lote o un insumo referenciado por el parte NO existe en el backend, el POST MUST responder un 4xx con mensaje claro (404), y el sync debe reflejarlo como FAILED con `lastError` descriptivo sin reintentar.

- **GIVEN** un parte cuya `taskId` no existe en el backend
- **WHEN** el móvil hace POST
- **THEN** el backend responde 404 con mensaje claro; la fila queda FAILED con `lastError` descriptivo y no reintenta.

#### Requirement: Derivación con tests de unidad
La lógica de derivación (task → lot/taskType; operario/company desde JWT) MUST estar cubierta por tests de unidad que verifiquen: task existente deriva correctamente; task inexistente → 4xx claro; operario/company desde JWT; ítems inválidos o vacíos rechazados.

- **GIVEN** una suite de tests de la derivación
- **WHEN** corre con task existente, task faltante, JWT sin datos e ítems vacíos
- **THEN** cada caso valida la derivación correcta o el error 4xx correspondiente.

### Área C — Sesión y refreshToken (móvil)

#### Requirement: Persistencia del refreshToken
El móvil MUST persistir el `refreshToken` en la tabla `Session` (migración drift aditiva) al hacer login.

- **GIVEN** un login exitoso que devuelve `refreshToken`
- **WHEN** el móvil guarda la sesión
- **THEN** el refreshToken queda persistido junto al token en SQLite.

#### Requirement: Refresh-on-401 con un retry
Ante un HTTP 401 durante el sync, el móvil MUST refrescar el token una vez y reintentar la petición; si el refresh falla, la fila queda FAILED y (para autenticación) la sesión se limpia forzando re-login.

- **GIVEN** una fila cuyo POST recibe 401
- **WHEN** el motor refresca el token
- **THEN** reintenta la petición una vez con el token nuevo.
- **GIVEN** un refresh que falla (token inválido)
- **WHEN** el móvil procesa
- **THEN** marca la fila FAILED y limpia la sesión para que el operario re-inicie sesión.

### Área D — Boundary mapper de enums

#### Requirement: Mapeo EN ↔ ES en el boundary
El móvil MUST mapear enums **EN→ES al enviar** y **ES→EN al recibir** en un boundary mapper de la capa `data`. Los enums del backend permanecen en español y **nunca** se migran. Cubre: `DailyReportStatus`, `ReceptionStatus`, `MachineActivityType`, `MachineStatus`, `PhotoEntityType`.

- **GIVEN** un parte con estado `PENDING_APPROVAL` (EN)
- **WHEN** se serializa para enviar
- **THEN** viaja como `PENDIENTE_APROBACION` (ES).
- **GIVEN** una respuesta del backend con `PENDIENTE_APROBACION`
- **WHEN** se deserializa en el móvil
- **THEN** se lee como `PENDING_APPROVAL`.
- **AND** `PhotoEntityType` del backend tiene `ACTIVIDAD_MAQUINARIA`, valor extra que el móvil no modela y debe ignorar en el mapeo.

## Pendientes / Fuera de alcance

- Solo `DAILY_REPORT` cableado end-to-end. `RECEPTION`, `MACHINE_ACTIVITY`, `PHOTO` y `STOCK` existen en la cola pero **sin endpoint backend** este sprint.
- Down-sync de catálogos (tasks/lots/inputs/recipes): change futuro.
- No hay migración de enums del backend.
