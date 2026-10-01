# Apply Progress: Sprint 1 Multi-Tenant Enforcement

## Completed Work

- Tenant-scoped farms and lots enforcement is already implemented across controllers, services, use cases, ports, Prisma adapters, and controller specs.
- This follow-up fix split farm company lookup out of `PrismaFarmRepository` into a dedicated `PrismaCompanyReader`, removing the incorrect `CompanyReaderPort` implementation from the farm repository and resolving the TS2420 verification warning.

## Verification

- `pnpm --filter backend run test -- farm.use-cases.spec.ts farm.controller.spec.ts`
- `pnpm --filter backend run test:cov -- farm.use-cases.spec.ts farm.controller.spec.ts`

## TDD Cycle Evidence

| Cycle | Scope | Red evidence | Green evidence | Refactor / notes |
|---|---|---|---|---|
| 1 | Farm tenant enforcement | Added/updated farm use-case and controller specs for JWT requirement, tenant-scoped list/read/update, and deprecated body `companyId` behavior before implementation. | `pnpm --filter backend run test -- farm.use-cases.spec.ts farm.controller.spec.ts lot.use-cases.spec.ts lot.controller.spec.ts` passed as part of the implementation batch: 4 suites, 42 tests. | Controller derives tenant from `req.user.firmaId`; body `companyId` is ignored for Sprint 1 compatibility. |
| 2 | Lot tenant enforcement | Added/updated lot use-case and controller specs for JWT requirement, transitive farm ownership, 404 cross-tenant target, and 400 cross-tenant `farmId`. | `pnpm --filter backend run test -- farm.use-cases.spec.ts farm.controller.spec.ts lot.use-cases.spec.ts lot.controller.spec.ts` passed: 4 suites, 42 tests. | Lot scoping is implemented through farm ownership rather than adding direct `companyId` to `Lot`. |
| 3 | Farm repository port mismatch fix | Verification/coverage exposed TS2420: `PrismaFarmRepository` incorrectly implemented `CompanyReaderPort` without satisfying the port shape. | `pnpm --filter backend run test:cov -- farm.use-cases.spec.ts farm.controller.spec.ts` passed after the fix; targeted farm tests also passed. | Split company lookup into dedicated `PrismaCompanyReader`; `PrismaFarmRepository` now only implements farm persistence. |
| 4 | Regression suite | Full backend suite was rerun after implementation. | `pnpm --filter backend run test` passed: 25 suites, 238 tests. | Build and lint were intentionally not run per project rules. |

## Notes

- `PrismaFarmRepository` now stays focused on farm persistence only.
- Company existence checks for farm create/update now use a separate outbound adapter, which matches the hexagonal boundary and keeps the farm repository small.
