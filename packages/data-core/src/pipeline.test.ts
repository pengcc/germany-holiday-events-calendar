import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readJson, writeJsonAtomic } from "./fs";
import {
  assessPublishedReleaseReadiness,
  getSourceRunArtifacts,
  previewPublish,
  publishRun,
  resolveDecision,
  resumeRun,
  reviewBatch,
} from "./pipeline";
import {
  type BatchReviewDecision,
  type DataRun,
  type HolidayRecord,
  PublishedDatasetManifestSchema,
  PublishedHolidayRecordsSchema,
  type SourceFingerprint,
  type SourceManifest,
  type SourceRunArtifacts,
} from "./schemas";

const temporaryRoots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    temporaryRoots.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("review and recovery pipeline", () => {
  it("requires an explicit resolution before a blocking source change can be approved", async () => {
    const root = await makeWorkspace();
    const runId = "run-review";
    const source = makeSource();
    const fingerprint = makeFingerprint();
    const issue = {
      code: "SENSITIVE_CHANGE",
      severity: "blocker" as const,
      stage: "compared" as const,
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      periodId: source.period.id,
      recordId: "record-1",
      message: "A date moved.",
      suggestedAction: "Review official evidence.",
      decisionRequired: true,
    };
    const artifacts: SourceRunArtifacts = {
      schemaVersion: 1,
      source,
      fingerprint,
      records: [],
      issues: [issue],
      diff: [],
      overrideIds: [],
    };
    await writeRun(root, runId, source, artifacts);

    await expect(
      reviewBatch(root, {
        runId,
        sourceId: source.id,
        reviewer: "Reviewer",
        decision: "approved",
      }),
    ).rejects.toThrow("unresolved blocking issue");

    await resolveDecision(root, {
      runId,
      sourceId: source.id,
      issueKey: "SENSITIVE_CHANGE:record-1",
      resolution: "accept-source-change",
      rationale: "Confirmed in the official calendar.",
      evidenceUrl: "https://www.kmk.org/",
      resolvedBy: "Reviewer",
    });

    const review = await reviewBatch(root, {
      runId,
      sourceId: source.id,
      reviewer: "Reviewer",
      decision: "approved",
    });
    expect(review.resolutionIds).toHaveLength(1);
  });

  it("creates a child run and reuses a completed parent fetch", async () => {
    const root = await makeWorkspace();
    const source = makeSource();
    const parentRunId = "run-parent";
    const parentDirectory = resolve(root, "dev_locals/data-runs", parentRunId, source.id);
    await mkdir(parentDirectory, { recursive: true });
    await writeFile(
      resolve(parentDirectory, "raw.source"),
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:holiday-1",
        "DTSTART;VALUE=DATE:20261012",
        "DTEND;VALUE=DATE:20261025",
        "SUMMARY:Herbst - Thüringen - Ferien",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
      "utf8",
    );
    await writeJsonAtomic(resolve(parentDirectory, "fingerprint.json"), makeFingerprint());
    const parent: DataRun = {
      schemaVersion: 1,
      id: parentRunId,
      createdAt: "2026-06-06T00:00:00.000Z",
      updatedAt: "2026-06-06T00:00:00.000Z",
      stage: "compared",
      sources: [
        {
          sourceId: source.id,
          jurisdiction: source.jurisdiction,
          periodId: source.period.id,
          status: "blocked",
          stage: "validated",
          recordCount: 0,
          issueCount: 1,
          decisionRequiredCount: 1,
        },
      ],
    };
    await writeJsonAtomic(resolve(root, "dev_locals/data-runs", parentRunId, "run.json"), parent);

    const resumed = await resumeRun(root, parentRunId);
    expect(resumed.parentRunId).toBe(parentRunId);
    expect(resumed.sources[0]).toMatchObject({ status: "completed", recordCount: 1 });
    const artifacts = await getSourceRunArtifacts(root, resumed.id, source.id);
    expect(artifacts.records[0]?.endDate).toBe("2026-10-24");
  });
});

describe("approved publication and release readiness", () => {
  it("keeps strict publish blocked while approved-partial excludes unresolved batches", async () => {
    const { root, runId, approvedSource, blockedSource } = await makePublishWorkspace({
      blockedPublicSource: true,
    });
    await reviewBatch(root, {
      runId,
      sourceId: approvedSource.id,
      reviewer: "Reviewer",
      decision: "approved",
    });
    await writeJsonAtomic(
      resolve(root, "dev_locals/data-runs", runId, blockedSource.id, "review.json"),
      makeReview(runId, blockedSource, "approved"),
    );

    const preview = await previewPublish(root, runId);
    expect(preview.approvableSources).toEqual([approvedSource.id]);
    expect(preview.blockedSources).toContain(blockedSource.id);
    expect(preview.releaseReadiness).toMatchObject({
      releaseReady: false,
      missingSourceIds: [blockedSource.id],
    });
    await expect(publishRun(root, runId, { allowDirty: true })).rejects.toThrow(
      "1 missing approved batch",
    );

    await publishRun(root, runId, { allowDirty: true, approvedPartial: true });
    const records = PublishedHolidayRecordsSchema.parse(
      await readJson(resolve(root, "apps/web/public/data/holidays.json")),
    );
    const manifest = PublishedDatasetManifestSchema.parse(
      await readJson(resolve(root, "apps/web/public/data/manifest.json")),
    );
    expect(records.records.map((record) => record.source.sourceId)).toEqual([approvedSource.id]);
    expect(records.records.some((record) => record.source.sourceId === blockedSource.id)).toBe(
      false,
    );
    expect(
      manifest.coverageMatrix.find(
        (cell) => cell.jurisdiction === "DE-TH" && cell.category === "public",
      ),
    ).toMatchObject({ covered: false, sourceIds: [] });
    await expect(
      assessPublishedReleaseReadiness(root, { today: "2026-07-01" }),
    ).resolves.toMatchObject({
      releaseReady: false,
      missingSourceIds: [blockedSource.id],
    });
  });

  it("passes release readiness only when every required batch is approved and covered", async () => {
    const { root, runId, approvedSource, blockedSource } = await makePublishWorkspace({
      blockedPublicSource: false,
      advisoryPublicSource: true,
    });
    for (const source of [approvedSource, blockedSource]) {
      await reviewBatch(root, {
        runId,
        sourceId: source.id,
        reviewer: "Reviewer",
        decision: "approved",
      });
    }

    await publishRun(root, runId, { allowDirty: true });
    const records = PublishedHolidayRecordsSchema.parse(
      await readJson(resolve(root, "apps/web/public/data/holidays.json")),
    );
    const publicRecords = records.records.filter(
      (record) => record.source.sourceId === blockedSource.id,
    );
    expect(publicRecords.map((record) => record.scope).sort()).toEqual(["regional", "statewide"]);
    const readiness = await assessPublishedReleaseReadiness(root, { today: "2026-07-01" });
    expect(readiness).toMatchObject({
      releaseReady: true,
      requiredSourceCount: 2,
      approvedSourceCount: 2,
      missingSourceIds: [],
      staleSourceIds: [],
      incompleteCoverage: [],
    });
    await expect(
      assessPublishedReleaseReadiness(root, { today: "2100-01-01" }),
    ).resolves.toMatchObject({
      releaseReady: false,
      staleSourceIds: [approvedSource.id, blockedSource.id].sort(),
    });
  });

  it("does not let a regional-only public record establish statewide coverage", async () => {
    const { root, runId, approvedSource, blockedSource } = await makePublishWorkspace({
      blockedPublicSource: false,
      regionalOnlyPublicSource: true,
    });
    for (const source of [approvedSource, blockedSource]) {
      await reviewBatch(root, {
        runId,
        sourceId: source.id,
        reviewer: "Reviewer",
        decision: "approved",
      });
    }

    const preview = await previewPublish(root, runId);
    expect(preview.releaseReadiness).toMatchObject({
      releaseReady: false,
      missingSourceIds: [],
    });
    expect(preview.releaseReadiness.incompleteCoverage).toContainEqual(
      expect.objectContaining({
        jurisdiction: "DE-TH",
        year: 2026,
        category: "public",
        covered: false,
        sourceIds: [],
      }),
    );
    await expect(publishRun(root, runId, { allowDirty: true })).rejects.toThrow(
      "1 incomplete release coverage cell",
    );

    await publishRun(root, runId, { allowDirty: true, approvedPartial: true });
    await expect(
      assessPublishedReleaseReadiness(root, { today: "2026-07-01" }),
    ).resolves.toMatchObject({
      releaseReady: false,
      missingSourceIds: [],
      incompleteCoverage: [
        expect.objectContaining({ jurisdiction: "DE-TH", category: "public", covered: false }),
      ],
    });
  });
});

async function makeWorkspace(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "hsg-data-"));
  temporaryRoots.push(root);
  await Promise.all(
    [
      "data/sources",
      "data/overrides",
      "data/accepted/batches",
      "data/reviews",
      "apps/web/public/data",
      "dev_locals/data-runs",
      "dev_locals/source-cache",
    ].map((directory) => mkdir(resolve(root, directory), { recursive: true })),
  );
  const source = makeSource();
  await writeFile(
    resolve(root, "data/sources/source.yaml"),
    [
      "schemaVersion: 1",
      `id: ${source.id}`,
      `name: ${source.name}`,
      "authority: official",
      "category: school",
      "jurisdiction: DE-TH",
      "homepageUrl: https://www.kmk.org/",
      "fetchUrl: https://invalid.example/source.ics",
      "format: ics",
      "adapter: kmk-ics",
      "enabled: true",
      "period:",
      "  kind: schoolYear",
      "  id: 2026-27",
      "  startDate: 2026-08-01",
      "  endDate: 2027-07-31",
      "license:",
      "  note: Test",
      "  redistribution: unknown",
      "fetch:",
      "  expectedContentTypes: [text/calendar]",
      "  allowedHosts: [invalid.example]",
      "  timeoutMs: 1000",
      "  maxBytes: 10000",
      "  maxRedirects: 0",
      "freshness:",
      "  retrievalCadenceDays: 90",
      "  reviewBy: 2026-12-31",
      "",
    ].join("\n"),
    "utf8",
  );
  await writeFile(
    resolve(root, "data/public-holiday-rules.yaml"),
    "schemaVersion: 1\nrules: []\n",
    "utf8",
  );
  return root;
}

async function writeRun(
  root: string,
  runId: string,
  source: SourceManifest,
  artifacts: SourceRunArtifacts,
): Promise<void> {
  const directory = resolve(root, "dev_locals/data-runs", runId, source.id);
  await mkdir(directory, { recursive: true });
  await writeJsonAtomic(resolve(directory, "artifacts.json"), artifacts);
  await writeJsonAtomic(resolve(root, "dev_locals/data-runs", runId, "run.json"), {
    schemaVersion: 1,
    id: runId,
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    stage: "compared",
    sources: [
      {
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        status: "blocked",
        stage: "compared",
        recordCount: 0,
        issueCount: 1,
        decisionRequiredCount: 1,
      },
    ],
  } satisfies DataRun);
}

function makeSource(): SourceManifest {
  return {
    schemaVersion: 1,
    id: "kmk-de-th-test",
    name: "KMK test source",
    authority: "official",
    category: "school",
    jurisdiction: "DE-TH",
    homepageUrl: "https://www.kmk.org/",
    fetchUrl: "https://invalid.example/source.ics",
    format: "ics",
    adapter: "kmk-ics",
    enabled: true,
    period: {
      kind: "schoolYear",
      id: "2026-27",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
    },
    license: { note: "Test", redistribution: "unknown" },
    fetch: {
      expectedContentTypes: ["text/calendar"],
      allowedHosts: ["invalid.example"],
      timeoutMs: 1_000,
      maxBytes: 10_000,
      maxRedirects: 0,
    },
    freshness: { retrievalCadenceDays: 90, reviewBy: "2026-12-31" },
  };
}

function makeFingerprint(): SourceFingerprint {
  const body = "test";
  return {
    sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    bytes: body.length,
    contentType: "text/calendar",
    retrievedAt: "2026-06-06T00:00:00.000Z",
    finalUrl: "https://www.kmk.org/source.ics",
  };
}

async function makePublishWorkspace(options: {
  blockedPublicSource: boolean;
  advisoryPublicSource?: boolean;
  regionalOnlyPublicSource?: boolean;
}): Promise<{
  root: string;
  runId: string;
  approvedSource: SourceManifest;
  blockedSource: SourceManifest;
}> {
  const root = await mkdtemp(resolve(tmpdir(), "hsg-publish-"));
  temporaryRoots.push(root);
  await Promise.all(
    [
      "data/sources",
      "data/overrides",
      "data/accepted/batches",
      "data/reviews",
      "data/snapshots/accepted",
      "apps/web/public/data",
      "dev_locals/data-runs",
    ].map((directory) => mkdir(resolve(root, directory), { recursive: true })),
  );
  const approvedSource: SourceManifest = {
    ...makeSource(),
    id: "school-de-th-2026",
    name: "School holidays Thuringia 2026",
    freshness: { retrievalCadenceDays: 90, reviewBy: "2099-12-31" },
  };
  const blockedSource: SourceManifest = {
    ...makeSource(),
    id: "public-de-th-2026",
    name: "Public holidays Thuringia 2026",
    category: "public",
    format: "html",
    adapter: "public-rules",
    period: {
      kind: "calendarYear",
      id: "2026",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    },
    freshness: { retrievalCadenceDays: 90, reviewBy: "2099-12-31" },
  };
  await Promise.all(
    [approvedSource, blockedSource].map((source) =>
      writeFile(
        resolve(root, "data/sources", `${source.id}.yaml`),
        `${JSON.stringify(source, null, 2)}\n`,
        "utf8",
      ),
    ),
  );
  await writeFile(
    resolve(root, "data/release.yaml"),
    [
      "schemaVersion: 1",
      "targetYears: [2026]",
      "jurisdictions: [DE-TH]",
      "categories: [school, public]",
      "",
    ].join("\n"),
    "utf8",
  );
  await writeFile(
    resolve(root, "data/public-holiday-rules.yaml"),
    "schemaVersion: 1\nrules: []\n",
    "utf8",
  );
  const runId = "run-publish";
  const sources = [approvedSource, blockedSource];
  for (const source of sources) {
    const blocked = source.id === blockedSource.id && options.blockedPublicSource;
    const records = makeRecords(source, options.regionalOnlyPublicSource ?? false);
    const artifacts: SourceRunArtifacts = {
      schemaVersion: 1,
      source,
      fingerprint: makeFingerprint(),
      records,
      issues: blocked
        ? [
            {
              code: "REGIONAL_SCOPE_REVIEW_REQUIRED",
              severity: "blocker",
              stage: "validated",
              sourceId: source.id,
              jurisdiction: source.jurisdiction,
              periodId: source.period.id,
              recordId: `${source.id}:regional-holiday`,
              message: "Regional applicability requires review.",
              suggestedAction: "Review official evidence.",
              decisionRequired: true,
            },
          ]
        : source.id === blockedSource.id && options.advisoryPublicSource
          ? [
              {
                code: "REGIONAL_APPLICABILITY_ADVISORY",
                severity: "warning",
                stage: "validated",
                sourceId: source.id,
                jurisdiction: source.jurisdiction,
                periodId: source.period.id,
                recordId: `${source.id}:regional-holiday`,
                message: "Regional applicability remains advisory.",
                suggestedAction: "Keep the record regional.",
                decisionRequired: false,
                technicalDetails: "https://example.com/official-law",
              },
            ]
          : [],
      diff: [],
      overrideIds: [],
    };
    const sourceDirectory = resolve(root, "dev_locals/data-runs", runId, source.id);
    await mkdir(sourceDirectory, { recursive: true });
    await writeJsonAtomic(resolve(sourceDirectory, "artifacts.json"), artifacts);
  }
  await writeJsonAtomic(resolve(root, "dev_locals/data-runs", runId, "run.json"), {
    schemaVersion: 1,
    id: runId,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    stage: "compared",
    sources: sources.map((source) => {
      const blocked = source.id === blockedSource.id && options.blockedPublicSource;
      return {
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        status: blocked ? "blocked" : "completed",
        stage: "compared",
        recordCount: makeRecords(source, options.regionalOnlyPublicSource ?? false).length,
        issueCount:
          blocked || (source.id === blockedSource.id && options.advisoryPublicSource) ? 1 : 0,
        decisionRequiredCount: blocked ? 1 : 0,
      };
    }),
  } satisfies DataRun);
  return { root, runId, approvedSource, blockedSource };
}

function makeRecords(source: SourceManifest, regionalOnlyPublicSource: boolean): HolidayRecord[] {
  const base = {
    schemaVersion: 1,
    jurisdiction: source.jurisdiction,
    category: source.category,
    startDate: "2026-10-01",
    endDate: "2026-10-01",
    names: { de: source.name, en: source.name, zh: source.name },
    periodId: source.period.id,
  } as const;
  if (source.category !== "public") {
    return [
      {
        ...base,
        id: `${source.id}:holiday`,
        scope: "statewide",
        regions: [],
        source: { sourceId: source.id, sourceEventId: "holiday" },
      },
    ];
  }
  const regional: HolidayRecord = {
    ...base,
    id: `${source.id}:regional-holiday`,
    scope: "regional",
    regions: ["fixture-region"],
    source: { sourceId: source.id, sourceEventId: "regional-holiday" },
  };
  if (regionalOnlyPublicSource) {
    return [regional];
  }
  return [
    {
      ...base,
      id: `${source.id}:statewide-holiday`,
      scope: "statewide",
      regions: [],
      source: { sourceId: source.id, sourceEventId: "statewide-holiday" },
    },
    regional,
  ];
}

function makeReview(
  runId: string,
  source: SourceManifest,
  decision: BatchReviewDecision["decision"],
): BatchReviewDecision {
  return {
    schemaVersion: 1,
    runId,
    sourceId: source.id,
    jurisdiction: source.jurisdiction,
    periodId: source.period.id,
    decision,
    reviewer: "Reviewer",
    reviewedAt: "2026-07-01T00:00:00.000Z",
    notes: "Fixture review",
    fingerprintSha256: makeFingerprint().sha256,
    overrideIds: [],
    resolutionIds: [],
  };
}
