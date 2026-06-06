#!/usr/bin/env node

import {
  getRun,
  loadOverrides,
  loadSourceManifests,
  monitorSources,
  previewPublish,
  projectPaths,
  publishRun,
  rebuildPublishedData,
  refreshSources,
  resolveDecision,
  resumeRun,
  reviewBatch,
  validateAcceptedData,
} from "@hsg/data-core";
import { Command, Option } from "commander";

const program = new Command()
  .name("holiday-data")
  .description("Review-gated local holiday data workflow")
  .version("0.0.0");

program
  .command("refresh")
  .description("Fetch, normalize, validate, and compare configured sources")
  .addOption(
    new Option("-s, --source <sourceId>", "Limit the run to a source ID").argParser(
      (value, previous: string[] = []) => [...previous, value],
    ),
  )
  .option("-c, --concurrency <count>", "Maximum concurrent source requests", "3")
  .action(async (options: { source?: string[]; concurrency: string }) => {
    const run = await refreshSources({
      workspaceRoot: process.cwd(),
      sourceIds: options.source,
      concurrency: Number(options.concurrency),
    });
    printRun(run);
    console.log(`\nReview run: pnpm data:review -- ${run.id} <source-id>`);
  });

program
  .command("validate")
  .description("Validate every accepted batch")
  .action(async () => {
    const paths = projectPaths(process.cwd());
    await Promise.all([loadSourceManifests(paths.sources), loadOverrides(paths.overrides)]);
    const issues = await validateAcceptedData(process.cwd());
    printIssues(issues);
    if (issues.some((issue) => issue.severity === "blocker")) {
      process.exitCode = 1;
    }
  });

program
  .command("resume")
  .description("Create a new run that reuses fetched artifacts from a blocked parent run")
  .argument("<runId>")
  .addOption(
    new Option("-s, --source <sourceId>", "Retry one source ID").argParser(
      (value, previous: string[] = []) => [...previous, value],
    ),
  )
  .action(async (runId: string, options: { source?: string[] }) => {
    const run = await resumeRun(process.cwd(), runId, options.source);
    printRun(run);
  });

program
  .command("resolve")
  .description("Record a decision for a blocking source change")
  .argument("<runId>")
  .argument("<sourceId>")
  .argument("<issueKey>")
  .requiredOption("--reviewer <name>", "Human reviewer name")
  .requiredOption("--rationale <text>", "Reason for the decision")
  .requiredOption("--evidence <url>", "Official evidence URL")
  .option(
    "--resolution <type>",
    "accept-source-change, override, or reject",
    "accept-source-change",
  )
  .action(
    async (
      runId: string,
      sourceId: string,
      issueKey: string,
      options: {
        reviewer: string;
        rationale: string;
        evidence: string;
        resolution: "accept-source-change" | "override" | "reject";
      },
    ) => {
      const result = await resolveDecision(process.cwd(), {
        runId,
        sourceId,
        issueKey,
        resolvedBy: options.reviewer,
        rationale: options.rationale,
        evidenceUrl: options.evidence,
        resolution: options.resolution,
      });
      console.log(`Recorded ${result.resolution} as ${result.id}.`);
    },
  );

program
  .command("review")
  .description("Record a human review decision inside a local run")
  .argument("<runId>")
  .argument("<sourceId>")
  .requiredOption("--reviewer <name>", "Human reviewer name")
  .option("--reject", "Reject instead of approve")
  .option("--notes <notes>", "Review notes", "")
  .action(
    async (
      runId: string,
      sourceId: string,
      options: { reviewer: string; reject?: boolean; notes: string },
    ) => {
      const decision = await reviewBatch(process.cwd(), {
        runId,
        sourceId,
        reviewer: options.reviewer,
        decision: options.reject ? "rejected" : "approved",
        notes: options.notes,
      });
      console.log(
        `${decision.sourceId} ${decision.decision} by ${decision.reviewer} at ${decision.reviewedAt}`,
      );
      console.log(`Preview publish: pnpm data:publish -- ${runId} --preview`);
    },
  );

program
  .command("publish")
  .description("Publish approved batches and preserve old data for blocked batches")
  .argument("<runId>")
  .option("--preview", "Show planned files without writing")
  .option("--allow-dirty", "Bypass the publish-path clean check for controlled recovery")
  .action(async (runId: string, options: { preview?: boolean; allowDirty?: boolean }) => {
    const preview = await previewPublish(process.cwd(), runId);
    console.log(JSON.stringify(preview, null, 2));
    if (!options.preview) {
      const manifest = await publishRun(process.cwd(), runId, {
        allowDirty: options.allowDirty,
      });
      console.log(
        `Published ${manifest.recordCount} records as dataset ${manifest.datasetVersion}.`,
      );
    }
  });

program
  .command("rebuild")
  .description("Regenerate static JSON from accepted reviewed batches")
  .option("--check", "Fail when committed static JSON differs")
  .action(async (options: { check?: boolean }) => {
    const manifest = await rebuildPublishedData(process.cwd(), { check: options.check });
    console.log(
      `${options.check ? "Verified" : "Wrote"} ${manifest.recordCount} records (${manifest.datasetVersion}).`,
    );
  });

program
  .command("status")
  .description("Show a local run status")
  .argument("<runId>")
  .action(async (runId: string) => {
    printRun(await getRun(process.cwd(), runId));
  });

program
  .command("monitor")
  .description("Read-only source reachability, fingerprint, and review-by check")
  .action(async () => {
    const report = await monitorSources(process.cwd());
    console.log(JSON.stringify(report, null, 2));
    if (report.sources.some((source) => !source.reachable)) {
      process.exitCode = 1;
    }
  });

program.parseAsync().catch((error: unknown) => {
  console.error(formatError(error));
  process.exitCode = 1;
});

function printRun(run: Awaited<ReturnType<typeof getRun>>): void {
  console.log(`Run ${run.id} (${run.stage})`);
  console.table(
    run.sources.map((source) => ({
      source: source.sourceId,
      state: source.jurisdiction,
      period: source.periodId,
      stage: source.stage,
      status: source.status,
      records: source.recordCount,
      issues: source.issueCount,
      decisions: source.decisionRequiredCount,
      error: source.error ?? "",
    })),
  );
}

function printIssues(issues: Awaited<ReturnType<typeof validateAcceptedData>>): void {
  if (issues.length === 0) {
    console.log("Accepted data validation passed.");
    return;
  }
  console.table(
    issues.map((issue) => ({
      severity: issue.severity,
      code: issue.code,
      source: issue.sourceId ?? "",
      record: issue.recordId ?? "",
      message: issue.message,
      next: issue.suggestedAction,
    })),
  );
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}
