# Delta Spec — Sprint 1: App Flutter UI & Persistencia Local

**Change:** `sprint1-flutter-ui-persistencia-local`
**Alcance:** capa móvil **offline-first** (drift/SQLite). El motor de sync, la aprobación web y el backend quedan **fuera de este sprint** (Sprint 2).

## Propósito

Habilitar la captura en campo sin conectividad: toda escritura va a SQLite local y queda marcada `pending` para sincronización futura. **Sin dependencia de red para capturar.**

## ADDED Requirements

### Área 1 — Sesión (CUU00)

#### Requirement: Sesión local persistida
El móvil MUST persistir localmente la sesión del usuario logueado (`Session`: `userId`, `email`, `fullName`, `role`, `token`, `companyId?`, `lastAccessedAt`) para operar offline.

- **GIVEN** un operario con credenciales válidas
- **WHEN** el login es exitoso
- **THEN** el móvil guarda la sesión en SQLite y la reutiliza en reaperturas sin conexión.

### Área 2 — Parte diario (CUU05) — R007, R008, R009

#### Requirement: Carga offline del parte diario (R007)
El móvil MUST permitir cargar el parte diario (fecha, firma, lote, hectáreas, horas/jornada y labor) en modo offline y persistirlo en `DailyReport` con estado `PENDING_APPROVAL`. La unidad del parte es **1 operario + 1 jornada + 1 lote + 1 labor**.

- **GIVEN** un operario sin conectividad con sesión local activa
- **WHEN** carga el parte con fecha, firma, lote, hectáreas, labor e ítems de consumo
- **THEN** el parte se persiste localmente marcado `PENDING_APPROVAL`, listo para sync.

#### Requirement: Receta previa obligatoria (R009)
El móvil MUST exigir que el lote tenga una `Recipe` (receta agronómica) para habilitar la carga del parte; sin receta no se habilita.

- **GIVEN** un lote sin receta agronómica
- **WHEN** el operario intenta cargar el parte
- **THEN** el sistema bloquea la carga indicando la falta de receta.

#### Requirement: Fotografías de respaldo (R008)
El móvil MUST permitir adjuntar hasta **5 fotos opcionales** por parte (`Photo` genérica, `entityType=DAILY_REPORT`), con el archivo en filesystem y la ruta en DB.

- **GIVEN** un parte en captura con 5 fotos adjuntas
- **WHEN** el operario intenta adjuntar una 6.ª foto
- **THEN** el sistema rechaza la foto y mantiene el máximo de 5.

### Área 3 — Recepción de insumos (CUU06) — R014, R017

#### Requirement: Recepción offline de insumos (R014)
El móvil MUST permitir registrar offline la recepción (insumo del catálogo + cantidad + unidad, hasta 5 fotos) y persistirla en `Reception` con estado `PENDING_VALIDATION`. No requiere número de remito.

- **GIVEN** un cliente entrega insumos en campo sin conectividad
- **WHEN** el operario/admin registra los ítems y confirma
- **THEN** la recepción se persiste localmente `PENDING_VALIDATION`, lista para sync.

#### Requirement: Stock global por cliente, ingreso post-validación (R017)
El móvil MUST modelar el `Stock` como **global por cliente** (`@@unique(clientId, inputId)`) y SOLO ingresar stock tras la validación (mutuo acuerdo). El descuento automático por parte aprobado es cascade del backend (Sprint 2), no del móvil.

- **GIVEN** una recepción en estado `VALIDATED`
- **WHEN** el sistema procesa la validación
- **THEN** el stock del cliente se incrementa a nivel global (no por lote individual).

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

## Estados de validación

| Entidad | Estados |
|---------|---------|
| `DailyReport` | `PENDING_APPROVAL` → `APPROVED` / `REJECTED` |
| `Reception` | `PENDING_VALIDATION` → `VALIDATED` / `REJECTED` |
| Escrituras locales | marcadas `pending` en `SyncQueue` (Sprint 2) |

## Pendientes

- CUU00: flujo de autenticación por desarrollar (roles, multi-tenant). *Pendiente*.
- R016 no definido en la spec de insumos (salta R015 → R017). *Pendiente*.
- Política de sincronización y resolución de conflictos (R007). *Pendiente* — Sprint 2.
- Umbrales de horas/hectáreas por tipo de máquina (R021). *Pendiente*.
- Relación multi-firma `Client ↔ Company` sin modelar (ver `contrato-esquema-prisma.md` §3.5). *Pendiente*.
- Origen del costo por parte para rentabilidad (tarifario por firma, R032). *Pendiente*.
