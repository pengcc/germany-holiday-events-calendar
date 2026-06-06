import { execFile } from "node:child_process";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";
import pLimit from "p-limit";
import { stringify } from "yaml";
import { compareRecords } from "./diff";
import { fetchSource } from "./fetch";
import {
  assertWithin,
  projectPaths,
  readJson,
  sha256,
  stableStringify,
  writeJsonAtomic,
  writeTextAtomic,
} from "./fs";
import { normalizeKmkIcs } from "./ical";
import { loadOverrides, loadSourceManifests } from "./manifests";
import { applyOverrides } from "./overrides";
import { crossCheckPublicHolidays } from "./public-holiday-crosscheck";
import {
  type AcceptedBatch,
  AcceptedBatchSchema,
  type BatchReviewDecision,
  BatchReviewDecisionSchema,
  type DataRun,
  DataRunSchema,
  type DecisionResolution,
  DecisionResolutionSchema,
  type HolidayOverride,
  type PublishedDatasetManifest,
  PublishedDatasetManifestSchema,
  type SourceManifest,
  type SourceRun,
  type SourceRunArtifacts,
  SourceRunArtifactsSchema,
  type ValidationIssue,
} from "./schemas";
import { hasBlockingIssues, validateRecords } from "./validation";

const execFileAsync = promisify(execFile);

export interface RefreshOptions {
  workspaceRoot: string;
  sourceIds?: string[];
  concurrency?: number;
  reuseFromRunId?: string;
}

export async function refreshSources(options: RefreshOptions): Promise<DataRun> {
  const paths = projectPaths(options.workspaceRoot);
  const allSources = await loadSourceManifests(paths.sources);
  const selected = allSources.filter(
    (source) =>
      source.enabled && (!options.sourceIds?.length || options.sourceIds.includes(source.id)),
  );
  if (selected.length === 0) {
    throw new Error("No enabled source manifests matched the requested source IDs.");
  }

  const overrides = await loadOverrides(paths.overrides);
  const runId = createRunId();
  const runDirectory = assertWithin(paths.runs, resolve(paths.runs, runId));
  const reuseDirectory = options.reuseFromRunId
    ? assertWithin(paths.runs, resolve(paths.runs, options.reuseFromRunId))
    : undefined;
  await mkdir(runDirectory, { recursive: true });
  const now = new Date().toISOString();
  let run: DataRun = {
    schemaVersion: 1,
    id: runId,
    parentRunId: options.reuseFromRunId,
    createdAt: now,
    updatedAt: now,
    stage: "fetched",
    sources: selected.map((source) => ({
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      periodId: source.period.id,
      status: "completed",
      stage: "fetched",
      recordCount: 0,
      issueCount: 0,
      decisionRequiredCount: 0,
    })),
  };
  await writeJsonAtomic(resolve(runDirectory, "run.json"), run);

  const limit = pLimit(options.concurrency ?? 3);
  const sourceRuns = await Promise.all(
    selected.map((source) =>
      limit(() =>
        processSource(source, overrides, paths.accepted, paths.cache, runDirectory, reuseDirectory),
      ),
    ),
  );
  run = {
    ...run,
    updatedAt: new Date().toISOString(),
    stage: "compared",
    sources: sourceRuns,
  };
  await writeJsonAtomic(resolve(runDirectory, "run.json"), run);
  return run;
}

async function processSource(
  source: SourceManifest,
  overrides: HolidayOverride[],
  acceptedDirectory: string,
  cacheDirectory: string,
  runDirectory: string,
  reuseDirectory?: string,
): Promise<SourceRun> {
  const sourceDirectory = assertWithin(runDirectory, resolve(runDirectory, source.id));
  await mkdir(sourceDirectory, { recursive: true });
  try {
    const fetched = await getFetchInput(source, cacheDirectory, sourceDirectory, reuseDirectory);
    const normalized = normalizeSource(fetched.body, source);
    const overridden = applyOverrides(normalized.records, overrides, source.id);
    const validationIssues = [
      ...validateRecords(overridden.records, source),
      ...crossCheckPublicHolidays(overridden.records, source),
    ];
    const accepted = await readAcceptedBatch(acceptedDirectory, source.id);
    const diff = compareRecords(accepted?.records ?? [], overridden.records);
    const diffIssues = diff
      .filter((entry) => entry.decisionRequired)
      .map<ValidationIssue>((entry) => ({
        code: entry.kind === "removed" ? "RECORD_REMOVED" : "SENSITIVE_CHANGE",
        severity: "blocker",
        stage: "compared",
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        recordId: entry.recordId,
        message:
          entry.kind === "removed"
            ? "A previously accepted holiday record was removed."
            : "A date or scope field changed from the accepted record.",
        suggestedAction:
          "Inspect the source event and explicitly resolve the decision before approval.",
        decisionRequired: true,
      }));
    const issues = [...normalized.issues, ...overridden.issues, ...validationIssues, ...diffIssues];
    const artifacts: SourceRunArtifacts = {
      schemaVersion: 1,
      source,
      fingerprint: fetched.fingerprint,
      records: overridden.records,
      issues,
      diff,
      overrideIds: overridden.overrideIds,
    };
    await writeJsonAtomic(resolve(sourceDirectory, "artifacts.json"), artifacts);

    return {
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      periodId: source.period.id,
      status: hasBlockingIssues(issues) ? "blocked" : "completed",
      stage: "compared",
      fingerprint: fetched.fingerprint,
      recordCount: overridden.records.length,
      issueCount: issues.length,
      decisionRequiredCount: issues.filter((issue) => issue.decisionRequired).length,
    };
  } catch (error) {
    return {
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      periodId: source.period.id,
      status: "blocked",
      stage: "fetched",
      recordCount: 0,
      issueCount: 1,
      decisionRequiredCount: 1,
      error: humanizeError(error),
    };
  }
}

async function getFetchInput(
  source: SourceManifest,
  cacheDirectory: string,
  sourceDirectory: string,
  reuseDirectory?: string,
) {
  if (reuseDirectory) {
    try {
      const reusedBody = await readFile(
        assertWithin(reuseDirectory, resolve(reuseDirectory, source.id, "raw.source")),
        "utf8",
      );
      const reusedFingerprint = SourceRunArtifactsSchema.shape.fingerprint.parse(
        await readJson(
          assertWithin(reuseDirectory, resolve(reuseDirectory, source.id, "fingerprint.json")),
        ),
      );
      await writeTextAtomic(resolve(sourceDirectory, "raw.source"), reusedBody);
      await writeJsonAtomic(resolve(sourceDirectory, "fingerprint.json"), reusedFingerprint);
      return { body: reusedBody, fingerprint: reusedFingerprint, fromCache: true };
    } catch {
      // A parent run that failed before fetch completion has no reusable response.
    }
  }

  const fetched = await fetchSource(source, cacheDirectory);
  await writeTextAtomic(resolve(sourceDirectory, "raw.source"), fetched.body);
  await writeJsonAtomic(resolve(sourceDirectory, "fingerprint.json"), fetched.fingerprint);
  return fetched;
}

function normalizeSource(body: string, source: SourceManifest) {
  if (source.adapter === "kmk-ics") {
    return normalizeKmkIcs(body, source);
  }
  throw new Error(`Adapter ${source.adapter} is declared but not implemented.`);
}

export async function listRuns(workspaceRoot: string): Promise<DataRun[]> {
  const paths = projectPaths(workspaceRoot);
  let entries: string[];
  try {
    entries = await readdir(paths.runs);
  } catch {
    return [];
  }
  const runs = await Promise.all(
    entries
      .sort()
      .reverse()
      .map(async (entry) => {
        try {
          return DataRunSchema.parse(await readJson(resolve(paths.runs, entry, "run.json")));
        } catch {
          return undefined;
        }
      }),
  );
  return runs.filter((run): run is DataRun => Boolean(run));
}

export async function getRun(workspaceRoot: string, runId: string): Promise<DataRun> {
  assertIdentifier(runId);
  const paths = projectPaths(workspaceRoot);
  return DataRunSchema.parse(
    await readJson(assertWithin(paths.runs, resolve(paths.runs, runId, "run.json"))),
  );
}

export async function resumeRun(
  workspaceRoot: string,
  parentRunId: string,
  sourceIds?: string[],
): Promise<DataRun> {
  const parent = await getRun(workspaceRoot, parentRunId);
  const retrySources = sourceIds?.length
    ? sourceIds
    : parent.sources
        .filter((source) => source.status === "blocked")
        .map((source) => source.sourceId);
  if (retrySources.length === 0) {
    throw new Error("The parent run has no blocked sources to resume.");
  }
  return refreshSources({
    workspaceRoot,
    sourceIds: retrySources,
    reuseFromRunId: parentRunId,
  });
}

export async function getSourceRunArtifacts(
  workspaceRoot: string,
  runId: string,
  sourceId: string,
): Promise<SourceRunArtifacts> {
  assertIdentifier(runId);
  assertIdentifier(sourceId);
  const paths = projectPaths(workspaceRoot);
  return SourceRunArtifactsSchema.parse(
    await readJson(
      assertWithin(paths.runs, resolve(paths.runs, runId, sourceId, "artifacts.json")),
    ),
  );
}

export async function reviewBatch(
  workspaceRoot: string,
  input: {
    runId: string;
    sourceId: string;
    decision: "approved" | "rejected";
    reviewer: string;
    notes?: string;
  },
): Promise<BatchReviewDecision> {
  const artifacts = await getSourceRunArtifacts(workspaceRoot, input.runId, input.sourceId);
  const paths = projectPaths(workspaceRoot);
  const resolutions = await readResolutions(paths.runs, input.runId, input.sourceId);
  const resolvedIssueKeys = new Set(resolutions.map((resolution) => resolution.issueKey));
  const unresolvedBlockers = artifacts.issues.filter(
    (issue) =>
      (issue.severity === "blocker" || issue.decisionRequired) &&
      !resolvedIssueKeys.has(issueKey(issue)),
  );
  if (input.decision === "approved" && unresolvedBlockers.length > 0) {
    throw new Error(
      `This batch has ${unresolvedBlockers.length} unresolved blocking issue(s). Resolve them before approval.`,
    );
  }
  const decision = BatchReviewDecisionSchema.parse({
    schemaVersion: 1,
    runId: input.runId,
    sourceId: input.sourceId,
    jurisdiction: artifacts.source.jurisdiction,
    periodId: artifacts.source.period.id,
    decision: input.decision,
    reviewer: input.reviewer,
    reviewedAt: new Date().toISOString(),
    notes: input.notes ?? "",
    fingerprintSha256: artifacts.fingerprint.sha256,
    overrideIds: artifacts.overrideIds,
    resolutionIds: resolutions.map((resolution) => resolution.id),
  });
  await writeJsonAtomic(
    assertWithin(paths.runs, resolve(paths.runs, input.runId, input.sourceId, "review.json")),
    decision,
  );
  const run = await getRun(workspaceRoot, input.runId);
  const reviewedSourceIds = new Set<string>();
  for (const source of run.sources) {
    try {
      BatchReviewDecisionSchema.parse(
        await readJson(resolve(paths.runs, input.runId, source.sourceId, "review.json")),
      );
      reviewedSourceIds.add(source.sourceId);
    } catch {
      // A missing review means the run remains at the comparison stage.
    }
  }
  if (reviewedSourceIds.size === run.sources.length) {
    await writeJsonAtomic(resolve(paths.runs, input.runId, "run.json"), {
      ...run,
      stage: "reviewed",
      updatedAt: new Date().toISOString(),
    });
  }
  return decision;
}

export async function resolveDecision(
  workspaceRoot: string,
  input: {
    runId: string;
    sourceId: string;
    issueKey: string;
    resolution: "accept-source-change" | "override" | "reject";
    rationale: string;
    evidenceUrl: string;
    resolvedBy: string;
  },
): Promise<DecisionResolution> {
  const artifacts = await getSourceRunArtifacts(workspaceRoot, input.runId, input.sourceId);
  const issue = artifacts.issues.find((item) => issueKey(item) === input.issueKey);
  if (!issue?.decisionRequired) {
    throw new Error("The requested issue does not require a recorded decision.");
  }
  const resolution = DecisionResolutionSchema.parse({
    schemaVersion: 1,
    id: `resolution-${Date.now()}`,
    runId: input.runId,
    sourceId: input.sourceId,
    issueKey: input.issueKey,
    resolution: input.resolution,
    rationale: input.rationale,
    evidenceUrl: input.evidenceUrl,
    resolvedBy: input.resolvedBy,
    resolvedAt: new Date().toISOString(),
  });
  const paths = projectPaths(workspaceRoot);
  const existing = await readResolutions(paths.runs, input.runId, input.sourceId);
  const next = [...existing.filter((item) => item.issueKey !== input.issueKey), resolution].sort(
    (left, right) => left.issueKey.localeCompare(right.issueKey),
  );
  await writeJsonAtomic(resolve(paths.runs, input.runId, input.sourceId, "resolutions.json"), next);
  return resolution;
}

export async function getDecisionResolutions(
  workspaceRoot: string,
  runId: string,
  sourceId: string,
): Promise<DecisionResolution[]> {
  const paths = projectPaths(workspaceRoot);
  return readResolutions(paths.runs, runId, sourceId);
}

export async function createOverrideDraft(
  workspaceRoot: string,
  input: {
    runId: string;
    sourceId: string;
    recordId?: string;
    rationale: string;
    evidenceUrl: string;
  },
): Promise<string> {
  const artifacts = await getSourceRunArtifacts(workspaceRoot, input.runId, input.sourceId);
  const id = `override-${input.sourceId}-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
  const draft = {
    schemaVersion: 1,
    id,
    sourceId: input.sourceId,
    operation: "update",
    targetRecordId: input.recordId ?? "replace-with-record-id",
    record: {
      startDate: "YYYY-MM-DD",
      endDate: "YYYY-MM-DD",
    },
    rationale: input.rationale,
    evidenceUrl: input.evidenceUrl,
    createdAt: new Date().toISOString(),
    reviewBy: artifacts.source.freshness.reviewBy,
  };
  const paths = projectPaths(workspaceRoot);
  const draftPath = assertWithin(
    paths.runs,
    resolve(paths.runs, input.runId, input.sourceId, `${id}.draft.yaml`),
  );
  await writeTextAtomic(draftPath, stringify(draft));
  return draftPath;
}

export async function previewPublish(
  workspaceRoot: string,
  runId: string,
): Promise<{
  approvableSources: string[];
  blockedSources: string[];
  files: string[];
  warnings: string[];
  suggestedCommitMessage: string;
}> {
  const run = await getRun(workspaceRoot, runId);
  const paths = projectPaths(workspaceRoot);
  const approvableSources: string[] = [];
  const blockedSources: string[] = [];

  for (const source of run.sources) {
    try {
      const review = BatchReviewDecisionSchema.parse(
        await readJson(resolve(paths.runs, runId, source.sourceId, "review.json")),
      );
      if (review.decision === "approved") {
        approvableSources.push(source.sourceId);
      } else {
        blockedSources.push(source.sourceId);
      }
    } catch {
      blockedSources.push(source.sourceId);
    }
  }

  return {
    approvableSources,
    blockedSources,
    files: [
      ...approvableSources.flatMap((sourceId) => [
        `data/accepted/batches/${sourceId}.json`,
        `data/reviews/${sourceId}.json`,
      ]),
      "apps/web/public/data/holidays.json",
      "apps/web/public/data/manifest.json",
    ],
    warnings:
      blockedSources.length > 0
        ? [`${blockedSources.length} unapproved or blocked source batch(es) will retain old data.`]
        : [],
    suggestedCommitMessage: `Update reviewed holiday data from ${runId}`,
  };
}

export async function publishRun(
  workspaceRoot: string,
  runId: string,
  options: { allowDirty?: boolean } = {},
): Promise<PublishedDatasetManifest> {
  const paths = projectPaths(workspaceRoot);
  if (!options.allowDirty) {
    await assertPublishPathsClean(paths.root);
  }
  const preview = await previewPublish(workspaceRoot, runId);
  if (preview.approvableSources.length === 0) {
    throw new Error("No approved source batches are available to publish.");
  }

  for (const sourceId of preview.approvableSources) {
    const artifacts = await getSourceRunArtifacts(workspaceRoot, runId, sourceId);
    const review = BatchReviewDecisionSchema.parse(
      await readJson(resolve(paths.runs, runId, sourceId, "review.json")),
    );
    const accepted = AcceptedBatchSchema.parse({
      schemaVersion: 1,
      source: artifacts.source,
      fingerprint: artifacts.fingerprint,
      records: artifacts.records,
      review,
    });
    await writeJsonAtomic(resolve(paths.accepted, `${sourceId}.json`), accepted);
    await writeJsonAtomic(resolve(paths.reviews, `${sourceId}.json`), review);

    if (artifacts.source.license.redistribution === "allowed") {
      const raw = await readFile(resolve(paths.runs, runId, sourceId, "raw.source"), "utf8");
      await writeTextAtomic(
        resolve(paths.snapshots, sourceId, `${artifacts.fingerprint.sha256}.source`),
        raw,
      );
    }
  }

  const manifest = await rebuildPublishedData(workspaceRoot);
  const run = await getRun(workspaceRoot, runId);
  await writeJsonAtomic(resolve(paths.runs, runId, "run.json"), {
    ...run,
    stage: "published",
    updatedAt: new Date().toISOString(),
  });
  return manifest;
}

export async function validateAcceptedData(workspaceRoot: string): Promise<ValidationIssue[]> {
  const paths = projectPaths(workspaceRoot);
  const batches = await readAllAccepted(paths.accepted);
  return batches.flatMap((batch) => validateRecords(batch.records, batch.source));
}

export async function rebuildPublishedData(
  workspaceRoot: string,
  options: { check?: boolean; today?: string } = {},
): Promise<PublishedDatasetManifest> {
  const paths = projectPaths(workspaceRoot);
  const batches = await readAllAccepted(paths.accepted);
  const records = batches
    .flatMap((batch) => batch.records)
    .sort(
      (left, right) =>
        left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id),
    );
  const recordsContent = `${stableStringify({ schemaVersion: 1, records })}\n`;
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const coverage = batches
    .map((batch) => ({
      sourceId: batch.source.id,
      jurisdiction: batch.source.jurisdiction,
      periodId: batch.source.period.id,
      reviewBy: batch.source.freshness.reviewBy,
      stale: batch.source.freshness.reviewBy < today,
    }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  const warnings = coverage
    .filter((item) => item.stale)
    .map((item) => `${item.sourceId} passed its review-by date ${item.reviewBy}.`);
  if (warnings.length > 0 && !options.check) {
    throw new Error(`Publishing is blocked by stale data: ${warnings.join(" ")}`);
  }
  const deterministicVersion = sha256(recordsContent).slice(0, 16);
  const generatedAt =
    batches
      .map((batch) => batch.review.reviewedAt)
      .sort()
      .at(-1) ?? "1970-01-01T00:00:00.000Z";
  const manifest = PublishedDatasetManifestSchema.parse({
    schemaVersion: 1,
    datasetVersion: deterministicVersion,
    generatedAt,
    recordsFile: "holidays.json",
    recordsSha256: sha256(recordsContent),
    recordCount: records.length,
    coverage,
    warnings,
    overrideIds: [...new Set(batches.flatMap((batch) => batch.review.overrideIds))].sort(),
  });
  const manifestContent = `${stableStringify(manifest)}\n`;

  if (options.check) {
    const existingRecords = await readFileOrEmpty(resolve(paths.publicData, "holidays.json"));
    const existingManifest = await readFileOrEmpty(resolve(paths.publicData, "manifest.json"));
    if (existingRecords !== recordsContent || existingManifest !== manifestContent) {
      throw new Error(
        "Published data is not reproducible. Run `pnpm data:rebuild` and review the diff.",
      );
    }
  } else {
    await writeTextAtomic(resolve(paths.publicData, "holidays.json"), recordsContent);
    await writeTextAtomic(resolve(paths.publicData, "manifest.json"), manifestContent);
  }
  return manifest;
}

export async function monitorSources(workspaceRoot: string): Promise<{
  checkedAt: string;
  sources: Array<{
    sourceId: string;
    reachable: boolean;
    fingerprint?: string;
    changed?: boolean;
    reviewBy: string;
    error?: string;
  }>;
}> {
  const paths = projectPaths(workspaceRoot);
  const sources = (await loadSourceManifests(paths.sources)).filter((source) => source.enabled);
  const results = [];
  for (const source of sources) {
    try {
      const fetched = await fetchSource(source, paths.cache);
      const accepted = await readAcceptedBatch(paths.accepted, source.id);
      results.push({
        sourceId: source.id,
        reachable: true,
        fingerprint: fetched.fingerprint.sha256,
        changed: accepted ? accepted.fingerprint.sha256 !== fetched.fingerprint.sha256 : true,
        reviewBy: source.freshness.reviewBy,
      });
    } catch (error) {
      results.push({
        sourceId: source.id,
        reachable: false,
        reviewBy: source.freshness.reviewBy,
        error: humanizeError(error),
      });
    }
  }
  return { checkedAt: new Date().toISOString(), sources: results };
}

async function readAllAccepted(directory: string): Promise<AcceptedBatch[]> {
  let files: string[];
  try {
    files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  } catch {
    return [];
  }
  return Promise.all(
    files.map(async (file) =>
      AcceptedBatchSchema.parse(await readJson(resolve(directory, basename(file)))),
    ),
  );
}

async function readAcceptedBatch(
  directory: string,
  sourceId: string,
): Promise<AcceptedBatch | undefined> {
  try {
    return AcceptedBatchSchema.parse(await readJson(resolve(directory, `${sourceId}.json`)));
  } catch {
    return undefined;
  }
}

async function readFileOrEmpty(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function readResolutions(
  runsDirectory: string,
  runId: string,
  sourceId: string,
): Promise<DecisionResolution[]> {
  assertIdentifier(runId);
  assertIdentifier(sourceId);
  try {
    const value = await readJson<unknown[]>(
      assertWithin(runsDirectory, resolve(runsDirectory, runId, sourceId, "resolutions.json")),
    );
    return value.map((item) => DecisionResolutionSchema.parse(item));
  } catch {
    return [];
  }
}

async function assertPublishPathsClean(workspaceRoot: string): Promise<void> {
  const { stdout } = await execFileAsync(
    "git",
    ["status", "--porcelain", "--", "data", "apps/web/public/data"],
    {
      cwd: workspaceRoot,
    },
  );
  if (stdout.trim()) {
    throw new Error(
      "Publishable data paths contain uncommitted changes. Commit or resolve them before publishing.",
    );
  }
}

function createRunId(): string {
  return `run-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`;
}

function assertIdentifier(value: string): void {
  if (!/^[a-zA-Z0-9-]+$/.test(value)) {
    throw new Error(`Invalid identifier: ${value}`);
  }
}

function humanizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function issueKey(issue: ValidationIssue): string {
  return `${issue.code}:${issue.recordId ?? "batch"}`;
}
