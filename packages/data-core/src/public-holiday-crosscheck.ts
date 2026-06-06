import Holidays from "date-holidays";
import type { HolidayRecord, SourceManifest, ValidationIssue } from "./schemas";

export function crossCheckPublicHolidays(
  records: HolidayRecord[],
  source: SourceManifest,
): ValidationIssue[] {
  if (source.category !== "public") {
    return [];
  }

  const state = source.jurisdiction.slice(3);
  const calendar = new Holidays("DE", state, {
    languages: ["de"],
    types: ["public"],
  });
  const years = yearsInPeriod(source.period.startDate, source.period.endDate);
  const expected = years
    .flatMap((year) => calendar.getHolidays(year, "de"))
    .filter((holiday) => holiday.type === "public");
  const issues: ValidationIssue[] = [];

  for (const holiday of expected) {
    const date = holiday.date.slice(0, 10);
    const matched = records.some(
      (record) =>
        record.scope === "statewide" && record.startDate <= date && record.endDate >= date,
    );
    if (!matched) {
      issues.push({
        code: "PUBLIC_HOLIDAY_CROSSCHECK_MISSING",
        severity: "warning",
        stage: "validated",
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        message: `${holiday.name} on ${date} is present in the read-only date-holidays cross-check but not the official batch.`,
        actual: date,
        suggestedAction:
          "Compare the official legal source. Do not copy third-party data into the batch automatically.",
        decisionRequired: true,
      });
    }
  }

  return issues;
}

function yearsInPeriod(startDate: string, endDate: string): number[] {
  const startYear = Number(startDate.slice(0, 4));
  const endYear = Number(endDate.slice(0, 4));
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
}
