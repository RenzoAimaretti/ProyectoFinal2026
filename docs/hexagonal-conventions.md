# Agrolify Hexagonal Architecture Conventions

This document is the source of truth for migrating Agrolify to hexagonal architecture. Apply these rules before generic framework advice.

## Goal

Move business behavior away from frameworks, UI widgets, HTTP details, and Prisma. The application core must depend on ports and plain types; adapters handle NestJS, Flutter, HTTP, Prisma, crypto, SDKs, and platform details.

## Current Migration Strategy

Use a strangler migration. Do not rewrite the whole app at once.

1. Pick one vertical slice.
2. Preserve the existing HTTP or UI contract.
3. Add characterization tests when behavior is not already covered.
4. Extract ports and use cases.
5. Move Prisma, HTTP, and SDK usage into adapters.
6. Wire adapters in the composition root.
7. Repeat module by module.

Recommended first backend pilot: `livestock`.

Reason: it has real rules around company existence, lot ownership, duplicate tag numbers, and date parsing. A trivial CRUD can hide bad boundaries.

## Backend Module Layout

Use a hexagon per NestJS feature module under `packages/backend/src/entities/{module}` or `packages/backend/src/auth`.

```text
packages/backend/src/entities/livestock/
  domain/
    livestock.entity.ts
    livestock-status.ts
    errors.ts
  application/
    dto/
      create-livestock.input.ts
      update-livestock.input.ts
      livestock.output.ts
    ports/
      livestock.repository.port.ts
      company-reader.port.ts
      lot-reader.port.ts
    use-cases/
      create-livestock.use-case.ts
      update-livestock.use-case.ts
      find-livestock.use-case.ts
      delete-livestock.use-case.ts
  adapters/
    inbound/
      livestock.controller.ts
    outbound/
      prisma-livestock.repository.ts
      prisma-company-reader.ts
      prisma-lot-reader.ts
  livestock.module.ts
```

Keep the current route names unless the user explicitly asks for an API change.

## Backend Dependency Rules

Allowed dependency direction:

- `adapters` can import `application` and `domain`.
- `application` can import `domain` and its own ports.
- `domain` imports only domain-local code and plain TypeScript utilities.
- `*.module.ts` wires concrete adapters to ports.
- Controllers are inbound adapters.
- Prisma repositories are outbound adapters.

Forbidden dependencies:

- `domain/**` must not import `@nestjs/*`, Prisma generated client, `PrismaService`, HTTP types, controllers, services, or adapters.
- `application/**` must not import `PrismaService`, Prisma generated models, controllers, NestJS HTTP exceptions, Flutter code, or concrete adapters.
- `adapters/outbound/**` must not call controllers or inbound adapters.
- Controllers must not import `PrismaService`.
- Use cases must not read HTTP request objects, response objects, headers, route params, or body decorators.

## Ports

Ports model capabilities, not technologies.

Good names:

- `LivestockRepositoryPort`
- `CompanyReaderPort`
- `LotReaderPort`
- `RefreshTokenRepositoryPort`
- `PasswordHasherPort`
- `TokenSignerPort`
- `ClockPort`

Bad names:

- `PrismaLivestockPort`
- `HttpAuthPort`
- `DatabaseServicePort`
- `NestJwtPort`

Use small ports. Do not create one fat repository when a use case only needs one read operation.

## NestJS Wiring

TypeScript interfaces do not exist at runtime. Use symbols as injection tokens.

```ts
export const LIVESTOCK_REPOSITORY = Symbol('LIVESTOCK_REPOSITORY');

export interface LivestockRepositoryPort {
  findById(id: string): Promise<LivestockOutput | null>;
}
```

Register implementations in the module:

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

The module is the composition root for that feature. Do not hide wiring in global service locators.

## Use Cases

Use cases orchestrate application behavior.

Rules:

- One use case has one public `execute` method.
- Inputs and outputs are plain TypeScript types.
- Use cases depend on ports through constructor injection.
- Use cases may validate application invariants.
- Use cases may call domain entities/value objects.
- Use cases do not know if data comes from Prisma, REST, cache, or memory.

Avoid speculative abstractions. If a CRUD method has no business behavior, keep the use case thin.

## Domain

Use `domain` only for business rules that are meaningful without NestJS or Prisma.

Examples:

- livestock status transitions
- lot/company ownership rule
- auth lockout policy
- refresh token expiration policy
- value object validation that is reused by multiple use cases

Do not create empty entity classes just to look architectural. If there is no behavior, a plain type is enough.

## DTOs And Mapping

Keep protocol DTOs separate from application inputs.

- Controller body/query/param DTOs belong to inbound adapters.
- Use-case input/output types belong to application.
- Prisma generated models belong to outbound adapters only.
- Mapping from Prisma rows to application outputs happens in outbound adapters.
- Mapping from HTTP body/params to use-case input happens in inbound adapters.

Never return Prisma rows directly from use cases.

## Error Handling

Application and domain layers use application errors, not NestJS HTTP exceptions.

Recommended errors:

- `EntityNotFoundError`
- `DuplicateEntityError`
- `InvalidRelationError`
- `InvalidInputError`
- `AuthenticationFailedError`
- `AccountLockedError`

Controllers or exception filters translate application errors to HTTP responses.

Example mapping:

- `EntityNotFoundError` -> `404 Not Found`
- `DuplicateEntityError` -> `409 Conflict`
- `InvalidRelationError` -> `400 Bad Request`
- `InvalidInputError` -> `400 Bad Request`
- `AuthenticationFailedError` -> `401 Unauthorized`
- `AccountLockedError` -> `423 Locked`

Infrastructure errors should be logged at the adapter boundary and translated to application-safe errors when possible.

## Auth Module Rules

Auth is high-risk. Migrate it after at least one CRUD module is stable.

Target ports:

- `UserCredentialsRepositoryPort`
- `RefreshTokenRepositoryPort`
- `PasswordHasherPort`
- `TokenSignerPort`
- `RandomTokenPort`
- `ClockPort`

Target use cases:

- `ValidateUserCredentialsUseCase`
- `LoginUseCase`
- `RefreshTokensUseCase`
- `LogoutUseCase`

Rules:

- Argon2 and bcrypt migration logic belongs behind `PasswordHasherPort`.
- JWT signing belongs behind `TokenSignerPort`.
- `randomBytes` belongs behind `RandomTokenPort`.
- `new Date()` and `Date.now()` belong behind `ClockPort` when used in policies or tests.
- Prisma refresh token scanning belongs in a repository adapter.

## Flutter Layout

Flutter should use the same dependency direction.

```text
packages/mobile/lib/
  domain/
    models/
    repositories/
      auth_repository.dart
    usecases/
      login_usecase.dart
  data/
    models/
    services/
      auth_api_service.dart
    repositories/
      http_auth_repository.dart
  app/
    auth/
      login_view_model.dart
      login_view.dart
```

Rules:

- ViewModels depend on use cases or domain repositories, not HTTP services.
- HTTP clients live in `data/services`.
- Repository implementations live in `data/repositories`.
- Repository contracts live in `domain/repositories`.
- Use cases live in `domain/usecases`.
- `main.dart` or a dedicated composition root wires concrete implementations.
- Widgets do not instantiate repositories or services.

## Testing Rules

Testing follows the boundary.

- Domain tests need no mocks and no framework setup.
- Use-case tests use in-memory fakes for ports.
- Adapter tests verify Prisma/HTTP mapping and infrastructure behavior.
- Controller tests verify protocol mapping and HTTP error translation.
- E2E tests protect public contracts for critical flows.
- Before migrating a legacy service with weak coverage, add characterization tests for current behavior.

Minimum for each migrated backend module:

- use-case unit tests for success and main failure paths
- at least one inbound adapter/controller test or e2e coverage for route contract
- import-boundary check showing no Prisma import outside adapters and `src/prisma`

Minimum for each migrated Flutter feature:

- ViewModel test with fake use case or fake repository
- repository test with fake service or mocked HTTP client
- widget test for user-visible states when UI changes

## Migration Order

Recommended backend order:

1. `livestock` pilot
2. `company`
3. `module-entity`
4. `farm`
5. `lot`
6. `livestock-event`
7. `weight-record`
8. `task-type`
9. `task`
10. `machine`
11. `machine-usage`
12. `user`
13. `auth`
14. `livestock-movement` if it is part of the active app module

Recommended mobile order:

1. Move `AuthRepository` contract to `domain/repositories`.
2. Add `LoginUseCase`.
3. Move `HttpAuthRepository` to `data/repositories` as implementation only.
4. Inject `LoginUseCase` into `LoginViewModel`.
5. Wire dependencies in `main.dart` or a composition root.

## Acceptance Checklist

A migrated slice is accepted only when all apply:

- Public API or UI behavior is preserved unless explicitly changed.
- Use cases do not import Prisma or NestJS HTTP exceptions.
- Domain does not import frameworks, generated Prisma types, or adapters.
- Prisma access exists only in outbound adapters or `src/prisma`.
- Controllers are thin and delegate to use cases.
- NestJS modules wire ports to adapters explicitly.
- Tests cover the migrated behavior at the correct boundary.
- No new dependency is added unless there is a concrete need.

## Anti-Patterns

- Creating folders without moving dependencies inward.
- Returning Prisma rows from use cases.
- Naming ports after technologies.
- Injecting concrete repositories into ViewModels.
- Calling adapters from other adapters.
- Using global service locators to avoid constructor injection.
- Moving all modules in one commit without tests.
- Creating domain classes with no behavior just to look clean.
