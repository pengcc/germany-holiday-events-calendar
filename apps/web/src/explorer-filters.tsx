import { type StateCode, stateCodes } from "@hsg/data-core/schemas";
import type { ReactNode } from "react";
import {
  type ExplorerSearch,
  type HolidayLayer,
  holidayLayers,
  periodModes,
  viewModes,
} from "./explorer-search";
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

const selectClasses = "he-control he-focus-ring h-10 w-full rounded-md border px-3";

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
  return (
    <div>
      <div>
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
        <SelectField label={text.year}>
          <select
            aria-label={text.year}
            className={selectClasses}
            value={year}
            onChange={(event) => onChange({ year: Number(event.target.value) })}
          >
            {availableYears.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label={text.period}>
          <select
            aria-label={text.period}
            className={selectClasses}
            value={search.period}
            onChange={(event) => onChange({ period: event.target.value })}
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
        </SelectField>

        {search.period === "quarter" ? (
          <SelectField label={text.quarter}>
            <select
              aria-label={text.quarter}
              className={selectClasses}
              value={search.quarter}
              onChange={(event) => onChange({ quarter: Number(event.target.value) })}
            >
              {[1, 2, 3, 4].map((quarter) => (
                <option key={quarter} value={quarter}>
                  Q{quarter}
                </option>
              ))}
            </select>
          </SelectField>
        ) : null}

        {search.period === "month" ? (
          <SelectField label={text.month}>
            <select
              aria-label={text.month}
              className={selectClasses}
              value={search.month}
              onChange={(event) => onChange({ month: Number(event.target.value) })}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>
                  {new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
                    new Date(Date.UTC(year, month - 1, 1)),
                  )}
                </option>
              ))}
            </select>
          </SelectField>
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
      <label className="he-text-secondary mt-5 block text-sm font-semibold">
        <span className="mb-1 block">{text.singleStateChoice}</span>
        <select
          aria-label={text.singleStateChoice}
          className={selectClasses}
          value={selectedStates[0]}
          onChange={(event) => onChange(event.target.value as StateCode)}
        >
          {stateCodes.map((stateCode) => (
            <option key={stateCode} value={stateCode}>
              {stateNames[stateCode]?.[locale]} ({stateCode})
            </option>
          ))}
        </select>
      </label>
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

function SelectField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="he-text-secondary text-sm font-medium">
      <span className="mb-1 block">{label}</span>
      {children}
    </div>
  );
}

function formatStateCount(count: number, text: ExplorerCopy): string {
  return count === 1 ? text.oneStateSelected : `${count} ${text.statesSelected}`;
}
