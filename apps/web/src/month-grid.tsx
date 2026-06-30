import type { HolidayRecord } from "@hsg/data-core/schemas";
import { buildMonth, type CalendarCell, type CalendarDay } from "./calendar";
import type { ExplorerCopy, Locale } from "./i18n";
import { cn } from "./lib/cn";

const leadingCellKeys = ["mon", "tue", "wed", "thu", "fri", "sat"];

interface MonthGridProps {
  year: number;
  month: number;
  locale: Locale;
  dayIndex: ReadonlyMap<string, CalendarDay>;
  selectedDate?: string;
  selectedStateCount: number;
  text: ExplorerCopy;
  onSelectDate: (date: string) => void;
}

export function MonthGrid({
  year,
  month,
  locale,
  dayIndex,
  selectedDate,
  selectedStateCount,
  text,
  onSelectDate,
}: MonthGridProps) {
  const monthData = buildMonth(year, month, dayIndex, locale);
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  const weekdays =
    locale === "zh"
      ? ["一", "二", "三", "四", "五", "六", "日"]
      : locale === "de"
        ? ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
        : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <section className="border border-slate-200 bg-white p-3" aria-label={`${monthName} ${year}`}>
      <h3 className="mb-3 text-sm font-semibold capitalize">{monthName}</h3>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">
        {weekdays.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
        {leadingCellKeys.slice(0, monthData.leading).map((key) => (
          <span key={`${year}-${month}-${key}`} />
        ))}
        {monthData.cells.map((cell) => (
          <DateButton
            key={cell.date}
            cell={cell}
            locale={locale}
            selected={cell.date === selectedDate}
            selectedStateCount={selectedStateCount}
            text={text}
            onSelectDate={onSelectDate}
          />
        ))}
      </div>
    </section>
  );
}

function DateButton({
  cell,
  locale,
  selected,
  selectedStateCount,
  text,
  onSelectDate,
}: {
  cell: CalendarCell;
  locale: Locale;
  selected: boolean;
  selectedStateCount: number;
  text: ExplorerCopy;
  onSelectDate: (date: string) => void;
}) {
  const categories = new Set(cell.records.map((record) => record.category));
  const fullOverlap = cell.overlap === "full";
  const partialOverlap = cell.overlap === "partial";
  const oneStateActivity = selectedStateCount === 1 && cell.hasStatewideActivity;
  const activityText = fullOverlap
    ? text.fullOverlap
    : partialOverlap
      ? text.partialOverlap
      : oneStateActivity
        ? text.singleStateActivity
        : undefined;
  const dateLabel = formatDate(cell.date, locale);
  const layerLabels: string[] = [];
  if (categories.has("public")) {
    layerLabels.push(text.public);
  }
  if (categories.has("school")) {
    layerLabels.push(text.school);
  }
  const ariaLabel = [dateLabel, ...layerLabels, activityText ?? text.none].join("; ");

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={cn(
        "relative flex aspect-square min-w-0 items-center justify-center rounded-sm border text-xs font-medium focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700",
        fullOverlap && "border-emerald-700 bg-emerald-700 text-white",
        partialOverlap && "border-amber-400 bg-amber-300 text-slate-950",
        oneStateActivity && "border-sky-700 bg-sky-100 text-sky-950",
        !cell.hasStatewideActivity && "border-slate-200 bg-white text-slate-700",
        selected && "ring-2 ring-sky-950 ring-offset-1",
      )}
      type="button"
      onClick={() => onSelectDate(cell.date)}
    >
      <time dateTime={cell.date}>{cell.day}</time>
      {categories.size > 0 ? (
        <span className="absolute bottom-0.5 left-0.5 flex gap-0.5" aria-hidden="true">
          {categories.has("public") ? (
            <Marker label={text.publicMarker} recordType="public" />
          ) : null}
          {categories.has("school") ? (
            <Marker label={text.schoolMarker} recordType="school" />
          ) : null}
        </span>
      ) : null}
      {cell.hasStatewideActivity ? (
        <span className="absolute right-0.5 bottom-0.5 text-[8px] font-bold" aria-hidden="true">
          {selectedStateCount > 1
            ? `${cell.matchedStates.length}/${selectedStateCount}`
            : cell.matchedStates.length}
        </span>
      ) : null}
    </button>
  );
}

function Marker({ label, recordType }: { label: string; recordType: HolidayRecord["category"] }) {
  return (
    <span
      className={cn(
        "flex size-3 items-center justify-center rounded-sm text-[7px] font-bold leading-none",
        recordType === "public" ? "bg-violet-800 text-white" : "bg-cyan-800 text-white",
      )}
    >
      {label}
    </span>
  );
}

function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
