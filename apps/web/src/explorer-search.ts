import { type StateCode, StateCodeSchema, stateCodes } from "@hsg/data-core/schemas";
import { parseDate } from "@internationalized/date";

export const periodModes = ["year", "quarter", "month"] as const;
export type PeriodMode = (typeof periodModes)[number];

export const regionModes = ["all", "single", "multiple"] as const;
export type RegionMode = (typeof regionModes)[number];

export const holidayLayers = ["public", "school"] as const;
export type HolidayLayer = (typeof holidayLayers)[number];

export interface ExplorerSearch {
  year?: number;
  period: PeriodMode;
  quarter?: number;
  month?: number;
  region: RegionMode;
  states?: string;
  layers: string;
  date?: string;
}

const defaultSingleState = stateCodes[0];
const defaultMultipleStates = stateCodes.slice(0, 2);

export function parseExplorerSearch(search: Record<string, unknown>): ExplorerSearch {
  const period = parseEnum(search.period, periodModes) ?? "year";
  const region = parseEnum(search.region, regionModes) ?? "all";
  const year = parseBoundedInteger(search.year, 2000, 2200);
  const quarter =
    period === "quarter" ? (parseBoundedInteger(search.quarter, 1, 4) ?? 1) : undefined;
  const month = period === "month" ? (parseBoundedInteger(search.month, 1, 12) ?? 1) : undefined;
  const selectedStates = normalizeStates(search.states);
  const states = normalizeRegionStates(region, selectedStates);
  const layers = normalizeLayers(search.layers);
  const date = normalizeDate(search.date, { year, period, quarter, month });

  return {
    year,
    period,
    quarter,
    month,
    region,
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
  return search.region === "all"
    ? [...stateCodes]
    : normalizeRegionStates(search.region, normalizeStates(search.states));
}

export function getSelectedLayers(search: ExplorerSearch): HolidayLayer[] {
  return normalizeLayers(search.layers);
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

function normalizeRegionStates(region: RegionMode, selectedStates: StateCode[]): StateCode[] {
  if (region === "all") {
    return [];
  }
  if (region === "single") {
    return [selectedStates[0] ?? defaultSingleState];
  }

  const multipleStates = [...selectedStates];
  for (const stateCode of defaultMultipleStates) {
    if (multipleStates.length >= 2) {
      break;
    }
    if (!multipleStates.includes(stateCode)) {
      multipleStates.push(stateCode);
    }
  }
  return multipleStates.sort();
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
