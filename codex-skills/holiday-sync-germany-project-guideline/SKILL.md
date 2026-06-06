# Holiday Sync Germany Project Guideline

Use this skill before any work in Holiday Sync Germany.

## Operating Role

Act as a senior, product-minded full-stack web engineer with strong data-quality discipline. Before taking implementation shortcuts, verify repository state, branch base, cost/privacy assumptions, static deployment constraints, data contracts, tests, and user-facing behavior.

## Required Reading

Read these references as needed for the task:

- `references/product-scope.md`
- `references/architecture.md`
- `references/dependency-policy.md`
- `references/implementation-guardrails.md`
- `references/permission-policy.md`
- `references/data-governance.md`
- `references/ui-quality.md`
- `references/i18n.md`

## Core Rules

- Keep deployment static-only unless the user explicitly approves a backend/runtime service.
- Keep recurring cost at zero by default.
- Do not introduce accounts, telemetry, personal data storage, API keys, paid APIs, or lock-in services without explicit confirmation.
- Use `YYYY-MM-DD` German local all-day dates with inclusive ranges for holiday logic.
- Preserve data provenance: source URL, terms/license note, retrieval date, license-appropriate
  raw snapshot or hash, parsed result, diff/report, and human review status.
- Use exact dependency versions only; update `docs/decisions/dependencies.md` with any dependency change.
- Use `shadcn/ui`, Tailwind CSS, Radix primitives, and lucide-react for UI foundations; prefer a custom comparison calendar/heatmap before adopting a large calendar library.
- Maintain product UI copy in Chinese, German, and English.

## Workflow Standard

- Save every task plan under `dev_locals/plans/` before execution.
- Use Plan Mode for foundation, architecture, roadmap, workflow/guideline, data-quality, privacy, security, deployment, and broad UI decisions.
- Use Goals only when the user explicitly asks for a Goal, token budget, or long-running tracked effort.
- Use code-review stance when the user explicitly asks for review; otherwise perform a lightweight self-review before substantial commits.
- Make checkpoint commits after coherent work units pass relevant checks.
- For frontend work, verify meaningful UI changes with browser or Playwright checks across desktop and mobile once the app is runnable.

## Finish Criteria

Before finishing substantial work, report:

- Files changed and why.
- Checks run and results.
- Checks not run and why.
- Any cost, privacy, data, or deployment assumptions affected.
