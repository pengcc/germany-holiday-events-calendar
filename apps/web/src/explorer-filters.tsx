import { type StateCode, stateCodes } from "@hsg/data-core/schemas";
import { ChevronDown } from "lucide-react";
import { FilterSelect } from "./components/select";
import {
  type ExplorerSearch,
  type HolidayLayer,
  holidayLayers,
  periodModes,
  viewModes,
} from "./explorer-search";
import { formatActiveFilterSummary } from "./filter-summary";
import type { ExplorerCopy, Locale } from "./i18n";
import { stateNames } from "./i18n";
import { cn } from "./lib/cn";

interface ExplorerFiltersProps {
  locale: Locale;
  search: ExplorerSearch;
  year: number;
  availableYears: readonly number[];
  selectedStates: readonly StateCode[];
  selectedLayers: readonly HolidayLayer[];
  text: ExplorerCopy;
  onChange: (updates: Partial<Record<keyof ExplorerSearch, unknown>>) => void;
  onToggleState: (stateCode: StateCode) => void;
  onToggleLayer: (layer: HolidayLayer) => void;
}

export function ExplorerFilters({
  locale,
  search,
  year,
  availableYears,
  selectedStates,
  selectedLayers,
  text,
  onChange,
  onToggleState,
  onToggleLayer,
}: ExplorerFiltersProps) {
  const activeFilterSummary = formatActiveFilterSummary({
    locale,
    search,
    selectedLayers,
    selectedStates,
    text,
    year,
  });

  return (
    <details className="he-filter-disclosure">
      <summary className="he-filter-summary he-focus-ring" data-testid="mobile-filter-summary">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{text.filters}</span>
          <span className="he-text-secondary mt-0.5 block text-xs leading-5">
            {activeFilterSummary}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="he-filter-summary-chevron size-5 shrink-0" />
      </summary>

      <div className="he-filter-content" data-testid="filter-content">
        <div className="hidden lg:block">
          <h2 className="text-lg font-semibold">{text.filters}</h2>
          <p className="he-text-secondary mt-1 text-sm leading-5">{text.filterHelp}</p>
        </div>

        <fieldset className="mt-5">
          <legend className="he-text-secondary text-sm font-semibold">{text.viewMode}</legend>
          <p className="he-text-muted mt-1 text-xs leading-5">{text.viewModeHelp}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {viewModes.map((mode) => (
              <label
                key={mode}
                className={cn(
                  "he-filter-option flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                  search.view === mode && "he-filter-option-selected",
                )}
              >
                <input
                  checked={search.view === mode}
                  className="he-choice size-4 shrink-0"
                  name="view"
                  type="radio"
                  onChange={() => onChange({ view: mode })}
                />
                <span>
                  {mode === "state"
                    ? text.stateView
                    : mode === "nationwide"
                      ? text.nationwideView
                      : text.compareView}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <FilterSelect
            id="filter-year"
            label={text.year}
            options={availableYears.map((item) => ({ value: String(item), label: String(item) }))}
            value={String(year)}
            onValueChange={(value) => onChange({ year: Number(value) })}
          />

          <FilterSelect
            id="filter-period"
            label={text.period}
            options={periodModes.map((mode) => ({
              value: mode,
              label:
                mode === "year"
                  ? text.yearView
                  : mode === "quarter"
                    ? text.quarterView
                    : text.monthView,
            }))}
            value={search.period}
            onValueChange={(value) => onChange({ period: value })}
          />

          {search.period === "quarter" ? (
            <FilterSelect
              id="filter-quarter"
              label={text.quarter}
              options={[1, 2, 3, 4].map((quarter) => ({
                value: String(quarter),
                label: `Q${quarter}`,
              }))}
              value={String(search.quarter)}
              onValueChange={(value) => onChange({ quarter: Number(value) })}
            />
          ) : null}

          {search.period === "month" ? (
            <FilterSelect
              id="filter-month"
              label={text.month}
              options={Array.from({ length: 12 }, (_, index) => index + 1).map((month) => ({
                value: String(month),
                label: new Intl.DateTimeFormat(locale, {
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(Date.UTC(year, month - 1, 1))),
              }))}
              value={String(search.month)}
              onValueChange={(value) => onChange({ month: Number(value) })}
            />
          ) : null}
        </div>

        <fieldset className="mt-5">
          <legend className="he-text-secondary text-sm font-semibold">{text.layers}</legend>
          <p className="he-text-muted mt-1 text-xs leading-5">{text.layerHelp}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {holidayLayers.map((layer) => {
              const selected = selectedLayers.includes(layer);
              const unavailable = search.view === "nationwide" && layer === "school";
              return (
                <label
                  key={layer}
                  className={cn(
                    "he-filter-option flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2",
                    selected && "he-filter-option-selected",
                  )}
                >
                  <input
                    checked={selected}
                    className="he-choice size-4 shrink-0"
                    disabled={unavailable || (selected && selectedLayers.length === 1)}
                    type="checkbox"
                    onChange={() => onToggleLayer(layer)}
                  />
                  {layer === "public" ? text.public : text.school}
                </label>
              );
            })}
          </div>
          {search.view === "nationwide" ? (
            <p className="he-text-muted mt-2 text-xs leading-5">{text.nationwidePublicOnly}</p>
          ) : null}
        </fieldset>

        <StateSelection
          locale={locale}
          view={search.view}
          selectedStates={selectedStates}
          text={text}
          onChange={(stateCode) =>
            search.view === "state" ? onChange({ states: stateCode }) : onToggleState(stateCode)
          }
        />
      </div>
    </details>
  );
}

function StateSelection({
  locale,
  view,
  selectedStates,
  text,
  onChange,
}: {
  locale: Locale;
  view: ExplorerSearch["view"];
  selectedStates: readonly StateCode[];
  text: ExplorerCopy;
  onChange: (stateCode: StateCode) => void;
}) {
  if (view === "nationwide") {
    return (
      <section className="he-filter-option mt-5 rounded-md border p-3">
        <h3 className="he-text-secondary text-sm font-semibold">{text.selectStates}</h3>
        <p className="he-text-secondary mt-1 text-sm">{text.allStatesIncluded}</p>
      </section>
    );
  }

  if (view === "state") {
    return (
      <FilterSelect
        className="mt-5"
        id="filter-state"
        label={text.singleStateChoice}
        options={stateCodes.map((stateCode) => ({
          value: stateCode,
          label: `${stateNames[stateCode]?.[locale]} (${stateCode})`,
        }))}
        value={selectedStates[0] ?? stateCodes[0]}
        onValueChange={(value) => onChange(value as StateCode)}
      />
    );
  }

  return (
    <section className="mt-5">
      <h3 className="he-text-secondary text-sm font-semibold">{text.selectStates}</h3>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={text.selectedStatesLabel}>
        {selectedStates.slice(0, 3).map((stateCode) => (
          <li key={stateCode} className="he-state-chip rounded-full border px-2 py-1 text-xs">
            {stateCode.slice(3)}
          </li>
        ))}
        {selectedStates.length > 3 ? (
          <li className="he-control rounded-full border px-2 py-1 text-xs">
            +{selectedStates.length - 3}
          </li>
        ) : null}
      </ul>
      {selectedStates.length < 2 ? (
        <p className="he-warning mt-2 border-l-4 p-2 text-xs leading-5" role="alert">
          {text.compareValidation}
        </p>
      ) : null}
      <details className="he-control mt-2 rounded-md border">
        <summary className="he-focus-ring cursor-pointer px-3 py-2 text-sm font-medium">
          {text.chooseStates} · {formatStateCount(selectedStates.length, text)}
        </summary>
        <div className="he-border-subtle border-t p-3">
          <p className="he-text-muted mb-2 text-xs leading-5">{text.minimumTwoStates}</p>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {stateCodes.map((stateCode) => {
              const selected = selectedStates.includes(stateCode);
              return (
                <label
                  key={stateCode}
                  className={cn(
                    "he-filter-option flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm",
                    selected && "he-filter-option-selected",
                  )}
                >
                  <input
                    checked={selected}
                    className="he-choice size-4 shrink-0"
                    type="checkbox"
                    onChange={() => onChange(stateCode)}
                  />
                  <span className="min-w-0 flex-1">{stateNames[stateCode]?.[locale]}</span>
                  <span className="he-text-muted text-xs">{stateCode.slice(3)}</span>
                </label>
              );
            })}
          </div>
        </div>
      </details>
    </section>
  );
}

function formatStateCount(count: number, text: ExplorerCopy): string {
  return count === 1 ? text.oneStateSelected : `${count} ${text.statesSelected}`;
}
