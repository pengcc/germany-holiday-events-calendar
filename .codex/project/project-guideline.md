# Project Guideline

This file is the current source of truth for project-specific facts.

Plans, handoffs, and scratch notes are process documents. They may become outdated after execution.

## 1. Project Overview

- Product name: Germany Holiday & Events Calendar.
- Chinese product name: 德国假期与重要活动日历.
- Repository name: `germany-holiday-events-calendar`.
- Purpose: provide a neutral, multilingual public planning site for German public and school
  holidays, selected trade fairs, and selected culture or major city events.
- Primary users include Chinese-speaking families in Germany and travel planners comparing dates
  across federal states. German and English readers are also supported.
- Current phase: the Holiday Explorer frontend and reviewed 2026–2027 holiday dataset are
  implemented. The first reviewed Culture Events record and localized Culture Events page are
  implemented. Shared three-area navigation and the Trade Fairs public area remain planned.

## 2. Current Scope

The holiday MVP includes:

- German public holidays and school holidays.
- All 16 German federal states.
- Three explicit view modes: one-state lookup (`state`), nationwide-common public holidays
  (`nationwide`), and multi-state comparison (`compare`).
- Year, month, and quarter filtering.
- Holiday overlap highlighting across selected states.
- Localized date details and Chinese, German, and English public routes.
- A practical, readable, mobile-first public frontend.
- Result-focused calendars that hide months without normal activity in valid state, nationwide,
  and compare modes while preserving explicit invalid-compare validation and coverage warnings.
- Limited-applicability regional public-holiday advisories that remain separate from statewide
  activity and comparison results.
- Reviewed generated JSON consumed by a static frontend.
- A local manual refresh, validation, review, and publish workflow.

The public site has three distinct top-level areas:

1. **Holidays** — German public holidays and school holidays; the default/home area at `/zh`,
   `/de`, and `/en`.
2. **Trade Fairs / Messe** — a first-class planned area for selected official trade-fair events.
3. **Culture Events** — selected culture and major city events, currently represented by
   `/zh/city-events`, `/de/city-events`, and `/en/city-events`.

Trade Fairs must not be merged into Holiday Explorer or the Culture Events product area. Before
adding more event data or event filters, establish shared public navigation and this three-area
information architecture. Events remain neutral planning information users may use to attend,
avoid, or plan around a period, not only negative impact or risk signals. See
`docs/public-site-product-framing.md`.

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
  modify data. Its public information architecture separates Holidays, Trade Fairs, and Culture
  Events rather than combining them as calendar modes.
- `apps/data-studio` is a local-only TanStack Start application bound to `127.0.0.1`. It may use
  local server functions and filesystem access for review and publishing workflows. It is not
  deployed and does not call the deployed public frontend.
- `packages/data-core` owns framework-independent schemas, parsing, normalization, validation,
  date handling, review, and publishing logic shared by local tools and apps.
- `tools/data-cli` exposes the local file-based workflow.
- Reviewed accepted batches, review decisions, and published public JSON are committed project
  artifacts. Immutable refresh/run workspaces under `dev_locals/data-runs/` are local-only and
  must not be committed.

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
- Use `product-framing-review` as the stable workflow identifier for Task and Product Framing.
  Apply Task / Change Framing to unclear or drift-prone non-product work without forcing end-user
  Product Framing; use deeper Product Framing only for end-user behavior. Apply the Framing Review Gate
  before reviewing, approving, or executing a plan or proposal when its scope may have drifted.
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

As of 2026-07-04:

- The foundation-kit workflow is the active operating standard, project memory is populated, and
  the project-local `tanstack-static-frontend` skill is installed.
- The monorepo structure and static/local application boundary are implemented.
- The public app has explicit `/zh`, `/de`, and `/en` routes with URL-backed `state`, `nationwide`,
  and `compare` view modes; year, quarter, and month periods; and public-holiday and school-holiday
  layers where valid for the selected mode.
- The static frontend validates schema-version-1 generated JSON in the browser, derives inclusive
  date ranges and statewide overlap/activity, and excludes regional and school-specific records
  from statewide overlap counts. Regional public records may appear as limited-applicability
  advisory information but never create normal public activity, nationwide-common results, or
  multi-state overlap.
- State, nationwide, and valid compare modes hide months without normal activity for the current
  filters. Regional-advisory-only months stay hidden. Invalid compare remains a validation state,
  and mode-aware coverage warnings remain visible even when the result-month list is empty.
- The calendar provides semantic date selection, URL-backed selected-date recovery for visible
  results, localized date details, source/applicability labels, honest empty/error/coverage
  states, and responsive filter and state-selection controls.
- Holiday Explorer acceptance and follow-up validation passed formatting/lint checks, type
  checking, unit tests, deterministic rebuild verification, production builds, and desktop/mobile
  browser smoke tests.
- Data Studio and the CLI implement local source refresh, validation, comparison, review,
  recovery, deterministic rebuild, and explicit publishing workflows.
- The release configuration covers all 16 states for 2026 and 2027 and defines an 80-batch review
  gate.
- The committed published manifest contains 559 reviewed records, including 8 regional records,
  for 2026–2027. It lists all 80 current source coverage entries as non-stale and all 64
  state/year/category matrix cells as covered.
- City Events v1 schemas, manual reviewed publication tooling, one reviewed CSD Berlin 2026
  top-level record, deterministic public JSON, and localized `/zh|de|en/city-events` pages are
  implemented.
- The public site has adopted a three-area architecture: Holidays, Trade Fairs / Messe, and Culture
  Events. Shared navigation and the Trade Fairs route/page are not implemented yet.

## 13. Known Constraints and Risks

- Public deployment must remain static and free of secrets or server runtime dependencies.
- More event data and filters must not be added before shared navigation and the three-area public
  information architecture are established.
- Data quality depends on provenance, explicit review decisions, and deterministic publication.
- Regional and school-specific holiday applicability must not be silently presented as statewide.
  Evidence-backed regional public holidays may be nonblocking advisories, remain
  `scope: regional`, and never count as statewide coverage by themselves, nationwide-common
  activity, normal public calendar activity, or multi-state overlap. Unsafe or insufficiently
  evidenced regional cases remain blocking.
- TanStack Start remains isolated to local Data Studio responsibilities.
- Legacy `codex-skills/` content contains useful domain guidance but also old product naming and
  duplicated workflow guidance; do not delete it until useful guidance is migrated or proven
  redundant.
- Internal package names still use the `@hsg/*` scope. Renaming is deferred because it would cause
  broad import and lockfile churn without changing product behavior.

## 14. Shared Language / Project Terms

- **Holiday MVP**: the public and school holiday browsing/comparison release before events.
- **Holidays area**: the default/home public area at `/zh`, `/de`, and `/en` for German public and
  school holidays.
- **Trade Fairs area**: a separate first-class planned public area for selected official Messe and
  trade-fair events.
- **Culture Events area**: the separate public area currently served by localized `/city-events`
  routes for selected culture and major city events.
- **Planning event**: a selected major event presented neutrally for attending, avoiding, or
  planning around.
- **Public frontend**: the static application in `apps/web`.
- **Data Studio**: the local-only review and publishing application in `apps/data-studio`.
- **Reviewed generated JSON**: the only data boundary consumed by the public frontend.
- **Accepted batch**: one source/state/period data batch with an explicit human review decision.
- **State view**: lookup of normal public/school holiday activity for exactly one federal state.
- **Nationwide view**: statewide public holiday dates shared by all 16 federal states.
- **Compare view**: normal holiday activity and overlap across 2–16 selected federal states;
  fewer than two states is an explicit invalid comparison.
- **Regional advisory**: a reviewed, limited-applicability public holiday record that remains
  regional and may be shown as advisory information but does not count as statewide activity.
- **Coverage warning**: manifest-derived notice that results may be incomplete; it remains visible
  independently of whether result months are present.

## 15. Project Boundaries

- Project root: the repository root.
- Allowed local-only paths: `dev_locals/plans/`, `dev_locals/handoffs/`, and other ignored
  `dev_locals/` artifacts created by an approved workflow.
- Files outside the project root, global tooling, credentials, and machine configuration require
  explicit approval before mutation.
- Secrets, personal data, and local environment values must not be stored in project memory or
  committed files.

## 16. Agent Notes

- Use `docs/public-site-product-framing.md` as the public-site information architecture baseline.
- Use `docs/holiday-explorer-prd.md` as the current behavioral product baseline for the Holidays
  area only.
- Treat `docs/product-prd.md` as historical/reference material for broader product direction,
  architecture boundaries, and post-MVP event framing.
- Use the project-local `tanstack-static-frontend` skill for work touching public routing, static
  frontend data loading, locale/search state, or the Data Studio/public boundary.
- Use docs-first research for framework, API, version, deployment, or tooling claims.
- Public navigation, Trade Fairs, additional event data, and event filters each require an
  explicitly approved implementation slice consistent with the three-area architecture.
