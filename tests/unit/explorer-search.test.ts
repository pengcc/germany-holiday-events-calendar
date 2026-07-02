import { describe, expect, it } from "vitest";
import {
  getSelectedLayers,
  getSelectedStates,
  getVisibleMonths,
  isComparisonValid,
  parseExplorerSearch,
  updateExplorerSearch,
} from "../../apps/web/src/explorer-search";
import { stateCodes } from "../../packages/data-core/src/schemas";

describe("explorer search state", () => {
  it("uses one federal state, both layers, and the year period by default", () => {
    const search = parseExplorerSearch({});

    expect(search).toEqual({
      year: undefined,
      period: "year",
      quarter: undefined,
      month: undefined,
      view: "state",
      states: "DE-BE",
      layers: "public,school",
      date: undefined,
    });
    expect(getSelectedStates(search)).toEqual(["DE-BE"]);
    expect(getSelectedLayers(search)).toEqual(["public", "school"]);
    expect(getVisibleMonths(search)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("canonicalizes state and comparison selections without inventing comparison states", () => {
    const explicitSingle = parseExplorerSearch({ view: "state", states: "DE-TH" });
    const single = parseExplorerSearch({ view: "state", states: "invalid,DE-BE,DE-BB" });
    const comparison = parseExplorerSearch({
      view: "compare",
      states: ["DE-TH", "DE-BE", "DE-TH", "invalid"],
    });
    const incomplete = parseExplorerSearch({ view: "compare", states: "DE-BE" });

    expect(explicitSingle.states).toBe("DE-TH");
    expect(getSelectedStates(explicitSingle)).toEqual(["DE-TH"]);
    expect(single.states).toBe("DE-BB");
    expect(getSelectedStates(single)).toEqual(["DE-BB"]);
    expect(comparison.states).toBe("DE-BE,DE-TH");
    expect(getSelectedStates(comparison)).toEqual(["DE-BE", "DE-TH"]);
    expect(getSelectedStates(incomplete)).toEqual(["DE-BE"]);
    expect(isComparisonValid(incomplete)).toBe(false);
  });

  it("maps legacy region links and enforces nationwide public-only state", () => {
    expect(parseExplorerSearch({ region: "single" }).view).toBe("state");
    expect(parseExplorerSearch({ region: "multiple", states: "DE-BE" }).view).toBe("compare");

    const nationwide = parseExplorerSearch({
      region: "all",
      layers: "school",
      date: "2026-05-01",
      year: 2026,
    });

    expect(nationwide).toMatchObject({
      view: "nationwide",
      layers: "public",
      date: "2026-05-01",
    });
    expect(getSelectedStates(nationwide)).toEqual(stateCodes);
    expect(getSelectedLayers(nationwide)).toEqual(["public"]);
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

  it("normalizes updates through the same trust boundary and preserves visible dates", () => {
    const current = parseExplorerSearch({
      year: 2026,
      period: "month",
      month: 5,
      view: "compare",
      states: "DE-BB,DE-BE",
      date: "2026-05-01",
    });
    const updated = updateExplorerSearch(current, {
      period: "month",
      month: 5,
      layers: "school",
    });

    expect(updated).toMatchObject({
      year: 2026,
      view: "compare",
      states: "DE-BB,DE-BE",
      period: "month",
      month: 5,
      layers: "school",
      date: "2026-05-01",
    });
    expect(updateExplorerSearch(current, { view: "state" }).date).toBe("2026-05-01");
    expect(updateExplorerSearch(current, { month: 6 }).date).toBeUndefined();
  });
});
