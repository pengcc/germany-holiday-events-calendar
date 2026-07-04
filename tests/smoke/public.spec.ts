import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { stateCodes } from "../../packages/data-core/src/schemas";

const publicFixtureRoot = resolve("tests/fixtures/public");
const publicManifestFixture = JSON.parse(
  readFileSync(resolve(publicFixtureRoot, "manifest.json"), "utf8"),
) as Record<string, unknown>;
const desktopFilterBreakpoint = 1024;

async function expandMobileFilters(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? desktopFilterBreakpoint) >= desktopFilterBreakpoint) {
    return;
  }
  const disclosure = page.locator("details.he-filter-disclosure");
  if ((await disclosure.getAttribute("open")) === null) {
    await page.getByTestId("mobile-filter-summary").click();
  }
}

async function selectFilterOption(
  page: Page,
  label: string,
  option: string | RegExp,
): Promise<void> {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: typeof option === "string" }).click();
}

async function usePublishedDataFixture(page: Page): Promise<void> {
  await page.route("**/data/holidays.json", (route) =>
    route.fulfill({ path: resolve(publicFixtureRoot, "holidays.json") }),
  );
  await page.route("**/data/manifest.json", (route) =>
    route.fulfill({ path: resolve(publicFixtureRoot, "manifest.json") }),
  );
}

async function useMultiYearPublishedDataFixture(page: Page): Promise<void> {
  await page.route("**/data/holidays.json", (route) =>
    route.fulfill({ path: resolve(publicFixtureRoot, "holidays.json") }),
  );
  await page.route("**/data/manifest.json", (route) =>
    route.fulfill({
      body: JSON.stringify({ ...publicManifestFixture, targetYears: [2026, 2027] }),
      contentType: "application/json",
    }),
  );
}

async function expectDateDetailsPromptForViewport(page: Page): Promise<void> {
  const prompt = page.getByText("Select a date in the calendar to view details.");
  if ((page.viewportSize()?.width ?? 0) >= 1280) {
    await expect(prompt).toBeVisible();
    return;
  }
  await expect(prompt).toHaveCount(0);
}

async function useInvalidPublishedDataFixture(page: Page): Promise<void> {
  await page.route("**/data/holidays.json", (route) =>
    route.fulfill({
      body: JSON.stringify({ schemaVersion: 1, records: [{ invalid: true }] }),
      contentType: "application/json",
      status: 200,
    }),
  );
  await page.route("**/data/manifest.json", (route) =>
    route.fulfill({ path: resolve(publicFixtureRoot, "manifest.json") }),
  );
}

async function useNationwidePublishedDataFixture(page: Page): Promise<void> {
  const records = stateCodes.map((jurisdiction) => ({
    schemaVersion: 1,
    id: `public-${jurisdiction.toLowerCase()}-2026-common`,
    jurisdiction,
    category: "public",
    scope: "statewide",
    regions: [],
    startDate: "2026-05-01",
    endDate: "2026-05-01",
    names: { de: "Gemeinsamer Feiertag", en: "Common public holiday", zh: "共同公共假日" },
    periodId: "2026",
    source: { sourceId: `public-${jurisdiction.toLowerCase()}-2026` },
  }));
  await page.route("**/data/holidays.json", (route) =>
    route.fulfill({
      body: JSON.stringify({ schemaVersion: 1, records }),
      contentType: "application/json",
    }),
  );
  await page.route("**/data/manifest.json", (route) =>
    route.fulfill({
      body: JSON.stringify({
        schemaVersion: 1,
        datasetVersion: "fixture-nationwide-2026",
        generatedAt: "2026-07-02T00:00:00.000Z",
        recordsFile: "holidays.json",
        recordsSha256: "0".repeat(64),
        recordCount: records.length,
        targetYears: [2026],
        jurisdictions: stateCodes,
        categories: ["public"],
        regionalRecordCount: 0,
        coverageMatrix: [],
        coverage: [],
        warnings: [],
        overrideIds: [],
      }),
      contentType: "application/json",
    }),
  );
}

async function useAdvisoryVisualFixture(page: Page): Promise<void> {
  const records = [
    {
      schemaVersion: 1,
      id: "public-de-be-2026-regional",
      jurisdiction: "DE-BE",
      category: "public",
      scope: "regional",
      regions: ["Fixture municipality"],
      startDate: "2026-06-04",
      endDate: "2026-06-04",
      names: { de: "Regionaler Hinweis", en: "Regional advisory", zh: "地区提示" },
      periodId: "2026",
      source: { sourceId: "fixture-regional" },
    },
    {
      schemaVersion: 1,
      id: "public-de-be-2026-statewide",
      jurisdiction: "DE-BE",
      category: "public",
      scope: "statewide",
      regions: [],
      startDate: "2026-06-05",
      endDate: "2026-06-05",
      names: { de: "Landesweiter Feiertag", en: "Statewide holiday", zh: "全州公共假日" },
      periodId: "2026",
      source: { sourceId: "fixture-statewide" },
    },
  ];
  await page.route("**/data/holidays.json", (route) =>
    route.fulfill({
      body: JSON.stringify({ schemaVersion: 1, records }),
      contentType: "application/json",
    }),
  );
  await page.route("**/data/manifest.json", (route) =>
    route.fulfill({
      body: JSON.stringify({
        schemaVersion: 1,
        datasetVersion: "fixture-advisory-visual-2026",
        generatedAt: "2026-07-02T00:00:00.000Z",
        recordsFile: "holidays.json",
        recordsSha256: "0".repeat(64),
        recordCount: records.length,
        targetYears: [2026],
        jurisdictions: ["DE-BE"],
        categories: ["public"],
        regionalRecordCount: 1,
        coverageMatrix: [
          {
            jurisdiction: "DE-BE",
            year: 2026,
            category: "public",
            covered: true,
            sourceIds: ["fixture-statewide"],
          },
        ],
        coverage: [],
        warnings: [],
        overrideIds: [],
      }),
      contentType: "application/json",
    }),
  );
}

const localeExpectations = {
  zh: {
    appName: "德国假期与重要活动日历",
    title: "德国公共假日与学校假期",
    language: "语言",
    areaNavigation: "公共网站区域",
    activeArea: "假期日历",
    stateView: "一个联邦州",
    publicDayLegend: "浅橙：全州公共假日",
    schoolDayLegend: "浅青绿：学校假期",
    mixedDayLegend: "青绿底条：同时包含学校假期",
    selectedDateLegend: "深色描边：已选日期",
    regionalAdvisoryLegend: "部分地区适用提示",
  },
  de: {
    appName: "Germany Holiday & Events Calendar",
    title: "Feiertage und Schulferien vergleichen",
    language: "Sprache",
    areaNavigation: "Öffentliche Bereiche",
    activeArea: "Feiertage",
    stateView: "Ein Bundesland",
    publicDayLegend: "Hellorange: landesweiter Feiertag",
    schoolDayLegend: "Helltürkis: Schulferien",
    mixedDayLegend: "Türkiser Balken: zusätzlich Schulferien",
    selectedDateLegend: "Dunkle Umrandung: ausgewähltes Datum",
    regionalAdvisoryLegend: "Hinweis auf regionale Geltung",
  },
  en: {
    appName: "Germany Holiday & Events Calendar",
    title: "Compare public and school holidays",
    language: "Language",
    areaNavigation: "Public site areas",
    activeArea: "Holidays",
    stateView: "One federal state",
    publicDayLegend: "Light orange: statewide public holiday",
    schoolDayLegend: "Light teal: school holiday",
    mixedDayLegend: "Teal bar: also includes school holiday",
    selectedDateLegend: "Dark outline: selected date",
    regionalAdvisoryLegend: "Limited-applicability advisory",
  },
} as const;

for (const [locale, expected] of Object.entries(localeExpectations)) {
  test(`${locale} comparison route renders`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expandMobileFilters(page);
    await expect(page.getByRole("heading", { level: 1, name: expected.title })).toBeVisible();
    await expect(page.getByRole("navigation", { name: expected.language })).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: expected.areaNavigation })
        .getByRole("link", { name: expected.activeArea }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.locator("header")).toContainText(expected.appName);
    await expect(page.getByRole("radio", { name: expected.stateView })).toBeChecked();
    await expect(page.getByText(expected.publicDayLegend, { exact: true })).toBeVisible();
    await expect(page.getByText(expected.schoolDayLegend, { exact: true })).toBeVisible();
    await expect(page.getByText(expected.mixedDayLegend, { exact: true })).toBeVisible();
    await expect(page.getByText(expected.selectedDateLegend, { exact: true })).toBeVisible();
    await expect(page.getByText(expected.regionalAdvisoryLegend, { exact: true })).toBeVisible();
    await expect(page.getByText("Holiday Sync Germany")).toHaveCount(0);
    await expect(page.locator("main")).toContainText(/reviewed|审核|geprüft/i);
  });
}

test("validated explorer filters drive the visible period and survive locale navigation", async ({
  page,
}) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=quarter&quarter=2&region=multiple&states=DE-BE,DE-BB&layers=public,school&date=2026-05-01",
  );
  await expandMobileFilters(page);

  await expect(page.getByRole("radio", { name: "Compare federal states" })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Period", exact: true })).toHaveText("Quarter");
  await expect(page.getByRole("combobox", { name: "Quarter", exact: true })).toHaveText("Q2");
  await expect(page.getByText("2 states selected")).toBeVisible();
  await expect(page.getByRole("region", { name: "April 2026" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "May 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "June 2026" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "July 2026" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Holiday details" })).toContainText("Labour Day");
  await expect(page.getByText("Data coverage is incomplete for this selection")).toBeVisible();

  await page.getByRole("link", { name: "de", exact: true }).click();
  await expect(page).toHaveURL(/\/de\?/);
  const localizedSearch = new URL(page.url()).searchParams;
  expect(localizedSearch.get("view")).toBe("compare");
  expect(localizedSearch.has("region")).toBe(false);
  expect(localizedSearch.get("states")).toBe("DE-BB,DE-BE");
  expect(localizedSearch.get("date")).toBe("2026-05-01");
  await expect(page.getByRole("region", { name: "Feiertagsdetails" })).toContainText(
    "Tag der Arbeit",
  );
});

test("view mode and period controls update the route-backed calendar", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026");
  await expandMobileFilters(page);

  await expect(page.getByRole("radio", { name: "One federal state" })).toBeChecked();
  await expect(page.getByLabel("Federal state", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Nationwide common public holidays" }).check();
  await expect(
    page.getByText("All 16 federal states are included; no individual selection is needed."),
  ).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "School holiday" })).toBeDisabled();
  await page.getByRole("radio", { name: "Compare federal states" }).check();
  await expect(page.getByText("Choose states · 0 states selected", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Select at least two federal states to show comparison results."),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "January 2026" })).toBeVisible();
  await expect(page.getByText(/No comparable holiday results match/)).toHaveCount(0);

  await selectFilterOption(page, "Period", "Month");
  await selectFilterOption(page, "Month", "July");
  await expect(page.getByRole("region", { name: "July 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "June 2026" })).toHaveCount(0);

  await selectFilterOption(page, "Period", "Year");
  await expect(page.getByRole("region", { name: "January 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "December 2026" })).toBeVisible();
});

test("desktop year view keeps month cards readable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026&period=year&region=single&states=DE-BE&layers=public,school");

  const may = page.getByRole("region", { name: "May 2026" });
  const july = page.getByRole("region", { name: "July 2026" });
  const mayBox = await may.boundingBox();
  const julyBox = await july.boundingBox();

  await expect(page.getByRole("region", { name: "January 2026" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "June 2026" })).toHaveCount(0);
  expect(mayBox?.width).toBeGreaterThanOrEqual(340);
  expect(julyBox?.width).toBeGreaterThanOrEqual(340);
  expect(julyBox?.y).toBe(mayBox?.y);
});

test("invalid explorer filters are replaced with safe canonical values", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=invalid&period=month&month=99&region=multiple&states=invalid&layers=events&date=invalid",
  );

  await expect(page).toHaveURL(/year=2026/);
  const search = new URL(page.url()).searchParams;
  expect(search.get("period")).toBe("month");
  expect(search.get("month")).toBe("1");
  expect(search.get("view")).toBe("compare");
  expect(search.has("states")).toBe(false);
  expect(search.get("layers")).toBe("public,school");
  expect(search.has("date")).toBe(false);
});

test("visible dates update the URL and recover populated and empty details", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=month&month=5&region=multiple&states=DE-BE,DE-BB&layers=public,school",
  );

  const mayFirst = page.getByRole("button", { name: /May 1, 2026/ });
  await expect(mayFirst).toHaveAttribute("data-calendar-state", "public-school");
  await expect(mayFirst.locator("[data-holiday-marker]")).toHaveCount(0);
  await expect(mayFirst).toContainText("2/2");
  await mayFirst.click();

  await expect(page).toHaveURL(/date=2026-05-01/);
  await expect(mayFirst).toHaveAttribute("aria-pressed", "true");
  await expect(mayFirst).toHaveAttribute("data-selected", "true");
  const details = page.getByRole("region", { name: "Holiday details" });
  await expect(details).toContainText("Labour Day");
  await expect(details).toContainText("School-specific closure");
  await expect(details).toContainText("School-specific: Fixture schools");
  await expect(details).toContainText("May 1, 2026 – May 2, 2026");
  await expect(details).toContainText("public-de-be-2026");
  await expect(details).toContainText("school-de-be-2026-27 · fixture-school-closure");

  await page.reload();
  await expect(page.getByRole("button", { name: /May 1, 2026/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("region", { name: "Holiday details" })).toContainText("Labour Day");

  const mayThird = page.getByRole("button", { name: /May 3, 2026/ });
  await mayThird.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/date=2026-05-03/);
  await expect(details).toContainText(
    "No published holiday records match the current filters on this date.",
  );
});

test("date selection preserves SPA scroll and focus context", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026&period=year&view=compare&states=DE-BE,DE-BB&layers=public,school");

  const julyNinth = page.getByRole("button", { name: /July 9, 2026/ });
  await julyNinth.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    document.documentElement.dataset.dateSelectionSentinel = "present";
  });
  const scrollBeforeSelection = await page.evaluate(() => window.scrollY);

  await julyNinth.click();

  await expect(page).toHaveURL(/date=2026-07-09/);
  await expect(julyNinth).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.dataset.dateSelectionSentinel)).toBe(
    "present",
  );
  const scrollAfterSelection = await page.evaluate(() => window.scrollY);
  expect(Math.abs(scrollAfterSelection - scrollBeforeSelection)).toBeLessThanOrEqual(1);
});

test("mobile and tablet details follow the selected month without duplication", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026&period=year&view=compare&states=DE-BE,DE-BB&layers=public,school");

  const details = page.getByRole("region", { name: "Holiday details" });
  const may = page.getByRole("region", { name: "May 2026" });
  const july = page.getByRole("region", { name: "July 2026" });
  await expect(details).toHaveCount(0);

  await page.getByRole("button", { name: /May 1, 2026/ }).click();
  await expect(details).toHaveCount(1);
  await expect(may.locator("xpath=following-sibling::*[1]")).toHaveClass(/he-inline-date-details/);
  await expect(may.locator("xpath=following-sibling::*[1]")).toContainText("Labour Day");
  await expect(july.locator("xpath=preceding-sibling::*[1]")).toHaveClass(/he-inline-date-details/);

  await page.setViewportSize({ width: 768, height: 900 });
  await expect(details).toHaveCount(1);
  await expect(may.locator("xpath=following-sibling::*[1]")).toHaveClass(/he-inline-date-details/);

  await page.getByRole("button", { name: /July 9, 2026/ }).click();
  await expect(details).toHaveCount(1);
  await expect(july.locator("xpath=following-sibling::*[1]")).toHaveClass(/he-inline-date-details/);
  await expect(july.locator("xpath=following-sibling::*[1]")).toContainText("Summer holidays");
  await expect(may.locator("xpath=following-sibling::*[1]")).not.toHaveClass(
    /he-inline-date-details/,
  );
});

test("xl keeps one sticky details panel and date buttons expose interaction affordances", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026&period=year&view=compare&states=DE-BE,DE-BB&layers=public,school");

  const details = page.getByRole("region", { name: "Holiday details" });
  const mayFirst = page.getByRole("button", { name: /May 1, 2026/ });
  const mayThird = page.getByRole("button", { name: /May 3, 2026/ });
  await expect(details).toHaveCount(1);
  await expect(details).toContainText("Select a date in the calendar to view details.");
  await expect(details).toHaveCSS("position", "sticky");
  expect((await details.boundingBox())?.x).toBeGreaterThan((await mayFirst.boundingBox())?.x ?? 0);

  await expect(mayThird).toHaveCSS("cursor", "pointer");
  const restingShadow = await mayThird.evaluate((element) => getComputedStyle(element).boxShadow);
  await mayThird.hover();
  const hoverShadow = await mayThird.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(hoverShadow).not.toBe(restingShadow);
  await mayThird.focus();
  await expect(mayThird).toHaveCSS("outline-style", "solid");

  await mayFirst.click();
  await expect(details).toHaveCount(1);
  await expect(details).toContainText("Labour Day");
});

test("regional public holidays stay advisory-only in state, compare, and nationwide views", async ({
  page,
}) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=month&month=6&region=single&states=DE-BE&layers=public&date=2026-06-04",
  );

  await expect(page.getByRole("region", { name: "June 2026" })).toHaveCount(0);
  await expect(
    page.getByText(
      "No holiday results match the selected federal state, holiday types, and period.",
    ),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/date=2026-06-04/);

  await page.goto(
    "/en?year=2026&period=month&month=5&region=multiple&states=DE-BE,DE-BB&layers=public",
  );
  const mixedDate = page.getByRole("button", { name: /May 1, 2026/ });
  await expect(mixedDate).toHaveAttribute("data-calendar-state", "public");
  await expect(mixedDate.locator("[data-holiday-marker]")).toHaveCount(0);
  await expect(mixedDate.locator('[data-regional-advisory-marker="true"]')).toBeVisible();
  await expect(mixedDate).toContainText("2/2");
  await mixedDate.click();
  const details = page.getByRole("region", { name: "Holiday details" });
  await expect(details).toContainText("Labour Day");
  await expect(details).toContainText("Regional observance");
  await expect(details).not.toContainText("DE-BB-INTERNAL-REGION-TOKEN");

  await page.goto("/en?year=2026&period=month&month=6&view=nationwide");
  await expect(page.getByRole("region", { name: "June 2026" })).toHaveCount(0);
  await expect(
    page.getByText("No statewide public holiday is shared by all 16 federal states"),
  ).toBeVisible();
});

test("nationwide view keeps only months containing common statewide results", async ({ page }) => {
  await useNationwidePublishedDataFixture(page);
  await page.goto("/en?year=2026&period=year&view=nationwide");

  await expect(page.getByRole("region", { name: "May 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "April 2026" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "June 2026" })).toHaveCount(0);
  await expect(page.getByText(/No statewide public holiday is shared/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /May 1, 2026/ })).toHaveAccessibleName(
    /Public holiday/,
  );
});

test("valid compare filters result months, preserves warnings, and clears hidden dates", async ({
  page,
}) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=year&view=compare&states=DE-BE,DE-BB&layers=public,school&date=2026-06-04",
  );

  await expect(page.getByRole("region", { name: "May 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "July 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "June 2026" })).toHaveCount(0);
  await expect(page).not.toHaveURL(/date=2026-06-04/);
  await expectDateDetailsPromptForViewport(page);

  await page.goto(
    "/en?year=2026&period=month&month=2&view=compare&states=DE-BE,DE-BB&layers=public",
  );
  await expect(page.getByText("Data coverage is incomplete for this selection")).toBeVisible();
  await expect(
    page.getByText(
      "No comparable holiday results match the selected states, holiday types, and period.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "February 2026" })).toHaveCount(0);
});

test("dates outside the active period are ignored and layer and activity labels are explicit", async ({
  page,
}) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=month&month=7&region=multiple&states=DE-BE,DE-BB&layers=school&date=2026-05-01",
  );

  await expectDateDetailsPromptForViewport(page);
  const julyNinth = page.getByRole("button", { name: /July 9, 2026/ });
  await expect(julyNinth).toHaveAccessibleName(/School holiday/);
  await expect(julyNinth).toHaveAccessibleName(/Partial overlap/);
  await expect(julyNinth).toHaveAttribute("data-calendar-state", "school");
  await expect(julyNinth.locator("[data-holiday-marker]")).toHaveCount(0);
  await expect(julyNinth).toContainText("1/2");
  await julyNinth.click();
  const details = page.getByRole("region", { name: "Holiday details" });
  await expect(details).toContainText("Summer holidays");
  await expect(details).toContainText("July 9, 2026 – August 22, 2026");
  await expect(details).toContainText("Statewide");
  await expect(details).toContainText("school-de-be-2026-27");

  await page.goto("/en?year=2026&period=month&month=7&region=single&states=DE-BE&layers=school");
  await expect(page.getByRole("button", { name: /July 9, 2026/ })).not.toHaveAccessibleName(
    /overlap/i,
  );
  await expect(page.getByText(/Full overlap/)).toHaveCount(0);
  await expect(page.getByText(/Partial overlap/)).toHaveCount(0);
});

test("state selection stays compact and native controls have usable hit targets", async ({
  page,
}) => {
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026");
  await expandMobileFilters(page);

  await page.getByRole("radio", { name: "Compare federal states" }).check();
  const stateDisclosure = page.locator("summary").filter({ hasText: "Choose states" });
  await expect(stateDisclosure).toContainText("1 state selected");
  await expect(page.getByRole("checkbox", { name: /Berlin/ })).toBeHidden();

  await stateDisclosure.click();
  const berlin = page.getByRole("checkbox", { name: /Berlin/ });
  await berlin.uncheck();
  await expect(stateDisclosure).toContainText("0 states selected");
  await expect(
    page.getByText("Select at least two federal states to show comparison results."),
  ).toBeVisible();
  const badenWuerttemberg = page.getByRole("checkbox", { name: /Baden-Württemberg/ });
  await expect(badenWuerttemberg).toBeVisible();
  await badenWuerttemberg.check();
  await expect(badenWuerttemberg).toBeChecked();
  expect(new URL(page.url()).searchParams.get("states")).toContain("DE-BW");

  await stateDisclosure.click();
  await expect(badenWuerttemberg).toBeHidden();
  await expect(page.getByRole("heading", { name: "Holiday calendar" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("mobile filters stay collapsed, summarize changes, and preserve disclosure state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026&view=state&states=DE-BE&layers=public,school");

  const disclosure = page.locator("details.he-filter-disclosure");
  const summary = page.getByTestId("mobile-filter-summary");
  await expect(disclosure).not.toHaveAttribute("open", "");
  await expect(summary).toContainText("One federal state");
  await expect(summary).toContainText("Berlin (BE)");
  await expect(summary).toContainText("2026");
  await expect(summary).toContainText("Public holiday + School holiday");
  await expect(page.getByRole("radio", { name: "One federal state" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Holiday calendar" })).toBeVisible();

  await summary.click();
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(page.getByRole("radio", { name: "One federal state" })).toBeVisible();

  await selectFilterOption(page, "Federal state", "Brandenburg (DE-BB)");
  await selectFilterOption(page, "Period", "Quarter");
  await selectFilterOption(page, "Quarter", "Q2");
  await page.getByRole("checkbox", { name: "School holiday" }).uncheck();

  await expect(disclosure).toHaveAttribute("open", "");
  await expect(summary).toContainText("Brandenburg (BB)");
  await expect(summary).toContainText("Q2 2026");
  await expect(summary).toContainText("Public holiday");
  await expect(summary).not.toContainText("School holiday");
  const search = new URL(page.url()).searchParams;
  expect(search.get("states")).toBe("DE-BB");
  expect(search.get("period")).toBe("quarter");
  expect(search.get("quarter")).toBe("2");
  expect(search.get("layers")).toBe("public");

  await summary.press("Enter");
  await expect(disclosure).not.toHaveAttribute("open", "");
  await expect(page.getByRole("radio", { name: "One federal state" })).toBeHidden();
  await summary.press("Space");
  await expect(disclosure).toHaveAttribute("open", "");
  await summary.press("Enter");
  await expect(disclosure).not.toHaveAttribute("open", "");
});

test("mobile nationwide and compare summaries reflect canonical mode state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026&view=nationwide&layers=school");

  const summary = page.getByTestId("mobile-filter-summary");
  await expect(summary).toContainText("Nationwide common public holidays");
  await expect(summary).toContainText("All 16 federal states");
  await expect(summary).toContainText("Public holiday");
  await expect(summary).not.toContainText("School holiday");
  await summary.click();
  await expect(page.getByRole("checkbox", { name: "School holiday" })).toBeDisabled();

  await page.goto("/en?year=2026&view=compare&states=DE-BB");
  await expect(summary).toContainText("Compare federal states");
  await expect(summary).toContainText("BB");
  await summary.click();
  await expect(
    page.getByText("Select at least two federal states to show comparison results."),
  ).toBeVisible();

  await page.goto("/en?year=2026&view=compare&states=DE-BB,DE-BE,DE-BY,DE-TH");
  await expect(summary).toContainText("BB, BE, BY +1");
});

test("single-state select contains the 16-state list on a narrow mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026&view=state&states=DE-BE&layers=public,school");
  await page.getByTestId("mobile-filter-summary").click();

  const stateSelect = page.getByRole("combobox", { name: "Federal state", exact: true });
  await expect(stateSelect).toHaveAttribute("aria-expanded", "false");
  await stateSelect.click();

  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  await expect(page.locator("#filter-state")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("option")).toHaveCount(16);
  const contentBox = await listbox.locator("xpath=..").boundingBox();
  expect(contentBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((contentBox?.x ?? 0) + (contentBox?.width ?? 0)).toBeLessThanOrEqual(320);

  const thuringia = page.getByRole("option", { name: "Thuringia (DE-TH)", exact: true });
  await thuringia.scrollIntoViewIfNeeded();
  await thuringia.click();
  await expect(page).toHaveURL(/states=DE-TH/);
  await expect(stateSelect).toBeFocused();
  await expect(page.getByTestId("mobile-filter-summary")).toContainText("Thuringia (TH)");

  await stateSelect.click();
  await page.keyboard.press("Escape");
  await expect(listbox).toHaveCount(0);
  await expect(stateSelect).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("replacement selects expose keyboard, selected-state, and typeahead behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await useMultiYearPublishedDataFixture(page);
  await page.goto("/en?year=2026&view=state&states=DE-BE&layers=public,school");

  const yearSelect = page.getByRole("combobox", { name: "Year", exact: true });
  await yearSelect.focus();
  await yearSelect.press("Enter");
  const selectedYear = page.getByRole("option", { name: "2026", exact: true });
  await expect(selectedYear).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/year=2027/);
  await expect(yearSelect).toBeFocused();

  await yearSelect.press("Space");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(yearSelect).toBeFocused();

  const stateSelect = page.getByRole("combobox", { name: "Federal state", exact: true });
  await stateSelect.focus();
  await stateSelect.press("Enter");
  await page.keyboard.type("thu");
  const thuringia = page.getByRole("option", { name: "Thuringia (DE-TH)", exact: true });
  await expect(thuringia).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/states=DE-TH/);
  await expect(stateSelect).toBeFocused();
});

test("desktop filters remain visible while the mobile summary stays hidden", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en?year=2026");

  await expect(page.locator("details.he-filter-disclosure")).not.toHaveAttribute("open", "");
  await expect(page.getByTestId("mobile-filter-summary")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "One federal state" })).toBeVisible();
});

test("localized collapsed filters fit a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/zh?year=2026");

  const summary = page.getByTestId("mobile-filter-summary");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("筛选条件");
  await expect(summary).toContainText("一个联邦州");
  await expect(summary).toContainText("柏林州 (BE)");
  await expect(summary).toContainText("公共假日 + 学校假期");
  await expect(page.getByRole("radio", { name: "一个联邦州" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("layer and view changes preserve a visible selected date in URL state", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=month&month=5&region=multiple&states=DE-BE,DE-BB&layers=public,school",
  );
  await expandMobileFilters(page);

  await page.getByRole("button", { name: /May 1, 2026/ }).click();
  const publicLayer = page.getByRole("checkbox", { name: "Public holiday" });
  const schoolLayer = page.getByRole("checkbox", { name: "School holiday" });
  await schoolLayer.uncheck();

  let search = new URL(page.url()).searchParams;
  expect(search.get("date")).toBe("2026-05-01");
  expect(search.get("layers")).toBe("public");
  await expect(publicLayer).toBeDisabled();

  await page.getByRole("radio", { name: "One federal state" }).check();
  await selectFilterOption(page, "Federal state", "Berlin (DE-BE)");
  search = new URL(page.url()).searchParams;
  expect(search.get("date")).toBe("2026-05-01");
  expect(search.get("view")).toBe("state");
  expect(search.get("states")).toBe("DE-BE");
  await expect(page.getByRole("button", { name: /May 1, 2026/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await schoolLayer.check();
  expect(new URL(page.url()).searchParams.get("layers")).toBe("public,school");
});

test("invalid runtime JSON shows a localized unavailable state", async ({ page }) => {
  await useInvalidPublishedDataFixture(page);
  await page.goto("/de?year=2026");

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Ferientermine derzeit nicht verfügbar");
  await expect(alert).toContainText(
    "Die veröffentlichten Ferientermine konnten nicht geladen oder validiert werden.",
  );
  await expect(page.getByRole("region", { name: "Januar 2026" })).toHaveCount(0);
});

test("an empty state period hides the calendar and explains coverage", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026&period=month&month=2&region=single&states=DE-BE&layers=public");

  await expect(page.getByText("Data coverage is incomplete for this selection")).toBeVisible();
  await expect(
    page.getByText(
      "No holiday results match the selected federal state, holiday types, and period.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "February 2026" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Holiday details" })).toHaveCount(0);
});

test("advisory-only dates stay visually neutral and uncounted", async ({ page }) => {
  await useAdvisoryVisualFixture(page);
  await page.goto("/en?year=2026&period=month&month=6&view=state&states=DE-BE&layers=public");

  const advisoryDate = page.getByRole("button", { name: /June 4, 2026/ });
  await expect(advisoryDate).toHaveAttribute("data-calendar-state", "normal");
  await expect(advisoryDate.locator('[data-regional-advisory-marker="true"]')).toBeVisible();
  await expect(advisoryDate).toHaveAccessibleName(/Limited-applicability public holiday advisory/);
  await expect(advisoryDate).not.toContainText("1/1");

  const statewideDate = page.getByRole("button", { name: /June 5, 2026/ });
  await expect(statewideDate).toHaveAttribute("data-calendar-state", "public");
  await expect(statewideDate.locator('[data-regional-advisory-marker="true"]')).toHaveCount(0);
});

const cityEventsLocaleExpectations = {
  zh: {
    title: "精选城市活动",
    impact: "明显出行影响",
    source: "查看官方来源",
    explorer: "假期日历",
    areaNavigation: "公共网站区域",
    tradeFairs: "展会活动",
  },
  de: {
    title: "Ausgewählte Stadt-Events",
    impact: "Hohe Reiseauswirkung",
    source: "Offizielle Quelle öffnen",
    explorer: "Feiertage",
    areaNavigation: "Öffentliche Bereiche",
    tradeFairs: "Messen",
  },
  en: {
    title: "Selected City Events",
    impact: "High travel impact",
    source: "Open official source",
    explorer: "Holidays",
    areaNavigation: "Public site areas",
    tradeFairs: "Trade Fairs",
  },
} as const;

for (const [locale, expected] of Object.entries(cityEventsLocaleExpectations)) {
  test(`${locale} City Events route renders reviewed public data`, async ({ page }) => {
    await page.goto(`/${locale}/city-events`);

    await expect(page.getByRole("heading", { level: 1, name: expected.title })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "CSD Berlin Pride Demonstration 2026" }),
    ).toBeVisible();
    await expect(page.getByText(expected.impact, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(expected.source) })).toHaveAttribute(
      "href",
      "https://csd-berlin.de/en/demo-route-2026",
    );
    await expect(page.getByRole("link", { name: expected.explorer })).toHaveAttribute(
      "href",
      new RegExp(`/${locale}`),
    );
    const areaNavigation = page.getByRole("navigation", { name: expected.areaNavigation });
    await expect(
      areaNavigation.getByRole("link", { name: /文化活动|Kultur-Events|Culture Events/ }),
    ).toHaveAttribute("aria-current", "page");
    await expect(areaNavigation.getByRole("link", { name: expected.tradeFairs })).toHaveAttribute(
      "href",
      `/${locale}/messe-events`,
    );
    await expect(page.locator("main")).not.toContainText(/route|party|stage|vehicle/i);
  });
}

const messeLocaleExpectations = {
  zh: {
    title: "精选展会活动",
    status: "展会数据尚未发布",
    database: "不会提供完整的展会数据库",
    navigation: "公共网站区域",
    activeArea: "展会活动",
  },
  de: {
    title: "Ausgewählte Messe-Events",
    status: "Noch keine Messedaten veröffentlicht",
    database: "keine vollständige Messedatenbank",
    navigation: "Öffentliche Bereiche",
    activeArea: "Messen",
  },
  en: {
    title: "Selected Trade Fair Events",
    status: "Trade-fair data is not published yet",
    database: "not be a complete trade-fair database",
    navigation: "Public site areas",
    activeArea: "Trade Fairs",
  },
} as const;

for (const [locale, expected] of Object.entries(messeLocaleExpectations)) {
  test(`${locale} Trade Fairs placeholder exposes the three-area architecture`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/messe-events`);

    await expect(page.getByRole("heading", { level: 1, name: expected.title })).toBeVisible();
    await expect(page.getByRole("heading", { name: expected.status })).toBeVisible();
    await expect(page.getByText(new RegExp(expected.database))).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: expected.navigation })
        .getByRole("link", { name: expected.activeArea }),
    ).toHaveAttribute("aria-current", "page");
  });
}

test("three-area navigation preserves locale and drops Holiday search state", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=month&month=5&view=compare&states=DE-BE,DE-BB&layers=public",
  );
  const navigation = page.getByRole("navigation", { name: "Public site areas" });

  await navigation.getByRole("link", { name: "Culture Events" }).click();
  await expect(page).toHaveURL("/en/city-events");
  await page
    .getByRole("navigation", { name: "Public site areas" })
    .getByRole("link", { name: "Trade Fairs" })
    .click();
  await expect(page).toHaveURL("/en/messe-events");
  await page
    .getByRole("navigation", { name: "Public site areas" })
    .getByRole("link", { name: "Holidays" })
    .click();
  await expect(page).toHaveURL("/en");
});

test("City Events route shows safe validation and selected-source empty states", async ({
  page,
}) => {
  await page.route("**/data/city-events.json", (route) =>
    route.fulfill({
      body: JSON.stringify({ schemaVersion: 1, records: [{ invalid: true }] }),
      contentType: "application/json",
    }),
  );
  await page.goto("/en/city-events");
  await expect(page.getByRole("alert")).toContainText(
    "City Events data is temporarily unavailable",
  );

  await page.unroute("**/data/city-events.json");
  await page.route("**/data/city-events.json", (route) =>
    route.fulfill({
      body: JSON.stringify({ schemaVersion: 1, records: [] }),
      contentType: "application/json",
    }),
  );
  await page.route("**/data/city-events-manifest.json", (route) =>
    route.fulfill({
      body: JSON.stringify({
        schemaVersion: 1,
        datasetVersion: "empty-fixture",
        generatedAt: "2026-07-03T12:29:25.000Z",
        recordsFile: "city-events.json",
        recordsSha256: "0".repeat(64),
        recordCount: 0,
        coverageKind: "selected_official_sources",
        coveredCities: ["berlin"],
        coveredSources: ["csd_berlin"],
        sourceCoverage: [
          {
            source: "csd_berlin",
            city: "berlin",
            status: "manual",
            retrievedAt: "2026-07-03T12:29:25.000Z",
            reviewedAt: "2026-07-03T12:29:25.000Z",
            reviewStatus: "current",
            reviewPolicyVersion: "city-events-v1",
            stale: false,
            publishedRecordCount: 0,
            warnings: [],
          },
        ],
        warnings: [],
      }),
      contentType: "application/json",
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "No published selected events yet" }),
  ).toBeVisible();
  await expect(page.getByText(/does not mean there are no other events in Berlin/i)).toBeVisible();
});
