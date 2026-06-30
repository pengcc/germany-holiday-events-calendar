import type { HolidayRecord, PublishedDatasetManifest, StateCode } from "@hsg/data-core/schemas";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Check, DatabaseZap, Languages } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deriveHolidayCalendar } from "./calendar";
import { Button } from "./components/button";
import { loadPublishedData } from "./data";
import { DateDetails } from "./date-details";
import {
  type ExplorerSearch,
  getSelectedLayers,
  getSelectedStates,
  getVisibleMonths,
  holidayLayers,
  periodModes,
  regionModes,
  searchValuesEqual,
  updateExplorerSearch,
} from "./explorer-search";
import { HolidayCalendar } from "./holiday-calendar";
import { copy, type Locale, stateNames } from "./i18n";
import { HolidayLegend } from "./legend";
import { cn } from "./lib/cn";

interface ComparisonPageProps {
  locale: Locale;
  search: ExplorerSearch;
  onSearchChange: (search: ExplorerSearch, options?: { replace?: boolean }) => void;
}

const stateCodes = Object.keys(stateNames);

export function ComparisonPage({ locale, search, onSearchChange }: ComparisonPageProps) {
  const text = copy[locale];
  const [records, setRecords] = useState<HolidayRecord[]>([]);
  const [manifest, setManifest] = useState<PublishedDatasetManifest>();
  const [error, setError] = useState<string>();
  const visibleMonths = getVisibleMonths(search);
  const year = search.year ?? manifest?.targetYears[0] ?? new Date().getFullYear();
  const calendar = useMemo(
    () =>
      deriveHolidayCalendar({
        records,
        selectedStates: getSelectedStates(search),
        layers: getSelectedLayers(search),
        period: {
          year,
          mode: search.period,
          quarter: search.quarter,
          month: search.month,
        },
        coverageMatrix: manifest?.coverageMatrix,
      }),
    [manifest?.coverageMatrix, records, search, year],
  );
  const selectedStates = calendar.selectedStates;
  const selectedLayers = calendar.layers;

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

  useEffect(() => {
    if (!manifest) {
      return;
    }
    const fallbackYear = manifest.targetYears[0] ?? new Date().getFullYear();
    const canonicalSearch = updateExplorerSearch(search, {
      year:
        search.year !== undefined && manifest.targetYears.includes(search.year)
          ? search.year
          : fallbackYear,
    });
    if (!searchValuesEqual(search, canonicalSearch)) {
      onSearchChange(canonicalSearch, { replace: true });
    }
  }, [manifest, onSearchChange, search]);

  const availableYears = useMemo(() => {
    if (manifest?.targetYears.length) {
      return manifest.targetYears;
    }
    const years = new Set<number>([new Date().getFullYear(), new Date().getFullYear() + 1]);
    for (const record of records) {
      years.add(Number(record.startDate.slice(0, 4)));
      years.add(Number(record.endDate.slice(0, 4)));
    }
    return [...years].sort();
  }, [manifest, records]);

  function changeSearch(updates: Partial<Record<keyof ExplorerSearch, unknown>>): void {
    onSearchChange(updateExplorerSearch(search, updates));
  }

  function toggleState(stateCode: StateCode): void {
    if (search.region === "all") {
      return;
    }
    if (search.region === "single") {
      changeSearch({ states: stateCode });
      return;
    }
    if (selectedStates.includes(stateCode) && selectedStates.length <= 2) {
      return;
    }
    changeSearch({
      states: selectedStates.includes(stateCode)
        ? selectedStates.filter((item) => item !== stateCode).join(",")
        : [...selectedStates, stateCode].join(","),
    });
  }

  function toggleLayer(layer: (typeof holidayLayers)[number]): void {
    if (selectedLayers.includes(layer) && selectedLayers.length === 1) {
      return;
    }
    changeSearch({
      layers: selectedLayers.includes(layer)
        ? selectedLayers.filter((item) => item !== layer).join(",")
        : [...selectedLayers, layer].join(","),
    });
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
                <Link search={search} to={`/${item}`}>
                  {item}
                </Link>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <label className="text-sm font-medium text-slate-600">
              <span className="mb-1 block">{text.region}</span>
              <select
                aria-label={text.region}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3"
                value={search.region}
                onChange={(event) => changeSearch({ region: event.target.value })}
              >
                {regionModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === "all"
                      ? text.allGermany
                      : mode === "single"
                        ? text.singleState
                        : text.multipleStates}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              <span className="mb-1 block">{text.year}</span>
              <select
                aria-label={text.year}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3"
                value={year}
                onChange={(event) => changeSearch({ year: Number(event.target.value) })}
              >
                {availableYears.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              <span className="mb-1 block">{text.period}</span>
              <select
                aria-label={text.period}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3"
                value={search.period}
                onChange={(event) => changeSearch({ period: event.target.value })}
              >
                {periodModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === "year"
                      ? text.yearView
                      : mode === "quarter"
                        ? text.quarterView
                        : text.monthView}
                  </option>
                ))}
              </select>
            </label>
            {search.period === "quarter" ? (
              <label className="text-sm font-medium text-slate-600">
                <span className="mb-1 block">{text.quarter}</span>
                <select
                  aria-label={text.quarter}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3"
                  value={search.quarter}
                  onChange={(event) => changeSearch({ quarter: Number(event.target.value) })}
                >
                  {[1, 2, 3, 4].map((quarter) => (
                    <option key={quarter} value={quarter}>
                      Q{quarter}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {search.period === "month" ? (
              <label className="text-sm font-medium text-slate-600">
                <span className="mb-1 block">{text.month}</span>
                <select
                  aria-label={text.month}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3"
                  value={search.month}
                  onChange={(event) => changeSearch({ month: Number(event.target.value) })}
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>
                      {new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
                        new Date(Date.UTC(year, month - 1, 1)),
                      )}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-slate-700">{text.layers}</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {holidayLayers.map((layer) => (
                <label key={layer} className="flex items-center gap-2">
                  <input
                    checked={selectedLayers.includes(layer)}
                    type="checkbox"
                    onChange={() => toggleLayer(layer)}
                  />
                  {layer === "public" ? text.public : text.school}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5">
            <h2 className="font-semibold">{text.selectStates}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedStates.length} {text.selected}
            </p>
          </div>

          <div className="mt-5 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {stateCodes.map((stateCodeValue) => {
              const stateCode = stateCodeValue as StateCode;
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
                    disabled={search.region === "all"}
                    name={search.region === "single" ? "state" : undefined}
                    type={search.region === "single" ? "radio" : "checkbox"}
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
            <HolidayLegend text={text} />
          </div>

          {error ? (
            <div className="mt-6 border-l-4 border-red-700 bg-red-50 p-4 text-sm text-red-950">
              {error}
            </div>
          ) : !manifest ? (
            <div className="mt-6 border border-slate-200 bg-white p-4 text-sm text-slate-700">
              {text.loading}
            </div>
          ) : manifest.recordCount === 0 ? (
            <div className="mt-6 flex min-h-64 flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <DatabaseZap aria-hidden="true" className="size-9 text-sky-800" />
              <h3 className="mt-4 text-lg font-semibold">{text.noDataTitle}</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{text.noDataBody}</p>
            </div>
          ) : (
            <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <HolidayCalendar
                dayIndex={calendar.days}
                locale={locale}
                months={visibleMonths}
                selectedDate={search.date}
                selectedStateCount={selectedStates.length}
                text={text}
                year={year}
                onSelectDate={(date) => changeSearch({ date })}
              />
              <DateDetails
                day={search.date ? calendar.days.get(search.date) : undefined}
                locale={locale}
                selectedDate={search.date}
                text={text}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
