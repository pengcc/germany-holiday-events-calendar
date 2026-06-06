# Dependency Decisions

Last reviewed: 2026-06-06

Versions were resolved from official project documentation and exact npm registry metadata.
All workspace manifests use exact versions.

## Runtime And Core Tooling

| Package | Version | Decision |
| --- | ---: | --- |
| Node.js | 24.16.0 | Project LTS runtime. |
| pnpm | 11.5.2 | Exact workspace package manager. |
| TypeScript | 5.9.3 | Stable TypeScript 5 line. |
| Biome | 2.4.16 | Formatting, linting, and import organization. |
| Vitest | 4.1.8 | Unit and integration tests. |
| Playwright | 1.60.0 | Desktop and mobile smoke tests. |
| tsx | 4.22.4 | Execute local TypeScript CLI tools. |

## React And UI

| Package | Version | Decision |
| --- | ---: | --- |
| react / react-dom | 19.2.7 | Shared React runtime. |
| Vite | 8.0.16 | Public app and Start build tooling. |
| @vitejs/plugin-react | 6.0.2 | React Fast Refresh and JSX support. |
| @tanstack/react-router | 1.170.13 | Static public routing and Start routing. |
| @tanstack/router-plugin | 1.168.16 | Transitive Start route-generation plugin recorded for compatibility. |
| @tanstack/react-start | 1.168.22 | Local-only Data Studio server functions. Start is RC, so no shared data logic depends on it. |
| @tanstack/react-table | 8.21.3 | Accessible review and diff table model. |
| Tailwind CSS / @tailwindcss/vite | 4.3.0 | Styling and Vite integration. |
| shadcn | 4.10.0 | Exact CLI version for future component generation. |
| lucide-react | 1.17.0 | UI icon system. |
| @radix-ui/react-slot | 1.2.4 | shadcn-compatible composition primitive. |
| class-variance-authority | 0.7.1 | Component variant definitions. |
| clsx | 2.1.1 | Conditional class composition. |
| tailwind-merge | 3.6.0 | Tailwind class conflict resolution. |
| tw-animate-css | 1.4.0 | shadcn-compatible animation utilities. |

## Data Tooling

| Package | Version | Decision |
| --- | ---: | --- |
| zod | 4.4.3 | Runtime schemas for every persisted data boundary. |
| yaml | 2.9.0 | Human-readable source manifests and override records. |
| ical.js | 2.2.1 | Standards-aware iCalendar parsing. |
| @internationalized/date | 3.12.2 | All-day calendar arithmetic without timezone timestamps. |
| commander | 15.0.0 | Structured CLI commands and help. |
| p-limit | 7.3.0 | Bounded source fetch concurrency. |
| date-holidays | 3.30.2 | Read-only public-holiday cross-check, never publishing authority. |

## Policy

- No `latest`, caret, tilde, or broad semver ranges.
- TanStack Start remains isolated to the local Data Studio while it is an RC.
- Do not add databases, queues, analytics, hosted services, or paid APIs without explicit approval.
- Dependency changes require this table and the lockfile to change together.
