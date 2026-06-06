# Quality Gates

Last reviewed: 2026-06-05

## Target Gates

The intended local and CI quality gates are:

- Format/lint/import organization through Biome.
- Type checking through TypeScript.
- Unit tests through Vitest.
- Data schema validation and deterministic rebuild checks.
- Static public build through Vite.
- Local Data Studio production build through TanStack Start.
- Desktop/mobile Playwright smoke checks for public routes and the local Studio.

## Current Foundation State

CI must use the frozen lockfile and may not refresh external holiday data. Source monitoring is a
separate read-only workflow that reports drift without changing reviewed files.

## Command Targets

Future default commands:

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm data:validate
pnpm data:rebuild:check
pnpm build
pnpm smoke
```
