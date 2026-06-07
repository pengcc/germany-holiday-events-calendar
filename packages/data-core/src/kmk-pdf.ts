import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { HolidayRecord, SourceManifest, StateCode, ValidationIssue } from "./schemas";

interface PositionedText {
  str: string;
  x: number;
  y: number;
}

const stateLabels: Record<StateCode, string> = {
  "DE-BW": "Baden-Württemberg",
  "DE-BY": "Bayern",
  "DE-BE": "Berlin",
  "DE-BB": "Brandenburg",
  "DE-HB": "Bremen",
  "DE-HH": "Hamburg",
  "DE-HE": "Hessen",
  "DE-MV": "Mecklenburg-Vorpommern",
  "DE-NI": "Niedersachsen",
  "DE-NW": "Nordrhein-Westfalen",
  "DE-RP": "Rheinland-Pfalz",
  "DE-SL": "Saarland",
  "DE-SN": "Sachsen",
  "DE-ST": "Sachsen-Anhalt",
  "DE-SH": "Schleswig-Holstein",
  "DE-TH": "Thüringen",
};

const columns = [
  {
    key: "autumn",
    minX: 170,
    maxX: 260,
    year: "start",
    names: { de: "Herbstferien", en: "Autumn holidays", zh: "秋假" },
  },
  {
    key: "christmas",
    minX: 260,
    maxX: 350,
    year: "start",
    names: { de: "Weihnachtsferien", en: "Christmas holidays", zh: "圣诞假期" },
  },
  {
    key: "winter",
    minX: 350,
    maxX: 440,
    year: "end",
    names: { de: "Winterferien", en: "Winter holidays", zh: "寒假" },
  },
  {
    key: "easter",
    minX: 440,
    maxX: 530,
    year: "end",
    names: { de: "Oster-/Frühjahrsferien", en: "Easter or spring holidays", zh: "复活节或春假" },
  },
  {
    key: "pentecost",
    minX: 530,
    maxX: 625,
    year: "end",
    names: {
      de: "Himmelfahrts-/Pfingstferien",
      en: "Ascension or Pentecost holidays",
      zh: "升天节或圣灵降临节假期",
    },
  },
  {
    key: "summer",
    minX: 625,
    maxX: 730,
    year: "end",
    names: { de: "Sommerferien", en: "Summer holidays", zh: "暑假" },
  },
] as const;

export async function normalizeKmkPdf(
  bytes: Uint8Array,
  source: SourceManifest,
): Promise<{ records: HolidayRecord[]; issues: ValidationIssue[] }> {
  const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise;
  const positioned: PositionedText[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) {
        continue;
      }
      positioned.push({
        str: item.str.trim(),
        x: item.transform[4],
        y: item.transform[5] - pageNumber * 1_000,
      });
    }
  }
  return normalizeKmkPositionedText(positioned, source);
}

export function normalizeKmkPositionedText(
  positioned: PositionedText[],
  source: SourceManifest,
): { records: HolidayRecord[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const labels = Object.entries(stateLabels)
    .map(([jurisdiction, label]) => ({
      jurisdiction: jurisdiction as StateCode,
      item: positioned.find(
        (candidate) =>
          candidate.x < 170 && normalizeStateLabel(candidate.str) === normalizeStateLabel(label),
      ),
    }))
    .filter((value): value is { jurisdiction: StateCode; item: PositionedText } =>
      Boolean(value.item),
    )
    .sort((left, right) => right.item.y - left.item.y);

  const selected = labels.find((label) => label.jurisdiction === source.jurisdiction);
  if (!selected || labels.length !== 16) {
    issues.push({
      code: "KMK_PDF_STATE_ROWS_INVALID",
      severity: "blocker",
      stage: "normalized",
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      periodId: source.period.id,
      message: "The KMK PDF state table could not be reconstructed reliably.",
      expected: "All 16 German state rows",
      actual: `${labels.length} recognized state rows`,
      suggestedAction: "Inspect the PDF layout and update the coordinate adapter before review.",
      decisionRequired: false,
    });
    return { records: [], issues };
  }

  const selectedIndex = labels.indexOf(selected);
  const previous = labels[selectedIndex - 1];
  const next = labels[selectedIndex + 1];
  const upper =
    selectedIndex === 0
      ? selected.item.y + 12
      : ((previous?.item.y ?? selected.item.y + 12) + selected.item.y) / 2;
  const lower =
    selectedIndex === labels.length - 1
      ? selected.item.y - 12
      : (selected.item.y + (next?.item.y ?? selected.item.y - 12)) / 2;
  const rowItems = positioned.filter((item) => item.y < upper && item.y > lower && item.x >= 170);
  const [startYear, endYear] = schoolYears(source.period.id);
  const records: HolidayRecord[] = [];

  for (const column of columns) {
    const text = rowItems
      .filter((item) => item.x >= column.minX && item.x < column.maxX)
      .sort((left, right) => right.y - left.y || left.x - right.x)
      .map((item) => item.str)
      .join(" ");
    if (!text || /^-+$/.test(text.replaceAll(/\s/g, ""))) {
      continue;
    }
    const ranges = parseGermanDateRanges(text, column.year === "start" ? startYear : endYear);
    if (ranges.length === 0) {
      issues.push({
        code: "KMK_PDF_CELL_UNPARSED",
        severity: "blocker",
        stage: "normalized",
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        periodId: source.period.id,
        recordId: column.key,
        message: `The ${column.key} holiday cell contains an unsupported date format.`,
        actual: text,
        suggestedAction: "Inspect the positioned PDF text and extend the reviewed parser rule.",
        decisionRequired: false,
      });
      continue;
    }
    for (const [index, range] of ranges.entries()) {
      records.push({
        schemaVersion: 1,
        id: `${source.id}:${column.key}:${range.startDate}:${index + 1}`,
        jurisdiction: source.jurisdiction,
        category: "school",
        scope: "statewide",
        regions: [],
        startDate: range.startDate,
        endDate: range.endDate,
        names: column.names,
        periodId: source.period.id,
        source: {
          sourceId: source.id,
          sourceEventId: `${column.key}-${index + 1}`,
        },
      });
    }
  }

  return {
    records: records.sort(
      (left, right) =>
        left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id),
    ),
    issues,
  };
}

export function parseGermanDateRanges(
  text: string,
  defaultYear: number,
): Array<{ startDate: string; endDate: string }> {
  const ranges: Array<{ startDate: string; endDate: string }> = [];
  const expression = /(\d{2})\.(\d{2})\.\s*(?:-\s*(\d{2})\.(\d{2})\.)?/g;
  for (const match of text.matchAll(expression)) {
    const startMonth = Number(match[2]);
    const endMonth = Number(match[4] ?? match[2]);
    const startDate = formatDate(defaultYear, startMonth, Number(match[1]));
    const endYear = endMonth < startMonth ? defaultYear + 1 : defaultYear;
    const endDate = formatDate(endYear, endMonth, Number(match[3] ?? match[1]));
    ranges.push({ startDate, endDate });
  }
  return ranges;
}

function normalizeStateLabel(value: string): string {
  return value
    .replace(/\s*[¹²³⁴⁵⁶⁷⁸⁹⁰]+\s*$/, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();
}

function schoolYears(periodId: string): [number, number] {
  const match = /^(\d{4})-(\d{2})$/.exec(periodId);
  if (!match) {
    throw new Error(`Unsupported school-year period ID: ${periodId}`);
  }
  const startYear = match[1];
  const endYear = match[2];
  return [Number(startYear), Number(`${startYear.slice(0, 2)}${endYear}`)];
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
