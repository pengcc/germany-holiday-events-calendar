import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";

const publicFixtureRoot = resolve("tests/fixtures/public");

async function usePublishedDataFixture(page: Page): Promise<void> {
  await page.route("**/data/holidays.json", (route) =>
    route.fulfill({ path: resolve(publicFixtureRoot, "holidays.json") }),
  );
  await page.route("**/data/manifest.json", (route) =>
    route.fulfill({ path: resolve(publicFixtureRoot, "manifest.json") }),
  );
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

const localeExpectations = {
  zh: {
    appName: "德国假期与重要活动日历",
    language: "语言",
    allStates: "已包含全部 16 个联邦州，无需逐一选择。",
    publicMarkerLegend: "圆点：公共假日",
    schoolMarkerLegend: "菱形：学校假期",
  },
  de: {
    appName: "Germany Holiday & Events Calendar",
    language: "Sprache",
    allStates: "Alle 16 Bundesländer sind enthalten; eine Einzelauswahl ist nicht nötig.",
    publicMarkerLegend: "Kreis: Feiertag",
    schoolMarkerLegend: "Raute: Schulferien",
  },
  en: {
    appName: "Germany Holiday & Events Calendar",
    language: "Language",
    allStates: "All 16 federal states are included; no individual selection is needed.",
    publicMarkerLegend: "Circle: Public holiday",
    schoolMarkerLegend: "Diamond: School holiday",
  },
} as const;

for (const [locale, expected] of Object.entries(localeExpectations)) {
  test(`${locale} comparison route renders`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("navigation", { name: expected.language })).toBeVisible();
    await expect(page.locator("header")).toContainText(expected.appName);
    await expect(page.getByText(expected.allStates)).toBeVisible();
    await expect(page.getByText(expected.publicMarkerLegend, { exact: true })).toBeVisible();
    await expect(page.getByText(expected.schoolMarkerLegend, { exact: true })).toBeVisible();
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

  await expect(page.getByRole("radio", { name: "Multiple states" })).toBeChecked();
  await expect(page.getByLabel("Period")).toHaveValue("quarter");
  await expect(page.getByLabel("Quarter", { exact: true })).toHaveValue("2");
  await expect(page.getByText("2 states selected")).toBeVisible();
  await expect(page.getByRole("region", { name: "April 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "June 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "July 2026" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Date details" })).toContainText("Labour Day");
  await expect(page.getByText("Data coverage is incomplete for this selection")).toBeVisible();

  await page.getByRole("link", { name: "de" }).click();
  await expect(page).toHaveURL(/\/de\?/);
  const localizedSearch = new URL(page.url()).searchParams;
  expect(localizedSearch.get("region")).toBe("multiple");
  expect(localizedSearch.get("states")).toBe("DE-BB,DE-BE");
  expect(localizedSearch.get("date")).toBe("2026-05-01");
  await expect(page.getByRole("region", { name: "Details zum Datum" })).toContainText(
    "Tag der Arbeit",
  );
});

test("region and period controls update the route-backed calendar", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026");

  await expect(
    page.getByText("All 16 federal states are included; no individual selection is needed."),
  ).toBeVisible();
  await page.getByRole("radio", { name: "One state" }).check();
  await expect(page.getByLabel("Federal state")).toBeVisible();
  await page.getByRole("radio", { name: "Multiple states" }).check();
  await expect(page.getByText("2 states selected")).toBeVisible();

  await page.getByLabel("Period").selectOption("month");
  await page.getByLabel("Month", { exact: true }).selectOption("7");
  await expect(page.getByRole("region", { name: "July 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "June 2026" })).toHaveCount(0);

  await page.getByLabel("Period").selectOption("year");
  await expect(page.getByRole("region", { name: "January 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "December 2026" })).toBeVisible();
});

test("desktop year view keeps month cards readable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=year&region=multiple&states=DE-BE,DE-BB&layers=public,school",
  );

  const january = page.getByRole("region", { name: "January 2026" });
  const february = page.getByRole("region", { name: "February 2026" });
  const march = page.getByRole("region", { name: "March 2026" });
  const januaryBox = await january.boundingBox();
  const februaryBox = await february.boundingBox();
  const marchBox = await march.boundingBox();

  expect(januaryBox?.width).toBeGreaterThanOrEqual(320);
  expect(februaryBox?.width).toBeGreaterThanOrEqual(320);
  expect(februaryBox?.y).toBe(januaryBox?.y);
  expect(marchBox?.y).toBeGreaterThan(januaryBox?.y ?? 0);
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
  expect(search.get("region")).toBe("multiple");
  expect(search.get("states")).toBe("DE-BW,DE-BY");
  expect(search.get("layers")).toBe("public,school");
  expect(search.has("date")).toBe(false);
});

test("visible dates update the URL and recover populated and empty details", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=month&month=5&region=multiple&states=DE-BE,DE-BB&layers=public,school",
  );

  const mayFirst = page.getByRole("button", { name: /May 1, 2026/ });
  await expect(mayFirst.locator('[data-holiday-marker="public"]')).toBeVisible();
  await expect(mayFirst.locator('[data-holiday-marker="school"]')).toBeVisible();
  await expect(mayFirst).toContainText("2/2");
  await mayFirst.click();

  await expect(page).toHaveURL(/date=2026-05-01/);
  await expect(mayFirst).toHaveAttribute("aria-pressed", "true");
  const details = page.getByRole("region", { name: "Date details" });
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
  await expect(page.getByRole("region", { name: "Date details" })).toContainText("Labour Day");

  const mayThird = page.getByRole("button", { name: /May 3, 2026/ });
  await mayThird.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/date=2026-05-03/);
  await expect(details).toContainText(
    "No published holiday records match the current filters on this date.",
  );
});

test("dates outside the active period are ignored and layer and activity labels are explicit", async ({
  page,
}) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=month&month=7&region=multiple&states=DE-BE,DE-BB&layers=school&date=2026-05-01",
  );

  await expect(page.getByText("Select a date in the calendar to view details.")).toBeVisible();
  const julyNinth = page.getByRole("button", { name: /July 9, 2026/ });
  await expect(julyNinth).toHaveAccessibleName(/School holiday/);
  await expect(julyNinth).toHaveAccessibleName(/Partial overlap/);
  await expect(julyNinth.locator('[data-holiday-marker="school"]')).toBeVisible();
  await expect(julyNinth.locator('[data-holiday-marker="public"]')).toHaveCount(0);
  await expect(julyNinth).toContainText("1/2");
  await julyNinth.click();
  const details = page.getByRole("region", { name: "Date details" });
  await expect(details).toContainText("Summer holidays");
  await expect(details).toContainText("July 9, 2026 – August 22, 2026");
  await expect(details).toContainText("Statewide");
  await expect(details).toContainText("school-de-be-2026-27");

  await page.goto("/en?year=2026&period=month&month=7&region=single&states=DE-BE&layers=school");
  await expect(page.getByRole("button", { name: /July 9, 2026/ })).toHaveAccessibleName(
    /Holiday activity in one state/,
  );
  await expect(page.getByText("Full overlap")).toBeVisible();
  await expect(page.getByText("Partial overlap")).toBeVisible();
  await expect(page.getByText("Holiday activity in one state")).toBeVisible();
});

test("state selection stays compact and native controls have usable hit targets", async ({
  page,
}) => {
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026");

  await page.getByRole("radio", { name: "Multiple states" }).check();
  const stateDisclosure = page.locator("summary").filter({ hasText: "Choose states" });
  await expect(stateDisclosure).toContainText("2 states selected");
  await expect(page.getByRole("checkbox", { name: /Berlin/ })).toBeHidden();

  await stateDisclosure.click();
  const berlin = page.getByRole("checkbox", { name: /Berlin/ });
  await expect(berlin).toBeVisible();
  await berlin.check();
  await expect(berlin).toBeChecked();
  expect(new URL(page.url()).searchParams.get("states")).toContain("DE-BE");

  await stateDisclosure.click();
  await expect(berlin).toBeHidden();
  await expect(page.getByRole("heading", { name: "Holiday calendar" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("localized filters fit a 320px viewport without expanding all states", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/zh?year=2026");

  await expect(page.getByRole("heading", { name: "筛选条件" })).toBeVisible();
  await expect(page.getByText("已包含全部 16 个联邦州，无需逐一选择。")).toBeVisible();
  await expect(page.locator("summary").filter({ hasText: "选择联邦州" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("layer and region changes preserve a visible selected date in URL state", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=month&month=5&region=multiple&states=DE-BE,DE-BB&layers=public,school",
  );

  await page.getByRole("button", { name: /May 1, 2026/ }).click();
  const publicLayer = page.getByRole("checkbox", { name: "Public holiday" });
  const schoolLayer = page.getByRole("checkbox", { name: "School holiday" });
  await schoolLayer.uncheck();

  let search = new URL(page.url()).searchParams;
  expect(search.get("date")).toBe("2026-05-01");
  expect(search.get("layers")).toBe("public");
  await expect(publicLayer).toBeDisabled();

  await page.getByRole("radio", { name: "One state" }).check();
  await page.getByLabel("Federal state").selectOption("DE-BE");
  search = new URL(page.url()).searchParams;
  expect(search.get("date")).toBe("2026-05-01");
  expect(search.get("region")).toBe("single");
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

test("an empty filtered period remains browsable and explains coverage", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026&period=month&month=2&region=single&states=DE-BE&layers=public");

  await expect(page.getByText("Data coverage is incomplete for this selection")).toBeVisible();
  await expect(
    page.getByText("No published holiday records match the current period and filters."),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "February 2026" })).toBeVisible();
  await page.getByRole("button", { name: /February 1, 2026/ }).click();
  await expect(page.getByRole("region", { name: "Date details" })).toContainText(
    "No published holiday records match the current filters on this date.",
  );
});
