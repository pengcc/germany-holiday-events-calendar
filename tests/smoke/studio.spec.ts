import { expect, test } from "@playwright/test";

test("local Data Studio renders its review boundary", async ({ page }) => {
  await page.goto("http://127.0.0.1:3010/");
  await expect(page.getByRole("heading", { name: "Holiday Data Studio" })).toBeVisible();
  await expect(page.getByText("127.0.0.1 only")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh sources" })).toBeVisible();
  await expect(page.getByText("Configured sources")).toBeVisible();
});
