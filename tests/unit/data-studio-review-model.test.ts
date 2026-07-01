import type {
  BatchReviewDecision,
  DecisionResolution,
  HolidayRecord,
  ReleaseConfig,
  SourceManifest,
  SourceRun,
  SourceRunArtifacts,
} from "@hsg/data-core";
import { describe, expect, it } from "vitest";
import {
  batchIdsForSelection,
  batchReviewStatus,
  batchReviewSummary,
  buildReviewCoverageMatrix,
  bulkApprovalDisabledReason,
  filterHolidayRecords,
  inclusiveDayCount,
  isReadyWithoutIssues,
  type ReviewBatch,
} from "../../apps/data-studio/src/lib/review-model";

const record: HolidayRecord = {
  schemaVersion: 1,
  id: "school:autumn",
  jurisdiction: "DE-BW",
  category: "school",
  scope: "statewide",
  regions: [],
  startDate: "2026-10-26",
  endDate: "2026-10-31",
  names: { de: "Herbstferien", en: "Autumn holidays", zh: "秋假" },
  periodId: "2026-27",
  source: { sourceId: "school-bw", sourceEventId: "autumn" },
};

describe("record review model", () => {
  it("counts inclusive all-day ranges and filters across localized names and years", () => {
    expect(inclusiveDayCount(record)).toBe(6);
    expect(
      filterHolidayRecords([record], {
        query: "秋假",
        category: "school",
        scope: "statewide",
        year: 2026,
      }),
    ).toEqual([record]);
    expect(
      filterHolidayRecords([record], {
        query: "",
        category: "public",
        scope: "all",
        year: "all",
      }),
    ).toEqual([]);
  });

  it("classifies reviewed, blocked, ready, and missing release cells", () => {
    const source = makeSource();
    const ready = makeBatch(source);
    const blocked = makeBatch(source, {
      issues: [
        {
          code: "DATE_MOVED",
          severity: "blocker",
          stage: "compared",
          recordId: record.id,
          message: "A date moved.",
          suggestedAction: "Review the official source.",
          decisionRequired: true,
        },
      ],
    });
    expect(batchReviewStatus(ready)).toBe("ready");
    expect(batchReviewStatus(blocked)).toBe("blocked");
    expect(
      batchReviewStatus({
        ...blocked,
        resolutions: [{ issueKey: `DATE_MOVED:${record.id}` } as DecisionResolution],
      }),
    ).toBe("ready");
    expect(
      batchReviewStatus({
        ...ready,
        review: { decision: "approved" } as BatchReviewDecision,
      }),
    ).toBe("approved");

    const release: ReleaseConfig = {
      schemaVersion: 1,
      targetYears: [2026],
      jurisdictions: ["DE-BW", "DE-TH"],
      categories: ["school", "public"],
    };
    const matrix = buildReviewCoverageMatrix(release, [source], [ready]);
    expect(matrix).toEqual([
      expect.objectContaining({ jurisdiction: "DE-BW", category: "school", status: "ready" }),
      expect.objectContaining({ jurisdiction: "DE-BW", category: "public", status: "missing" }),
      expect.objectContaining({ jurisdiction: "DE-TH", category: "school", status: "missing" }),
      expect.objectContaining({ jurisdiction: "DE-TH", category: "public", status: "missing" }),
    ]);

    const overlappingSource = { ...source, id: "school-bw-second" };
    const mixedMatrix = buildReviewCoverageMatrix(
      release,
      [source, overlappingSource],
      [
        { ...ready, review: { decision: "approved" } as BatchReviewDecision },
        makeBatch(overlappingSource, {
          issues: [
            {
              code: "SOURCE_CONFLICT",
              severity: "blocker",
              stage: "compared",
              message: "Official sources conflict.",
              suggestedAction: "Resolve the conflict.",
              decisionRequired: true,
            },
          ],
        }),
      ],
    );
    expect(mixedMatrix[0]?.status).toBe("blocked");
  });

  it("selects only ready batches without issues or pending decisions", () => {
    const source = makeSource();
    const ready = makeBatch(source);
    const warning = makeBatch(source, {
      issues: [
        {
          code: "SOURCE_WARNING",
          severity: "warning",
          stage: "compared",
          message: "Check the source metadata.",
          suggestedAction: "Review the source.",
          decisionRequired: false,
        },
      ],
    });
    const blocked = makeBatch(source, {
      issues: [
        {
          code: "SOURCE_CONFLICT",
          severity: "blocker",
          stage: "compared",
          message: "Official sources conflict.",
          suggestedAction: "Resolve the conflict.",
          decisionRequired: true,
        },
      ],
    });

    expect(isReadyWithoutIssues(ready)).toBe(true);
    expect(isReadyWithoutIssues(warning)).toBe(false);
    expect(isReadyWithoutIssues(blocked)).toBe(false);
    expect(
      isReadyWithoutIssues({
        ...ready,
        review: { decision: "approved" } as BatchReviewDecision,
      }),
    ).toBe(false);
    expect(batchReviewSummary(blocked)).toMatchObject({
      status: "blocked",
      issueCount: 1,
      decisionRequiredCount: 1,
    });
    expect(batchIdsForSelection([ready, blocked], "readyWithoutIssues")).toEqual([
      ready.sourceRun.sourceId,
    ]);
    expect(batchIdsForSelection([ready, blocked], "none")).toEqual([]);

    expect(bulkApprovalDisabledReason([], 0, "Reviewer", false)).toBe(
      "Select at least one READY · 0 issues batch.",
    );
    expect(bulkApprovalDisabledReason([ready], 1, "", false)).toBe(
      "Enter reviewer name before approving.",
    );
    expect(bulkApprovalDisabledReason([ready], 1, "Reviewer", false)).toBeUndefined();
    expect(bulkApprovalDisabledReason([blocked], 1, "Reviewer", false)).toBe(
      "Selected batches include blocked or already approved items.",
    );
    expect(
      bulkApprovalDisabledReason(
        [{ ...ready, review: { decision: "approved" } as BatchReviewDecision }],
        1,
        "Reviewer",
        false,
      ),
    ).toBe("Selected batches include blocked or already approved items.");
    expect(bulkApprovalDisabledReason([ready], 2, "Reviewer", false)).toBe(
      "Selected batches include blocked or already approved items.",
    );
  });
});

function makeSource(): SourceManifest {
  return {
    schemaVersion: 1,
    id: "school-bw",
    name: "School holidays Baden-Württemberg",
    authority: "official",
    category: "school",
    jurisdiction: "DE-BW",
    homepageUrl: "https://www.kmk.org/",
    fetchUrl: "https://www.kmk.org/source.ics",
    format: "ics",
    adapter: "kmk-ics",
    enabled: true,
    period: {
      kind: "schoolYear",
      id: "2026-27",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
    },
    license: { note: "Official test source", redistribution: "unknown" },
    fetch: {
      expectedContentTypes: ["text/calendar"],
      allowedHosts: ["www.kmk.org"],
      timeoutMs: 1_000,
      maxBytes: 10_000,
      maxRedirects: 0,
    },
    freshness: { retrievalCadenceDays: 90, reviewBy: "2027-01-31" },
  };
}

function makeBatch(
  source: SourceManifest,
  artifacts: Partial<SourceRunArtifacts> = {},
): ReviewBatch {
  const sourceRun: SourceRun = {
    sourceId: source.id,
    jurisdiction: source.jurisdiction,
    periodId: source.period.id,
    status: "completed",
    stage: "compared",
    recordCount: 1,
    issueCount: artifacts.issues?.length ?? 0,
    decisionRequiredCount: artifacts.issues?.length ?? 0,
  };
  return {
    sourceRun,
    resolutions: [],
    artifacts: {
      schemaVersion: 1,
      source,
      fingerprint: {
        sha256: "a".repeat(64),
        bytes: 1,
        contentType: "text/calendar",
        retrievedAt: "2026-06-06T00:00:00.000Z",
        finalUrl: source.fetchUrl,
      },
      records: [record],
      issues: [],
      diff: [],
      overrideIds: [],
      ...artifacts,
    },
  };
}
