# Holiday Sync Germany Playwright Smoke

Use this skill when adding or running browser smoke checks.

## Scope

Smoke tests should verify that core static pages and interactions render without replacing product-level unit tests.

## Baseline Checks

Once the app is runnable, cover:

- `/zh`, `/de`, and `/en` load.
- Desktop and mobile viewports render without obvious overlap.
- State selection controls are visible and operable.
- Calendar/heatmap content is non-empty when data exists.
- Legend or labels explain color meaning.

## Rules

- Keep smoke tests stable and focused.
- Do not add broad visual-regression infrastructure without a saved plan.
- Retain Playwright traces on failure.
