---
name: holiday-sync-germany-publish-current-branch
description: Publish the current Holiday Sync Germany feature branch by pushing it, creating a pull request to main, and enabling auto-merge only when CI protection can make that safe. Use when the user says "publish-current-branch" or asks to publish the current branch for this project.
---

# Holiday Sync Germany Publish Current Branch

## Trigger

Use this skill when the user says:

```txt
publish-current-branch
```

This means: push the current branch, create a pull request to `main`, enable auto-merge after CI
passes when safely enforceable, keep the branch, and return the local repository to refreshed
`main` after a verified merge.

## Required Context

Before acting:

1. Read `codex-skills/holiday-sync-germany-project-guideline/SKILL.md`.
2. Read `codex-skills/holiday-sync-germany-project-guideline/references/permission-policy.md`.
3. Check the current branch, working tree, remote URL, and branch base.

## Safety Rules

- Do not run from `main`.
- Do not publish a dirty working tree unless the user explicitly asks to include those changes and
  they are committed first.
- Require `origin` to resolve to `pengcc/holiday-sync-germany`; stop on any mismatch.
- Do not delete local or remote branches.
- Use `gh` CLI by default for PR creation and auto-merge, always with
  `--repo pengcc/holiday-sync-germany`.
- Use the GitHub connector for read/context operations or only as a write fallback when `gh` is
  unavailable and the connector has the required permission.
- Do not use `gh` against another repository in this project context.
- Do not run destructive repository, release, workflow, cache, label, secret, variable, or API
  operations.
- Do not change branch protection, rulesets, auto-merge settings, secrets, deployment, Cloudflare
  configuration, paid services, analytics, or larger runners without explicit user confirmation.
- If a tool approval prompt appears, wait for the user.

## Required Local Checks

Confirm `.github/workflows/ci.yml` exists, then run the checks required by the current workflow:

```txt
mise exec -- pnpm check
mise exec -- pnpm typecheck
mise exec -- pnpm test
mise exec -- pnpm data:validate
mise exec -- pnpm data:rebuild:check
mise exec -- pnpm build
mise exec -- pnpm smoke
```

If any check fails, stop and report the failure. Do not push.

## Publish Workflow

1. Confirm the current branch is not `main`.
2. Confirm the working tree is clean.
3. Confirm the branch is based on the current `origin/main`; stop and report if it is stale or
   diverged rather than rebasing without instruction.
4. Confirm `origin` is the expected repository and CI exists.
5. Run all required local checks.
6. Push with upstream tracking:

   ```txt
   git push -u origin <current-branch>
   ```

7. Create a pull request to `main` with `gh pr create --repo pengcc/holiday-sync-germany`.
8. Do not delete the branch.
9. After the merge is verified:

   ```txt
   git switch main
   git fetch origin main
   git merge --ff-only origin/main
   ```

If auto-merge is enabled but the PR is pending, do not start the next-stage plan or implementation
from the feature branch. Report that work should wait until merge verification and refreshed
`main`.

## Auto-Merge Discipline

Enable auto-merge only when:

- branch protection or a ruleset requires the relevant CI checks for `main`; or
- the latest PR CI checks succeeded and the user explicitly confirms merging now.

Do not assume auto-merge waits for optional CI. If required checks are not enforced, create the PR,
report the gap, and ask whether the user wants to configure protection or wait for CI manually.

Before reporting that repository settings block auto-merge, verify:

```txt
gh api repos/pengcc/holiday-sync-germany --jq '.allow_auto_merge'
```

When auto-merge is allowed and required checks are enforced, prefer:

```txt
gh pr merge <number> --auto --squash --repo pengcc/holiday-sync-germany
```

Prefer squash merge unless the user requests another method.

## Output

Report:

- branch pushed;
- pull request URL;
- auto-merge status and its safety basis;
- local-check results;
- whether local `main` was refreshed after a verified merge;
- any manual follow-up;
- a final `Recommended next step` section.
