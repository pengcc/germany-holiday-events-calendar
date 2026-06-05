# Holiday Sync Germany Data Quality

Use this skill for holiday source research, data ingestion, parsing, validation, diffs, or generated static data.

## Rules

- Read the project guideline and `references/data-governance.md`.
- Use TypeScript for local data tooling unless a saved plan explicitly chooses otherwise.
- Keep raw snapshots separate from normalized generated JSON.
- Validate data with schemas before publication.
- Generate a reviewable diff/report for source updates.
- Require human review before publishable static data changes.
- Use `YYYY-MM-DD` German local all-day dates and inclusive ranges.

## Checks

Future data changes should include schema validation, date-range validation, duplicate checks, state/year coverage checks, and overlap logic tests.
