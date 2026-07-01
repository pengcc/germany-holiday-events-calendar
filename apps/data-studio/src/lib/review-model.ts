import type {
  BatchReviewDecision,
  DecisionResolution,
  HolidayRecord,
  ReleaseConfig,
  SourceManifest,
  SourceRun,
  SourceRunArtifacts,
} from "@hsg/data-core";
import { enumerateDates } from "@hsg/data-core/dates";

export type ReviewBatch = {
  sourceRun: SourceRun;
  artifacts?: SourceRunArtifacts;
  resolutions: DecisionResolution[];
  review?: BatchReviewDecision;
};

export type CoverageStatus = "approved" | "blocked" | "ready" | "missing";

export type CoverageCell = {
  jurisdiction: ReleaseConfig["jurisdictions"][number];
  year: number;
  category: ReleaseConfig["categories"][number];
  status: CoverageStatus;
  sourceIds: string[];
};

export type BatchReviewSummary = {
  status: CoverageStatus;
  issueCount: number;
  decisionRequiredCount: number;
};

export type BatchSelectionMode = "all" | "none" | "readyWithoutIssues";

export type RecordFilters = {
  query: string;
  category: "all" | HolidayRecord["category"];
  scope: "all" | HolidayRecord["scope"];
  year: "all" | number;
};

export function inclusiveDayCount(record: Pick<HolidayRecord, "startDate" | "endDate">): number {
  return enumerateDates(record.startDate, record.endDate).length;
}

export function filterHolidayRecords(
  records: HolidayRecord[],
  filters: RecordFilters,
): HolidayRecord[] {
  const query = filters.query.trim().toLocaleLowerCase("de");
  return records.filter((record) => {
    const matchesQuery =
      !query ||
      [record.names.de, record.names.en, record.names.zh]
        .join(" ")
        .toLocaleLowerCase("de")
        .includes(query);
    const matchesCategory = filters.category === "all" || record.category === filters.category;
    const matchesScope = filters.scope === "all" || record.scope === filters.scope;
    const matchesYear =
      filters.year === "all" ||
      (record.startDate <= `${filters.year}-12-31` && record.endDate >= `${filters.year}-01-01`);
    return matchesQuery && matchesCategory && matchesScope && matchesYear;
  });
}

export function batchReviewSummary(batch: ReviewBatch): BatchReviewSummary {
  if (batch.review?.decision === "approved") {
    return {
      status: "approved",
      issueCount: batch.artifacts?.issues.length ?? batch.sourceRun.issueCount,
      decisionRequiredCount: 0,
    };
  }
  const resolved = new Set(batch.resolutions.map((resolution) => resolution.issueKey));
  const unresolvedIssues =
    batch.artifacts?.issues.filter(
      (issue) =>
        (issue.severity === "blocker" || issue.decisionRequired) &&
        !resolved.has(`${issue.code}:${issue.recordId ?? "batch"}`),
    ) ?? [];
  const decisionRequiredCount = unresolvedIssues.filter((issue) => issue.decisionRequired).length;
  return {
    status:
      batch.sourceRun.status === "blocked" || unresolvedIssues.length > 0 || !batch.artifacts
        ? "blocked"
        : "ready",
    issueCount: batch.artifacts?.issues.length ?? batch.sourceRun.issueCount,
    decisionRequiredCount:
      batch.artifacts === undefined ? batch.sourceRun.decisionRequiredCount : decisionRequiredCount,
  };
}

export function batchReviewStatus(batch: ReviewBatch): CoverageStatus {
  return batchReviewSummary(batch).status;
}

export function isReadyWithoutIssues(batch: ReviewBatch): boolean {
  const summary = batchReviewSummary(batch);
  return (
    summary.status === "ready" &&
    summary.issueCount === 0 &&
    batch.sourceRun.issueCount === 0 &&
    summary.decisionRequiredCount === 0 &&
    batch.sourceRun.decisionRequiredCount === 0
  );
}

export function batchIdsForSelection(
  visibleBatches: ReviewBatch[],
  mode: BatchSelectionMode,
): string[] {
  if (mode === "none") {
    return [];
  }
  const batches =
    mode === "readyWithoutIssues" ? visibleBatches.filter(isReadyWithoutIssues) : visibleBatches;
  return batches.map((batch) => batch.sourceRun.sourceId);
}

export function bulkApprovalDisabledReason(
  selectedBatches: ReviewBatch[],
  selectedBatchIdCount: number,
  reviewer: string,
  busy: boolean,
): string | undefined {
  if (selectedBatchIdCount === 0) {
    return "Select at least one READY · 0 issues batch.";
  }
  if (
    selectedBatches.length !== selectedBatchIdCount ||
    selectedBatches.some((batch) => batchReviewSummary(batch).status !== "ready")
  ) {
    return "Selected batches include blocked or already approved items.";
  }
  if (!reviewer.trim()) {
    return "Enter reviewer name before approving.";
  }
  if (busy) {
    return "Another Studio action is in progress.";
  }
  return undefined;
}

export function buildReviewCoverageMatrix(
  release: ReleaseConfig,
  sources: SourceManifest[],
  batches: ReviewBatch[],
): CoverageCell[] {
  const batchesBySource = new Map(batches.map((batch) => [batch.sourceRun.sourceId, batch]));
  return release.jurisdictions.flatMap((jurisdiction) =>
    release.targetYears.flatMap((year) =>
      release.categories.map((category) => {
        const matchingSources = sources.filter(
          (source) =>
            source.enabled &&
            source.jurisdiction === jurisdiction &&
            source.category === category &&
            source.period.startDate <= `${year}-12-31` &&
            source.period.endDate >= `${year}-01-01`,
        );
        const matchingBatches = matchingSources
          .map((source) => batchesBySource.get(source.id))
          .filter((batch): batch is ReviewBatch => Boolean(batch));
        const statuses = matchingBatches.map(batchReviewStatus);
        const status: CoverageStatus =
          statuses.length === 0
            ? "missing"
            : statuses.includes("blocked")
              ? "blocked"
              : statuses.every((status) => status === "approved")
                ? "approved"
                : "ready";
        return {
          jurisdiction,
          year,
          category,
          status,
          sourceIds: matchingBatches.map((batch) => batch.sourceRun.sourceId).sort(),
        };
      }),
    ),
  );
}
