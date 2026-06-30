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

for (const locale of ["zh", "de", "en"]) {
  test(`${locale} comparison route renders`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Language" })).toBeVisible();
    await expect(page.getByText("DE-BW").or(page.getByText("BW", { exact: true }))).toBeVisible();
    await expect(page.getByText("DE-TH").or(page.getByText("TH", { exact: true }))).toBeVisible();
    await expect(page.locator("main")).toContainText(/reviewed|审核|geprüft/i);
  });
}

test("validated explorer filters drive the visible period and survive locale navigation", async ({
  page,
}) => {
  await usePublishedDataFixture(page);
  await page.goto(
    "/en?year=2026&period=quarter&quarter=2&region=multiple&states=DE-BE,DE-BB&layers=public,school",
  );

  await expect(page.getByLabel("Region scope")).toHaveValue("multiple");
  await expect(page.getByLabel("Period")).toHaveValue("quarter");
  await expect(page.getByLabel("Quarter", { exact: true })).toHaveValue("2");
  await expect(page.getByText("2 states selected")).toBeVisible();
  await expect(page.getByRole("region", { name: "April 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "June 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "July 2026" })).toHaveCount(0);

  await page.getByRole("link", { name: "de" }).click();
  await expect(page).toHaveURL(/\/de\?/);
  expect(new URL(page.url()).searchParams.get("region")).toBe("multiple");
  expect(new URL(page.url()).searchParams.get("states")).toBe("DE-BB,DE-BE");
});

test("region and period controls update the route-backed calendar", async ({ page }) => {
  await usePublishedDataFixture(page);
  await page.goto("/en?year=2026");

  await expect(page.getByText("16 states selected")).toBeVisible();
  await page.getByLabel("Region scope").selectOption("single");
  await expect(page.getByText("1 states selected")).toBeVisible();
  await page.getByLabel("Region scope").selectOption("multiple");
  await expect(page.getByText("2 states selected")).toBeVisible();

  await page.getByLabel("Period").selectOption("month");
  await page.getByLabel("Month", { exact: true }).selectOption("7");
  await expect(page.getByRole("region", { name: "July 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "June 2026" })).toHaveCount(0);

  await page.getByLabel("Period").selectOption("year");
  await expect(page.getByRole("region", { name: "January 2026" })).toBeVisible();
  await expect(page.getByRole("region", { name: "December 2026" })).toBeVisible();
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
  await expect(mayFirst).toContainText("P");
  await expect(mayFirst).toContainText("S");
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
  await expect(details).toContainText("No holiday records match the current filters on this date.");
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
  await expect(julyNinth).toContainText("S");
  await expect(julyNinth).toContainText("1/2");
  await julyNinth.click();
  const details = page.getByRole("region", { name: "Date details" });
  await expect(details).toContainText("Summer holidays");
  await expect(details).toContainText("July 9, 2026 – August 22, 2026");
  await expect(details).toContainText("Statewide");
  await expect(details).toContainText("school-de-be-2026-27");

  await page.goto("/en?year=2026&period=month&month=7&region=single&states=DE-BE&layers=school");
  await expect(page.getByRole("button", { name: /July 9, 2026/ })).toHaveAccessibleName(
    /Activity in selected state/,
  );
  await expect(page.getByText("Full overlap")).toBeVisible();
  await expect(page.getByText("Partial overlap")).toBeVisible();
  await expect(page.getByText("Activity in selected state")).toBeVisible();
});
