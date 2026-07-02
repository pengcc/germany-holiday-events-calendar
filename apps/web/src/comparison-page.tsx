import type { HolidayRecord, PublishedDatasetManifest, StateCode } from "@hsg/data-core/schemas";
import { Link } from "@tanstack/react-router";
import { CalendarDays, DatabaseZap, Languages } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deriveHolidayCalendar, getResultMonths } from "./calendar";
import { Button } from "./components/button";
import { loadPublishedData } from "./data";
import { DateDetails } from "./date-details";
import { ExplorerFilters } from "./explorer-filters";
import {
  type ExplorerSearch,
  getSelectedLayers,
  getSelectedStates,
  getVisibleMonths,
  type HolidayLayer,
  isComparisonValid,
  searchValuesEqual,
  updateExplorerSearch,
} from "./explorer-search";
import { HolidayCalendar } from "./holiday-calendar";
import { copy, type Locale } from "./i18n";
import { HolidayLegend } from "./legend";

interface ComparisonPageProps {
  locale: Locale;
  search: ExplorerSearch;
  onSearchChange: (search: ExplorerSearch, options?: { replace?: boolean }) => void;
}

export function ComparisonPage({ locale, search, onSearchChange }: ComparisonPageProps) {
  const text = copy[locale];
  const [records, setRecords] = useState<HolidayRecord[]>([]);
  const [manifest, setManifest] = useState<PublishedDatasetManifest>();
  const [error, setError] = useState<string>();
  const periodMonths = useMemo(() => getVisibleMonths(search), [search]);
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
        viewMode: search.view,
      }),
    [manifest?.coverageMatrix, records, search, year],
  );
  const selectedStates = calendar.selectedStates;
  const selectedLayers = calendar.layers;
  const comparisonValid = isComparisonValid(search);
  const visibleMonths = useMemo(
    () => getResultMonths(periodMonths, calendar.days, search.view, comparisonValid),
    [calendar.days, comparisonValid, periodMonths, search.view],
  );
  const showResultEmptyState = comparisonValid && visibleMonths.length === 0;

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

  useEffect(() => {
    if (
      !manifest ||
      !search.date ||
      !comparisonValid ||
      visibleMonths.includes(Number(search.date.slice(5, 7)))
    ) {
      return;
    }
    onSearchChange(updateExplorerSearch(search, { date: undefined }), { replace: true });
  }, [comparisonValid, manifest, onSearchChange, search, visibleMonths]);

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
    if (search.view === "nationwide") {
      return;
    }
    if (search.view === "state") {
      changeSearch({ states: stateCode });
      return;
    }
    changeSearch({
      states: selectedStates.includes(stateCode)
        ? selectedStates.filter((item) => item !== stateCode).join(",")
        : [...selectedStates, stateCode].join(","),
    });
  }

  function toggleLayer(layer: HolidayLayer): void {
    if (search.view === "nationwide") {
      return;
    }
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
          <nav aria-label={text.language} className="flex items-center gap-1">
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
          <ExplorerFilters
            availableYears={availableYears}
            locale={locale}
            search={search}
            selectedLayers={selectedLayers}
            selectedStates={selectedStates}
            text={text}
            year={year}
            onChange={changeSearch}
            onToggleLayer={toggleLayer}
            onToggleState={toggleState}
          />
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{text.calendar}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {search.view === "state"
                  ? text.stateModeSummary
                  : search.view === "nationwide"
                    ? text.nationwideModeSummary
                    : text.compareModeSummary}
              </p>
            </div>
            <HolidayLegend compareMode={search.view === "compare" && comparisonValid} text={text} />
          </div>

          {error ? (
            <div
              className="mt-6 border-l-4 border-red-700 bg-red-50 p-4 text-sm text-red-950"
              role="alert"
            >
              <h3 className="font-semibold">{text.dataErrorTitle}</h3>
              <p className="mt-1 leading-6">{text.dataErrorBody}</p>
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
            <>
              {!calendar.coverage.complete && comparisonValid ? (
                <div className="mt-6 border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">
                  <h3 className="font-semibold">{text.incompleteCoverageTitle}</h3>
                  <p className="mt-1 leading-6">
                    {search.view === "state"
                      ? text.incompleteStateCoverage
                      : search.view === "nationwide"
                        ? text.incompleteNationwideCoverage
                        : text.incompleteCompareCoverage}
                  </p>
                </div>
              ) : null}
              {showResultEmptyState ? (
                <p className="mt-4 border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  {search.view === "state"
                    ? text.noStateResultMonths
                    : search.view === "nationwide"
                      ? text.noNationwideResultMonths
                      : text.noCompareResultMonths}
                </p>
              ) : (
                <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                  <HolidayCalendar
                    dayIndex={calendar.days}
                    locale={locale}
                    months={visibleMonths}
                    selectedDate={search.date}
                    selectedStateCount={selectedStates.length}
                    showFractions={search.view === "compare" && comparisonValid}
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
            </>
          )}
        </section>
      </div>
    </main>
  );
}
