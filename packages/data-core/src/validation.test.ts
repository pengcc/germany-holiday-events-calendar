import { describe, expect, it } from "vitest";
import type { HolidayRecord, SourceManifest } from "./schemas";
import { validateRecords } from "./validation";

const source: SourceManifest = {
  schemaVersion: 1,
  id: "source",
  name: "Source",
  authority: "official",
  category: "school",
  jurisdiction: "DE-TH",
  homepageUrl: "https://example.com/",
  fetchUrl: "https://example.com/source.ics",
  format: "ics",
  adapter: "kmk-ics",
  enabled: true,
  period: {
    kind: "schoolYear",
    id: "2026-27",
    startDate: "2026-08-01",
    endDate: "2027-07-31",
  },
  license: { note: "Test", redistribution: "unknown" },
  fetch: {
    expectedContentTypes: ["text/calendar"],
    allowedHosts: ["example.com"],
    timeoutMs: 1_000,
    maxBytes: 10_000,
    maxRedirects: 1,
  },
  freshness: { retrievalCadenceDays: 90, reviewBy: "2026-12-31" },
};

const record: HolidayRecord = {
  schemaVersion: 1,
  id: "source:event",
  jurisdiction: "DE-TH",
  category: "school",
  scope: "statewide",
  regions: [],
  startDate: "2026-10-12",
  endDate: "2026-10-24",
  names: { de: "Herbst", en: "Herbst", zh: "Herbst" },
  periodId: "2026-27",
  source: { sourceId: "source", sourceEventId: "event" },
};

describe("record validation", () => {
  it("detects duplicate semantic records", () => {
    const issues = validateRecords([record, { ...record, id: "source:event-2" }], source);
    expect(issues.some((issue) => issue.code === "DUPLICATE_HOLIDAY")).toBe(true);
  });

  it("blocks invalid inclusive ranges", () => {
    const issues = validateRecords(
      [{ ...record, startDate: "2026-10-25", endDate: "2026-10-24" }],
      source,
    );
    expect(issues.some((issue) => issue.code === "INVALID_DATE_RANGE")).toBe(true);
  });
});
