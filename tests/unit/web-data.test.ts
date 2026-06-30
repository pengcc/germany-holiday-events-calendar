import { describe, expect, it } from "vitest";
import { parsePublishedData } from "../../apps/web/src/data";

const record = {
  schemaVersion: 1 as const,
  id: "public-de-be-2026-05-01",
  jurisdiction: "DE-BE",
  category: "public",
  scope: "statewide",
  regions: [],
  startDate: "2026-05-01",
  endDate: "2026-05-01",
  names: { de: "Tag der Arbeit", en: "Labour Day", zh: "劳动节" },
  periodId: "2026",
  source: { sourceId: "public-de-be-2026" },
};

const manifest = {
  schemaVersion: 1 as const,
  datasetVersion: "fixture",
  generatedAt: "2026-06-30T00:00:00.000Z",
  recordsFile: "holidays.json",
  recordsSha256: "0".repeat(64),
  recordCount: 1,
  targetYears: [2026],
  jurisdictions: ["DE-BE"],
  categories: ["public"],
  regionalRecordCount: 0,
  coverageMatrix: [],
  coverage: [],
  warnings: [],
  overrideIds: [],
};

describe("published web data validation", () => {
  it("accepts a valid schema-v1 records envelope and manifest", () => {
    const parsed = parsePublishedData({ schemaVersion: 1, records: [record] }, manifest);

    expect(parsed.records).toHaveLength(1);
    expect(parsed.manifest.recordCount).toBe(1);
  });

  it("rejects invalid records", () => {
    expect(() =>
      parsePublishedData(
        { schemaVersion: 1, records: [{ ...record, jurisdiction: "DE-XX" }] },
        manifest,
      ),
    ).toThrow("Published holiday data is invalid.");
  });

  it("rejects a manifest count that does not match the records", () => {
    expect(() =>
      parsePublishedData({ schemaVersion: 1, records: [record] }, { ...manifest, recordCount: 2 }),
    ).toThrow("Published holiday data does not match its manifest.");
  });
});
