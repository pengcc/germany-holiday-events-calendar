# TanStack Static Frontend

## Critical Contract

Use this project-local skill for work that touches the public TanStack Router application, Vite
static output, generated JSON loading, locale routes, URL filter state, or the boundary between the
public frontend and local Data Studio.

This skill provides project constraints and routing guidance. It does not create a plan, approve
implementation, install dependencies, modify files, publish data, deploy, or replace
`plan-with-context`, `execute-plan`, `code-review`, or `docs-first-research`.

## Purpose

Keep frontend work aligned with Germany Holiday & Events Calendar's static deployment, local data
governance, multilingual routes, and mobile-first product direction.

## When to Use

Use this skill when planning, implementing, or reviewing:

- TanStack Router routes or validated search parameters in `apps/web`.
- Vite public build or static-hosting behavior.
- Public loading of reviewed generated JSON.
- `/zh`, `/de`, and `/en` locale routes and locale-preserving navigation.
- Year, period, region, layer, state, or selected-date URL filters.
- Mobile-first route/page composition for the public holiday explorer.
- The boundary between public frontend code and local TanStack Start Data Studio code.
- Cloudflare Pages fallback behavior represented by repository configuration.

## When Not to Use

Do not use this skill to:

- Approve or execute work without an approved workflow.
- Make product-scope or architecture decisions that require `plan-with-context` or
  `project-architecture-plan`.
- Treat TanStack Start as part of the deployed public application.
- Add server functions, SSR, API routes, upstream runtime fetching, secrets, or data mutation to
  the public frontend.
- Install dependencies, run shadcn initialization, publish data, deploy, push, or create a pull
  request.
- Replace data-quality, UI-design, accessibility, testing, or project-memory workflows.
- Act as a generic TanStack tutorial.

## Required Context

Before project-impacting work:

1. Pass the Project Memory Context Gate through `project-memory`.
2. Read the approved plan or review target and confirm its scope.
3. Inspect `apps/web`, relevant routes/components/styles, `package.json`, Vite configuration,
   public data files, and applicable tests.
4. Inspect `apps/data-studio` only when the public/local boundary is relevant.
5. Use `docs-first-research` for framework, API, version, deployment, static-hosting, or tooling
   claims that are not already established by repository evidence.

Repository evidence and project memory take priority over generic framework preferences.

## Public Frontend Boundaries

- `apps/web` is a client-side TanStack Router application built by Vite as static assets.
- Public runtime code may read only reviewed generated assets under its static data boundary.
- The browser must not fetch upstream holiday or event sources directly.
- Public code must not depend on TanStack Start server functions, a hosted backend, filesystem
  access, secrets, or runtime data mutation.
- Preserve explicit `/zh`, `/de`, and `/en` routes. Keep navigation and filter state locale-aware.
- Validate route/search input before use. Invalid combinations must produce safe defaults or a
  clear corrective state defined by the approved plan.
- Keep all-day holiday logic in `YYYY-MM-DD` form with inclusive ranges; do not introduce timestamp
  or timezone conversion casually.
- Design route/page structure for narrow screens first and preserve semantic controls, visible
  focus, keyboard operation, readable overflow, and non-color-only meaning.

## Generated JSON Loading

- Load only files produced by the reviewed local publish workflow.
- Treat generated JSON as an external trust boundary and use shared runtime validation when the
  approved plan provides it.
- Keep loading, unavailable-data, empty-data, and invalid-data states distinct.
- Do not regenerate, refresh, review, or publish data during normal public builds.
- Do not bypass `packages/data-core` contracts with ad hoc incompatible frontend types.

## Static Hosting and Fallback

- Keep the public application deployable as Vite static output.
- Preserve repository-defined SPA fallback behavior for locale routes.
- Treat Cloudflare Pages as a static hosting target, not authorization for Workers, Functions, or
  other runtime services.
- Any change to fallback rules, output paths, deployment configuration, or hosting behavior must
  be included in an approved plan and verified through `docs-first-research` when provider behavior
  matters.

## Local Data Studio Boundary

- `apps/data-studio` may retain TanStack Start and local server functions for filesystem-backed
  review and publishing.
- Keep Data Studio bound to local use, excluded from deployment, and independent from the deployed
  public frontend.
- Share framework-independent schemas and helpers through `packages/data-core`; do not move local
  server responsibilities into `apps/web`.

## Workflow Routing

- Planning or changing routes, data loading, filters, or static behavior: `plan-with-context`.
- Implementing an explicitly approved saved plan: `execute-plan`.
- Reviewing a diff or pull request: `code-review`.
- Verifying TanStack, Vite, or Cloudflare behavior: `docs-first-research`.
- Planning a concrete page or interaction: use `ui-design-basics` as bounded support.
- Recording durable resulting facts or decisions: `update-project-memory`.

This skill remains supporting guidance inside the active workflow and never grants execution or
publishing approval.

## Stop Conditions

Stop and return to the active planning or execution workflow if work would:

- Add a public server/runtime dependency or upstream browser fetch.
- Change dependency versions or add tooling outside the approved plan.
- Change the generated data contract without coordinated data-core and validation scope.
- Deploy Data Studio or mix its server functions into the public app.
- Expand holiday MVP work into Berlin event implementation.
- Require undocumented Cloudflare, TanStack, or Vite assumptions.

## Output

When this guidance materially affects work, report:

- Public route/static surface affected.
- Generated-data boundary affected.
- Locale and mobile behavior affected.
- Public/Data Studio boundary impact.
- Validation used or required.
- Active workflow to continue with.

## Final Self-Check

- Does the public app remain static-only and free of server functions and upstream fetching?
- Are locale routes and validated filter state preserved?
- Is generated JSON still reviewed and locally published?
- Is Data Studio still local-only?
- Were version-specific claims verified rather than assumed?
- Did this skill remain supporting guidance rather than approving work?
