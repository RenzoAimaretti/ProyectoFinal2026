# Convenciones de Arquitectura Hexagonal (Backend)

**Proyecto**: `proyectofinal2026` | **Rama**: `refactor/hexagonal-architecture`
**Alcance**: convenciones de la migración por módulos (strangler per module). Fuente: `openspec/changes/hexagonal-architecture/` (spec.md + design.md).

## 1. Layout de módulo

Cada módulo bajo `src/entities/{module}/` sigue este layout:

```
src/entities/{module}/
  ports/                        # interfaces de puerto + Symbol de token
  domain/                       # copias de enums (ej. livestock-status.ts)
  adapters/outbound/prisma/     # ÚNICO lugar que importa prisma/generated
  {module}.service.ts           # capa de aplicación — inyecta puertos, sin PrismaService
  {module}.controller.ts        # solo cambios de path de import
  {module}.module.ts            # providers: [{ provide: TOKEN, useClass: Adapter }]
```

- F3 (auth) replica el layout bajo `src/auth/{ports,adapters/outbound/prisma}/`.
- F4 (mobile) usa composición raíz manual en `main.dart` (sin paquete de DI).

## 2. Tokens de inyección (Symbol)

- Definir en `ports/`:
  ```ts
  export const {MODULE}_REPOSITORY = Symbol('{MODULE}_REPOSITORY');
  export interface {Module}RepositoryPort { /* métodos */ }
  ```
- El binding en el módulo SIEMPRE usa el Symbol como token (REQ-A-08):
  ```ts
  providers: [{ provide: {MODULE}_REPOSITORY, useClass: Prisma{Module}Repository }]
  ```
- Convención de nombres: `<MODULO>_REPOSITORY` para el puerto principal del módulo; `<MODULO>_LOOKUP` para capability ports de lectura cruzada (D1), que luego se reemplazan por el puerto exportado del módulo dueño (REQ-F2-03).

## 3. Frontera de imports de Prisma

- `prisma/generated` y `@prisma/client` SOLO se importan desde `**/adapters/**` y `src/prisma/**` (REQ-A-04, enforced por eslint).
- Los services inyectan puertos: NO importan `PrismaService` ni `prisma/generated`.
- Enums: los módulos usan una copia de dominio (ej. `domain/livestock-status.ts` con miembros idénticos al generado); el adapter mapea enum generado ↔ enum de dominio.
- Legacy `@prisma/client/runtime/client` en `user.service.ts` queda intacto hasta su extracción en F2 (fuera de alcance F0).

## 4. Grandfather list — no-restricted-imports (decisión 2026-08-04, Opción A)

- Regla en `eslint.config.mjs`: `no-restricted-imports: ['error', { patterns: [{ group: ['**/prisma/generated/**', '@prisma/client'] }] }]` sobre `**/*.ts`; bloque grandfather DESPUÉS (flat config: último bloque que matchea gana).
- Exentos permanentes (allowlist por convención, §3): `src/prisma/**`, `**/adapters/**`.
- Inventario grandfather (21 archivos legacy, pre-decisión) con horizonte de remoción — podar cada entrada al completar su fase:
  - **F1** (remover al completar F1): `livestock.service.ts`, `livestock.controller.ts`.
  - **F2** (remover al completar F2, 14): `company.service.ts`, `farm.service.ts`, `lot.service.ts`, `livestock-event.service.ts`, `livestock-event.controller.ts`, `task.service.ts`, `task.controller.ts`, `user.service.ts`, `user.controller.ts`, `machine.service.ts`, `machine.controller.ts`, `machine-usage.service.ts`, `weight-record.service.ts`, `weight-record.controller.ts`.
  - **F3** (remover al completar F3, 4): `auth.service.spec.ts`, `guards/roles.guard.ts`, `interfaces/jwt-payload.interface.ts`, `decorators/roles.decorator.ts`.
  - **F3 ex-post** (remover al crear el puerto de F3): `test/auth.e2e-spec.ts`.
- Nota: `user.controller.ts` y `machine.controller.ts` se agregaron post-inventario (hallazgo del primer lint run, 2026-08-04) — mismos imports legacy, horizonte F2.
- Blind spot aceptado: archivos NUEVOS con imports prohibidos no son detectados; mitigación: disciplina de poda por fase + T-F2-69 (end-state check: cero `src/` fuera de adapters/prisma importando `prisma/generated`).
- NOTA baseline (pre-existente, fuera de alcance): `pnpm lint` global NO pasa en HEAD — 2882 errores `prettier/prettier` por CRLF (`core.autocrlf=true`, sin `.gitattributes`/`endOfLine`) + ~126 `recommendedTypeChecked`. Criterio de aceptación F0 = la regla no introduce violaciones NUEVAS (verificado: 0 hits fuera del grandfather).

## 5. Secuencia por módulo (strict TDD)

1. Spec contract-locking contra puertos mockeados (plain objects + `jest.fn()`) ANTES del refactor.
2. Puerto + Symbol en `ports/`.
3. Adapter en `adapters/outbound/prisma/` (único archivo del módulo que importa `prisma/generated`).
4. Refactor del service: inyectar puertos; firmas públicas sin cambios.
5. Wiring en `{module}.module.ts`.
6. Verificación: unit + lint + build (+ e2e opcional); commit por ola.

## 6. Reglas de comportamiento

- API congelada: rutas, shapes de respuesta y mensajes de error byte-identical (REQ-C-01..08).
- Los services mantienen excepciones `@nestjs/common` (NotFound/BadRequest/Conflict/InternalServerError, REQ-A-06); sin puerto de mapeo de excepciones.
- Prohibido "mejorar" lógica durante la extracción (ej. dejar el scan O(n) de refresh tokens como está).
