# Dependency Policy

## Version Rules

- Pin exact versions in `package.json`.
- Do not commit `latest`, caret ranges, tilde ranges, or broad semver ranges.
- Keep `packageManager` exact.
- Keep Node pinned through `mise`.
- Update `docs/decisions/dependencies.md` whenever dependency versions change.

## Selection Rules

- Prefer current LTS runtimes over Current releases.
- Prefer stable package releases over beta, canary, RC, or experimental channels.
- If the latest version is ahead of framework compatibility, pin the latest stable compatible line and document the reason.
- Do not add a dependency when a small local helper is clearer and lower risk.
- Do not add paid, hosted, telemetry, analytics, geocoding, map, or enrichment services without explicit approval.

## Update Workflow

- Update dependencies manually in coherent batches.
- Re-check official docs or registry metadata before changing versions.
- Run relevant checks after updates.
- Record known compatibility notes in the dependency decision table.
