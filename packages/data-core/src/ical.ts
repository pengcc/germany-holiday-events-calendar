import ICAL from "ical.js";
import { subtractDays } from "./dates";
import type { HolidayRecord, SourceManifest, ValidationIssue } from "./schemas";

function localizedName(summary: string): HolidayRecord["names"] {
  const germanName = summary.split(" - ")[0]?.trim() || summary.trim();
  return {
    de: germanName,
    en: germanName,
    zh: germanName,
  };
}

export function normalizeKmkIcs(
  text: string,
  source: SourceManifest,
): { records: HolidayRecord[]; issues: ValidationIssue[] } {
  const calendar = new ICAL.Component(ICAL.parse(text));
  const events = calendar.getAllSubcomponents("vevent");
  const issues: ValidationIssue[] = [];
  const records: HolidayRecord[] = [];

  for (const component of events) {
    const event = new ICAL.Event(component);
    const start = event.startDate;
    const end = event.endDate;

    if (!start?.isDate || !end?.isDate) {
      issues.push({
        code: "ICS_NOT_ALL_DAY",
        severity: "blocker",
        stage: "normalized",
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        recordId: event.uid || undefined,
        message: "The source event is not represented as an all-day date range.",
        expected: "DTSTART and DTEND with VALUE=DATE",
        actual: `${start?.toString() ?? "missing"} to ${end?.toString() ?? "missing"}`,
        suggestedAction: "Inspect the source event and add a reviewed adapter rule or override.",
        decisionRequired: false,
      });
      continue;
    }

    const startDate = start.toString();
    const endDate = subtractDays(end.toString(), 1);
    const eventId = event.uid || `${startDate}-${endDate}-${event.summary}`;
    records.push({
      schemaVersion: 1,
      id: `${source.id}:${eventId}`,
      jurisdiction: source.jurisdiction,
      category: source.category,
      scope: "statewide",
      regions: [],
      startDate,
      endDate,
      names: localizedName(event.summary || "Ferien"),
      periodId: source.period.id,
      source: {
        sourceId: source.id,
        sourceEventId: event.uid || undefined,
      },
    });
  }

  return {
    records: records.sort(
      (left, right) =>
        left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id),
    ),
    issues,
  };
}
