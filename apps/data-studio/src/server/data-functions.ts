import type { BatchReviewDecision } from "@hsg/data-core";
import { createServerFn } from "@tanstack/react-start";
import { findWorkspaceRoot } from "./workspace";

interface RefreshInput {
  sourceIds: string[];
}

interface ReviewInput {
  runId: string;
  sourceId: string;
  reviewer: string;
  notes: string;
  decision: "approved" | "rejected";
}

interface ResolveInput {
  runId: string;
  sourceId: string;
  issueKey: string;
  reviewer: string;
  rationale: string;
  evidenceUrl: string;
  resolution: "accept-source-change" | "override" | "reject";
}

interface OverrideDraftInput {
  runId: string;
  sourceId: string;
  recordId?: string;
  rationale: string;
  evidenceUrl: string;
}

interface PublishInput {
  runId: string;
}

interface ResumeInput {
  runId: string;
  sourceIds?: string[];
}

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const {
    BatchReviewDecisionSchema,
    getDecisionResolutions,
    getSourceRunArtifacts,
    listRuns,
    loadSourceManifests,
    previewPublish,
    projectPaths,
    readJson,
  } = await import("@hsg/data-core");
  const workspaceRoot = await findWorkspaceRoot();
  const paths = projectPaths(workspaceRoot);
  const [sources, runs] = await Promise.all([
    loadSourceManifests(paths.sources),
    listRuns(workspaceRoot),
  ]);
  const latestRun = runs[0];

  const batches = latestRun
    ? await Promise.all(
        latestRun.sources.map(async (sourceRun) => {
          try {
            const artifacts = await getSourceRunArtifacts(
              workspaceRoot,
              latestRun.id,
              sourceRun.sourceId,
            );
            const resolutions = await getDecisionResolutions(
              workspaceRoot,
              latestRun.id,
              sourceRun.sourceId,
            );
            let review: BatchReviewDecision | undefined;
            try {
              review = BatchReviewDecisionSchema.parse(
                await readJson(`${paths.runs}/${latestRun.id}/${sourceRun.sourceId}/review.json`),
              );
            } catch {
              review = undefined;
            }
            return { sourceRun, artifacts, resolutions, review };
          } catch {
            return { sourceRun, artifacts: undefined, resolutions: [], review: undefined };
          }
        }),
      )
    : [];

  const publishPreview = latestRun ? await previewPublish(workspaceRoot, latestRun.id) : undefined;

  return {
    sources,
    runs,
    latestRun,
    batches,
    publishPreview,
  };
});

export const refreshData = createServerFn({ method: "POST" })
  .inputValidator((input: RefreshInput) => input)
  .handler(async ({ data }) => {
    const { refreshSources } = await import("@hsg/data-core");
    return refreshSources({
      workspaceRoot: await findWorkspaceRoot(),
      sourceIds: data.sourceIds,
    });
  });

export const resumeData = createServerFn({ method: "POST" })
  .inputValidator((input: ResumeInput) => input)
  .handler(async ({ data }) => {
    const { resumeRun } = await import("@hsg/data-core");
    return resumeRun(await findWorkspaceRoot(), data.runId, data.sourceIds);
  });

export const saveReview = createServerFn({ method: "POST" })
  .inputValidator((input: ReviewInput) => input)
  .handler(async ({ data }) => {
    const { reviewBatch } = await import("@hsg/data-core");
    return reviewBatch(await findWorkspaceRoot(), data);
  });

export const saveResolution = createServerFn({ method: "POST" })
  .inputValidator((input: ResolveInput) => input)
  .handler(async ({ data }) => {
    const { resolveDecision } = await import("@hsg/data-core");
    return resolveDecision(await findWorkspaceRoot(), {
      ...data,
      resolvedBy: data.reviewer,
    });
  });

export const makeOverrideDraft = createServerFn({ method: "POST" })
  .inputValidator((input: OverrideDraftInput) => input)
  .handler(async ({ data }) => {
    const { createOverrideDraft } = await import("@hsg/data-core");
    return createOverrideDraft(await findWorkspaceRoot(), data);
  });

export const publishData = createServerFn({ method: "POST" })
  .inputValidator((input: PublishInput) => input)
  .handler(async ({ data }) => {
    const { publishRun } = await import("@hsg/data-core");
    return publishRun(await findWorkspaceRoot(), data.runId);
  });
