# Proposal — Sprint 1: App Flutter UI & Persistencia Local (SQLite/Hive)

## Intent

Construir la base de la app móvil Flutter **offline-first** del SaaS Agro-Trazabilidad: interfaz de usuario y **persistencia local** (SQLite vía `drift`) para que el Operario a Campo capture datos en campo sin conexión y los sincronice con el backend en el Sprint 2.

## Scope

Tarea del Gantt: **"App Flutter UI & Persistencia Local (SQLite/Hive)"** — Fase 1 (Fundaciones & Offline), Sprint 1.
Responsable: **Ignacio — Dev 1 (Mobile & Sync)**.

Casos de uso del sprint:

| CUU | Nombre | Rol móvil |
|-----|--------|-----------|
| CUU00 | Iniciar sesión | Operario a Campo |
| CUU05 | Emitir partes diarios de labor (núcleo) | Operario a Campo |
| CUU06 | Recepcionar insumos del cliente | Operario/Admin |
| CUU08 | Registrar actividades sobre maquinaria | Operario |

**Fuera de alcance:** Ganadería RFID (CUU10–13), motor de sincronización real (Sprint 2), aprobación web (backend/web).

## Approach

- **Persistencia local:** SQLite vía **drift** (ORM tipado, migraciones declarativas, queries reactivas). Hive solo como complemento futuro (cache/cola). Fotos al filesystem con path en DB (no blob).
- **Arquitectura:** hexagonal (ports & adapters) según `docs/hexagonal-conventions.md`, espejando el backend. Dominio (puertos + use cases) → data (adaptadores drift) → app (UI + ViewModels).
- **State management:** `setState` por ahora (streams de drift para reactividad básica).
- **Esquema local:** 18 tablas en inglés, alineadas a convenciones Prisma (PascalCase modelos, camelCase campos, PK TEXT uuid).

## Decisions

1. El **Campo pertenece al Cliente** (productor) y es **trabajado por una Firma**.
2. `MachineActivity` como **tabla única** con campos nullable según tipo.
3. `Stock` como **tabla explícita** (global por cliente).
4. `Photo` **genérica** polimórfica (`entityType` + `entityId`).
5. `version` + `deleted` (soft-delete) **solo en catálogos**.
6. Naming en **inglés**, espejando el backend Prisma.

## Risks

- **Divergencia de esquema con el backend:** entidades core del móvil (Client, Input, Recipe, DailyReport, Reception, Stock, MachineActivity, Photo) no existen en Prisma. Mitigado con `contrato-esquema-prisma.md`.
- **Ambigüedad multi-firma:** la relación `Client ↔ Company` no está modelada en ningún lado. Resolver con Renzo.

## Artifacts

- `spec.md`
- `design.md`
- `contrato-esquema-prisma.md`
- `tasks.md`
