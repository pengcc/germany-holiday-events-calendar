# Holiday Sync Germany

Holiday Sync Germany is a static-first trilingual web product for comparing German public holidays and school holidays across federal states. The product should help Chinese-speaking families and travel planners in Germany identify overlapping holiday periods and plan travel with better timing.

## Product Direction

- Deploy as static files only, with Cloudflare Pages free tier as the preferred target.
- Use local TypeScript data tooling to fetch, normalize, validate, diff, and regenerate static JSON.
- Require human review before fetched or parsed holiday data becomes publishable static data.
- Keep the product UI available in Chinese, German, and English through explicit `/zh`, `/de`, and `/en` routes.
- Use `YYYY-MM-DD` German local all-day dates and inclusive date ranges for all holiday logic.

## Non-Goals

The project must not introduce accounts, saved trips, alerts, personal data storage, telemetry, API keys, paid APIs, backend runtime services, or recurring-cost infrastructure without explicit approval.

## Foundation Stack

- Runtime: Node.js 24 LTS through `mise`.
- Package manager: `pnpm` with exact `packageManager` pinning.
- Public app: TanStack Router with Vite static output.
- Local data app: TanStack Start Data Studio bound to `127.0.0.1`.
- Shared data tooling: TypeScript schemas, adapters, validation, review, and publishing.
- UI: shadcn/ui, Tailwind CSS, Radix UI primitives, and lucide-react icons.
- Quality: Biome, TypeScript, Vitest, deterministic data checks, and Playwright smoke tests.

## Workspace

```txt
apps/web             Static public comparison app
apps/data-studio     Local-only review and publishing interface
packages/data-core   Shared holiday data contracts and pipeline services
tools/data-cli       Resumable command-line data workflow
data/                Versioned sources, accepted records, reviews, and overrides
```

Common commands:

```sh
pnpm dev:web
pnpm dev:studio
pnpm data:refresh --source <source-id>
pnpm data:validate
pnpm data:rebuild:check
pnpm build
pnpm smoke
```

The current release contract covers all 16 states for 2026 and 2027. It requires 80 reviewed
source/state/period batches before the first static dataset can be published. A refresh always
stops at the human review gate.

See [docs/decisions/dependencies.md](docs/decisions/dependencies.md) for exact dependency decisions.
See [docs/decisions/quality-gates.md](docs/decisions/quality-gates.md) for quality gate expectations.
See [docs/data-workflow.md](docs/data-workflow.md) for refresh, review, recovery, and publishing.

## Working Rules

Before implementation work, read [AGENTS.md](AGENTS.md) and the project guideline skill it references. Every task must save a plan under `dev_locals/plans/` before execution. Checkpoint commits should be made after coherent work units pass their relevant checks.
