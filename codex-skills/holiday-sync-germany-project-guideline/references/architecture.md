# Architecture

## Direction

The product is a static-first Next.js application with local TypeScript data tooling. Runtime deployment should serve static HTML, CSS, JavaScript, and generated JSON only.

## App

- Use Next.js static export with `output: "export"`.
- Use explicit locale routes: `/zh`, `/de`, `/en`.
- Prefer build-time/static data consumption over runtime requests.
- Do not rely on cookies, server actions, ISR, dynamic route params without static generation, or other server-only features.
- Keep image handling compatible with static export; use unoptimized images unless a static-safe loader is explicitly chosen.

## Data

- Frontend consumes generated normalized JSON.
- Local tools may fetch public/official sources, retain raw snapshots, parse data, validate contracts, generate reports, and write reviewed static data.
- Data contract should include federal state, year, holiday type, all-day ISO local date or inclusive date range, localized names where available, and source metadata.

## UI

- Use shadcn/ui conventions, Tailwind CSS, Radix primitives, and lucide-react.
- Build a custom comparison calendar/heatmap before adopting FullCalendar.
- If FullCalendar becomes necessary, document why the custom approach is no longer sufficient.
