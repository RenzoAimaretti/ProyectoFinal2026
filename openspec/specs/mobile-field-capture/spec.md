# Spec — Captura en campo offline (móvil)

**Origen:** `sprint1-flutter-ui-persistencia-local` (ADDED) + `sprint1-polish-operario-tareas` (MODIFIED), fusionados al archivarse el 2026-11-19.
**Alcance:** capa móvil **offline-first** (drift/SQLite). La sincronización está en `offline-sync-engine`.

## Propósito

Habilitar la captura en campo sin conectividad: toda escritura va a SQLite local y queda marcada en la `SyncQueue` para sincronizarse. **Sin dependencia de red para capturar.**

## Requirements

### Área 1 — Sesión (CUU00)

#### Requirement: Sesión local persistida
El móvil MUST persistir localmente la sesión del usuario logueado (`Session`: `userId`, `email`, `fullName`, `role`, `token`, `refreshToken?`, `companyId?`, `lastAccessedAt`) para operar offline.

- **GIVEN** un operario con credenciales válidas
- **WHEN** el login es exitoso
- **THEN** el móvil guarda la sesión en SQLite y la reutiliza en reaperturas sin conexión.

### Área 2 — Parte diario (CUU05) — R007, R008, R009

#### Requirement: El parte nace de una Tarea (R007)
El móvil MUST permitir cargar offline el parte diario y persistirlo en `DailyReport` con estado `PENDING_APPROVAL`. Todo parte MUST referenciar una `Task` (`DailyReport.taskId` obligatoria) y hereda de ella el lote y la labor. Una misma tarea admite múltiples partes (1 tarea → N jornadas). La unidad del parte es **1 operario + 1 jornada + 1 tarea**.

- **GIVEN** un operario sin conectividad con sesión local activa y tareas asignadas
- **WHEN** carga un parte con fecha, tarea, hectáreas, horas e ítems de consumo
- **THEN** el parte se persiste localmente `PENDING_APPROVAL`, ligado a la tarea, con lote y labor heredados, listo para sync.

#### Requirement: Fecha elegida por el operario (no `now()`)
El móvil MUST permitir que el operario elija la fecha del parte, con default hoy y **bloqueo de fechas futuras**.

- **GIVEN** un operario cargando un parte
- **WHEN** selecciona una fecha pasada o de hoy
- **THEN** el parte se registra con esa fecha.
- **WHEN** intenta seleccionar una fecha futura
- **THEN** el sistema la rechaza.

#### Requirement: Firma heredada del selector global
El móvil MUST asignar la firma (`companyId`) del parte desde el selector global de firma; el formulario no solicita firma.

- **GIVEN** una firma activa seleccionada en el dashboard
- **WHEN** el operario carga un parte
- **THEN** el parte queda asociado a esa firma sin pedirla de nuevo.

#### Requirement: Receta previa obligatoria (R009)
El móvil MUST exigir que el lote de la tarea tenga una `Recipe` (receta agronómica) para habilitar la carga del parte; sin receta no se habilita. Las recetas activas llegan con el catálogo de campo (ver `offline-sync-engine`, Área E).

- **GIVEN** un lote sin receta agronómica
- **WHEN** el operario intenta cargar el parte
- **THEN** el sistema bloquea la carga indicando la falta de receta.

#### Requirement: Fotografías de respaldo (R008)
El móvil MUST permitir adjuntar hasta **5 fotos opcionales** por parte (`Photo` genérica, `entityType=DAILY_REPORT`), con el archivo en filesystem y la ruta en DB.

- **GIVEN** un parte en captura con 5 fotos adjuntas
- **WHEN** el operario intenta adjuntar una 6.ª foto
- **THEN** el sistema rechaza la foto y mantiene el máximo de 5.

#### Requirement: Nombres resueltos en el listado
El móvil MUST mostrar en los listados los nombres de lote/labor (partes), cliente (recepciones) y máquina (maquinaria), resolviendo las FKs por JOIN en drift. No muestra IDs crudos.

- **GIVEN** un parte diario listado
- **WHEN** el operario ve la bandeja
- **THEN** ve "Lote 1 · Pulverización", no el UUID del lote.

### Área 3 — Recepción de insumos (CUU06) — R014, R017

#### Requirement: Recepción offline de insumos (R014)
El móvil MUST permitir registrar offline la recepción (insumo del catálogo + cantidad + unidad, hasta 5 fotos) y persistirla en `Reception` con estado `PENDING_VALIDATION`. No requiere número de remito.

- **GIVEN** un cliente entrega insumos en campo sin conectividad
- **WHEN** el operario registra los ítems y confirma
- **THEN** la recepción se persiste localmente `PENDING_VALIDATION`, lista para sync.

#### Requirement: Recepción en solo-lectura (sin validación en el móvil)
El móvil MUST NOT validar recepciones: la validación es responsabilidad del administrador/contratista en el web. La bandeja móvil lista **todas** las recepciones (cualquier estado) en modo solo-lectura.

- **GIVEN** un operario en la pestaña Recepciones
- **WHEN** observa la lista
- **THEN** ve todas las recepciones con su estado, sin botón de validación.

#### Requirement: Stock global por cliente, ingreso post-validación (R017)
El `Stock` MUST modelarse como **global por cliente** (`@@unique(clientId, inputId)`) y SOLO ingresar tras la validación (mutuo acuerdo), que ocurre en el web. El descuento por parte aprobado es responsabilidad del backend. El dashboard móvil no muestra KPI de stock.

### Área 4 — Maquinaria (CUU08) — R018, R019, R020, R021

#### Requirement: Registro de actividades de maquinaria
El móvil MUST permitir registrar actividades sobre máquina en `MachineActivity` (tabla única con campos nullable según tipo), en modo offline: **combustible** (litros + comprobante, R018), **mantenimiento/reparación** (costos + repuestos, R020) y **uso en campo** (horas + hectáreas, R021).

- **GIVEN** un operario autenticado y una máquina registrada
- **WHEN** registra una actividad de cualquiera de los tipos soportados
- **THEN** la actividad se persiste localmente y actualiza el historial de la máquina.

#### Requirement: Costo discriminado por firma (R019)
El móvil MUST asignar el gasto de combustible a una firma/razón social (`companyId`) para no mezclar costos entre unidades de negocio.

- **GIVEN** un registro de combustible
- **WHEN** se asocia la firma/razón social
- **THEN** el costo queda discriminado por firma.

#### Requirement: Acumulación de horas/hectáreas y alerta (R021)
El móvil SHOULD acumular horas y hectáreas por máquina y alertar cuando se alcance el umbral de mantenimiento preventivo.

- **GIVEN** una máquina con horas/hectáreas acumuladas
- **WHEN** una actividad registrada alcanza el umbral
- **THEN** el sistema alerta sobre el mantenimiento preventivo correspondiente.

## Estados

| Entidad | Estados |
|---------|---------|
| `DailyReport` | `PENDING_APPROVAL` → `APPROVED` / `REJECTED` |
| `Reception` | `PENDING_VALIDATION` → `VALIDATED` / `REJECTED` |
| `Task` | `PENDING` / `IN_PROGRESS` / `COMPLETED` / `CANCELLED` (solo lectura en móvil) |

## Pendientes

- R016 no definido en la spec de insumos (salta R015 → R017).
- Umbrales de horas/hectáreas por tipo de máquina (R021).
- Origen del costo por parte para rentabilidad (tarifario por firma, R032): Sprint 4.
