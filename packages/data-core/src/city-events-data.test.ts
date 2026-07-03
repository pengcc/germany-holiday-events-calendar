import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rebuildPublishedCityEventsData } from "./city-events-data";
import { readJson, writeJsonAtomic } from "./fs";

let temporaryRoot: string | undefined;

afterEach(async () => {
  if (temporaryRoot) {
    await rm(temporaryRoot, { recursive: true, force: true });
    temporaryRoot = undefined;
  }
});

describe("rebuildPublishedCityEventsData", () => {
  it("generates deterministic reviewed public artifacts and verifies them", async () => {
    temporaryRoot = await mkdtemp(resolve(tmpdir(), "city-events-data-"));
    await writeJsonAtomic(
      resolve(temporaryRoot, "data/city-events/accepted/example.json"),
      acceptedFact,
    );
    await writeJsonAtomic(resolve(temporaryRoot, "data/city-events/curation.json"), curationSet);
    await writeJsonAtomic(
      resolve(temporaryRoot, "data/city-events/source-coverage.json"),
      sourceCoverage,
    );

    const generated = await rebuildPublishedCityEventsData(temporaryRoot);
    const checked = await rebuildPublishedCityEventsData(temporaryRoot, { check: true });
    const publicRecords = await readJson<Record<string, unknown>>(
      resolve(temporaryRoot, "apps/web/public/data/city-events.json"),
    );
    const publicManifest = await readJson<Record<string, unknown>>(
      resolve(temporaryRoot, "apps/web/public/data/city-events-manifest.json"),
    );

    expect(checked).toEqual(generated);
    expect(generated.manifest.recordsSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(generated.manifest.recordCount).toBe(1);
    const serializedPublicRecords = JSON.stringify(publicRecords);
    expect(serializedPublicRecords).not.toContain("sourceEventKey");
    expect(serializedPublicRecords).not.toContain("hidden");
    expect(serializedPublicRecords).not.toContain("Internal reviewer");
    expect(serializedPublicRecords).not.toContain("rationale");
    expect(serializedPublicRecords).not.toContain("impactNoteOverride");
    expect(publicManifest).not.toHaveProperty("reviewBy");

    await writeFile(
      resolve(temporaryRoot, "apps/web/public/data/city-events.json"),
      "{}\n",
      "utf8",
    );
    await expect(rebuildPublishedCityEventsData(temporaryRoot, { check: true })).rejects.toThrow(
      "Published City Events data is not reproducible",
    );
  });
});

const acceptedFact = {
  schemaVersion: 1,
  event: {
    id: "city-event:csd_berlin:demonstration:2026",
    sourceEventKey: "demonstration:2026",
    source: "csd_berlin",
    category: "major_culture",
    title: "CSD Berlin Pride Demonstration 2026",
    startDate: "2026-07-25",
    endDate: "2026-07-25",
    city: "berlin",
    sourceUrl: "https://csd-berlin.de/en/demo-route-2026",
  },
  evidenceCheckedAt: "2026-07-03T12:29:25.000Z",
  review: {
    reviewedAt: "2026-07-03T12:29:25.000Z",
    reviewer: "Internal reviewer",
    rationale: "Minimal official facts checked.",
  },
};

const curationSet = {
  schemaVersion: 1,
  curations: [
    {
      eventId: acceptedFact.event.id,
      impactLevel: "high",
      hidden: false,
    },
  ],
};

const sourceCoverage = [
  {
    source: "csd_berlin",
    city: "berlin",
    status: "manual",
    retrievedAt: "2026-07-03T12:29:25.000Z",
    reviewedAt: "2026-07-03T12:29:25.000Z",
    reviewStatus: "current",
    reviewPolicyVersion: "city-events-v1",
    stale: false,
    publishedRecordCount: 1,
    warnings: ["Top-level record only."],
  },
];
