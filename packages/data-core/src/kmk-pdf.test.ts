import { describe, expect, it } from "vitest";
import { normalizeKmkPositionedText, parseGermanDateRanges } from "./kmk-pdf";
import { type SourceManifest, stateCodes } from "./schemas";

describe("KMK PDF normalization", () => {
  it("parses single dates, ranges, and ranges crossing New Year", () => {
    expect(parseGermanDateRanges("23.12. - 09.01.", 2026)).toEqual([
      { startDate: "2026-12-23", endDate: "2027-01-09" },
    ]);
    expect(parseGermanDateRanges("25.03. 30.03. - 03.04.", 2027)).toEqual([
      { startDate: "2027-03-25", endDate: "2027-03-25" },
      { startDate: "2027-03-30", endDate: "2027-04-03" },
    ]);
  });

  it("reconstructs a state row from positioned table text", () => {
    const labels = stateCodes.map((jurisdiction, index) => ({
      str: stateLabel(jurisdiction),
      x: 62,
      y: 500 - index * 20,
    }));
    const result = normalizeKmkPositionedText(
      [
        ...labels,
        { str: "26.10. - 30.10.", x: 193, y: 500 },
        { str: "31.10.", x: 207, y: 495 },
        { str: "23.12. - 09.01.", x: 283, y: 500 },
        { str: "29.07. - 11.09.", x: 643, y: 500 },
      ],
      source,
    );

    expect(result.issues).toEqual([]);
    expect(result.records.map((record) => [record.startDate, record.endDate])).toEqual([
      ["2026-10-26", "2026-10-30"],
      ["2026-10-31", "2026-10-31"],
      ["2026-12-23", "2027-01-09"],
      ["2027-07-29", "2027-09-11"],
    ]);
  });

  it("blocks a table that does not contain all state rows", () => {
    const result = normalizeKmkPositionedText(
      [{ str: "Baden-Württemberg", x: 62, y: 500 }],
      source,
    );
    expect(result.issues[0]?.code).toBe("KMK_PDF_STATE_ROWS_INVALID");
  });
});

const source: SourceManifest = {
  schemaVersion: 1,
  id: "kmk-pdf-de-bw-2026-27",
  name: "KMK PDF test",
  authority: "official",
  category: "school",
  jurisdiction: "DE-BW",
  documentId: "kmk-pdf-2026-27",
  homepageUrl: "https://www.kmk.org/service/ferienregelung.html",
  fetchUrl: "https://www.kmk.org/FER2026_27.pdf",
  format: "pdf",
  adapter: "kmk-pdf",
  enabled: true,
  period: {
    kind: "schoolYear",
    id: "2026-27",
    startDate: "2026-08-01",
    endDate: "2027-09-30",
  },
  license: { note: "Test", redistribution: "unknown" },
  fetch: {
    expectedContentTypes: ["application/pdf"],
    allowedHosts: ["www.kmk.org"],
    timeoutMs: 1_000,
    maxBytes: 10_000_000,
    maxRedirects: 1,
  },
  freshness: { retrievalCadenceDays: 90, reviewBy: "2027-12-31" },
};

function stateLabel(jurisdiction: (typeof stateCodes)[number]): string {
  return {
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
  }[jurisdiction];
}
