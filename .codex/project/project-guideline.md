# Project Guideline

This file is the current source of truth for project-specific facts.

Plans, handoffs, and scratch notes are process documents. They may become outdated after execution.

## 1. Project Overview

- Product name: Germany Holiday & Events Calendar.
- Chinese product name: 德国假期与重要活动日历.
- Repository name: `germany-holiday-events-calendar`.
- Purpose: provide a neutral, multilingual calendar for browsing and comparing German public
  holidays, school holidays, and, after the holiday MVP, selected planning-relevant major events.
- Primary users include Chinese-speaking families in Germany and travel planners comparing dates
  across federal states. German and English readers are also supported.
- Current phase: project context is aligned; the next approved product work is the
  holiday-explorer refactor. Berlin major events are post-MVP.

## 2. Current Scope

The holiday MVP includes:

- German public holidays and school holidays.
- All 16 German federal states.
- All-Germany, single-state, and multi-state selection.
- Year, month, and quarter filtering.
- Holiday overlap highlighting across selected states.
- Localized date details and Chinese, German, and English public routes.
- A practical, readable, mobile-first public frontend.
- Reviewed generated JSON consumed by a static frontend.
- A local manual refresh, validation, review, and publish workflow.

Selected Berlin major events are a planned post-MVP layer. Events must be presented neutrally as
information users may use to attend, avoid, or plan around a period, not only as negative impact or
risk signals.

## 3. Non-Goals

Without a separately approved plan, do not introduce:

- A hosted backend runtime or public server functions.
- Accounts, authentication, profiles, saved trips, or personal data storage.
- Telemetry, analytics, API keys, paid APIs, or recurring-cost infrastructure.
- A deployed Data Studio or public data-modification UI.
- Databases or hosted data services.
- Hotel or travel booking, affiliate flows, alerts, or notifications.
- Arbitrary local-event aggregation or real-time event monitoring.
- Berlin major-event implementation in the holiday MVP.
- Separate repositories for the public frontend and Data Studio.

## 4. Tech Stack and Runtime

- Language: TypeScript with strict checking.
- Runtime: Node.js `24.16.0`, pinned through `mise`.
- Package manager: pnpm `11.5.2`, invoked through Corepack.
- Workspace: pnpm monorepo.
- Public frontend: React `19.2.7`, TanStack Router `1.170.13`, and Vite `8.0.16`.
- Local Data Studio: TanStack Start `1.168.22`, isolated from public deployment.
- Shared validation and data tooling: Zod, YAML, iCalendar and PDF parsers, and TypeScript.
- Styling and UI foundations: Tailwind CSS, shadcn/ui conventions, Radix primitives, and
  lucide-react.
- Validation: Biome, TypeScript, Vitest, deterministic data checks, and Playwright.
- Persistence: versioned files; no database.
- Deployment target: static Cloudflare Pages free tier for `apps/web` only.

Exact dependency versions and rationale are recorded in `docs/decisions/dependencies.md`.

## 5. Directory Structure

```txt
apps/web             Static multilingual public frontend and deployable JSON
apps/data-studio     Local-only review and publishing UI
packages/data-core   Shared schemas, validation, normalization, date logic, and data pipeline
tools/data-cli       Local refresh, review, validation, and publishing commands
tools/workflow-guard Project workflow checks
data/                Versioned source definitions, accepted data, reviews, and overrides
docs/                Product, data-workflow, and technical decision documentation
.codex/              Installed workflows, project memory, rules, and project-local skills
dev_locals/          Ignored plans, handoffs, data runs, and temporary local artifacts
```

## 6. Scripts and Commands

Use the project-pinned runtime:

```sh
mise exec -- corepack pnpm install --frozen-lockfile
mise exec -- corepack pnpm dev:web
mise exec -- corepack pnpm dev:studio
mise exec -- corepack pnpm check
mise exec -- corepack pnpm typecheck
mise exec -- corepack pnpm test
mise exec -- corepack pnpm data:validate
mise exec -- corepack pnpm data:rebuild:check
mise exec -- corepack pnpm build
mise exec -- corepack pnpm smoke
```

Local data workflow commands also include `data:refresh`, `data:resume`, `data:resolve`,
`data:review`, `data:publish`, `data:rebuild`, and `data:monitor`. Follow
`docs/data-workflow.md`; do not refresh or publish data as incidental validation.

## 7. Environment Variables

- The deployed public frontend requires no secrets or runtime environment variables.
- Local test and Data Studio commands may pass workspace or base-URL overrides defined by their
  existing configuration. Do not add or record real secret values.
- No `.env.example` is currently required by the public application.

## 8. Architecture and Data Flow

The project remains one monorepo with two distinct frontend applications:

- `apps/web` is a static-only public SPA. It reads reviewed JSON bundled under
  `apps/web/public/data/` and must not use server functions, fetch upstream sources at runtime, or
  modify data.
- `apps/data-studio` is a local-only TanStack Start application bound to `127.0.0.1`. It may use
  local server functions and filesystem access for review and publishing workflows. It is not
  deployed and does not call the deployed public frontend.
- `packages/data-core` owns framework-independent schemas, parsing, normalization, validation,
  date handling, review, and publishing logic shared by local tools and apps.
- `tools/data-cli` exposes the local file-based workflow.

The data flow is:

```txt
official/public sources
-> local fetch/import
-> normalize and validate
-> diff and human review
-> explicit local publish
-> reviewed static JSON
-> public static frontend
```

All holiday dates use `YYYY-MM-DD` German-local all-day values and inclusive ranges. Files are the
source of truth. The internal holiday schema remains version 1 during the frontend refactor.

## 9. Testing and Validation

Relevant changes should use the nearest applicable checks from `package.json`:

- `pnpm check` for formatting, linting, and import organization.
- `pnpm typecheck` for workspace TypeScript checks.
- `pnpm test` for unit and integration tests.
- `pnpm data:validate` and `pnpm data:rebuild:check` for data integrity.
- `pnpm build` for public and Data Studio production builds.
- `pnpm smoke` for desktop and mobile public/Data Studio browser checks.

CI and normal builds must not refresh upstream data. If pnpm requests dependency repair or
installation, stop and obtain approval rather than changing the environment implicitly.

## 10. Development Workflow

- Read `AGENTS.md` and pass the Project Memory Context Gate before project work.
- Installed reusable foundation content follows the current foundation-kit meta/core/rules
  baseline. Project memory remains project-owned, and generic `AGENTS.md` changes are adopted
  through targeted manual merges.
- Route work through the installed workflow skill that matches the task.
- Store approved executable plans under `dev_locals/plans/` and use `execute-plan` only after
  explicit approval.
- Update durable facts and decisions through `update-project-memory`; do not treat plans as current
  project truth.
- Before new work, check branch, worktree, unpushed commits, and open pull requests.
- Start unrelated work from an up-to-date default branch and a feature branch.
- Do not push, create a pull request, merge, release, or deploy without explicit user intent.
- Classify existing code as keep as-is, keep with cleanup, refactor, or replace based on evidence.
  Do not preserve or rewrite code solely because it already exists or for architectural purity.

## 11. Deployment

- Target: Cloudflare Pages free tier.
- Deployable application: `apps/web` only.
- Build output: the static Vite output from the public application.
- Public runtime: static HTML, CSS, JavaScript, and reviewed generated JSON only.
- Data Studio must never be included in public deployment.
- Deployment and repository/hosting configuration changes require a separate approved workflow.

## 12. Current Implementation Status

As of 2026-06-18:

- The foundation-kit workflow is the active operating standard, project memory is populated, and
  the project-local `tanstack-static-frontend` skill is installed.
- The monorepo structure and static/local application boundary are implemented.
- The public app has explicit `/zh`, `/de`, and `/en` routes and currently supports year and
  multi-state selection with a yearly holiday heatmap.
- Month/quarter modes, explicit region modes, layer filters, URL-backed filter state, selectable
  dates, and date details are not implemented yet.
- Data Studio and the CLI implement local source refresh, validation, comparison, review,
  recovery, deterministic rebuild, and explicit publishing workflows.
- The release configuration covers all 16 states for 2026 and 2027 and defines an 80-batch review
  gate.
- The committed generated manifest currently reports zero published holiday records and no
  accepted coverage.
- Berlin major-event schemas, sources, tooling, data, and UI are not implemented.

## 13. Known Constraints and Risks

- Public deployment must remain static and free of secrets or server runtime dependencies.
- Data quality depends on provenance, explicit review decisions, and deterministic publication.
- Regional and school-specific holiday applicability must not be silently presented as statewide.
- TanStack Start remains isolated to local Data Studio responsibilities.
- Legacy `codex-skills/` content contains useful domain guidance but also old product naming and
  duplicated workflow guidance; do not delete it until useful guidance is migrated or proven
  redundant.
- Internal package names still use the `@hsg/*` scope. Renaming is deferred because it would cause
  broad import and lockfile churn without changing product behavior.

## 14. Shared Language / Project Terms

- **Holiday MVP**: the public and school holiday browsing/comparison release before events.
- **Planning event**: a selected major event presented neutrally for attending, avoiding, or
  planning around.
- **Public frontend**: the static application in `apps/web`.
- **Data Studio**: the local-only review and publishing application in `apps/data-studio`.
- **Reviewed generated JSON**: the only data boundary consumed by the public frontend.
- **Accepted batch**: one source/state/period data batch with an explicit human review decision.

## 15. Project Boundaries

- Project root: the repository root.
- Allowed local-only paths: `dev_locals/plans/`, `dev_locals/handoffs/`, and other ignored
  `dev_locals/` artifacts created by an approved workflow.
- Files outside the project root, global tooling, credentials, and machine configuration require
  explicit approval before mutation.
- Secrets, personal data, and local environment values must not be stored in project memory or
  committed files.

## 16. Agent Notes

- Use `docs/product-prd.md` as the primary product source.
- Use the project-local `tanstack-static-frontend` skill for work touching public routing, static
  frontend data loading, locale/search state, or the Data Studio/public boundary.
- Use docs-first research for framework, API, version, deployment, or tooling claims.
- Berlin events require a separate approved plan after holiday MVP acceptance.
