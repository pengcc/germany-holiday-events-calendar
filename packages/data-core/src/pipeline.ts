import { execFile } from "node:child_process";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";
import pLimit from "p-limit";
import { stringify } from "yaml";
import { compareRecords } from "./diff";
import type { FetchResult } from "./fetch";
import { fetchSource } from "./fetch";
import {
  assertWithin,
  projectPaths,
  readJson,
  sha256,
  stableStringify,
  writeBytesAtomic,
  writeJsonAtomic,
  writeTextAtomic,
} from "./fs";
import { normalizeKmkIcs } from "./ical";
import { normalizeKmkPdf } from "./kmk-pdf";
import { loadOverrides, loadReleaseConfig, loadSourceManifests } from "./manifests";
import { applyOverrides } from "./overrides";
import { crossCheckPublicHolidays } from "./public-holiday-crosscheck";
import {
  generatePublicHolidays,
  loadPublicHolidayRules,
  type PublicHolidayRule,
  regionalRuleReviewIssues,
} from "./public-holidays";
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
  type HolidayRecord,
  type PublishedDatasetManifest,
  PublishedDatasetManifestSchema,
  type SourceDocument,
  type SourceFingerprint,
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

  const [overrides, publicHolidayRules] = await Promise.all([
    loadOverrides(paths.overrides),
    loadPublicHolidayRules(paths.publicRules),
  ]);
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
  const sharedFetches = new Map<string, Promise<FetchResult>>();
  const sourceRuns = await Promise.all(
    selected.map((source) =>
      limit(() =>
        processSource(
          source,
          overrides,
          publicHolidayRules,
          paths.accepted,
          paths.cache,
          runDirectory,
          reuseDirectory,
          sharedFetches,
        ),
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
  publicHolidayRules: PublicHolidayRule[],
  acceptedDirectory: string,
  cacheDirectory: string,
  runDirectory: string,
  reuseDirectory?: string,
  sharedFetches?: Map<string, Promise<FetchResult>>,
): Promise<SourceRun> {
  const sourceDirectory = assertWithin(runDirectory, resolve(runDirectory, source.id));
  await mkdir(sourceDirectory, { recursive: true });
  try {
    const fetched = await getFetchInput(
      source,
      cacheDirectory,
      sourceDirectory,
      reuseDirectory,
      sharedFetches,
    );
    const crossCheck = source.crossCheckDocument
      ? await getCrossCheckInput(
          source,
          cacheDirectory,
          sourceDirectory,
          reuseDirectory,
          sharedFetches,
        )
      : undefined;
    const rulesFingerprint =
      source.adapter === "public-rules"
        ? localRulesFingerprint(source, publicHolidayRules)
        : undefined;
    const fingerprint = compositeFingerprint(
      source,
      fetched.fingerprint,
      crossCheck?.fingerprint ?? rulesFingerprint,
      crossCheck ? undefined : rulesFingerprint ? "public-holiday-rules" : undefined,
    );
    const normalized = await normalizeSource(fetched.body, source, publicHolidayRules);
    const officialCrossCheck =
      source.adapter === "kmk-ics" && crossCheck
        ? await normalizeKmkPdf(crossCheck.body, {
            ...source,
            documentId: source.crossCheckDocument?.id,
            adapter: "kmk-pdf",
            format: "pdf",
          })
        : undefined;
    const officialCrossCheckIssues = officialCrossCheck
      ? [
          ...officialCrossCheck.issues,
          ...compareKmkOfficialSources(normalized.records, officialCrossCheck.records, source),
        ]
      : [];
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
    const issues = [
      ...normalized.issues,
      ...officialCrossCheckIssues,
      ...overridden.issues,
      ...validationIssues,
      ...diffIssues,
    ];
    const artifacts: SourceRunArtifacts = {
      schemaVersion: 1,
      source,
      fingerprint,
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
      fingerprint,
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
  sharedFetches?: Map<string, Promise<FetchResult>>,
) {
  if (reuseDirectory) {
    try {
      const reusedBody = await readFile(
        assertWithin(reuseDirectory, resolve(reuseDirectory, source.id, "raw.source")),
      );
      const reusedFingerprint = SourceRunArtifactsSchema.shape.fingerprint.parse(
        await readJson(
          assertWithin(reuseDirectory, resolve(reuseDirectory, source.id, "fingerprint.json")),
        ),
      );
      await writeBytesAtomic(resolve(sourceDirectory, "raw.source"), reusedBody);
      await writeJsonAtomic(resolve(sourceDirectory, "fingerprint.json"), reusedFingerprint);
      return { body: reusedBody, fingerprint: reusedFingerprint, fromCache: true };
    } catch {
      // A parent run that failed before fetch completion has no reusable response.
    }
  }

  const fetched = await fetchShared(source, cacheDirectory, sharedFetches);
  await writeBytesAtomic(resolve(sourceDirectory, "raw.source"), fetched.body);
  await writeJsonAtomic(resolve(sourceDirectory, "fingerprint.json"), fetched.fingerprint);
  return fetched;
}

async function getCrossCheckInput(
  source: SourceManifest,
  cacheDirectory: string,
  sourceDirectory: string,
  reuseDirectory?: string,
  sharedFetches?: Map<string, Promise<FetchResult>>,
) {
  const document = source.crossCheckDocument;
  if (!document) {
    throw new Error(`Source ${source.id} does not define a cross-check document.`);
  }
  const crossCheckSource = sourceFromDocument(source, document, `${source.id}-cross-check`);
  const rawPath = resolve(sourceDirectory, "cross-check.raw");
  const fingerprintPath = resolve(sourceDirectory, "cross-check-fingerprint.json");

  if (reuseDirectory) {
    try {
      const reusedBody = await readFile(
        assertWithin(reuseDirectory, resolve(reuseDirectory, source.id, "cross-check.raw")),
      );
      const reusedFingerprint = SourceRunArtifactsSchema.shape.fingerprint.parse(
        await readJson(
          assertWithin(
            reuseDirectory,
            resolve(reuseDirectory, source.id, "cross-check-fingerprint.json"),
          ),
        ),
      );
      await writeBytesAtomic(rawPath, reusedBody);
      await writeJsonAtomic(fingerprintPath, reusedFingerprint);
      return { body: reusedBody, fingerprint: reusedFingerprint, fromCache: true };
    } catch {
      // A parent run that failed before cross-check fetch completion is not reusable.
    }
  }

  const fetched = await fetchShared(crossCheckSource, cacheDirectory, sharedFetches);
  await writeBytesAtomic(rawPath, fetched.body);
  await writeJsonAtomic(fingerprintPath, fetched.fingerprint);
  return fetched;
}

function fetchShared(
  source: SourceManifest,
  cacheDirectory: string,
  sharedFetches?: Map<string, Promise<FetchResult>>,
): Promise<FetchResult> {
  if (!sharedFetches) {
    return fetchSource(source, cacheDirectory);
  }
  const key = source.documentId ?? source.id;
  const existing = sharedFetches.get(key);
  if (existing) {
    return existing;
  }
  const request = fetchSource(source, cacheDirectory);
  sharedFetches.set(key, request);
  return request;
}

async function normalizeSource(
  body: Uint8Array,
  source: SourceManifest,
  publicHolidayRules: PublicHolidayRule[],
) {
  if (source.adapter === "kmk-ics") {
    return normalizeKmkIcs(new TextDecoder().decode(body), source);
  }
  if (source.adapter === "kmk-pdf") {
    return normalizeKmkPdf(body, source);
  }
  if (source.adapter === "public-rules") {
    return {
      records: generatePublicHolidays(source, publicHolidayRules),
      issues: regionalRuleReviewIssues(source, publicHolidayRules),
    };
  }
  throw new Error(`Adapter ${source.adapter} is declared but not implemented.`);
}

function sourceFromDocument(
  source: SourceManifest,
  document: SourceDocument,
  id: string,
): SourceManifest {
  return {
    ...source,
    id,
    documentId: document.id,
    crossCheckDocumentId: undefined,
    crossCheckDocument: undefined,
    name: document.name,
    homepageUrl: document.homepageUrl,
    fetchUrl: document.fetchUrl,
    format: document.format,
    license: document.license,
    fetch: document.fetch,
    freshness: document.freshness,
  };
}

function compositeFingerprint(
  source: SourceManifest,
  primary: SourceFingerprint,
  crossCheck?: SourceFingerprint,
  secondaryDocumentId?: string,
): SourceFingerprint {
  if (!crossCheck) {
    return primary;
  }
  return {
    ...primary,
    sha256: sha256(`${primary.sha256}:${crossCheck.sha256}`),
    bytes: primary.bytes + crossCheck.bytes,
    retrievedAt:
      primary.retrievedAt > crossCheck.retrievedAt ? primary.retrievedAt : crossCheck.retrievedAt,
    documents: [
      {
        documentId: source.documentId ?? source.id,
        sha256: primary.sha256,
        bytes: primary.bytes,
        contentType: primary.contentType,
        finalUrl: primary.finalUrl,
      },
      {
        documentId:
          secondaryDocumentId ?? source.crossCheckDocument?.id ?? `${source.id}-cross-check`,
        sha256: crossCheck.sha256,
        bytes: crossCheck.bytes,
        contentType: crossCheck.contentType,
        finalUrl: crossCheck.finalUrl,
      },
    ],
  };
}

function localRulesFingerprint(
  source: SourceManifest,
  rules: PublicHolidayRule[],
): SourceFingerprint {
  const relevantRules = rules.filter(
    (rule) => rule.jurisdictions === "all" || rule.jurisdictions.includes(source.jurisdiction),
  );
  const body = stableStringify(relevantRules);
  return {
    sha256: sha256(body),
    bytes: new TextEncoder().encode(body).byteLength,
    contentType: "application/yaml+derived",
    retrievedAt: "1970-01-01T00:00:00.000Z",
    finalUrl: "https://holiday-sync-germany.invalid/local/public-holiday-rules",
  };
}

function compareKmkOfficialSources(
  primary: HolidayRecord[],
  crossCheck: HolidayRecord[],
  source: SourceManifest,
): ValidationIssue[] {
  const ranges = (records: HolidayRecord[]) =>
    records
      .map((record) => `${record.startDate}/${record.endDate}`)
      .sort()
      .join(", ");
  const primaryRanges = ranges(primary);
  const crossCheckRanges = ranges(crossCheck);
  if (primaryRanges === crossCheckRanges) {
    return [];
  }
  return [
    {
      code: "KMK_OFFICIAL_SOURCES_CONFLICT",
      severity: "blocker",
      stage: "validated",
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      periodId: source.period.id,
      message: "The KMK ICS calendar and KMK annual PDF contain different holiday ranges.",
      expected: crossCheckRanges || "At least one range in the KMK PDF",
      actual: primaryRanges || "No ranges in the KMK ICS calendar",
      suggestedAction:
        "Inspect both official KMK documents and record a resolution or reviewed override.",
      decisionRequired: true,
    },
  ];
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
  retainedSources: string[];
  missingRequiredSources: string[];
  regionalRecordCount: number;
  files: string[];
  warnings: string[];
  suggestedCommitMessage: string;
}> {
  const run = await getRun(workspaceRoot, runId);
  const paths = projectPaths(workspaceRoot);
  const approvableSources: string[] = [];
  const blockedSources: string[] = [];
  let regionalRecordCount = 0;

  for (const source of run.sources) {
    try {
      const review = BatchReviewDecisionSchema.parse(
        await readJson(resolve(paths.runs, runId, source.sourceId, "review.json")),
      );
      if (review.decision === "approved") {
        approvableSources.push(source.sourceId);
        const artifacts = await getSourceRunArtifacts(workspaceRoot, runId, source.sourceId);
        regionalRecordCount += artifacts.records.filter(
          (record) => record.scope === "regional",
        ).length;
      } else {
        blockedSources.push(source.sourceId);
      }
    } catch {
      blockedSources.push(source.sourceId);
    }
  }
  const [accepted, release, configuredSources] = await Promise.all([
    readAllAccepted(paths.accepted),
    loadReleaseConfig(paths.releaseConfig),
    loadSourceManifests(paths.sources),
  ]);
  const acceptedIds = new Set(accepted.map((batch) => batch.source.id));
  const approvedIds = new Set(approvableSources);
  const retainedSources = blockedSources.filter((sourceId) => acceptedIds.has(sourceId));
  const missingRequiredSources = configuredSources
    .filter(
      (source) =>
        source.enabled &&
        release.jurisdictions.includes(source.jurisdiction) &&
        release.categories.includes(source.category) &&
        release.targetYears.some((year) => periodOverlapsYear(source, year)) &&
        !acceptedIds.has(source.id) &&
        !approvedIds.has(source.id),
    )
    .map((source) => source.id)
    .sort();
  regionalRecordCount += accepted
    .filter((batch) => !approvedIds.has(batch.source.id))
    .flatMap((batch) => batch.records)
    .filter((record) => record.scope === "regional").length;
  const warnings = [];
  if (retainedSources.length > 0) {
    warnings.push(`${retainedSources.length} source batch(es) will retain reviewed old data.`);
  }
  if (missingRequiredSources.length > 0) {
    warnings.push(
      `${missingRequiredSources.length} required source batch(es) have no approved data; publication is blocked.`,
    );
  }

  return {
    approvableSources,
    blockedSources,
    retainedSources,
    missingRequiredSources,
    regionalRecordCount,
    files: [
      ...approvableSources.flatMap((sourceId) => [
        `data/accepted/batches/${sourceId}.json`,
        `data/reviews/${sourceId}.json`,
      ]),
      "apps/web/public/data/holidays.json",
      "apps/web/public/data/manifest.json",
    ],
    warnings,
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

  const existingBatches = await readAllAccepted(paths.accepted);
  const prospectiveBatches = new Map(
    existingBatches.map((batch) => [batch.source.id, batch] as const),
  );
  for (const sourceId of preview.approvableSources) {
    const artifacts = await getSourceRunArtifacts(workspaceRoot, runId, sourceId);
    const review = BatchReviewDecisionSchema.parse(
      await readJson(resolve(paths.runs, runId, sourceId, "review.json")),
    );
    prospectiveBatches.set(
      sourceId,
      AcceptedBatchSchema.parse({
        schemaVersion: 1,
        source: artifacts.source,
        fingerprint: artifacts.fingerprint,
        records: artifacts.records,
        review,
      }),
    );
  }
  await assertReleaseReady(workspaceRoot, [...prospectiveBatches.values()]);

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
      const raw = await readFile(resolve(paths.runs, runId, sourceId, "raw.source"));
      await writeBytesAtomic(
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
  const [batches, release] = await Promise.all([
    readAllAccepted(paths.accepted),
    loadReleaseConfig(paths.releaseConfig),
  ]);
  const windowStart = `${Math.min(...release.targetYears)}-01-01`;
  const windowEnd = `${Math.max(...release.targetYears)}-12-31`;
  const records = batches
    .flatMap((batch) => batch.records)
    .filter((record) => record.endDate >= windowStart && record.startDate <= windowEnd)
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
    targetYears: release.targetYears,
    jurisdictions: release.jurisdictions,
    categories: release.categories,
    regionalRecordCount: records.filter((record) => record.scope === "regional").length,
    coverageMatrix: buildCoverageMatrix(batches, release),
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

async function assertReleaseReady(workspaceRoot: string, batches: AcceptedBatch[]): Promise<void> {
  const paths = projectPaths(workspaceRoot);
  const [release, sources] = await Promise.all([
    loadReleaseConfig(paths.releaseConfig),
    loadSourceManifests(paths.sources),
  ]);
  const expectedSources = sources.filter(
    (source) =>
      source.enabled &&
      release.jurisdictions.includes(source.jurisdiction) &&
      release.categories.includes(source.category) &&
      release.targetYears.some((year) => periodOverlapsYear(source, year)),
  );
  const batchesById = new Map(batches.map((batch) => [batch.source.id, batch]));
  const missing = expectedSources
    .filter((source) => !batchesById.has(source.id))
    .map((source) => source.id);
  if (missing.length > 0) {
    throw new Error(
      `Publishing is blocked by ${missing.length} missing approved batch(es): ${missing.join(", ")}`,
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const stale = expectedSources.filter((source) => source.freshness.reviewBy < today);
  if (stale.length > 0) {
    throw new Error(
      `Publishing is blocked by stale batches: ${stale.map((source) => source.id).join(", ")}`,
    );
  }

  const incomplete = buildCoverageMatrix(batches, release).filter((cell) => !cell.covered);
  if (incomplete.length > 0) {
    throw new Error(
      `Publishing is blocked by ${incomplete.length} incomplete release coverage cell(s).`,
    );
  }
}

function buildCoverageMatrix(
  batches: AcceptedBatch[],
  release: Awaited<ReturnType<typeof loadReleaseConfig>>,
) {
  return release.jurisdictions.flatMap((jurisdiction) =>
    release.targetYears.flatMap((year) =>
      release.categories.map((category) => {
        const sourceIds = batches
          .filter(
            (batch) =>
              batch.source.jurisdiction === jurisdiction &&
              batch.source.category === category &&
              periodOverlapsYear(batch.source, year),
          )
          .map((batch) => batch.source.id)
          .sort();
        return { jurisdiction, year, category, covered: sourceIds.length > 0, sourceIds };
      }),
    ),
  );
}

function periodOverlapsYear(source: SourceManifest, year: number): boolean {
  return source.period.startDate <= `${year}-12-31` && source.period.endDate >= `${year}-01-01`;
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
