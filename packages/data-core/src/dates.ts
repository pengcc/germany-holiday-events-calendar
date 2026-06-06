import { parseDate } from "@internationalized/date";
import { IsoDateSchema } from "./schemas";

export function assertIsoDate(value: string): string {
  IsoDateSchema.parse(value);
  parseDate(value);
  return value;
}

export function compareDates(left: string, right: string): number {
  return parseDate(assertIsoDate(left)).compare(parseDate(assertIsoDate(right)));
}

export function subtractDays(value: string, days: number): string {
  return parseDate(assertIsoDate(value)).subtract({ days }).toString();
}

export function enumerateDates(startDate: string, endDate: string): string[] {
  const start = parseDate(assertIsoDate(startDate));
  const end = parseDate(assertIsoDate(endDate));
  if (start.compare(end) > 0) {
    throw new Error(`Date range starts after it ends: ${startDate} > ${endDate}`);
  }

  const dates: string[] = [];
  let current = start;
  while (current.compare(end) <= 0) {
    dates.push(current.toString());
    current = current.add({ days: 1 });
  }
  return dates;
}

export function isExpired(reviewBy: string, today: string): boolean {
  return compareDates(reviewBy, today) < 0;
}
