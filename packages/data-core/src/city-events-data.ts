import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  type BuildPublishedCityEventsDatasetResult,
  buildPublishedCityEventsDataset,
} from "./city-events-publish";
import {
  type AcceptedCityEventSourceFact,
  AcceptedCityEventSourceFactSchema,
  CityEventCurationSetSchema,
  CityEventSourceCoverageSchema,
} from "./city-events-schemas";
import { readJson, sha256, stableStringify, writeTextAtomic } from "./fs";

export async function rebuildPublishedCityEventsData(
  workspaceRoot: string,
  options: { check?: boolean } = {},
): Promise<BuildPublishedCityEventsDatasetResult> {
  const root = resolve(workspaceRoot);
  const acceptedFacts = await readAcceptedFacts(resolve(root, "data/city-events/accepted"));
  const curationSet = CityEventCurationSetSchema.parse(
    await readJson(resolve(root, "data/city-events/curation.json")),
  );
  const sourceCoverageInput = await readJson<unknown>(
    resolve(root, "data/city-events/source-coverage.json"),
  );
  const sourceCoverage = CityEventSourceCoverageSchema.array().parse(sourceCoverageInput);
  const generatedAt = [
    ...acceptedFacts.map((fact) => fact.review.reviewedAt),
    ...sourceCoverage.map((coverage) => coverage.reviewedAt),
  ]
    .sort()
    .at(-1);
  if (!generatedAt) {
    throw new Error(
      "City Events publication requires at least one reviewed fact or coverage entry.",
    );
  }

  const initial = buildPublishedCityEventsDataset({
    acceptedFacts,
    curationSet,
    datasetVersion: "pending",
    generatedAt,
    recordsSha256: "0".repeat(64),
    sourceCoverage,
    warnings: [
      "Coverage includes selected official sources only and is not a complete Berlin event listing.",
    ],
  });
  const recordsContent = `${stableStringify(initial.dataset)}\n`;
  const recordsSha256 = sha256(recordsContent);
  const result = buildPublishedCityEventsDataset({
    acceptedFacts,
    curationSet,
    datasetVersion: recordsSha256.slice(0, 16),
    generatedAt,
    recordsSha256,
    sourceCoverage,
    warnings: [
      "Coverage includes selected official sources only and is not a complete Berlin event listing.",
    ],
  });
  const manifestContent = `${stableStringify(result.manifest)}\n`;
  const recordsPath = resolve(root, "apps/web/public/data/city-events.json");
  const manifestPath = resolve(root, "apps/web/public/data/city-events-manifest.json");

  if (options.check) {
    const [existingRecords, existingManifest] = await Promise.all([
      readTextOrEmpty(recordsPath),
      readTextOrEmpty(manifestPath),
    ]);
    if (existingRecords !== recordsContent || existingManifest !== manifestContent) {
      throw new Error(
        "Published City Events data is not reproducible. Run the city-events-rebuild command and review the diff.",
      );
    }
  } else {
    await Promise.all([
      writeTextAtomic(recordsPath, recordsContent),
      writeTextAtomic(manifestPath, manifestContent),
    ]);
  }

  return result;
}

async function readAcceptedFacts(directory: string): Promise<AcceptedCityEventSourceFact[]> {
  const fileNames = (await readdir(directory))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();
  return Promise.all(
    fileNames.map(async (fileName) =>
      AcceptedCityEventSourceFactSchema.parse(await readJson(resolve(directory, fileName))),
    ),
  );
}

async function readTextOrEmpty(path: string): Promise<string> {
  try {
    const { readFile } = await import("node:fs/promises");
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}
