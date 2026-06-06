import type { HolidayRecord } from "@hsg/data-core";
import { CalendarDate, getDayOfWeek } from "@internationalized/date";

export interface CalendarCell {
  date: string;
  day: number;
  matchedStates: string[];
  records: HolidayRecord[];
}

export function buildMonth(
  year: number,
  month: number,
  selectedStates: string[],
  records: HolidayRecord[],
  locale: string,
): { leading: number; cells: CalendarCell[] } {
  const first = new CalendarDate(year, month, 1);
  const daysInMonth = first.calendar.getDaysInMonth(first);
  const leading = getDayOfWeek(first, locale, "mon");
  const cells: CalendarCell[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new CalendarDate(year, month, day).toString();
    const matches = records.filter(
      (record) =>
        record.scope === "statewide" &&
        selectedStates.includes(record.jurisdiction) &&
        record.startDate <= date &&
        record.endDate >= date,
    );
    cells.push({
      date,
      day,
      records: matches,
      matchedStates: [...new Set(matches.map((record) => record.jurisdiction))],
    });
  }
  return { leading, cells };
}
