# Quality Gates

Last reviewed: 2026-06-05

## Target Gates

The intended local and CI quality gates are:

- Format/lint/import organization through Biome.
- Type checking through TypeScript.
- Unit tests through Vitest.
- Data validation once the first static data contract exists.
- Static build through Next.js.
- Desktop/mobile Playwright smoke checks once the app has runnable pages.

## Current Foundation State

This foundation defines package scripts and config stubs, but does not install dependencies, generate a lockfile, or scaffold product pages. A GitHub Actions workflow should be added after the first install/lockfile step and minimal app scaffold exist, so CI does not start in a known-failing state.

## Command Targets

Future default commands:

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
```

Data validation should become a first-class command when the data schema and generated static data paths are introduced.
