---
name: agrolify-hexagonal-architecture
description: >
  Project-specific hexagonal architecture conventions for Agrolify across NestJS,
  Prisma, and Flutter. Trigger: use before migrating or reviewing Agrolify modules,
  use cases, ports, adapters, repositories, ViewModels, or composition roots.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0.0"
---

# Agrolify Hexagonal Architecture

Use this skill before applying the generic `hexagonal-architecture` skill in this repository. The generic skill explains the pattern; this skill defines the local rules.

## When To Use

- Migrating `packages/backend/src/entities/*` modules away from direct `PrismaService` usage.
- Migrating `packages/backend/src/auth` to ports, use cases, and adapters.
- Creating or reviewing NestJS use cases, repository ports, Prisma adapters, or module wiring.
- Moving Flutter auth or feature logic into `domain/repositories`, `domain/usecases`, and `data/repositories`.
- Checking whether imports violate the local architecture.
- Planning a new feature that crosses backend, Prisma, and Flutter layers.

## Source Of Truth

Read `docs/hexagonal-conventions.md` first. If this skill and the document disagree, the document wins.

## Critical Rules

- Use a hexagon per feature module, not one global hexagon.
- Migrate by vertical slice with the strangler approach.
- Preserve current HTTP routes and UI behavior unless the user explicitly asks for a contract change.
- `domain/**` must not import NestJS, Prisma, generated Prisma models, HTTP, Flutter widgets, adapters, or services.
- `application/**` must not import `PrismaService`, Prisma generated models, controllers, HTTP exceptions, or concrete adapters.
- Prisma belongs in `adapters/outbound/**` or `src/prisma` only.
- Controllers are inbound adapters and should map request data to use-case input.
- Use cases expose one public `execute` method and depend only on ports.
- NestJS modules are the composition roots for backend features.
- Flutter ViewModels depend on use cases or domain repositories, never HTTP services.
- `main.dart` or a dedicated composition root wires Flutter concrete implementations.

## Backend Target Layout

```text
packages/backend/src/entities/{module}/
  domain/
  application/
    dto/
    ports/
    use-cases/
  adapters/
    inbound/
    outbound/
  {module}.module.ts
```

Use `packages/backend/src/auth` with the same boundary names for auth.

## Backend Migration Checklist

- Identify the public operations currently exposed by the controller/service.
- Add characterization tests when behavior is not already covered.
- Define small outbound ports around side effects.
- Extract use-case input/output types into `application/dto`.
- Move orchestration into `application/use-cases`.
- Move Prisma calls into `adapters/outbound`.
- Keep controller logic limited to protocol mapping and error translation.
- Wire port tokens to adapter classes in the NestJS module.
- Verify no Prisma imports remain outside adapters and `src/prisma`.

## Port Naming

Good:

- `LivestockRepositoryPort`
- `CompanyReaderPort`
- `LotReaderPort`
- `RefreshTokenRepositoryPort`
- `PasswordHasherPort`
- `TokenSignerPort`
- `ClockPort`

Bad:

- `PrismaLivestockPort`
- `HttpAuthPort`
- `DatabaseServicePort`
- `NestJwtPort`

Ports describe capabilities, not technologies.

## NestJS Injection Tokens

Use symbols for TypeScript interface ports.

```ts
export const LIVESTOCK_REPOSITORY = Symbol('LIVESTOCK_REPOSITORY');

export interface LivestockRepositoryPort {
  findById(id: string): Promise<LivestockOutput | null>;
}
```

Wire the adapter in the module.

```ts
@Module({
  controllers: [LivestockController],
  providers: [
    CreateLivestockUseCase,
    {
      provide: LIVESTOCK_REPOSITORY,
      useClass: PrismaLivestockRepository,
    },
  ],
})
export class LivestockModule {}
```

## Error Rules

- Application/domain layers throw application errors.
- Controllers or filters translate those errors to NestJS HTTP responses.
- Do not throw `BadRequestException`, `ConflictException`, or `NotFoundException` from use cases.
- Do not leak Prisma errors beyond outbound adapters.

Use these mappings unless a specific contract says otherwise:

- `EntityNotFoundError` -> `404`
- `DuplicateEntityError` -> `409`
- `InvalidRelationError` -> `400`
- `InvalidInputError` -> `400`
- `AuthenticationFailedError` -> `401`
- `AccountLockedError` -> `423`

## Flutter Target Layout

```text
packages/mobile/lib/
  domain/
    models/
    repositories/
    usecases/
  data/
    models/
    services/
    repositories/
  app/
```

Flutter rules:

- Repository contracts live in `domain/repositories`.
- HTTP repository implementations live in `data/repositories`.
- HTTP clients live in `data/services`.
- ViewModels receive dependencies through constructors.
- Widgets do not create repositories, services, or HTTP clients.

## Recommended Order

Backend:

1. `livestock` as pilot.
2. CRUD modules with simpler dependencies.
3. `auth` after one or more CRUDs prove the pattern.
4. Mobile auth composition after backend auth boundaries are clear.

Mobile:

1. Move `AuthRepository` contract to domain.
2. Add `LoginUseCase`.
3. Keep `HttpAuthRepository` as data implementation.
4. Inject `LoginUseCase` into `LoginViewModel`.
5. Wire dependencies in composition root.

## Commands

```bash
pnpm --filter backend test
pnpm --filter backend test:e2e
flutter test
```

Do not run build unless the user explicitly asks.

## Resources

- `docs/hexagonal-conventions.md`
- `.agents/skills/hexagonal-architecture/SKILL.md`
- `.agents/skills/nestjs-best-practices/SKILL.md`
- `.agents/skills/flutter-apply-architecture-best-practices/SKILL.md`
