# Dependency Decisions

Last reviewed: 2026-06-05

Versions were resolved at foundation setup time using official project documentation where behavior matters and read-only `npm view <package> version` registry lookups for exact package versions.

## Runtime And Package Manager

| Tool | Version | Source | Decision |
| --- | ---: | --- | --- |
| Node.js | 24.16.0 | Official Node.js release page | Pin current Node 24 LTS line for the project runtime. |
| pnpm | 11.5.2 | npm registry | Pin in `packageManager` as `pnpm@11.5.2`. |

## Application Dependencies

| Package | Version | Source | Decision |
| --- | ---: | --- | --- |
| next | 16.2.7 | npm registry | Current stable Next.js; use static export through `output: "export"`. |
| react | 19.2.7 | npm registry | Matches the current stable React peer accepted by Next.js. |
| react-dom | 19.2.7 | npm registry | Keep React DOM aligned with React. |
| zod | 4.4.3 | npm registry | Runtime/schema validation for static data contracts and local tooling. |
| lucide-react | 1.17.0 | npm registry | Icon system for UI controls and actions. |
| @radix-ui/react-slot | 1.2.4 | npm registry | Foundational Radix primitive commonly used by shadcn/ui components. |
| class-variance-authority | 0.7.1 | npm registry | Component variant utility used by shadcn-style components. |
| clsx | 2.1.1 | npm registry | Conditional class composition. |
| tailwind-merge | 3.6.0 | npm registry | Tailwind class conflict resolution. |
| tw-animate-css | 1.4.0 | npm registry | Animation utility used by current shadcn/Tailwind setups. |

## Development Dependencies

| Package | Version | Source | Decision |
| --- | ---: | --- | --- |
| typescript | 5.9.3 | npm registry | Use latest TypeScript 5.x line for conservative Next ecosystem compatibility; TypeScript 6.0.3 is latest but intentionally deferred. |
| @types/node | 24.13.0 | npm registry | Match the Node 24 runtime instead of the latest Node 25 type line. |
| @types/react | 19.2.16 | npm registry | Match React 19 type support. |
| @types/react-dom | 19.2.3 | npm registry | Match React DOM 19 type support. |
| @biomejs/biome | 2.4.16 | npm registry | Formatter, linter, and import organization. |
| vitest | 4.1.8 | npm registry | Unit tests for date normalization, overlap logic, and data tooling. |
| @playwright/test | 1.60.0 | npm registry | Desktop/mobile browser smoke testing once the app is runnable. |
| tailwindcss | 4.3.0 | npm registry | UI styling foundation. |
| @tailwindcss/postcss | 4.3.0 | npm registry | Tailwind CSS v4 PostCSS integration for Next. |
| @tailwindcss/cli | 4.3.0 | npm registry | Optional local Tailwind CLI utility. |
| shadcn | 4.10.0 | npm registry | Pin CLI version for future shadcn/ui component generation. |

## Version Policy

- Use exact dependency versions only.
- Do not use `latest`, caret ranges, tilde ranges, or broad semver ranges in committed manifests.
- Prefer current LTS runtimes over Current releases.
- If a latest package is ahead of common framework compatibility, pin the latest stable compatible line and record the reason here.
- Update dependencies manually in batches, with the dependency table updated in the same change.
