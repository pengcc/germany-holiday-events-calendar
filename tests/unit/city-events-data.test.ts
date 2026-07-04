import { describe, expect, it } from "vitest";
import { parsePublishedCityEvents } from "../../apps/web/src/city-events-data";

const record = {
  id: "city-event:csd_berlin:demonstration:2026",
  source: "csd_berlin",
  category: "major_culture",
  title: "CSD Berlin Pride Demonstration 2026",
  startDate: "2026-07-25",
  endDate: "2026-07-25",
  city: "berlin",
  sourceUrl: "https://csd-berlin.de/en/demo-route-2026",
  impactLevel: "high",
} as const;

const coverage = {
  source: "csd_berlin",
  city: "berlin",
  status: "manual",
  retrievedAt: "2026-07-03T12:29:25.000Z",
  reviewedAt: "2026-07-03T12:29:25.000Z",
  reviewStatus: "current",
  reviewPolicyVersion: "city-events-v1",
  stale: false,
  publishedRecordCount: 1,
  warnings: [],
} as const;

const manifest = {
  schemaVersion: 1,
  datasetVersion: "fixture",
  generatedAt: "2026-07-03T12:29:25.000Z",
  recordsFile: "city-events.json",
  recordsSha256: "0".repeat(64),
  recordCount: 1,
  coverageKind: "selected_official_sources",
  coveredCities: ["berlin"],
  coveredSources: ["csd_berlin"],
  sourceCoverage: [coverage],
  warnings: [],
} as const;

describe("published City Events web data validation", () => {
  it("accepts a valid public records envelope and consistent manifest", () => {
    const parsed = parsePublishedCityEvents({ schemaVersion: 1, records: [record] }, manifest);

    expect(parsed.records).toEqual([record]);
    expect(parsed.manifest.coverageKind).toBe("selected_official_sources");
  });

  it("rejects internal fields and inconsistent counts", () => {
    expect(() =>
      parsePublishedCityEvents(
        { schemaVersion: 1, records: [{ ...record, sourceEventKey: "internal" }] },
        manifest,
      ),
    ).toThrow("Published City Events data is invalid.");
    expect(() =>
      parsePublishedCityEvents(
        { schemaVersion: 1, records: [record] },
        {
          ...manifest,
          recordCount: 2,
          sourceCoverage: [{ ...coverage, publishedRecordCount: 2 }],
        },
      ),
    ).toThrow("Published City Events data does not match its manifest.");
  });

  it("rejects records outside declared source coverage", () => {
    expect(() =>
      parsePublishedCityEvents(
        { schemaVersion: 1, records: [record] },
        {
          ...manifest,
          coveredSources: ["messe_berlin"],
          sourceCoverage: [{ ...coverage, source: "messe_berlin", publishedRecordCount: 1 }],
        },
      ),
    ).toThrow("Published City Events data exceeds its declared coverage.");
  });
});
