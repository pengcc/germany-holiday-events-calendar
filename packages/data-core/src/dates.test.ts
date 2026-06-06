import { describe, expect, it } from "vitest";
import { enumerateDates, subtractDays } from "./dates";

describe("all-day date helpers", () => {
  it("keeps inclusive date ranges without timestamps", () => {
    expect(enumerateDates("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });

  it("handles leap years", () => {
    expect(subtractDays("2028-03-01", 1)).toBe("2028-02-29");
  });
});
