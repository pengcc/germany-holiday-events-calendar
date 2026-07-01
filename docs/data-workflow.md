# Local Holiday Data Workflow

The public site never fetches upstream holiday data. Local tooling fetches and compares data, a
human records the review decision, and only an explicit publish command changes deployable JSON.

## Start The Tools

Use the pinned Node and pnpm versions:

```sh
mise exec -- corepack pnpm install
mise exec -- corepack pnpm dev:studio
```

The Data Studio is available only at `http://127.0.0.1:3010`. It has no deployment script and its
server functions accept source and run identifiers, never arbitrary paths or URLs.

The CLI provides the same workflow:

```sh
mise exec -- corepack pnpm data:refresh
mise exec -- corepack pnpm data:resume <blocked-run-id>
mise exec -- corepack pnpm data:resolve <run-id> <source-id> <issue-key> \
  --reviewer "Name" --rationale "Reason" --evidence "https://official.example/"
mise exec -- corepack pnpm data:review <run-id> <source-id> --reviewer "Name"
mise exec -- corepack pnpm data:publish <run-id> --preview
mise exec -- corepack pnpm data:publish <run-id>
mise exec -- corepack pnpm data:publish <run-id> --approved-partial
mise exec -- corepack pnpm data:release:check
```

The configured 2026–2027 release contains 80 independently reviewed batches:

- 48 school-holiday batches: 16 states across KMK school years 2025/26, 2026/27, and 2027/28.
- 32 public-holiday batches: 16 states for calendar years 2026 and 2027.
- KMK 2026/27 iCalendar data is compared with the official annual PDF before review.
- State legal pages fingerprint the evidence used by the versioned public-holiday rules.

## Review Sequence

1. Refresh configured sources. A new immutable run is created under `dev_locals/data-runs/`.
2. Inspect validation issues and the accepted-versus-fetched diff.
3. For a deletion, date movement, scope change, source conflict, or ambiguity, record an explicit
   decision with reviewer, rationale, and official evidence.
   Evidence-backed public holidays with known regional scope but an unresolved exact municipality
   set are emitted as nonblocking `REGIONAL_APPLICABILITY_ADVISORY` warnings. Approving their mixed
   source batch reviews the statewide records and retains the regional record as limited advisory
   data; it never converts or approves that record as statewide. A regional rule without enough
   official evidence or applicability information remains a blocking
   `REGIONAL_SCOPE_REVIEW_REQUIRED` issue.
4. Create an override draft only when normalized output needs a documented correction. Move a
   reviewed draft to `data/overrides/` and rerun the batch.
5. Approve or reject each source/state/period batch.
   Studio can bulk-approve selected batches only when each selected batch has no unresolved
   blocker. It still writes one review decision per batch.
6. Inspect the publish preview and confirm the listed files.
7. Publish. Strict `data:publish` requires complete release coverage. Use the explicit
   `--approved-partial` mode only to write approved data for local frontend review while coverage
   remains incomplete. Both modes refuse to run while `data/` or `apps/web/public/data/` already
   has uncommitted changes.
8. Inspect `git diff`, run the quality gates, and commit manually. Studio never commits or pushes.

## Failure Recovery

- A failed source does not remove its previously accepted batch.
- `data:resume` creates a child run and reuses the parent raw response and fingerprint when they
  exist. It contacts the source again only when the earlier fetch did not complete.
- Errors state the affected source or record, expected and actual values, and a suggested next
  action. Technical details are secondary and expandable in Studio.
- Do not use `--allow-dirty` for normal publishing. It exists only for controlled repository
  recovery after inspecting the working tree.

## Release Gate

- The first release requires approved, current data for all 80 configured batches.
- Public state/year coverage requires reviewed statewide public-holiday records. Regional records
  may accompany a reviewed mixed batch as limited advisory data, but a regional-only public batch
  cannot establish statewide coverage.
- `data:publish <run-id>` remains strict and fails before writing when required batches, freshness,
  or release coverage are incomplete.
- `data:publish <run-id> --approved-partial` writes only approved current-run batches together with
  still-current previously accepted batches. Blocked, rejected, unresolved, and unapproved run
  records are excluded. Missing coverage remains `covered: false` in the generated manifest.
- Approved-partial output exists for frontend review of incomplete data. It is not public release
  approval and must not be released or deployed as a complete dataset.
- `data:release:check` assesses the currently published manifest against required source batches,
  freshness, and coverage. It exits unsuccessfully until the complete release gate passes.
- The publish preview identifies approved batches, valid old batches that would be retained,
  missing required batches, regional records, and release readiness.
- A later refresh may retain a previously approved batch only while its `reviewBy` date remains
  valid.
- Published JSON is limited to records intersecting 2026–2027. Cross-year ranges remain intact.
- `pnpm data:rebuild:check` proves that committed accepted batches reproduce the static JSON
  exactly; normal web builds never fetch or regenerate upstream data.

## Source And License Rules

- Source manifests live in `data/sources/` and define allowed hosts, MIME types, response limits,
  authority, coverage, license status, cadence, and review-by date.
- Official or legal sources remain publishing authority. Third-party packages and feeds are
  read-only cross-checks.
- If redistribution is allowed, an approved raw snapshot may be committed under
  `data/snapshots/accepted/`.
- If redistribution is unknown or prohibited, the raw response remains under `dev_locals/`; only
  its URL, retrieval metadata, hash, normalized facts, and review record are versioned.
- Adding a source that needs a secret, API key, paid service, or unclear automated-access
  permission requires an explicit project decision before implementation.

## Scheduled Monitoring

The quarterly GitHub workflow checks reachability, fingerprints, and review-by dates. It may open
or update an Issue but never modifies data, opens a data pull request, or publishes the site.
