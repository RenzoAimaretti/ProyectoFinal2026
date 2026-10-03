# Feature: Clients module + client onboarding + restricted client view

Owner request. Admin manages clients; a client logs in with a generic password,
is forced to change it and complete their profile, then gets a restricted view
(Mi Campo + Insumos only). Full plan approved (schema + auth + scoping + RBAC).

## Requirements

1. Admin can list clients and create one with: login **email**, **first name +
   last name**, **campo name**, and **lotes (name + surface only; no SIG)**.
2. On creation the client user logs in with that email + a **generic password**.
3. First login forces a **password change** + capture **phone** and **address**.
4. Afterwards the client gets a **restricted view**: only **Mi Campo** (their
   field/lots) and **Insumos** (their stock; create a supply delivery/reception
   that the admin validates). No admin modules.

## Design decisions (approved)

- Link the login user to the client: `Client.userId` (unique) + relation.
- `Client` gains `firstName`, `lastName`, `phone`, `address`.
- `User` gains `mustChangePassword`.
- A client user is provisioned with a `UserCompany` membership (role
  `PRODUCTOR`) in the admin's firma, so existing auth resolves `firmaId` unchanged.
- Initial password: random per client (or `CLIENT_DEFAULT_PASSWORD` env), editable by the admin in the form;
  `mustChangePassword=true`, cleared on change.
- Server-side scoping for `PRODUCTOR` + `RolesGuard` on admin-only endpoints.
- `PRODUCTOR` modules = Mi Campo + Insumos.

## Tasks

- [ ] B1 [backend] Schema + migration: `Client.{firstName,lastName,phone,address,userId}`,
  `User.mustChangePassword`.
- [ ] B2 [backend] `POST /clients` composite create (Client + User + UserCompany +
  Farm + Lots, one transaction; generic password; returns created client + password).
- [ ] B3 [backend] `GET /clients/me`, `PUT /clients/me` (profile: phone, address).
- [ ] B4 [backend] `POST /auth/change-password`; expose `mustChangePassword` on login.
- [ ] B5 [backend] Productor scoping: farms/lots/stock/receptions only own client;
  `POST /receptions` forces own clientId.
- [ ] B6 [backend] RBAC: register `RolesGuard`; `@Roles` on admin-only endpoints.
- [ ] W1 [web] Admin "Clientes" page: list + create (email, nombre, apellido,
  campo, lotes name+surface).
- [ ] W2 [web] First-login flow: change password + phone/address before dashboard.
- [ ] W3 [web] `PRODUCTOR` nav = Mi Campo + Insumos; scope mi-campo/insumos to self.
- [ ] V1 Verify: backend tests + `next build` + HTTP smoke (create client, login,
  change password, client-scoped reads).

## Acceptance

- Admin creates a client + campo + lotes in one step; the client can log in.
- First login forces password change + phone/address; afterwards the client sees
  only Mi Campo (own field) and Insumos (own stock + create delivery).
- A client cannot read another client's data nor reach admin endpoints.
- Backend tests and `next build` green.

## Delivery

- Large (schema + backend + web): chained/stacked PRs before any PR.

## Progress log

- Launched Phase 1 (backend).
