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
