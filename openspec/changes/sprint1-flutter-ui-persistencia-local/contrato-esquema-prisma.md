# Contrato: Esquema Local Móvil → Backend Prisma

> **Para:** Renzo — Dev 3 (Arquitectura & Backend).
> **De:** Sprint 1 — App Flutter UI & Persistencia Local (Ignacio — Dev 1 Mobile).
> **Objetivo:** alinear el `schema.prisma` con las entidades que la app móvil persiste localmente (SQLite/drift), para que el Sprint 2 (motor de sync) no tenga divergencia de esquema.

---

## 1. Estado actual del backend (`schema.prisma`)

Modelos existentes: `Company`, `User`, `RefreshToken`, `Farm`, `Lot`, `TaskType`, `Task`, `Machine`, `MachineUsage`, `Module`, `Livestock`, `LivestockEvent`, `WeightRecord`, `LivestockMovement`.

Enums existentes: `UserRole`, `TaskStatus`, `LivestockStatus`, `MachineStatus`, `EventType` (valores en **español**, ej. `PENDIENTE`, `ACTIVA`).

---

## 2. Esquema local del móvil (18 tablas, drift/SQLite)

Convenciones: `PascalCase` modelos · `camelCase` campos · PK `TEXT` (uuid) · timestamps `DateTime` · enums `TextColumn`.

### Catálogos (referencia — con `version` + `deleted`)
| Modelo local | Campos | Backend | Estado |
|--------------|--------|---------|--------|
| `Company` | `id, name, cuit, active, createdAt, updatedAt, version, deleted` | `Company` | ✅ existe |
| `Client` | `id, name, cuit?, active, createdAt, updatedAt, version, deleted` | — | ❌ **nuevo** |
| `Farm` | `id, clientId, name, location?, surface, createdAt, updatedAt, version, deleted` | `Farm` | ⚠️ **cambia FK** |
| `Lot` | `id, farmId, name, coords?, area, active, createdAt, updatedAt, version, deleted` | `Lot` | ✅ existe |
| `LaborType` | `id, name, description?, createdAt, updatedAt, version, deleted` | `TaskType` | ⚠️ falta version/deleted |
| `Input` | `id, name, unit, active, createdAt, updatedAt, version, deleted` | — | ❌ **nuevo** |
| `Machine` | `id, companyId, name, brand?, status, entryDate?, maintenanceDate?, createdAt, updatedAt, version, deleted` | `Machine` | ✅ existe |

### Sesión
| Modelo local | Campos | Backend | Estado |
|--------------|--------|---------|--------|
| `Session` | `id, userId, email, fullName, role, token, companyId?, lastAccessedAt` | (`RefreshToken`) | local |

### Producción (CUU05)
| Modelo local | Campos | Backend | Estado |
|--------------|--------|---------|--------|
| `Recipe` | `id, lotId, date, status, observations?, createdAt, updatedAt` | — | ❌ **nuevo** (R009) |
| `RecipeItem` | `id, recipeId, inputId, dose, unit?, loadOrder` | — | ❌ **nuevo** |
| `DailyReport` | `id, operatorId, companyId, lotId, laborTypeId, date, hectares, hours, status, rejectionReason?, approvedAt?, approvedBy?, createdAt, updatedAt` | — | ❌ **nuevo** (núcleo) |
| `DailyReportItem` | `id, dailyReportId, inputId, quantity, unit` | — | ❌ **nuevo** |

### Insumos / Stock (CUU06)
| Modelo local | Campos | Backend | Estado |
|--------------|--------|---------|--------|
| `Reception` | `id, clientId, date, status, rejectionReason?, validatedBy?, validatedAt?, createdAt, updatedAt` | — | ❌ **nuevo** |
| `ReceptionItem` | `id, receptionId, inputId, quantity, unit` | — | ❌ **nuevo** |
| `Stock` | `id, clientId, inputId, quantity, updatedAt` — `@@unique(clientId, inputId)` | — | ❌ **nuevo** |

### Maquinaria (CUU08)
| Modelo local | Campos | Backend | Estado |
|--------------|--------|---------|--------|
| `MachineActivity` | `id, machineId, type, date, liters?, receipt?, cost?, spareParts?, usageHours?, hectares?, companyId?, observations?, createdAt, updatedAt` | `MachineUsage` | ⚠️ **parcial** |

### Infraestructura
| Modelo local | Campos | Backend | Estado |
|--------------|--------|---------|--------|
| `Photo` | `id, entityType, entityId, localPath, orderIndex, createdAt` | — | ❌ **nuevo** |
| `SyncQueue` | `id, entity, entityId, operation, status, attempts, lastError?, createdAt, updatedAt` | — | local (no sync) |

---

## 3. Desajustes a resolver en el backend

### 3.1 — `Farm` cambia de dueño
- **Local:** `Farm.clientId → Client` (el campo es del **productor/cliente**).
- **Backend actual:** `Farm.companyId → Company` (la firma).
- **Decisión de negocio:** el campo es del Cliente y es trabajado por una Firma. → `Farm` debería referenciar `clientId`; la "firma que trabaja" se resuelve a nivel de parte diario (`DailyReport.companyId`), no a nivel de campo.

### 3.2 — Entidades nuevas (no existen en Prisma)
`Client`, `Input`, `Recipe` + `RecipeItem`, `DailyReport` + `DailyReportItem`, `Reception` + `ReceptionItem`, `Stock`, `Photo`, y `MachineActivity` (extiende `MachineUsage`).

### 3.3 — Naming de enums (español vs inglés) — ✅ RESUELTO
**Decisión:** enums en **inglés**. El móvil usa `PENDING_APPROVAL` / `APPROVED` / `ACTIVE` / `OUT_OF_SERVICE`. El backend debe alinear sus enums a inglés (o el adaptador de sync mapeará español→inglés).

### 3.4 — `TaskType` sin `version`/`deleted`
Los demás catálogos del backend los tienen; `TaskType` no. Para la sync es conveniente que lo tenga.

### 3.5 — Relación multi-firma `Client ↔ Company` — ✅ RESUELTO
**Decisión:** el **Campo pertenece al Cliente** (`Farm.clientId → Client`) y es **trabajado por una Firma**, resuelta a nivel de parte diario (`DailyReport.companyId`). **No se requiere** tabla de relación `Client ↔ Company` explícita.

---

## 4. Modelos nuevos propuestos (Prisma, borrador)

```prisma
model Client {
  id        String   @id @default(uuid())
  name      String
  cuit      String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  version   Int      @default(1)
  deleted   Boolean  @default(false)
  farms     Farm[]
  receptions Reception[]
  stocks    Stock[]
}

model Input {
  id        String   @id @default(uuid())
  name      String
  unit      String   // L | KG | UNIT
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  version   Int      @default(1)
  deleted   Boolean  @default(false)
}

model Recipe {
  id        String   @id @default(uuid())
  lotId     String
  date      DateTime
  status    String
  observations String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lot       Lot      @relation(fields: [lotId], references: [id])
  items     RecipeItem[]
}

model RecipeItem {
  id        String @id @default(uuid())
  recipeId  String
  inputId   String
  dose      Float
  unit      String?
  loadOrder Int
  recipe    Recipe @relation(fields: [recipeId], references: [id])
  input     Input  @relation(fields: [inputId], references: [id])
}

model DailyReport {
  id              String   @id @default(uuid())
  operatorId      String
  companyId       String
  lotId           String
  laborTypeId     String
  date            DateTime
  hectares        Float
  hours           Float
  status          String   // PENDING_APPROVAL | APPROVED | REJECTED
  rejectionReason String?
  approvedAt      DateTime?
  approvedBy      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  items           DailyReportItem[]
}

model DailyReportItem {
  id            String @id @default(uuid())
  dailyReportId String
  inputId       String
  quantity      Float
  unit          String
}

model Reception {
  id              String   @id @default(uuid())
  clientId        String
  date            DateTime
  status          String   // PENDING_VALIDATION | VALIDATED | REJECTED
  rejectionReason String?
  validatedBy     String?
  validatedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  items           ReceptionItem[]
}

model ReceptionItem {
  id          String @id @default(uuid())
  receptionId String
  inputId     String
  quantity    Float
  unit        String
}

model Stock {
  id        String   @id @default(uuid())
  clientId  String
  inputId   String
  quantity  Float
  updatedAt DateTime @updatedAt

  @@unique([clientId, inputId])
}

model Photo {
  id          String   @id @default(uuid())
  entityType  String   // DAILY_REPORT | RECEPTION
  entityId    String
  localPath   String
  orderIndex  Int
  createdAt   DateTime @default(now())
}

model MachineActivity {
  id          String   @id @default(uuid())
  machineId   String
  type        String   // FUEL | MAINTENANCE | REPAIR | FIELD_USAGE
  date        DateTime
  liters      Float?
  receipt     String?
  cost        Float?
  spareParts  String?
  usageHours  Float?
  hectares    Float?
  companyId   String?
  observations String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

> ⚠️ Los tipos `Float`/`String` y las relaciones son un **borrador orientativo**. Renzo debe validar contra las reglas de negocio (R007, R009, R014, R017, R018–R021) antes de migrar. El móvil es la fuente de verdad del contrato hasta que esto se refleje en Prisma.
