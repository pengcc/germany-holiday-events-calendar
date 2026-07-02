# Project Decisions

This file records durable decisions that future work should not re-litigate accidentally.

### Decision 2026-06-18: Adopt Germany Holiday & Events Calendar product direction

- Status: Accepted
- Context: The previous Holiday Sync Germany framing covered holiday overlap comparison but not the
  broader neutral planning use case in the current PRD.
- Decision: Use **Germany Holiday & Events Calendar** as the product name,
  **德国假期与重要活动日历** as the Chinese name, and `germany-holiday-events-calendar` as the
  repository name. Build the MVP around German public and school holiday browsing and comparison.
- Reason: The name and scope describe the current product clearly while leaving room for selected
  major events after the holiday MVP.
- Impact: Product documentation and future visible copy should use the new identity. Existing
  internal `@hsg/*` package names may remain until a separately justified cleanup avoids broad
  churn.
- Related files: `docs/product-prd.md`, `README.md`, `.codex/project/project-guideline.md`

### Decision 2026-06-18: Preserve static public and local-only data architecture

- Status: Accepted
- Context: The product must remain deployable without a hosted backend, secrets, or recurring-cost
  runtime while preserving reviewed data quality.
- Decision: Keep one monorepo. Deploy only the Vite public frontend as static assets. Keep Data
  Studio, server functions, source fetching, filesystem access, review, and publishing local. The
  public frontend consumes reviewed generated JSON only.
- Reason: This boundary supports the Cloudflare Pages free-tier target, minimizes privacy and cost
  risk, and preserves the existing human-review data workflow.
- Impact: Public runtime code must not add server functions or upstream fetching. Data Studio must
  remain bound to local use and excluded from deployment.
- Related files: `apps/web/`, `apps/data-studio/`, `packages/data-core/`, `tools/data-cli/`,
  `docs/data-workflow.md`

### Decision 2026-06-18: Treat major events as neutral planning information

- Status: Accepted
- Context: Users may want to attend selected major events or avoid crowded, expensive, or
  traffic-affected periods.
- Decision: Describe future selected major events as planning-relevant information, not solely as
  impacts, risks, warnings, or disruptions. Use neutral names such as `PlanningEventRecord` or
  `MajorEventRecord`.
- Reason: Neutral positioning supports both attendance and avoidance use cases and matches the
  product identity.
- Impact: Berlin major events remain post-MVP and require a separate approved plan. Future data,
  copy, and UI must preserve neutral presentation and source confidence.
- Related files: `docs/product-prd.md`, `.codex/project/project-guideline.md`

### Decision 2026-06-18: Use evidence-based existing-code classification

- Status: Accepted
- Context: Existing code and tooling contain both aligned working systems and stale naming or
  workflow duplication.
- Decision: Classify each relevant area as keep as-is, keep with cleanup, refactor, or replace based
  on safety, usefulness, clarity, maintainability, data quality, and compatibility with the PRD.
- Reason: This permits justified refactoring without discarding reliable tooling or preserving
  unsuitable architecture by default.
- Impact: Changes should take the smallest useful, reversible path. Legacy `codex-skills/` files
  remain until useful guidance is migrated or confirmed redundant.
- Related files: `docs/product-prd.md`, `AGENTS.md`,
  `.codex/rules/engineering-quality-principles.md`

### Decision 2026-06-18: Preserve internal holiday schema version 1 during frontend refactoring

- Status: Accepted
- Context: The current schema and publishing pipeline already preserve provenance, applicability,
  review, and accepted-batch behavior across the local data workflow.
- Decision: Do not migrate accepted holiday data or rewrite the internal `HolidayRecord` schema as
  part of the frontend holiday-explorer refactor.
- Reason: A schema rewrite would create broad data and pipeline risk without being required for the
  holiday MVP.
- Impact: Frontend-facing contracts may be added compatibly in a later approved slice. Reconsider a
  breaking schema only when a demonstrated requirement, such as combined event publication,
  justifies it.
- Related files: `packages/data-core/src/schemas.ts`, `docs/data-workflow.md`

### Decision 2026-06-20: Adopt the current reusable foundation-kit operating baseline

- Status: Accepted
- Context: The project manually adopted the current foundation-kit meta skills, core workflows,
  and reusable rules while retaining project-specific operating context and memory.
- Decision: Keep reusable meta/core/rules content aligned with the current foundation-kit
  baseline. Preserve project-owned memory and adopt generic `AGENTS.md` improvements through
  targeted manual merges instead of template replacement.
- Reason: This receives current shared workflow and safety improvements without losing product,
  architecture, data-workflow, validation, or deployment constraints owned by this project.
- Impact: Future foundation-kit updates must use dry-run comparison and manual review for
  project-owned entrypoint or memory differences.
- Related files: `AGENTS.md`, `.codex/rules/`, `.codex/skills/meta/`, `.codex/skills/core/`,
  `.codex/project/project-guideline.md`

### Decision 2026-07-01: Separate approved-data publication from release readiness

- Status: Accepted
- Context: The first release requires 80 approved, current source batches, but that strict gate
  prevented approved partial data from being written for local frontend review while unrelated
  batches remained blocked or unreviewed.
- Decision: Keep `data:publish <run-id>` strict by default. Allow the explicit
  `--approved-partial` mode to write only approved data with uncovered manifest cells, and assess
  the currently published dataset independently through `data:release:check`.
- Reason: Frontend review needs realistic approved data without treating incomplete coverage as a
  releasable public dataset or admitting blocked, rejected, unresolved, or unapproved records.
- Impact: Partial output is not release approval. Public release still requires every configured
  batch, current freshness, and complete coverage to pass the release-readiness check.
- Related files: `packages/data-core/src/pipeline.ts`, `tools/data-cli/src/index.ts`,
  `package.json`, `docs/data-workflow.md`

### Decision 2026-07-02: Adopt the current Holiday Explorer behavioral baseline

- Status: Accepted
- Context: Earlier project material described the public frontend through all/single/multiple
  region-selection mechanics, treated the broad product PRD as the primary behavior source, and
  predated reviewed publication and regional-advisory support. That framing could cause future
  work to count limited regional holidays as statewide or restore obsolete empty-month behavior.
- Decision: Use `docs/holiday-explorer-prd.md` as the current behavioral product baseline for the
  public Holiday Explorer. Its modes are one-state lookup (`state`), nationwide-common public
  holidays (`nationwide`), and multi-state comparison (`compare`). Valid modes show only months
  with normal activity for current filters; invalid compare remains validation and coverage
  warnings remain independent. Evidence-backed limited-applicability public holidays remain
  `scope: regional`, may be shown as advisories, and must not count as statewide coverage by
  themselves, normal statewide activity, nationwide-common results, or multi-state overlap.
  Unsafe regional cases remain blockers. Treat `docs/product-prd.md` as historical/reference
  material rather than the current Holiday Explorer behavior source.
- Reason: The explicit source hierarchy and activity/advisory boundary preserve the product
  questions users actually ask while preventing regional data from overstating applicability or
  coverage.
- Impact: Future frontend, Data Studio, review, and data-workflow tasks must preserve these view,
  result-month, coverage, and regional-advisory semantics. Reviewed accepted data and published
  JSON remain committed artifacts; local run workspaces remain under ignored `dev_locals/`.
- Related files: `docs/holiday-explorer-prd.md`, `docs/product-prd.md`, `docs/data-workflow.md`,
  `apps/web/src/calendar.ts`, `apps/web/src/comparison-page.tsx`,
  `packages/data-core/src/public-holidays.ts`
