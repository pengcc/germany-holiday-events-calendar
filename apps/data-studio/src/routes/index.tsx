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
import { DiffTable } from "../components/diff-table";
import {
  getDashboard,
  makeOverrideDraft,
  publishData,
  refreshData,
  resumeData,
  saveResolution,
  saveReview,
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
                <label>
                  Batch
                  <select
                    value={selectedBatch.sourceRun.sourceId}
                    onChange={(event) => setSelectedSourceId(event.target.value)}
                  >
                    {dashboard.batches.map((batch) => (
                      <option key={batch.sourceRun.sourceId} value={batch.sourceRun.sourceId}>
                        {batch.sourceRun.jurisdiction} · {batch.sourceRun.periodId}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Validation and decisions</p>
                    <h2>Issues</h2>
                  </div>
                  <StatusText
                    blocked={unresolvedBlockers.length > 0}
                    count={selectedBatch.sourceRun.issueCount}
                  />
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

function StatusText({ blocked, count }: { blocked: boolean; count: number }) {
  return (
    <span className={`status ${blocked ? "status-blocked" : "status-ready"}`}>
      {blocked ? "Blocked" : "Ready"} · {count} issues
    </span>
  );
}

function issueKey(issue: ValidationIssue): string {
  return `${issue.code}:${issue.recordId ?? "batch"}`;
}
