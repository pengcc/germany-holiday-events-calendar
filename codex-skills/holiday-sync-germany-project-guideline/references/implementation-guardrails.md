# Implementation Guardrails

## General

- Keep changes scoped to the saved plan.
- Avoid unrelated refactors.
- Preserve static deployment constraints.
- Prefer TypeScript for app and local tooling.
- Keep code readable and data contracts explicit.
- Use structured parsing and validation for data; avoid ad hoc string handling where a proper parser or schema is reasonable.

## Dates

- Represent holidays as `YYYY-MM-DD` German local all-day dates.
- Treat date ranges as inclusive.
- Avoid JS timestamp/timezone calculations for holiday overlap logic.
- Add tests before or with non-trivial date logic.

## Data Changes

- Never update publishable static data directly from an external source without a reviewable diff/report.
- Keep raw source snapshots and review status for data updates.
- Make data validation failures block publication.

## UI Changes

- Design for a clean travel-planning tool, not a generic admin dashboard.
- Use icons for common tools and actions when a familiar lucide icon exists.
- Ensure responsive layout, clear legends, and no color-only meaning.
- Browser-check meaningful UI changes once runnable.
