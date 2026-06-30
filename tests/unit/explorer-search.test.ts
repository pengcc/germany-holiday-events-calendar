import { describe, expect, it } from "vitest";
import {
  getSelectedLayers,
  getSelectedStates,
  getVisibleMonths,
  parseExplorerSearch,
  updateExplorerSearch,
} from "../../apps/web/src/explorer-search";
import { stateCodes } from "../../packages/data-core/src/schemas";

describe("explorer search state", () => {
  it("uses all Germany, both layers, and the year period by default", () => {
    const search = parseExplorerSearch({});

    expect(search).toEqual({
      year: undefined,
      period: "year",
      quarter: undefined,
      month: undefined,
      region: "all",
      states: undefined,
      layers: "public,school",
      date: undefined,
    });
    expect(getSelectedStates(search)).toEqual(stateCodes);
    expect(getSelectedLayers(search)).toEqual(["public", "school"]);
    expect(getVisibleMonths(search)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("canonicalizes single and multiple state selections", () => {
    const single = parseExplorerSearch({ region: "single", states: "invalid,DE-BE,DE-BB" });
    const multiple = parseExplorerSearch({
      region: "multiple",
      states: ["DE-TH", "DE-BE", "DE-TH", "invalid"],
    });

    expect(single.states).toBe("DE-BB");
    expect(getSelectedStates(single)).toEqual(["DE-BB"]);
    expect(multiple.states).toBe("DE-BE,DE-TH");
    expect(getSelectedStates(multiple)).toEqual(["DE-BE", "DE-TH"]);
  });

  it("repairs incomplete selections and invalid layers", () => {
    const multiple = parseExplorerSearch({
      region: "multiple",
      states: "DE-BE",
      layers: "events,unknown",
    });

    expect(getSelectedStates(multiple)).toEqual(["DE-BE", "DE-BW"]);
    expect(getSelectedLayers(multiple)).toEqual(["public", "school"]);
  });

  it("normalizes period fields and rejects dates outside the active period", () => {
    const quarter = parseExplorerSearch({
      year: "2026",
      period: "quarter",
      quarter: "2",
      month: "9",
      date: "2026-07-01",
    });
    const month = parseExplorerSearch({
      year: 2026,
      period: "month",
      month: 5,
      quarter: 4,
      date: "2026-05-01",
    });

    expect(quarter).toMatchObject({ year: 2026, period: "quarter", quarter: 2 });
    expect(quarter.month).toBeUndefined();
    expect(quarter.date).toBeUndefined();
    expect(getVisibleMonths(quarter)).toEqual([4, 5, 6]);
    expect(month.quarter).toBeUndefined();
    expect(month.date).toBe("2026-05-01");
    expect(getVisibleMonths(month)).toEqual([5]);
  });

  it("composes year, quarter, and month views and retains only visible selected dates", () => {
    const year = parseExplorerSearch({ year: 2026, period: "year", date: "2026-12-31" });
    const quarter = parseExplorerSearch({
      year: 2026,
      period: "quarter",
      quarter: 3,
      date: "2026-07-09",
    });
    const month = parseExplorerSearch({
      year: 2026,
      period: "month",
      month: 7,
      date: "2026-08-01",
    });

    expect(getVisibleMonths(year)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(getVisibleMonths(quarter)).toEqual([7, 8, 9]);
    expect(quarter.date).toBe("2026-07-09");
    expect(getVisibleMonths(month)).toEqual([7]);
    expect(month.date).toBeUndefined();
  });

  it("normalizes updates through the same trust boundary", () => {
    const current = parseExplorerSearch({ year: 2026 });
    const updated = updateExplorerSearch(current, {
      region: "multiple",
      states: "DE-BB,DE-BE",
      period: "month",
      month: 10,
      layers: "school",
    });

    expect(updated).toMatchObject({
      year: 2026,
      region: "multiple",
      states: "DE-BB,DE-BE",
      period: "month",
      month: 10,
      layers: "school",
    });
  });

  it("preserves visible dates for filter changes and clears them for a new period", () => {
    const current = parseExplorerSearch({
      year: 2026,
      period: "month",
      month: 5,
      region: "multiple",
      states: "DE-BB,DE-BE",
      layers: "public,school",
      date: "2026-05-01",
    });

    expect(updateExplorerSearch(current, { layers: "public" }).date).toBe("2026-05-01");
    expect(updateExplorerSearch(current, { region: "single" }).date).toBe("2026-05-01");
    expect(updateExplorerSearch(current, { month: 6 }).date).toBeUndefined();
  });
});
