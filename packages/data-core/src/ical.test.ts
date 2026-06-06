import { describe, expect, it } from "vitest";
import { normalizeKmkIcs } from "./ical";
import type { SourceManifest } from "./schemas";

const source: SourceManifest = {
  schemaVersion: 1,
  id: "kmk-de-bw-test",
  name: "KMK test",
  authority: "official",
  category: "school",
  jurisdiction: "DE-BW",
  homepageUrl: "https://www.kmk.org/",
  fetchUrl: "https://www.kmk.org/test.ics",
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
    allowedHosts: ["www.kmk.org"],
    timeoutMs: 1_000,
    maxBytes: 10_000,
    maxRedirects: 1,
  },
  freshness: { retrievalCadenceDays: 90, reviewBy: "2026-12-31" },
};

describe("KMK iCalendar normalization", () => {
  it("converts exclusive DTEND into an inclusive local end date", () => {
    const result = normalizeKmkIcs(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:holiday-1",
        "DTSTART;VALUE=DATE:20261026",
        "DTEND;VALUE=DATE:20261031",
        "SUMMARY:Herbst - Baden-Württemberg - Ferien",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
      source,
    );

    expect(result.issues).toEqual([]);
    expect(result.records[0]).toMatchObject({
      startDate: "2026-10-26",
      endDate: "2026-10-30",
      names: { de: "Herbst" },
    });
  });

  it("blocks timestamp events", () => {
    const result = normalizeKmkIcs(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:holiday-2",
        "DTSTART:20261026T080000Z",
        "DTEND:20261026T160000Z",
        "SUMMARY:Unexpected timestamp",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
      source,
    );

    expect(result.records).toEqual([]);
    expect(result.issues[0]?.code).toBe("ICS_NOT_ALL_DAY");
  });
});
