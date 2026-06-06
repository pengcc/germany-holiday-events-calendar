# Architecture

## Direction

The product is a static TanStack Router/Vite application with a local-only TanStack Start Data
Studio and shared TypeScript data tooling. Runtime deployment serves static HTML, CSS, JavaScript,
and reviewed generated JSON only.

## App

- Use TanStack Router with Vite for the public static app.
- Use explicit locale routes: `/zh`, `/de`, `/en`.
- Keep the public app independent from server functions, SSR, hosted runtimes, and API routes.
- Use TanStack Start only for the local Data Studio and bind it to `127.0.0.1`.
- Keep shared data logic framework-independent in `packages/data-core`.

## Data

- Frontend consumes generated normalized JSON.
- Local tools may fetch public/official sources, retain license-appropriate snapshots, parse data,
  validate contracts, generate reports, and write reviewed static data.
- Files are the source of truth; do not add a database or hosted data service.
- Automate through comparison, then require human approval before publication.
- Data contract should include federal state, year, holiday type, all-day ISO local date or inclusive date range, localized names where available, and source metadata.

## UI

- Use shadcn/ui conventions, Tailwind CSS, Radix primitives, and lucide-react.
- Build a custom comparison calendar/heatmap before adopting FullCalendar.
- If FullCalendar becomes necessary, document why the custom approach is no longer sufficient.
