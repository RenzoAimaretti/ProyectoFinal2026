# Feature: Web UI functional + professional polish

Make the Next.js web app look professional and make every button functional.
Remove hardcoded data. Where no backend model exists, show an honest
"Proximamente" state (user decision: option 1), never invented data.

## Objective

- A real design system (tables, fields, feedback, skeletons, icons, KPI cards).
- Every interactive control performs a real action or is clearly disabled.
- No fabricated data; unsupported domains render an explicit empty state.

## Problem (from inventory)

- Fully hardcoded pages: `dashboard` (index), `insumos`, `finanzas`, `personal`.
- `insumos` needs backend endpoints that do not exist (`/receptions`, `/inputs`,
  `/clients`, `/stock`) even though the use cases are implemented.
- `ganadero` and `maquinaria` fetch from async server components without a token
  -> 401 (guarded endpoints).
- `mi-campo` + `produccion` mix real API data with fake NDVI/weather/recipe data;
  `produccion` has a render bug (loading return nested inside `.map`).
- Dead buttons everywhere; `api/client.ts` lacks PUT/DELETE; tables hand-rolled.

## Scope

In scope:
- `packages/nextjs`: design system, API client, all dashboard pages, landing/login.
- `packages/backend`: additive controllers for `reception`, `stock`, `input`,
  `client`, `recipe`, `machine-activity` (+ read enrichment needed by the UI).

Out of scope:
- New domain models (Invoice/Cheque, payroll/certifications, NDVI/weather/soil).
  Those pages get a "Proximamente" state and disabled controls.
- `packages/mobile` / Flutter.
- Prisma schema and migrations.

## Frozen foundation contract (page writers build against this)

`src/api/client.ts` adds: `apiPut<T>`, `apiDelete<T>`, and DTOs + functions:
- Inputs: `InputDTO{id,name,unit}`, `listInputs()`
- Clients: `ClientDTO{id,name,cuit,active}`, `listClients()`
- Receptions: `ReceptionItemDTO{id,inputId,inputName,quantity,validatedQuantity,variance,unit}`,
  `ReceptionDTO{id,clientId,clientName,date,status,rejectionReason,validatedAt,createdAt,items}`,
  `listReceptions()`, `getReception(id)`, `createReception(body)`,
  `validateReception(id, items)`, `rejectReception(id, reason)`
- Stock: `StockDTO{id,clientId,inputId,inputName,unit,quantity}`, `listStock(clientId?)`
- Recipes: `RecipeDTO{...items:[{inputId,inputName,dose,unit,loadOrder}]}`, `listRecipesByLot(lotId)`
- Machine activities: `MachineActivityDTO`, `listMachineActivities()`, `createMachineActivity(body)`
- Livestock: `createLivestockEvent(body)`, `createWeightRecord(body)`
- Users: `UserDTO{id,email,username,role,active}`, `listUsers()`, `createUser(body)`
- Machines: `createMachine(body)`; Daily reports: `createDailyReport(body)`

Design system (`components/ui/`): `DataTable`/`Table`, `TextField`, `SelectField`,
`TextareaField`, `Field`, `Toast`/`useToast`/`Toaster`, `Alert`, `Skeleton`/`TableSkeleton`,
`ConfirmDialog`, `Spinner`, generic `StatusBadge`, `KpiCard`, shared `icons.tsx`.
Existing exports stay backward compatible.

Backend endpoints (additive):
- `GET/POST /inputs`, `GET /inputs/:id`
- `GET /clients`
- `GET /receptions` (tenant-wide), `GET /receptions/:id`, `POST /receptions`,
  `POST /receptions/:id/validate`, `POST /receptions/:id/reject`
- `GET /stock?clientId=`, `GET /stock/balance?clientId=&inputId=`
- `GET /recipes?lotId=`
- `GET/POST /machine-activities`

## Tasks

- [ ] F1 [web] API client: PUT/DELETE + all DTOs/functions above.
- [ ] F2 [web] Design system: table, fields, toast, alert, skeletons, confirm, spinner, KPI, icons.
- [ ] B1 [backend] `receptions` controller (tenant-wide read + create/validate/reject + enrichment).
- [ ] B2 [backend] `inputs`, `clients`, `stock`, `recipes`, `machine-activities` controllers.
- [ ] P1 [web] `insumos`: real stock + reception inbox + validate/reject/create.
- [ ] P2 [web] `dashboard` index: real KPIs and pending counts.
- [ ] P3 [web] `produccion`: fix render bug, real recipes, "+ Cargar parte" -> POST daily-reports.
- [ ] P4 [web] `ganadero`/`maquinaria`: fix 401 (client fetch), wire buttons.
- [ ] P5 [web] `personal`: real users list + create; payroll/certs -> Proximamente.
- [ ] P6 [web] `mi-campo`: remove fake agro data -> Proximamente; fix map controls.
- [ ] P7 [web] `finanzas`: Proximamente state, no dead buttons.
- [ ] P8 [web] `landing`/`login`: fix dead links, reuse fields.
- [ ] V1 Verify: backend tests + `next build` + e2e per page.

## Acceptance criteria

- No page shows fabricated data; unsupported domains show "Proximamente".
- Every visible button performs a real action or is disabled with a reason.
- Tables/fields/feedback come from the shared design system.
- `pnpm --filter backend test` green; `pnpm --filter nextjs build` green.

## Delivery

- `delivery_strategy: ask-on-risk`; this is large (>>400 authored lines) -> chain/stack PRs before any PR. Push/PR = user's call.

## Progress log

- Inventory done; foundation + backend phases launched.
