import type { HolidayRecord, PublishedDatasetManifest, StateCode } from "@hsg/data-core/schemas";
import { describe, expect, it } from "vitest";
import {
  buildMonth,
  deriveHolidayCalendar,
  getCalendarPeriodBounds,
  getResultMonths,
  type HolidayLayer,
} from "../../apps/web/src/calendar";
import type { ViewMode } from "../../apps/web/src/explorer-search";
import { copy } from "../../apps/web/src/i18n";
import { stateCodes } from "../../packages/data-core/src/schemas";

describe("holiday calendar derivation", () => {
  it("indexes single-day and inclusive multi-day ranges", () => {
    const calendar = derive({
      records: [
        record("single", "DE-BE", "public", "2026-01-15", "2026-01-15"),
        record("multi", "DE-BE", "school", "2026-01-30", "2026-02-02"),
      ],
      states: ["DE-BE"],
      layers: ["public", "school"],
      period: { year: 2026, mode: "year" },
    });

    expect([...calendar.days.keys()]).toEqual([
      "2026-01-15",
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
    expect(calendar.days.get("2026-01-15")?.records.map(({ id }) => id)).toEqual(["single"]);
    expect(calendar.days.get("2026-02-02")?.records.map(({ id }) => id)).toEqual(["multi"]);
  });

  it("clips cross-month and cross-year records to the selected period", () => {
    const crossYear = record("cross-year", "DE-BE", "school", "2026-12-30", "2027-01-02");
    const december = derive({
      records: [crossYear],
      states: ["DE-BE"],
      layers: ["school"],
      period: { year: 2026, mode: "month", month: 12 },
    });
    const january = derive({
      records: [crossYear],
      states: ["DE-BE"],
      layers: ["school"],
      period: { year: 2027, mode: "month", month: 1 },
    });

    expect([...december.days.keys()]).toEqual(["2026-12-30", "2026-12-31"]);
    expect([...january.days.keys()]).toEqual(["2027-01-01", "2027-01-02"]);
  });

  it("uses exact month and quarter bounds", () => {
    const records = [
      record("q2-start", "DE-BE", "public", "2026-03-31", "2026-04-02"),
      record("q2-end", "DE-BE", "public", "2026-06-29", "2026-07-02"),
    ];
    const quarter = derive({
      records,
      states: ["DE-BE"],
      layers: ["public"],
      period: { year: 2026, mode: "quarter", quarter: 2 },
    });

    expect(quarter.period).toMatchObject({ startDate: "2026-04-01", endDate: "2026-06-30" });
    expect([...quarter.days.keys()]).toEqual([
      "2026-04-01",
      "2026-04-02",
      "2026-06-29",
      "2026-06-30",
    ]);
    expect(getCalendarPeriodBounds({ year: 2026, mode: "month", month: 2 })).toMatchObject({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
  });

  it("filters public and school layers independently", () => {
    const records = [
      record("public", "DE-BE", "public", "2026-05-01", "2026-05-01"),
      record("school", "DE-BE", "school", "2026-05-01", "2026-05-01"),
    ];

    expect(recordIds(derive({ records, states: ["DE-BE"], layers: ["public"] }))).toEqual([
      "public",
    ]);
    expect(recordIds(derive({ records, states: ["DE-BE"], layers: ["school"] }))).toEqual([
      "school",
    ]);
    expect(recordIds(derive({ records, states: ["DE-BE"], layers: ["school", "public"] }))).toEqual(
      ["public", "school"],
    );
  });

  it("calculates single-state activity and multiple-state partial/full overlap", () => {
    const records = [
      record("be-shared", "DE-BE", "public", "2026-05-01", "2026-05-01"),
      record("bb-shared", "DE-BB", "public", "2026-05-01", "2026-05-01"),
      record("be-only", "DE-BE", "public", "2026-05-02", "2026-05-02"),
    ];
    const single = derive({ records, states: ["DE-BE"], layers: ["public"] });
    const multiple = derive({ records, states: ["DE-BE", "DE-BB"], layers: ["public"] });

    expect(single.days.get("2026-05-01")).toMatchObject({
      hasStatewideActivity: true,
      overlap: "none",
      matchedStates: ["DE-BE"],
    });
    expect(multiple.days.get("2026-05-01")).toMatchObject({
      overlap: "full",
      matchedStates: ["DE-BB", "DE-BE"],
    });
    expect(multiple.days.get("2026-05-02")).toMatchObject({
      overlap: "partial",
      matchedStates: ["DE-BE"],
    });
  });

  it("supports all states and normalizes duplicate state/layer input", () => {
    const allStateRecords = stateCodes.map((stateCode) =>
      record(`all-${stateCode}`, stateCode, "public", "2026-10-03", "2026-10-03"),
    );
    const calendar = derive({
      records: allStateRecords,
      states: [...stateCodes].reverse().concat("DE-BE"),
      layers: ["public", "public"],
    });

    expect(calendar.selectedStates).toEqual([...stateCodes].sort());
    expect(calendar.layers).toEqual(["public"]);
    expect(calendar.days.get("2026-10-03")?.overlap).toBe("full");
    expect(calendar.days.get("2026-10-03")?.matchedStates).toHaveLength(16);
  });

  it("separates regional public advisories from normal activity and preserves school behavior", () => {
    const calendar = derive({
      records: [
        record("be-statewide", "DE-BE", "public", "2026-08-08", "2026-08-08"),
        record("bb-regional", "DE-BB", "public", "2026-08-08", "2026-08-08", "regional"),
        record("bb-school", "DE-BB", "school", "2026-08-08", "2026-08-08", "schoolSpecific"),
      ],
      states: ["DE-BE", "DE-BB"],
      layers: ["public", "school"],
    });
    const day = calendar.days.get("2026-08-08");

    expect(day?.records).toHaveLength(3);
    expect(day?.activityRecords.map(({ id }) => id)).toEqual(["bb-school", "be-statewide"]);
    expect(day?.advisoryRecords.map(({ id }) => id)).toEqual(["bb-regional"]);
    expect(day?.statewideRecords.map(({ id }) => id)).toEqual(["be-statewide"]);
    expect(day?.matchedStates).toEqual(["DE-BE"]);
    expect(day?.overlap).toBe("partial");
  });

  it("keeps a regional-only public date selectable without statewide activity or overlap", () => {
    const calendar = derive({
      records: [record("be-regional", "DE-BE", "public", "2026-06-04", "2026-06-04", "regional")],
      states: ["DE-BE", "DE-BB"],
      layers: ["public"],
    });
    const day = calendar.days.get("2026-06-04");

    expect(day).toMatchObject({
      hasStatewideActivity: false,
      matchedStates: [],
      overlap: "none",
    });
    expect(day?.records.map(({ id }) => id)).toEqual(["be-regional"]);
    expect(day?.activityRecords).toEqual([]);
    expect(day?.advisoryRecords.map(({ id }) => id)).toEqual(["be-regional"]);
  });

  it("requires all 16 statewide public jurisdictions for nationwide common dates", () => {
    const sharedRecords = stateCodes.map((stateCode) =>
      record(`shared-${stateCode}`, stateCode, "public", "2026-10-03", "2026-10-03"),
    );
    const calendar = derive({
      records: [
        ...sharedRecords,
        record("limited", "DE-BE", "public", "2026-10-04", "2026-10-04", "regional"),
      ],
      states: [...stateCodes],
      layers: ["public"],
      viewMode: "nationwide",
    });

    expect([...calendar.days.keys()]).toEqual(["2026-10-03"]);
    expect(calendar.days.get("2026-10-03")?.records).toHaveLength(16);
    expect(calendar.days.get("2026-10-03")?.advisoryRecords).toEqual([]);
    expect(calendar.days.get("2026-10-03")?.overlap).toBe("none");
  });

  it("returns an explicit empty result for invalid comparisons", () => {
    const calendar = derive({
      records: [record("single", "DE-BE", "public", "2026-05-01", "2026-05-01")],
      states: ["DE-BE"],
      layers: ["public"],
      viewMode: "compare",
    });

    expect(calendar.days.size).toBe(0);
  });

  it("returns empty date data without rescanning records", () => {
    const calendar = derive({ records: [], states: ["DE-BE"], layers: ["public"] });
    const month = buildMonth(2026, 5, calendar.days, "en");

    expect(calendar.days.size).toBe(0);
    expect(month.cells).toHaveLength(31);
    expect(month.cells[0]).toMatchObject({
      date: "2026-05-01",
      records: [],
      activityRecords: [],
      advisoryRecords: [],
      matchedStates: [],
      hasStatewideActivity: false,
      overlap: "none",
    });
  });

  it("reports incomplete coverage for selected states and layers", () => {
    const coverageMatrix: PublishedDatasetManifest["coverageMatrix"] = [
      coverage("DE-BE", "public", true),
      coverage("DE-BE", "school", false),
      coverage("DE-BB", "public", false),
      coverage("DE-BB", "school", false),
    ];
    const calendar = derive({
      records: [],
      states: ["DE-BE", "DE-BB", "DE-BE"],
      layers: ["school", "public", "school"],
      coverageMatrix,
    });

    expect(calendar.coverage).toEqual({
      complete: false,
      coveredCount: 1,
      expectedCount: 4,
      missing: [
        { jurisdiction: "DE-BB", year: 2026, category: "public" },
        { jurisdiction: "DE-BB", year: 2026, category: "school" },
        { jurisdiction: "DE-BE", year: 2026, category: "school" },
      ],
    });
  });

  it("provides regional advisory verification copy in every supported locale", () => {
    expect(copy.zh.regionalAdvisoryBody).toContain("官方来源");
    expect(copy.de.regionalAdvisoryBody).toContain("offizieller Quellen");
    expect(copy.en.regionalAdvisoryBody).toContain("official sources");
  });

  it("provides result-empty copy in every supported locale", () => {
    expect(copy.zh.noStateResultMonths).toContain("没有匹配");
    expect(copy.zh.noNationwideResultMonths).toContain("16 个州");
    expect(copy.zh.noCompareResultMonths).toContain("没有可比较");
    expect(copy.de.noStateResultMonths).toContain("keine passenden");
    expect(copy.de.noNationwideResultMonths).toContain("16 Bundesländern");
    expect(copy.de.noCompareResultMonths).toContain("keine vergleichbaren");
    expect(copy.en.noStateResultMonths).toContain("No holiday results");
    expect(copy.en.noNationwideResultMonths).toContain("all 16 federal states");
    expect(copy.en.noCompareResultMonths).toContain("No comparable holiday results");
  });

  it("filters state months while keeping invalid compare months unfiltered", () => {
    const calendar = derive({
      records: [record("may", "DE-BE", "public", "2026-05-01", "2026-05-01")],
      states: ["DE-BE"],
      layers: ["public"],
    });
    const periodMonths = [4, 5, 6];

    expect(getResultMonths(periodMonths, calendar.days, "state", true)).toEqual([5]);
    expect(getResultMonths(periodMonths, calendar.days, "compare", false)).toEqual(periodMonths);
  });

  it("keeps only nationwide months containing common statewide activity", () => {
    const calendar = derive({
      records: [
        ...stateCodes.map((stateCode) =>
          record(`shared-${stateCode}`, stateCode, "public", "2026-05-01", "2026-05-01"),
        ),
        record("regional", "DE-BE", "public", "2026-06-04", "2026-06-04", "regional"),
      ],
      states: [...stateCodes],
      layers: ["public"],
      viewMode: "nationwide",
    });

    expect(getResultMonths([4, 5, 6], calendar.days, "nationwide", true)).toEqual([5]);
    expect(getResultMonths([6], calendar.days, "nationwide", true)).toEqual([]);
  });

  it("keeps compare months with rendered public or school activity but not advisories", () => {
    const calendar = derive({
      records: [
        record("public", "DE-BE", "public", "2026-05-01", "2026-05-01"),
        record("advisory", "DE-BB", "public", "2026-06-04", "2026-06-04", "regional"),
        record("school", "DE-BB", "school", "2026-07-09", "2026-07-09"),
      ],
      states: ["DE-BE", "DE-BB"],
      layers: ["public", "school"],
      viewMode: "compare",
    });

    expect(getResultMonths([5, 6, 7], calendar.days, "compare", true)).toEqual([5, 7]);
  });
});

interface DeriveOptions {
  records: HolidayRecord[];
  states: StateCode[];
  layers: HolidayLayer[];
  period?: { year: number; mode: "year" | "quarter" | "month"; quarter?: number; month?: number };
  coverageMatrix?: PublishedDatasetManifest["coverageMatrix"];
  viewMode?: ViewMode;
}

function derive({
  records,
  states,
  layers,
  period = { year: 2026, mode: "year" },
  coverageMatrix = [],
  viewMode = states.length >= 2 ? "compare" : "state",
}: DeriveOptions) {
  return deriveHolidayCalendar({
    records,
    selectedStates: states,
    layers,
    period,
    coverageMatrix,
    viewMode,
  });
}

function record(
  id: string,
  jurisdiction: StateCode,
  category: HolidayLayer,
  startDate: string,
  endDate: string,
  scope: HolidayRecord["scope"] = "statewide",
): HolidayRecord {
  return {
    schemaVersion: 1,
    id,
    jurisdiction,
    category,
    scope,
    regions: scope === "statewide" ? [] : ["fixture-region"],
    startDate,
    endDate,
    names: { de: id, en: id, zh: id },
    periodId: startDate.slice(0, 4),
    source: { sourceId: "fixture" },
  };
}

function coverage(
  jurisdiction: StateCode,
  category: HolidayLayer,
  covered: boolean,
): PublishedDatasetManifest["coverageMatrix"][number] {
  return { jurisdiction, year: 2026, category, covered, sourceIds: covered ? ["fixture"] : [] };
}

function recordIds(calendar: ReturnType<typeof deriveHolidayCalendar>): string[] {
  return [...calendar.days.values()].flatMap((day) => day.records.map(({ id }) => id));
}
