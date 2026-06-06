import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeJsonAtomic } from "./fs";
import { getSourceRunArtifacts, resolveDecision, resumeRun, reviewBatch } from "./pipeline";
import type { DataRun, SourceFingerprint, SourceManifest, SourceRunArtifacts } from "./schemas";

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
