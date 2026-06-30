import type { CalendarDay } from "./calendar";
import type { ExplorerCopy, Locale } from "./i18n";
import { cn } from "./lib/cn";
import { MonthGrid } from "./month-grid";

interface HolidayCalendarProps {
  year: number;
  months: readonly number[];
  locale: Locale;
  dayIndex: ReadonlyMap<string, CalendarDay>;
  selectedDate?: string;
  selectedStateCount: number;
  text: ExplorerCopy;
  onSelectDate: (date: string) => void;
}

export function HolidayCalendar({
  year,
  months,
  locale,
  dayIndex,
  selectedDate,
  selectedStateCount,
  text,
  onSelectDate,
}: HolidayCalendarProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-4",
        months.length === 1 && "max-w-2xl grid-cols-1",
        months.length === 3 && "md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3",
        months.length === 12 && "md:grid-cols-2 2xl:grid-cols-3",
      )}
    >
      {months.map((month) => (
        <MonthGrid
          key={`${year}-${month}`}
          dayIndex={dayIndex}
          locale={locale}
          month={month}
          selectedDate={selectedDate}
          selectedStateCount={selectedStateCount}
          text={text}
          year={year}
          onSelectDate={onSelectDate}
        />
      ))}
    </div>
  );
}
