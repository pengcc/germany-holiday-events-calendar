import type { StateCode } from "@hsg/data-core/schemas";
import type { ExplorerSearch, HolidayLayer } from "./explorer-search";
import type { ExplorerCopy, Locale } from "./i18n";
import { stateNames } from "./i18n";

interface ActiveFilterSummaryInput {
  locale: Locale;
  search: ExplorerSearch;
  selectedLayers: readonly HolidayLayer[];
  selectedStates: readonly StateCode[];
  text: ExplorerCopy;
  year: number;
}

export function formatActiveFilterSummary({
  locale,
  search,
  selectedLayers,
  selectedStates,
  text,
  year,
}: ActiveFilterSummaryInput): string {
  return [
    formatView(search, text),
    formatStates(search, selectedStates, locale, text),
    formatPeriod(search, year, locale),
    selectedLayers.map((layer) => (layer === "public" ? text.public : text.school)).join(" + "),
  ].join(" · ");
}

function formatView(search: ExplorerSearch, text: ExplorerCopy): string {
  return search.view === "state"
    ? text.stateView
    : search.view === "nationwide"
      ? text.nationwideView
      : text.compareView;
}

function formatStates(
  search: ExplorerSearch,
  selectedStates: readonly StateCode[],
  locale: Locale,
  text: ExplorerCopy,
): string {
  if (search.view === "nationwide") {
    return text.allStatesSummary;
  }
  if (search.view === "state") {
    const stateCode = selectedStates[0];
    return stateCode
      ? `${stateNames[stateCode]?.[locale] ?? stateCode} (${shortStateCode(stateCode)})`
      : `0 ${text.statesSelected}`;
  }
  if (selectedStates.length === 0) {
    return `0 ${text.statesSelected}`;
  }
  const visibleStates = selectedStates.slice(0, 3).map(shortStateCode).join(", ");
  const remainder = selectedStates.length - 3;
  return remainder > 0 ? `${visibleStates} +${remainder}` : visibleStates;
}

function formatPeriod(search: ExplorerSearch, year: number, locale: Locale): string {
  if (search.period === "quarter") {
    return `Q${search.quarter ?? 1} ${year}`;
  }
  if (search.period === "month") {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }).format(new Date(Date.UTC(year, (search.month ?? 1) - 1, 1)));
  }
  return String(year);
}

function shortStateCode(stateCode: StateCode): string {
  return stateCode.slice(3);
}
