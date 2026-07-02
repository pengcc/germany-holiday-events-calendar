import { describe, expect, it } from "vitest";
import {
  getSelectedLayers,
  getSelectedStates,
  parseExplorerSearch,
} from "../../apps/web/src/explorer-search";
import { formatActiveFilterSummary } from "../../apps/web/src/filter-summary";
import { copy, type Locale } from "../../apps/web/src/i18n";

function format(locale: Locale, values: Record<string, unknown>, year = 2026): string {
  const search = parseExplorerSearch(values);
  return formatActiveFilterSummary({
    locale,
    search,
    selectedLayers: getSelectedLayers(search),
    selectedStates: getSelectedStates(search),
    text: copy[locale],
    year,
  });
}

describe("active filter summary", () => {
  it("summarizes the default state, year, and both layers", () => {
    expect(format("en", {})).toBe(
      "One federal state · Berlin (BE) · 2026 · Public holiday + School holiday",
    );
  });

  it("summarizes nationwide mode as all states and public only", () => {
    expect(format("de", { view: "nationwide", layers: "school" })).toBe(
      "Bundesweit gemeinsame Feiertage · Alle 16 Bundesländer · 2026 · Feiertag",
    );
  });

  it("summarizes compare state codes and quarter", () => {
    expect(
      format("en", {
        view: "compare",
        states: "DE-BE,DE-BB",
        period: "quarter",
        quarter: 2,
      }),
    ).toBe("Compare federal states · BB, BE · Q2 2026 · Public holiday + School holiday");
  });

  it("summarizes invalid and long compare selections concisely", () => {
    expect(format("en", { view: "compare", states: "" })).toContain("0 states selected");
    expect(
      format("en", {
        view: "compare",
        states: "DE-TH,DE-BY,DE-BE,DE-BB",
        layers: "school",
      }),
    ).toBe("Compare federal states · BB, BE, BY +1 · 2026 · School holiday");
  });

  it("uses localized state names and month formatting", () => {
    expect(
      format("zh", {
        view: "state",
        states: "DE-BE",
        period: "month",
        month: 8,
      }),
    ).toBe("一个联邦州 · 柏林州 (BE) · 2026年8月 · 公共假日 + 学校假期");
  });
});
