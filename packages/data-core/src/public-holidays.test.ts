import { describe, expect, it } from "vitest";
import type { PublicHolidayRule } from "./public-holidays";
import {
  generatePublicHolidays,
  gregorianEaster,
  regionalRuleReviewIssues,
} from "./public-holidays";
import type { SourceManifest } from "./schemas";

describe("public holiday legal rules", () => {
  it("calculates Gregorian Easter without timestamps", () => {
    expect(gregorianEaster(2026)).toBe("2026-04-05");
    expect(gregorianEaster(2027)).toBe("2027-03-28");
  });

  it("supports fixed, Easter-relative, weekday, and regional rules", () => {
    const records = generatePublicHolidays(source, rules);
    expect(records.map((record) => [record.source.sourceEventId, record.startDate])).toEqual([
      ["good-friday", "2026-04-03"],
      ["augsburg-peace-festival", "2026-08-08"],
      ["repentance-day", "2026-11-18"],
    ]);
    expect(records[1]).toMatchObject({
      scope: "regional",
      regions: ["DE-BY-09761000"],
    });
  });

  it("requires a human decision for unverified regional municipality sets", () => {
    const regionalRule = rules[2];
    if (!regionalRule) {
      throw new Error("Expected a regional test rule.");
    }
    const issues = regionalRuleReviewIssues(source, [
      {
        ...regionalRule,
        regionReviewStatus: "requires-review",
        evidenceUrl: "https://www.gesetze-bayern.de/Content/Document/BayFTG",
      },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "REGIONAL_SCOPE_REVIEW_REQUIRED",
      severity: "blocker",
      decisionRequired: true,
    });
  });
});

const source: SourceManifest = {
  schemaVersion: 1,
  id: "public-de-by-2026",
  name: "Bavaria public holidays 2026",
  authority: "official",
  category: "public",
  jurisdiction: "DE-BY",
  documentId: "law-de-by",
  homepageUrl: "https://www.gesetze-bayern.de/",
  fetchUrl: "https://www.gesetze-bayern.de/Content/Document/BayFTG",
  format: "html",
  adapter: "public-rules",
  enabled: true,
  period: {
    kind: "calendarYear",
    id: "2026",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  license: { note: "Test", redistribution: "unknown" },
  fetch: {
    expectedContentTypes: ["text/html"],
    allowedHosts: ["www.gesetze-bayern.de"],
    timeoutMs: 1_000,
    maxBytes: 1_000_000,
    maxRedirects: 1,
  },
  freshness: { retrievalCadenceDays: 180, reviewBy: "2027-12-31" },
};

const rules: PublicHolidayRule[] = [
  {
    id: "good-friday",
    names: { de: "Karfreitag", en: "Good Friday", zh: "耶稣受难日" },
    jurisdictions: "all",
    scope: "statewide",
    regions: [],
    date: { kind: "easterOffset", days: -2 },
  },
  {
    id: "repentance-day",
    names: { de: "Buß- und Bettag", en: "Day of Repentance and Prayer", zh: "忏悔祈祷日" },
    jurisdictions: ["DE-BY"],
    scope: "statewide",
    regions: [],
    date: { kind: "weekdayBefore", month: 11, day: 23, weekday: 3 },
  },
  {
    id: "augsburg-peace-festival",
    names: {
      de: "Augsburger Hohes Friedensfest",
      en: "Augsburg Peace Festival",
      zh: "奥格斯堡和平节",
    },
    jurisdictions: ["DE-BY"],
    scope: "regional",
    regions: ["DE-BY-09761000"],
    date: { kind: "fixed", month: 8, day: 8 },
  },
];
