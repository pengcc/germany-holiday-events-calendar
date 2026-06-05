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
- App: Next.js static export with TypeScript.
- UI: shadcn/ui, Tailwind CSS, Radix UI primitives, and lucide-react icons.
- Quality: Biome, Vitest, and Playwright smoke checks once the app is runnable.

See [docs/decisions/dependencies.md](docs/decisions/dependencies.md) for exact dependency decisions.
See [docs/decisions/quality-gates.md](docs/decisions/quality-gates.md) for quality gate expectations.

## Working Rules

Before implementation work, read [AGENTS.md](AGENTS.md) and the project guideline skill it references. Every task must save a plan under `dev_locals/plans/` before execution. Checkpoint commits should be made after coherent work units pass their relevant checks.
