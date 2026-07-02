import { Fragment, type ReactNode } from "react";
import type { CalendarDay } from "./calendar";
import type { ExplorerCopy, Locale } from "./i18n";
import { cn } from "./lib/cn";
import { MonthGrid } from "./month-grid";

interface HolidayCalendarProps {
  year: number;
  months: readonly number[];
  locale: Locale;
  dayIndex: ReadonlyMap<string, CalendarDay>;
  details?: ReactNode;
  selectedDate?: string;
  selectedStateCount: number;
  showFractions: boolean;
  text: ExplorerCopy;
  onSelectDate: (date: string) => void;
}

export function HolidayCalendar({
  year,
  months,
  locale,
  dayIndex,
  details,
  selectedDate,
  selectedStateCount,
  showFractions,
  text,
  onSelectDate,
}: HolidayCalendarProps) {
  const selectedMonth = selectedDate ? Number(selectedDate.slice(5, 7)) : undefined;

  return (
    <div
      className={cn(
        "grid min-w-0 gap-4",
        months.length === 1 && "max-w-2xl grid-cols-1",
        months.length > 1 && "grid-cols-[repeat(auto-fit,minmax(min(100%,21rem),1fr))]",
      )}
    >
      {months.map((month) => (
        <Fragment key={`${year}-${month}`}>
          <MonthGrid
            dayIndex={dayIndex}
            locale={locale}
            month={month}
            selectedDate={selectedDate}
            selectedStateCount={selectedStateCount}
            showFractions={showFractions}
            text={text}
            year={year}
            onSelectDate={onSelectDate}
          />
          {details && month === selectedMonth ? (
            <div className="he-inline-date-details">{details}</div>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
