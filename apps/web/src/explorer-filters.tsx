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

const selectClasses =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";

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
        <p className="mt-1 text-sm leading-5 text-slate-600">{text.filterHelp}</p>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-slate-700">{text.viewMode}</legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">{text.viewModeHelp}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {viewModes.map((mode) => (
            <label
              key={mode}
              className={cn(
                "flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                search.view === mode
                  ? "border-sky-700 bg-sky-50 text-sky-950"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              <input
                checked={search.view === mode}
                className="size-4 shrink-0 accent-sky-800"
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
        <legend className="text-sm font-semibold text-slate-700">{text.layers}</legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">{text.layerHelp}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          {holidayLayers.map((layer) => {
            const selected = selectedLayers.includes(layer);
            const unavailable = search.view === "nationwide" && layer === "school";
            return (
              <label
                key={layer}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2",
                  selected
                    ? "border-sky-700 bg-sky-50 text-sky-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                <input
                  checked={selected}
                  className="size-4 shrink-0 accent-sky-800"
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
          <p className="mt-2 text-xs leading-5 text-slate-500">{text.nationwidePublicOnly}</p>
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
      <section className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
        <h3 className="text-sm font-semibold text-slate-700">{text.selectStates}</h3>
        <p className="mt-1 text-sm text-slate-600">{text.allStatesIncluded}</p>
      </section>
    );
  }

  if (view === "state") {
    return (
      <label className="mt-5 block text-sm font-semibold text-slate-700">
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
      <h3 className="text-sm font-semibold text-slate-700">{text.selectStates}</h3>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={text.selectedStatesLabel}>
        {selectedStates.slice(0, 3).map((stateCode) => (
          <li
            key={stateCode}
            className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-950"
          >
            {stateCode.slice(3)}
          </li>
        ))}
        {selectedStates.length > 3 ? (
          <li className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
            +{selectedStates.length - 3}
          </li>
        ) : null}
      </ul>
      {selectedStates.length < 2 ? (
        <p
          className="mt-2 border-l-4 border-amber-500 bg-amber-50 p-2 text-xs leading-5 text-amber-950"
          role="alert"
        >
          {text.compareValidation}
        </p>
      ) : null}
      <details className="mt-2 rounded-md border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
          {text.chooseStates} · {formatStateCount(selectedStates.length, text)}
        </summary>
        <div className="border-t border-slate-200 p-3">
          <p className="mb-2 text-xs leading-5 text-slate-500">{text.minimumTwoStates}</p>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {stateCodes.map((stateCode) => {
              const selected = selectedStates.includes(stateCode);
              return (
                <label
                  key={stateCode}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <input
                    checked={selected}
                    className="size-4 shrink-0 accent-sky-800"
                    type="checkbox"
                    onChange={() => onChange(stateCode)}
                  />
                  <span className="min-w-0 flex-1">{stateNames[stateCode]?.[locale]}</span>
                  <span className="text-xs text-slate-500">{stateCode.slice(3)}</span>
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
    <div className="text-sm font-medium text-slate-600">
      <span className="mb-1 block">{label}</span>
      {children}
    </div>
  );
}

function formatStateCount(count: number, text: ExplorerCopy): string {
  return count === 1 ? text.oneStateSelected : `${count} ${text.statesSelected}`;
}
