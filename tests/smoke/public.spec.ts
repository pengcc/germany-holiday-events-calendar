import { expect, test } from "@playwright/test";

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

test("state selection remains operable", async ({ page }) => {
  await page.goto("/en");
  const bavaria = page.getByText("Bavaria", { exact: true });
  await bavaria.click();
  await expect(page.getByText("3 states selected")).toBeVisible();
});
