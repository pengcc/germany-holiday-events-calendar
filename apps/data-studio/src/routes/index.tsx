import type { ValidationIssue } from "@hsg/data-core";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Database,
  FileWarning,
  GitCompareArrows,
  LoaderCircle,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { BatchSummary } from "../components/batch-summary";
import { CoverageMatrix } from "../components/coverage-matrix";
import { DiffTable } from "../components/diff-table";
import { HolidayRecordTable } from "../components/holiday-record-table";
import {
  batchIdsForSelection,
  batchReviewSummary,
  buildReviewCoverageMatrix,
  bulkApprovalDisabledReason,
} from "../lib/review-model";
import {
  getDashboard,
  makeOverrideDraft,
  publishData,
  refreshData,
  resumeData,
  saveResolution,
  saveReview,
  saveReviews,
} from "../server/data-functions";

export const Route = createFileRoute("/")({
  loader: () => getDashboard(),
  component: StudioPage,
});

function StudioPage() {
  const dashboard = Route.useLoaderData();
  const router = useRouter();
  const refresh = useServerFn(refreshData);
  const resume = useServerFn(resumeData);
  const review = useServerFn(saveReview);
  const bulkReview = useServerFn(saveReviews);
  const resolve = useServerFn(saveResolution);
  const draftOverride = useServerFn(makeOverrideDraft);
  const publish = useServerFn(publishData);
  const [selectedSourceId, setSelectedSourceId] = useState(
    dashboard.batches[0]?.sourceRun.sourceId ?? "",
  );
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("https://www.kmk.org/service/ferien.html");
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  const filteredBatches = useMemo(
    () =>
      dashboard.batches.filter(
        (batch) =>
          (categoryFilter === "all" || batch.artifacts?.source.category === categoryFilter) &&
          (jurisdictionFilter === "all" || batch.sourceRun.jurisdiction === jurisdictionFilter) &&
          (periodFilter === "all" || batch.sourceRun.periodId === periodFilter),
      ),
    [categoryFilter, dashboard.batches, jurisdictionFilter, periodFilter],
  );
  const periods = [...new Set(dashboard.sources.map((source) => source.period.id))].sort();
  const jurisdictions = [...new Set(dashboard.sources.map((source) => source.jurisdiction))].sort();
  const coverageMatrix = useMemo(
    () => buildReviewCoverageMatrix(dashboard.release, dashboard.sources, dashboard.batches),
    [dashboard.batches, dashboard.release, dashboard.sources],
  );

  const selectedBatch = useMemo(
    () =>
      dashboard.batches.find((batch) => batch.sourceRun.sourceId === selectedSourceId) ??
      dashboard.batches[0],
    [dashboard.batches, selectedSourceId],
  );
  const resolvedKeys = new Set(
    selectedBatch?.resolutions.map((resolution) => resolution.issueKey) ?? [],
  );
  const unresolvedBlockers =
    selectedBatch?.artifacts?.issues.filter(
      (issue) =>
        (issue.severity === "blocker" || issue.decisionRequired) &&
        !resolvedKeys.has(issueKey(issue)),
    ) ?? [];
  const selectedBatchSummary = selectedBatch ? batchReviewSummary(selectedBatch) : undefined;
  const selectedBatchIdSet = new Set(selectedBatchIds);
  const selectedBatches = dashboard.batches.filter((batch) =>
    selectedBatchIdSet.has(batch.sourceRun.sourceId),
  );
  const bulkApprovalReason = bulkApprovalDisabledReason(
    selectedBatches,
    selectedBatchIds.length,
    reviewer,
    Boolean(busy),
  );

  async function runAction(name: string, action: () => Promise<unknown>, success: string) {
    setBusy(name);
    setMessage(undefined);
    try {
      await action();
      setMessage(success);
      await router.invalidate();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local workflow</p>
          <h1>Holiday Data Studio</h1>
        </div>
        <div className="local-badge">
          <ShieldCheck aria-hidden="true" />
          127.0.0.1 only
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <button
            className="primary-action"
            disabled={Boolean(busy)}
            type="button"
            onClick={() =>
              runAction(
                "refresh",
                () =>
                  refresh({ data: { sourceIds: dashboard.sources.map((source) => source.id) } }),
                "Source refresh completed. Inspect each batch before review.",
              )
            }
          >
            {busy === "refresh" ? <LoaderCircle className="spin" /> : <RefreshCw />}
            Refresh sources
          </button>
          {dashboard.latestRun?.sources.some(
            (source) => source.status === "blocked" && source.stage !== "compared",
          ) ? (
            <button
              className="resume-action"
              disabled={Boolean(busy)}
              type="button"
              onClick={() =>
                runAction(
                  "resume",
                  () =>
                    resume({
                      data: {
                        runId: dashboard.latestRun?.id ?? "",
                        sourceIds: dashboard.latestRun?.sources
                          .filter(
                            (source) => source.status === "blocked" && source.stage !== "compared",
                          )
                          .map((source) => source.sourceId),
                      },
                    }),
                  "Created a new run and reused available parent artifacts.",
                )
              }
            >
              <Play />
              Resume failed stages
            </button>
          ) : null}

          <section className="side-section">
            <h2>Configured sources</h2>
            <p>{dashboard.sources.length} enabled manifests</p>
            <div className="source-list">
              {dashboard.sources.map((source) => (
                <div key={source.id} className="source-item">
                  <span>{source.jurisdiction}</span>
                  <small>{source.period.id}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="side-section">
            <h2>Recent runs</h2>
            {dashboard.runs.slice(0, 6).map((run) => (
              <div key={run.id} className="run-item">
                <span>{run.stage}</span>
                <code>{run.id.replace("run-", "").slice(0, 16)}</code>
              </div>
            ))}
            {dashboard.runs.length === 0 ? <p>No local runs yet.</p> : null}
          </section>
        </aside>

        <div className="content">
          {message ? <div className="message">{message}</div> : null}

          <section className="metric-band">
            <Metric icon={<Database />} label="Sources" value={String(dashboard.sources.length)} />
            <Metric
              icon={<GitCompareArrows />}
              label="Latest batches"
              value={String(dashboard.latestRun?.sources.length ?? 0)}
            />
            <Metric
              icon={<AlertTriangle />}
              label="Blocked"
              value={String(
                dashboard.batches.filter((batch) => {
                  const resolutions = new Set(
                    batch.resolutions.map((resolution) => resolution.issueKey),
                  );
                  return batch.artifacts?.issues.some(
                    (issue) =>
                      (issue.severity === "blocker" || issue.decisionRequired) &&
                      !resolutions.has(issueKey(issue)),
                  );
                }).length,
              )}
            />
            <Metric
              icon={<CheckCircle2 />}
              label="Approved"
              value={String(
                dashboard.batches.filter((batch) => batch.review?.decision === "approved").length,
              )}
            />
          </section>

          {!selectedBatch ? (
            <section className="empty-state">
              <Play />
              <h2>Run the first source refresh</h2>
              <p>
                Fetching stops at the review gate. Nothing is written to deployment data until a
                human approves and publishes a batch.
              </p>
            </section>
          ) : (
            <>
              <section className="batch-toolbar">
                <div>
                  <p className="eyebrow">Latest run</p>
                  <h2>{dashboard.latestRun?.id}</h2>
                </div>
                <div className="batch-filters">
                  <label>
                    Category
                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="school">School</option>
                      <option value="public">Public</option>
                    </select>
                  </label>
                  <label>
                    State
                    <select
                      value={jurisdictionFilter}
                      onChange={(event) => setJurisdictionFilter(event.target.value)}
                    >
                      <option value="all">All</option>
                      {jurisdictions.map((jurisdiction) => (
                        <option key={jurisdiction}>{jurisdiction}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Period
                    <select
                      value={periodFilter}
                      onChange={(event) => setPeriodFilter(event.target.value)}
                    >
                      <option value="all">All</option>
                      {periods.map((period) => (
                        <option key={period}>{period}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Batch
                    <select
                      value={selectedBatch.sourceRun.sourceId}
                      onChange={(event) => setSelectedSourceId(event.target.value)}
                    >
                      {filteredBatches.map((batch) => (
                        <option key={batch.sourceRun.sourceId} value={batch.sourceRun.sourceId}>
                          {batch.sourceRun.jurisdiction} · {batch.sourceRun.periodId} ·{" "}
                          {batch.artifacts?.source.category}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Selected batch</p>
                    <h2>Batch summary</h2>
                  </div>
                  <StatusText summary={selectedBatchSummary} />
                </div>
                {selectedBatchSummary?.status === "blocked" ? (
                  <p className="blocking-note">
                    Blocked batches require resolving issues before approval. Review Validation and
                    decisions below for available actions.
                  </p>
                ) : null}
                {selectedBatch.artifacts ? (
                  <BatchSummary artifacts={selectedBatch.artifacts} />
                ) : (
                  <p className="blocking-note">
                    Normalized artifacts are unavailable for this batch. Resume its failed stage
                    before review.
                  </p>
                )}
              </section>

              <section className="section record-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Normalized source facts</p>
                    <h2>Holiday records</h2>
                  </div>
                  <span>{selectedBatch.artifacts?.records.length ?? 0} records</span>
                </div>
                <HolidayRecordTable
                  records={selectedBatch.artifacts?.records ?? []}
                  targetYears={dashboard.release.targetYears}
                />
              </section>

              <section className="section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Release readiness</p>
                    <h2>Coverage matrix</h2>
                  </div>
                  <ul className="coverage-legend" aria-label="Coverage status legend">
                    {(["ready", "blocked", "approved", "missing"] as const).map((status) => (
                      <li key={status}>
                        <span className={`coverage-status coverage-${status}`}>{status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <CoverageMatrix
                  cells={coverageMatrix}
                  targetYears={dashboard.release.targetYears}
                />
              </section>

              <section className="section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Bulk review</p>
                    <h2>Batch selection</h2>
                  </div>
                  <span>{filteredBatches.length} visible batches</span>
                </div>
                <div className="selection-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedBatchIds(batchIdsForSelection(filteredBatches, "all"))
                    }
                  >
                    Select all visible
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedBatchIds(batchIdsForSelection(filteredBatches, "none"))
                    }
                  >
                    Select none
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedBatchIds(
                        batchIdsForSelection(filteredBatches, "readyWithoutIssues"),
                      )
                    }
                  >
                    Select READY · 0 issues
                  </button>
                </div>
                <div className="bulk-review-controls">
                  <label>
                    Bulk reviewer
                    <input
                      placeholder="Reviewer name for selected batches"
                      value={reviewer}
                      onChange={(event) => setReviewer(event.target.value)}
                    />
                  </label>
                  <p>
                    Shared with the individual batch review form. Notes remain optional for bulk
                    approval.
                  </p>
                </div>
                <div className="batch-selection">
                  {filteredBatches.map((batch) => {
                    const summary = batchReviewSummary(batch);
                    return (
                      <label key={batch.sourceRun.sourceId} className="batch-select-row">
                        <input
                          checked={selectedBatchIds.includes(batch.sourceRun.sourceId)}
                          disabled={summary.status === "blocked" || summary.status === "approved"}
                          type="checkbox"
                          onChange={(event) =>
                            setSelectedBatchIds((current) =>
                              event.target.checked
                                ? [...current, batch.sourceRun.sourceId]
                                : current.filter((id) => id !== batch.sourceRun.sourceId),
                            )
                          }
                        />
                        <span>{batch.sourceRun.jurisdiction}</span>
                        <span>{batch.sourceRun.periodId}</span>
                        <span>{batch.artifacts?.source.category}</span>
                        <StatusText summary={summary} />
                      </label>
                    );
                  })}
                </div>
                <div className="button-row">
                  <button
                    className="primary-action"
                    disabled={Boolean(bulkApprovalReason)}
                    type="button"
                    onClick={() =>
                      runAction(
                        "bulk-approve",
                        () =>
                          bulkReview({
                            data: {
                              runId: dashboard.latestRun?.id ?? "",
                              sourceIds: selectedBatchIds,
                              reviewer,
                              notes,
                            },
                          }),
                        `${selectedBatchIds.length} batches approved locally.`,
                      )
                    }
                  >
                    <CheckCircle2 />
                    Approve selected
                  </button>
                </div>
                {bulkApprovalReason ? (
                  <p className="bulk-approval-reason" aria-live="polite">
                    {bulkApprovalReason}
                  </p>
                ) : null}
              </section>

              <section className="section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Validation and decisions</p>
                    <h2>Issues</h2>
                  </div>
                  <StatusText summary={selectedBatchSummary} />
                </div>
                {selectedBatch.artifacts?.issues.length ? (
                  <div className="issue-list">
                    {selectedBatch.artifacts.issues.map((issue) => {
                      const key = issueKey(issue);
                      const resolved = resolvedKeys.has(key);
                      return (
                        <article key={key} className={`issue issue-${issue.severity}`}>
                          <div className="issue-main">
                            <div>
                              <span className="status">{issue.severity}</span>
                              <code>{issue.code}</code>
                            </div>
                            <h3>{issue.message}</h3>
                            <p>
                              <strong>Next:</strong> {issue.suggestedAction}
                            </p>
                            {issue.actual ? (
                              <details>
                                <summary>Technical details</summary>
                                <pre>{issue.actual}</pre>
                              </details>
                            ) : null}
                          </div>
                          <div className="issue-actions">
                            {issue.decisionRequired ? (
                              <button
                                disabled={resolved || !reviewer || Boolean(busy)}
                                type="button"
                                onClick={() =>
                                  runAction(
                                    `resolve-${key}`,
                                    () =>
                                      resolve({
                                        data: {
                                          runId: dashboard.latestRun?.id ?? "",
                                          sourceId: selectedBatch.sourceRun.sourceId,
                                          issueKey: key,
                                          reviewer,
                                          rationale: notes || issue.message,
                                          evidenceUrl,
                                          resolution: "accept-source-change",
                                        },
                                      }),
                                    "Decision recorded. The issue can now be included in review.",
                                  )
                                }
                              >
                                {resolved ? "Decision recorded" : "Accept source change"}
                              </button>
                            ) : (
                              <button
                                disabled={Boolean(busy)}
                                type="button"
                                onClick={() =>
                                  runAction(
                                    `draft-${key}`,
                                    () =>
                                      draftOverride({
                                        data: {
                                          runId: dashboard.latestRun?.id ?? "",
                                          sourceId: selectedBatch.sourceRun.sourceId,
                                          recordId: issue.recordId,
                                          rationale: issue.message,
                                          evidenceUrl,
                                        },
                                      }),
                                    "Override draft created inside the local run directory.",
                                  )
                                }
                              >
                                Create override draft
                              </button>
                            )}
                            <button
                              className="icon-button"
                              title="Copy diagnostic"
                              type="button"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  JSON.stringify({ key, ...issue }, null, 2),
                                )
                              }
                            >
                              <Clipboard />
                              <span className="sr-only">Copy diagnostic</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty-inline">No validation issues.</p>
                )}
              </section>

              <section className="section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Accepted versus fetched</p>
                    <h2>Reviewable diff</h2>
                  </div>
                  <span>{selectedBatch.artifacts?.diff.length ?? 0} changes</span>
                </div>
                <DiffTable entries={selectedBatch.artifacts?.diff ?? []} />
              </section>

              <section className="review-grid">
                <div className="section">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Human gate</p>
                      <h2>Batch review</h2>
                    </div>
                    {selectedBatch.review ? (
                      <span className="status status-approved">
                        {selectedBatch.review.decision}
                      </span>
                    ) : null}
                  </div>
                  <div className="form-grid">
                    <label>
                      Reviewer
                      <input
                        placeholder="Human reviewer name"
                        value={reviewer}
                        onChange={(event) => setReviewer(event.target.value)}
                      />
                    </label>
                    <label>
                      Official evidence URL
                      <input
                        type="url"
                        value={evidenceUrl}
                        onChange={(event) => setEvidenceUrl(event.target.value)}
                      />
                    </label>
                    <label className="full">
                      Notes and rationale
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="button-row">
                    <button
                      className="primary-action"
                      disabled={!reviewer || unresolvedBlockers.length > 0 || Boolean(busy)}
                      type="button"
                      onClick={() =>
                        runAction(
                          "approve",
                          () =>
                            review({
                              data: {
                                runId: dashboard.latestRun?.id ?? "",
                                sourceId: selectedBatch.sourceRun.sourceId,
                                reviewer,
                                notes,
                                decision: "approved",
                              },
                            }),
                          "Batch approved locally. Publication is still a separate action.",
                        )
                      }
                    >
                      <CheckCircle2 />
                      Approve batch
                    </button>
                    <button
                      disabled={!reviewer || Boolean(busy)}
                      type="button"
                      onClick={() =>
                        runAction(
                          "reject",
                          () =>
                            review({
                              data: {
                                runId: dashboard.latestRun?.id ?? "",
                                sourceId: selectedBatch.sourceRun.sourceId,
                                reviewer,
                                notes,
                                decision: "rejected",
                              },
                            }),
                          "Batch rejected. Existing published data remains unchanged.",
                        )
                      }
                    >
                      Reject batch
                    </button>
                  </div>
                  {unresolvedBlockers.length > 0 ? (
                    <p className="blocking-note">
                      Resolve {unresolvedBlockers.length} blocking decision(s) before approval.
                    </p>
                  ) : null}
                </div>

                <div className="section">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Explicit write step</p>
                      <h2>Publish preview</h2>
                    </div>
                    <FileWarning />
                  </div>
                  <p>
                    Approved batches:{" "}
                    {dashboard.publishPreview?.approvableSources.join(", ") || "none"}
                  </p>
                  <p>
                    Retained reviewed batches:{" "}
                    {dashboard.publishPreview?.retainedSources.length ?? 0} · Regional records:{" "}
                    {dashboard.publishPreview?.regionalRecordCount ?? 0}
                  </p>
                  <ul className="file-list">
                    {dashboard.publishPreview?.files.map((file) => (
                      <li key={file}>
                        <code>{file}</code>
                      </li>
                    ))}
                  </ul>
                  {dashboard.publishPreview?.warnings.map((warning) => (
                    <p key={warning} className="blocking-note">
                      {warning}
                    </p>
                  ))}
                  <label className="confirm-row">
                    <input
                      checked={publishConfirmed}
                      type="checkbox"
                      onChange={(event) => setPublishConfirmed(event.target.checked)}
                    />
                    I reviewed the file list and understand that Studio writes files only.
                  </label>
                  <button
                    className="primary-action"
                    disabled={
                      !publishConfirmed ||
                      !dashboard.publishPreview?.approvableSources.length ||
                      Boolean(busy)
                    }
                    type="button"
                    onClick={() =>
                      runAction(
                        "publish",
                        () => publish({ data: { runId: dashboard.latestRun?.id ?? "" } }),
                        `Published files. Suggested commit: ${dashboard.publishPreview?.suggestedCommitMessage}`,
                      )
                    }
                  >
                    <Database />
                    Publish reviewed files
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

function StatusText({ summary }: { summary: ReturnType<typeof batchReviewSummary> | undefined }) {
  if (!summary) {
    return null;
  }
  return (
    <span className={`status status-${summary.status}`}>
      {summary.status} · {summary.issueCount} issues
      {summary.decisionRequiredCount > 0 ? ` · ${summary.decisionRequiredCount} decisions` : ""}
    </span>
  );
}

function issueKey(issue: ValidationIssue): string {
  return `${issue.code}:${issue.recordId ?? "batch"}`;
}
