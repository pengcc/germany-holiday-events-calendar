import { describe, expect, it } from "vitest";
import { crossCheckPublicHolidays } from "./public-holiday-crosscheck";
import type { SourceManifest } from "./schemas";

const source: SourceManifest = {
  schemaVersion: 1,
  id: "official-de-bw-2026",
  name: "Official public holidays",
  authority: "official",
  category: "public",
  jurisdiction: "DE-BW",
  homepageUrl: "https://example.com/",
  fetchUrl: "https://example.com/holidays.json",
  format: "json",
  adapter: "holiday-json",
  enabled: true,
  period: {
    kind: "calendarYear",
    id: "2026",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  license: { note: "Test", redistribution: "unknown" },
  fetch: {
    expectedContentTypes: ["application/json"],
    allowedHosts: ["example.com"],
    timeoutMs: 1_000,
    maxBytes: 10_000,
    maxRedirects: 0,
  },
  freshness: { retrievalCadenceDays: 180, reviewBy: "2026-12-31" },
};

describe("public holiday cross-check", () => {
  it("reports third-party dates as review warnings, never authoritative additions", () => {
    const issues = crossCheckPublicHolidays([], source);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toMatchObject({
      code: "PUBLIC_HOLIDAY_CROSSCHECK_MISSING",
      severity: "warning",
      decisionRequired: true,
    });
  });
});
