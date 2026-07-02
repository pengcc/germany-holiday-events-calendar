import { buildMonth, type CalendarCell, type CalendarDay } from "./calendar";
import { HolidayMarker } from "./holiday-marker";
import type { ExplorerCopy, Locale } from "./i18n";
import { cn } from "./lib/cn";
import { RegionalAdvisoryMarker } from "./regional-advisory-marker";

const leadingCellKeys = ["mon", "tue", "wed", "thu", "fri", "sat"];

interface MonthGridProps {
  year: number;
  month: number;
  locale: Locale;
  dayIndex: ReadonlyMap<string, CalendarDay>;
  selectedDate?: string;
  selectedStateCount: number;
  showFractions: boolean;
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
  showFractions,
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
            showFractions={showFractions}
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
  showFractions,
  text,
  onSelectDate,
}: {
  cell: CalendarCell;
  locale: Locale;
  selected: boolean;
  selectedStateCount: number;
  showFractions: boolean;
  text: ExplorerCopy;
  onSelectDate: (date: string) => void;
}) {
  const categories = new Set(cell.activityRecords.map((record) => record.category));
  const hasRegionalAdvisory = cell.advisoryRecords.length > 0;
  const fullOverlap = cell.overlap === "full";
  const partialOverlap = cell.overlap === "partial";
  const hasPublic = categories.has("public");
  const hasSchool = categories.has("school");
  const activityText = showFractions
    ? fullOverlap
      ? text.fullOverlap
      : partialOverlap
        ? text.partialOverlap
        : undefined
    : undefined;
  const dateLabel = formatDate(cell.date, locale);
  const layerLabels: string[] = [];
  if (categories.has("public")) {
    layerLabels.push(text.public);
  }
  if (categories.has("school")) {
    layerLabels.push(text.school);
  }
  const ariaLabel = [
    dateLabel,
    ...layerLabels,
    ...(hasRegionalAdvisory ? [text.regionalAdvisoryAccessible] : []),
    ...(activityText
      ? [activityText]
      : categories.size === 0 && !hasRegionalAdvisory
        ? [text.none]
        : []),
  ].join("; ");

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={cn(
        "relative flex aspect-square min-w-0 items-center justify-center rounded-sm border text-xs font-medium focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 sm:text-sm",
        hasPublic && "border-amber-500 bg-amber-200 text-slate-950",
        !hasPublic && hasSchool && "border-emerald-600 bg-emerald-100 text-emerald-950",
        !hasPublic && !hasSchool && "border-slate-200 bg-white text-slate-700",
        selected && "ring-2 ring-sky-950 ring-offset-1",
      )}
      type="button"
      onClick={() => onSelectDate(cell.date)}
    >
      <time dateTime={cell.date}>{cell.day}</time>
      {categories.size > 0 ? (
        <span className="absolute bottom-0.5 left-0.5 flex gap-0.5" aria-hidden="true">
          {categories.has("public") ? (
            <HolidayMarker category="public" className="border-white/80" />
          ) : null}
          {categories.has("school") ? (
            <HolidayMarker category="school" className="border-white/80" />
          ) : null}
        </span>
      ) : null}
      {hasRegionalAdvisory ? (
        <span className="absolute top-0.5 right-0.5" aria-hidden="true">
          <RegionalAdvisoryMarker />
        </span>
      ) : null}
      {showFractions && cell.hasStatewideActivity ? (
        <span
          className="absolute right-0.5 bottom-0.5 text-[8px] font-bold sm:text-[9px]"
          aria-hidden="true"
        >
          {`${cell.matchedStates.length}/${selectedStateCount}`}
        </span>
      ) : null}
    </button>
  );
}

function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
