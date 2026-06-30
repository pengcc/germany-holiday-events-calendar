import type { HolidayRecord, PublishedDatasetManifest, StateCode } from "@hsg/data-core/schemas";
import { CalendarDate, getDayOfWeek, parseDate } from "@internationalized/date";

export type HolidayLayer = HolidayRecord["category"];
export type CalendarPeriodMode = "year" | "quarter" | "month";
export type OverlapStatus = "none" | "partial" | "full";

export interface CalendarPeriodSelection {
  year: number;
  mode: CalendarPeriodMode;
  quarter?: number;
  month?: number;
}

export interface CalendarPeriodBounds extends CalendarPeriodSelection {
  startDate: string;
  endDate: string;
}

export interface CalendarDay {
  date: string;
  records: readonly HolidayRecord[];
  statewideRecords: readonly HolidayRecord[];
  matchedStates: readonly StateCode[];
  hasStatewideActivity: boolean;
  overlap: OverlapStatus;
}

export interface CoverageGap {
  jurisdiction: StateCode;
  year: number;
  category: HolidayLayer;
}

export interface CalendarCoverage {
  complete: boolean;
  coveredCount: number;
  expectedCount: number;
  missing: readonly CoverageGap[];
}

export interface HolidayCalendarDerivation {
  period: CalendarPeriodBounds;
  selectedStates: readonly StateCode[];
  layers: readonly HolidayLayer[];
  days: ReadonlyMap<string, CalendarDay>;
  coverage: CalendarCoverage;
}

export interface DeriveHolidayCalendarInput {
  records: readonly HolidayRecord[];
  selectedStates: readonly StateCode[];
  layers: readonly HolidayLayer[];
  period: CalendarPeriodSelection;
  coverageMatrix?: PublishedDatasetManifest["coverageMatrix"];
}

export interface CalendarCell extends CalendarDay {
  day: number;
}

export function deriveHolidayCalendar({
  records,
  selectedStates,
  layers,
  period,
  coverageMatrix = [],
}: DeriveHolidayCalendarInput): HolidayCalendarDerivation {
  const normalizedStates = uniqueSorted(selectedStates);
  const normalizedLayers = uniqueSorted(layers);
  const periodBounds = getCalendarPeriodBounds(period);
  const recordsByDate = new Map<string, Map<string, HolidayRecord>>();

  for (const record of records) {
    if (
      !normalizedStates.includes(record.jurisdiction) ||
      !normalizedLayers.includes(record.category) ||
      record.endDate < periodBounds.startDate ||
      record.startDate > periodBounds.endDate
    ) {
      continue;
    }

    const clippedStart =
      record.startDate < periodBounds.startDate ? periodBounds.startDate : record.startDate;
    const clippedEnd =
      record.endDate > periodBounds.endDate ? periodBounds.endDate : record.endDate;
    let date = parseDate(clippedStart);
    const end = parseDate(clippedEnd);
    while (date.compare(end) <= 0) {
      const isoDate = date.toString();
      const dateRecords = recordsByDate.get(isoDate) ?? new Map<string, HolidayRecord>();
      dateRecords.set(record.id, record);
      recordsByDate.set(isoDate, dateRecords);
      date = date.add({ days: 1 });
    }
  }

  const days = new Map<string, CalendarDay>();
  for (const [date, recordsForDate] of [...recordsByDate.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const dateRecords = [...recordsForDate.values()].sort(compareRecords);
    const statewideRecords = dateRecords.filter((record) => record.scope === "statewide");
    const matchedStates = uniqueSorted(statewideRecords.map((record) => record.jurisdiction));
    days.set(date, {
      date,
      records: dateRecords,
      statewideRecords,
      matchedStates,
      hasStatewideActivity: matchedStates.length > 0,
      overlap: getOverlapStatus(normalizedStates.length, matchedStates.length),
    });
  }

  return {
    period: periodBounds,
    selectedStates: normalizedStates,
    layers: normalizedLayers,
    days,
    coverage: deriveCoverage(normalizedStates, normalizedLayers, period.year, coverageMatrix),
  };
}

export function getCalendarPeriodBounds(period: CalendarPeriodSelection): CalendarPeriodBounds {
  const { firstMonth, monthCount } = getPeriodMonths(period);
  const start = new CalendarDate(period.year, firstMonth, 1);
  const end = start.add({ months: monthCount }).subtract({ days: 1 });
  return { ...period, startDate: start.toString(), endDate: end.toString() };
}

export function buildMonth(
  year: number,
  month: number,
  dayIndex: ReadonlyMap<string, CalendarDay>,
  locale: string,
): { leading: number; cells: CalendarCell[] } {
  const first = new CalendarDate(year, month, 1);
  const daysInMonth = first.calendar.getDaysInMonth(first);
  const leading = getDayOfWeek(first, locale, "mon");
  const cells: CalendarCell[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new CalendarDate(year, month, day).toString();
    const indexedDay = dayIndex.get(date);
    cells.push({
      day,
      date,
      records: indexedDay?.records ?? [],
      statewideRecords: indexedDay?.statewideRecords ?? [],
      matchedStates: indexedDay?.matchedStates ?? [],
      hasStatewideActivity: indexedDay?.hasStatewideActivity ?? false,
      overlap: indexedDay?.overlap ?? "none",
    });
  }
  return { leading, cells };
}

function deriveCoverage(
  selectedStates: readonly StateCode[],
  layers: readonly HolidayLayer[],
  year: number,
  coverageMatrix: PublishedDatasetManifest["coverageMatrix"],
): CalendarCoverage {
  const coveredKeys = new Set(
    coverageMatrix
      .filter((item) => item.year === year && item.covered)
      .map((item) => coverageKey(item.jurisdiction, item.category)),
  );
  const missing: CoverageGap[] = [];

  for (const jurisdiction of selectedStates) {
    for (const category of layers) {
      if (!coveredKeys.has(coverageKey(jurisdiction, category))) {
        missing.push({ jurisdiction, year, category });
      }
    }
  }

  const expectedCount = selectedStates.length * layers.length;
  return {
    complete: expectedCount > 0 && missing.length === 0,
    coveredCount: expectedCount - missing.length,
    expectedCount,
    missing,
  };
}

function getOverlapStatus(selectedStateCount: number, matchedStateCount: number): OverlapStatus {
  if (selectedStateCount < 2 || matchedStateCount === 0) {
    return "none";
  }
  return matchedStateCount === selectedStateCount ? "full" : "partial";
}

function getPeriodMonths(period: CalendarPeriodSelection): {
  firstMonth: number;
  monthCount: number;
} {
  if (period.mode === "month") {
    return { firstMonth: requireIntegerInRange(period.month, 1, 12, "month"), monthCount: 1 };
  }
  if (period.mode === "quarter") {
    const quarter = requireIntegerInRange(period.quarter, 1, 4, "quarter");
    return { firstMonth: (quarter - 1) * 3 + 1, monthCount: 3 };
  }
  return { firstMonth: 1, monthCount: 12 };
}

function requireIntegerInRange(
  value: number | undefined,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (!Number.isInteger(value) || (value ?? 0) < minimum || (value ?? 0) > maximum) {
    throw new Error(`Invalid calendar ${name}: ${String(value)}`);
  }
  return value as number;
}

function coverageKey(jurisdiction: StateCode, category: HolidayLayer): string {
  return `${jurisdiction}:${category}`;
}

function compareRecords(left: HolidayRecord, right: HolidayRecord): number {
  return (
    left.startDate.localeCompare(right.startDate) ||
    left.endDate.localeCompare(right.endDate) ||
    left.id.localeCompare(right.id)
  );
}

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}
