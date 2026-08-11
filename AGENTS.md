
> **Single Source of Truth** - This file is the master for all AI assistants working in this workspace.

This repository is organized around the skills stored in [.agents/skills](.agents/skills). Use those skills as the source of truth for task-specific behavior.

## Project Context

This workspace currently centers on Flutter app development plus supporting frontend, backend, and database work. The available skills reflect that mix:

| Skill | Purpose | File |
|-------|---------|------|
|`nestjs-best-practices`|Best practices for nestjs| [.agents/skills/nestjs-best-practices/SKILL.md](.agents/skills/nestjs-best-practices/SKILL.md)|
| `flutter-apply-architecture-best-practices` | Layered Flutter architecture, UI / logic / data separation | [.agents/skills/flutter-apply-architecture-best-practices/SKILL.md](.agents/skills/flutter-apply-architecture-best-practices/SKILL.md) |
| `flutter-build-responsive-layout` | Responsive and adaptive Flutter layouts | [.agents/skills/flutter-build-responsive-layout/SKILL.md](.agents/skills/flutter-build-responsive-layout/SKILL.md) |
| `flutter-fix-layout-issues` | Diagnose and fix Flutter constraint and overflow errors | [.agents/skills/flutter-fix-layout-issues/SKILL.md](.agents/skills/flutter-fix-layout-issues/SKILL.md) |
| `flutter-setup-declarative-routing` | Router setup, deep linking, browser history | [.agents/skills/flutter-setup-declarative-routing/SKILL.md](.agents/skills/flutter-setup-declarative-routing/SKILL.md) |
| `flutter-setup-localization` | `flutter_localizations`, `intl`, and generated l10n setup | [.agents/skills/flutter-setup-localization/SKILL.md](.agents/skills/flutter-setup-localization/SKILL.md) |
| `flutter-use-http-package` | HTTP requests with the `http` package | [.agents/skills/flutter-use-http-package/SKILL.md](.agents/skills/flutter-use-http-package/SKILL.md) |
| `flutter-add-widget-test` | Component-level Flutter tests | [.agents/skills/flutter-add-widget-test/SKILL.md](.agents/skills/flutter-add-widget-test/SKILL.md) |
| `flutter-add-integration-test` | End-to-end Flutter interaction flows | [.agents/skills/flutter-add-integration-test/SKILL.md](.agents/skills/flutter-add-integration-test/SKILL.md) |
| `flutter-add-widget-preview` | Widget previews and interactive UI validation | [.agents/skills/flutter-add-widget-preview/SKILL.md](.agents/skills/flutter-add-widget-preview/SKILL.md) |
| `frontend-design` | Distinctive, production-grade UI design | [.agents/skills/frontend-design/SKILL.md](.agents/skills/frontend-design/SKILL.md) |
| `nodejs-backend-patterns` | Express/Fastify backend patterns, auth, middleware, APIs | [.agents/skills/nodejs-backend-patterns/SKILL.md](.agents/skills/nodejs-backend-patterns/SKILL.md) |
| `prisma-database-setup` | Prisma ORM setup and database provider configuration | [.agents/skills/prisma-database-setup/SKILL.md](.agents/skills/prisma-database-setup/SKILL.md) |
| `hexagonal-architecture` | Ports and adapters, dependency inversion, clean boundaries | [.agents/skills/hexagonal-architecture/SKILL.md](.agents/skills/hexagonal-architecture/SKILL.md) |
| `agrolify-hexagonal-architecture` | Local Agrolify conventions for NestJS, Prisma, Flutter ports, adapters, use cases, and composition roots | [.agents/skills/agrolify-hexagonal-architecture/SKILL.md](.agents/skills/agrolify-hexagonal-architecture/SKILL.md) |
| `skill-creator` | Create or improve skills for this workspace | [.agents/skills/skill-creator/SKILL.md](.agents/skills/skill-creator/SKILL.md) |

## Skill Triggers

Invoke the matching skill first when the task clearly fits one of these cases:

| Action | Invoke First | Why |
|--------|--------------|-----|
| NestJs creating or editing|`nestjs-best-practices`|Keep logic and patterns consistent|
| Flutter architecture or refactor | `flutter-apply-architecture-best-practices` | Keeps UI, logic, and data separated |
| Flutter responsive UI | `flutter-build-responsive-layout` | Prevents layouts that only work on one screen size |
| Flutter overflow or constraint bug | `flutter-fix-layout-issues` | Fast path to the real layout violation |
| Flutter routing or deep links | `flutter-setup-declarative-routing` | Sets up `go_router` correctly |
| Flutter localization | `flutter-setup-localization` | Ensures `intl` and generated l10n are wired correctly |
| Flutter API calls | `flutter-use-http-package` | Standardizes HTTP usage and request handling |
| Flutter widget tests | `flutter-add-widget-test` | Gives a component-level test structure |
| Flutter integration tests | `flutter-add-integration-test` | Captures complete user flows |
| Flutter UI polish or previews | `flutter-add-widget-preview` | Helps validate the design interactively |
| New or improved UI design | `frontend-design` | Avoids generic layouts and generic styling |
| Backend API / middleware work | `nodejs-backend-patterns` | Applies production backend conventions |
| Prisma or database setup | `prisma-database-setup` | Uses the right provider and client setup |
| Domain boundaries or clean architecture | `hexagonal-architecture` | Keeps dependencies pointed inward |
| Agrolify hexagonal migration or review | `agrolify-hexagonal-architecture` | Applies local module layout, port, adapter, and composition-root rules |
| Creating or editing a skill | `skill-creator` | Uses the correct skill workflow |

## Working Rules

1. Prefer the smallest change that solves the actual problem.
2. Inspect nearby files before editing; do not invent architecture that the repo does not already use.
3. Follow the matching skill when the task clearly maps to one.
4. Keep changes consistent with the existing project structure and naming.
5. If a task crosses Flutter, backend, and database concerns, align the layers instead of mixing them in one file.

## Repository Notes

- Skills live under [.agents/skills](.agents/skills), not under a top-level `skills/` folder.
- `skills-lock.json` is part of the workspace context and should be kept in sync with the skills layout.
- `docs/hexagonal-conventions.md` is the local source of truth for Agrolify hexagonal migration rules.
- When adding a new skill, use `skill-creator` and register it here so future agents can find it quickly.

## Project Identity

This workspace should be treated as a Flutter-centric project with supporting frontend, backend, and database tooling. If the codebase grows, update this file so the skill table continues to match the actual `.agents/skills` directory.
