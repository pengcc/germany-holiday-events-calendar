import type { HolidayRecord, PublishedDatasetManifest } from "@hsg/data-core";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Check, DatabaseZap, Languages } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildMonth } from "./calendar";
import { Button } from "./components/button";
import { loadPublishedData } from "./data";
import { copy, type Locale, stateNames } from "./i18n";
import { cn } from "./lib/cn";

interface ComparisonPageProps {
  locale: Locale;
}

const stateCodes = Object.keys(stateNames);
const defaultStates = ["DE-BW", "DE-TH"];
const calendarMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const leadingCellKeys = ["mon", "tue", "wed", "thu", "fri", "sat"];

export function ComparisonPage({ locale }: ComparisonPageProps) {
  const text = copy[locale];
  const [records, setRecords] = useState<HolidayRecord[]>([]);
  const [manifest, setManifest] = useState<PublishedDatasetManifest>();
  const [error, setError] = useState<string>();
  const [selectedStates, setSelectedStates] = useState(defaultStates);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadPublishedData()
      .then(({ records: loadedRecords, manifest: loadedManifest }) => {
        setRecords(loadedRecords);
        setManifest(loadedManifest);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      });
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear(), new Date().getFullYear() + 1]);
    for (const record of records) {
      years.add(Number(record.startDate.slice(0, 4)));
      years.add(Number(record.endDate.slice(0, 4)));
    }
    return [...years].sort();
  }, [records]);

  function toggleState(stateCode: string): void {
    setSelectedStates((current) =>
      current.includes(stateCode)
        ? current.filter((item) => item !== stateCode)
        : [...current, stateCode],
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-sky-800 text-white">
              <CalendarDays aria-hidden="true" className="size-5" />
            </span>
            <span className="font-semibold">{text.appName}</span>
          </div>
          <nav aria-label="Language" className="flex items-center gap-1">
            <Languages aria-hidden="true" className="mr-1 size-4 text-slate-500" />
            {(["zh", "de", "en"] as const).map((item) => (
              <Button
                key={item}
                asChild
                className="h-8 px-2.5 uppercase"
                variant={item === locale ? "primary" : "ghost"}
              >
                <Link to={`/${item}`}>{item}</Link>
              </Button>
            ))}
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:py-10">
          <p className="mb-2 text-sm font-semibold text-sky-800">{text.appName}</p>
          <h1 className="max-w-4xl text-3xl font-bold sm:text-4xl">{text.title}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{text.intro}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1480px] gap-0 lg:grid-cols-[300px_1fr]">
        <aside className="border-b border-slate-200 bg-white p-4 sm:p-6 lg:border-r lg:border-b-0">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-semibold">{text.selectStates}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedStates.length} {text.selected}
              </p>
            </div>
            <label className="text-sm font-medium text-slate-600">
              <span className="mb-1 block">{text.year}</span>
              <select
                className="h-9 rounded-md border border-slate-300 bg-white px-3"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                {availableYears.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {stateCodes.map((stateCode) => {
              const selected = selectedStates.includes(stateCode);
              return (
                <label
                  key={stateCode}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
                    selected
                      ? "border-sky-700 bg-sky-50 text-sky-950"
                      : "border-transparent hover:bg-slate-100",
                  )}
                >
                  <input
                    checked={selected}
                    className="sr-only"
                    type="checkbox"
                    onChange={() => toggleState(stateCode)}
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded border",
                      selected ? "border-sky-700 bg-sky-800 text-white" : "border-slate-300",
                    )}
                  >
                    {selected ? <Check className="size-3.5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">{stateNames[stateCode]?.[locale]}</span>
                  <span className="text-xs text-slate-500">{stateCode.slice(3)}</span>
                </label>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{text.calendar}</h2>
              <p className="mt-1 text-sm text-slate-600">{text.statewideOnly}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-700">
              <Legend swatch="bg-emerald-700" text={text.overlap} />
              <Legend swatch="bg-amber-400" text={text.some} />
              <Legend swatch="bg-white" text={text.none} bordered />
            </div>
          </div>

          {error ? (
            <div className="mt-6 border-l-4 border-red-700 bg-red-50 p-4 text-sm text-red-950">
              {error}
            </div>
          ) : null}

          {manifest && manifest.recordCount === 0 ? (
            <div className="mt-6 flex min-h-64 flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <DatabaseZap aria-hidden="true" className="size-9 text-sky-800" />
              <h3 className="mt-4 text-lg font-semibold">{text.noDataTitle}</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{text.noDataBody}</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {calendarMonths.map((month) => (
                <Month
                  key={`${year}-${month}`}
                  locale={locale}
                  month={month}
                  records={records}
                  selectedStates={selectedStates}
                  year={year}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Legend({ swatch, text, bordered }: { swatch: string; text: string; bordered?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("size-3 rounded-sm", swatch, bordered && "border border-slate-300")} />
      {text}
    </span>
  );
}

function Month({
  year,
  month,
  locale,
  records,
  selectedStates,
}: {
  year: number;
  month: number;
  locale: Locale;
  records: HolidayRecord[];
  selectedStates: string[];
}) {
  const monthData = buildMonth(year, month, selectedStates, records, locale);
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
        {monthData.cells.map((cell) => {
          const allSelected =
            selectedStates.length >= 2 && cell.matchedStates.length === selectedStates.length;
          const someSelected = cell.matchedStates.length > 0;
          const names = [...new Set(cell.records.map((record) => record.names[locale]))].join(", ");
          return (
            <time
              key={cell.date}
              dateTime={cell.date}
              className={cn(
                "relative flex aspect-square min-w-0 items-center justify-center rounded-sm border text-xs font-medium",
                allSelected && "border-emerald-700 bg-emerald-700 text-white",
                !allSelected && someSelected && "border-amber-400 bg-amber-300 text-slate-950",
                !someSelected && "border-slate-200 bg-white text-slate-700",
              )}
              title={names || cell.date}
            >
              {cell.day}
              <span className="sr-only">
                {cell.date}: {names || "No holiday"}; {cell.matchedStates.length} selected states
              </span>
              {someSelected ? (
                <span className="absolute right-0.5 bottom-0 text-[8px] font-bold">
                  {cell.matchedStates.length}
                </span>
              ) : null}
            </time>
          );
        })}
      </div>
    </section>
  );
}
