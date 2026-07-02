import { type StateCode, StateCodeSchema, stateCodes } from "@hsg/data-core/schemas";
import { parseDate } from "@internationalized/date";

export const periodModes = ["year", "quarter", "month"] as const;
export type PeriodMode = (typeof periodModes)[number];

export const viewModes = ["state", "nationwide", "compare"] as const;
export type ViewMode = (typeof viewModes)[number];

const legacyRegionModes = ["all", "single", "multiple"] as const;
type LegacyRegionMode = (typeof legacyRegionModes)[number];

export const holidayLayers = ["public", "school"] as const;
export type HolidayLayer = (typeof holidayLayers)[number];

export interface ExplorerSearch {
  year?: number;
  period: PeriodMode;
  quarter?: number;
  month?: number;
  view: ViewMode;
  states?: string;
  layers: string;
  date?: string;
}

const defaultSingleState: StateCode = "DE-BE";
export function parseExplorerSearch(search: Record<string, unknown>): ExplorerSearch {
  const period = parseEnum(search.period, periodModes) ?? "year";
  const view =
    parseEnum(search.view, viewModes) ??
    mapLegacyRegion(parseEnum(search.region, legacyRegionModes)) ??
    "state";
  const year = parseBoundedInteger(search.year, 2000, 2200);
  const quarter =
    period === "quarter" ? (parseBoundedInteger(search.quarter, 1, 4) ?? 1) : undefined;
  const month = period === "month" ? (parseBoundedInteger(search.month, 1, 12) ?? 1) : undefined;
  const selectedStates = normalizeStates(search.states);
  const states = normalizeViewStates(view, selectedStates);
  const layers = view === "nationwide" ? ["public"] : normalizeLayers(search.layers);
  const date = normalizeDate(search.date, { year, period, quarter, month });

  return {
    year,
    period,
    quarter,
    month,
    view,
    states: states.length > 0 ? states.join(",") : undefined,
    layers: layers.join(","),
    date,
  };
}

export function updateExplorerSearch(
  current: ExplorerSearch,
  updates: Partial<Record<keyof ExplorerSearch, unknown>>,
): ExplorerSearch {
  return parseExplorerSearch({ ...current, ...updates });
}

export function getSelectedStates(search: ExplorerSearch): StateCode[] {
  return search.view === "nationwide"
    ? [...stateCodes]
    : normalizeViewStates(search.view, normalizeStates(search.states));
}

export function getSelectedLayers(search: ExplorerSearch): HolidayLayer[] {
  return search.view === "nationwide" ? ["public"] : normalizeLayers(search.layers);
}

export function isComparisonValid(search: ExplorerSearch): boolean {
  return search.view !== "compare" || getSelectedStates(search).length >= 2;
}

export function getVisibleMonths(search: ExplorerSearch): number[] {
  if (search.period === "month") {
    return [search.month ?? 1];
  }
  if (search.period === "quarter") {
    const firstMonth = ((search.quarter ?? 1) - 1) * 3 + 1;
    return [firstMonth, firstMonth + 1, firstMonth + 2];
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

export function searchValuesEqual(left: ExplorerSearch, right: ExplorerSearch): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeViewStates(view: ViewMode, selectedStates: StateCode[]): StateCode[] {
  if (view === "nationwide") {
    return [];
  }
  if (view === "state") {
    return [selectedStates[0] ?? defaultSingleState];
  }
  return [...selectedStates].sort();
}

function mapLegacyRegion(region: LegacyRegionMode | undefined): ViewMode | undefined {
  return region === "single"
    ? "state"
    : region === "all"
      ? "nationwide"
      : region === "multiple"
        ? "compare"
        : undefined;
}

function normalizeStates(value: unknown): StateCode[] {
  return parseList(value)
    .map((item) => StateCodeSchema.safeParse(item))
    .filter((result): result is { success: true; data: StateCode } => result.success)
    .map((result) => result.data)
    .filter((item, index, items) => items.indexOf(item) === index)
    .sort();
}

function normalizeLayers(value: unknown): HolidayLayer[] {
  const validLayers = parseList(value)
    .filter((item): item is HolidayLayer => holidayLayers.some((layer) => layer === item))
    .filter((item, index, items) => items.indexOf(item) === index);
  return validLayers.length > 0
    ? holidayLayers.filter((layer) => validLayers.includes(layer))
    : [...holidayLayers];
}

function parseList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDate(
  value: unknown,
  period: Pick<ExplorerSearch, "year" | "period" | "quarter" | "month">,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    parseDate(value);
  } catch {
    return undefined;
  }

  if (period.year !== undefined && Number(value.slice(0, 4)) !== period.year) {
    return undefined;
  }
  const dateMonth = Number(value.slice(5, 7));
  if (period.period === "month" && dateMonth !== period.month) {
    return undefined;
  }
  if (period.period === "quarter") {
    const firstMonth = ((period.quarter ?? 1) - 1) * 3 + 1;
    if (dateMonth < firstMonth || dateMonth > firstMonth + 2) {
      return undefined;
    }
  }
  return value;
}

function parseBoundedInteger(value: unknown, minimum: number, maximum: number): number | undefined {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

function parseEnum<const T extends readonly string[]>(
  value: unknown,
  values: T,
): T[number] | undefined {
  return typeof value === "string" && values.some((item) => item === value)
    ? (value as T[number])
    : undefined;
}
