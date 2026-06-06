import { describe, expect, it } from "vitest";
import { compareRecords } from "./diff";
import type { HolidayRecord } from "./schemas";

const base: HolidayRecord = {
  schemaVersion: 1,
  id: "source:event",
  jurisdiction: "DE-BW",
  category: "school",
  scope: "statewide",
  regions: [],
  startDate: "2026-10-26",
  endDate: "2026-10-30",
  names: { de: "Herbst", en: "Herbst", zh: "Herbst" },
  periodId: "2026-27",
  source: { sourceId: "source", sourceEventId: "event" },
};

describe("record comparison", () => {
  it("requires a decision for date movement and removals", () => {
    const moved = { ...base, startDate: "2026-10-27" };
    expect(compareRecords([base], [moved])[0]).toMatchObject({
      kind: "changed",
      changedFields: ["startDate"],
      decisionRequired: true,
    });
    expect(compareRecords([base], [])[0]).toMatchObject({
      kind: "removed",
      decisionRequired: true,
    });
  });

  it("does not require a decision for a newly added record", () => {
    expect(compareRecords([], [base])[0]).toMatchObject({
      kind: "added",
      decisionRequired: false,
    });
  });
});
