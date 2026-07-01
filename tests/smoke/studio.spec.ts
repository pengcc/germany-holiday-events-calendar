import { expect, test } from "@playwright/test";

test("local Data Studio renders its review boundary", async ({ page }) => {
  await page.goto("http://127.0.0.1:3010/");
  await expect(page.getByRole("heading", { name: "Holiday Data Studio" })).toBeVisible();
  await expect(page.getByText("127.0.0.1 only")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh sources" })).toBeVisible();
  await expect(page.getByText("Configured sources")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Batch summary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Holiday records" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coverage matrix" })).toBeVisible();
  await expect(
    page.locator(".record-table").getByRole("cell", { name: "Herbstferien" }),
  ).toBeVisible();
});

test("record filters narrow the selected batch without hiding review context", async ({ page }) => {
  await page.goto("http://127.0.0.1:3010/");
  await expect(page.getByText("Showing 2 of 2 records")).toBeVisible();

  await page.getByPlaceholder("Search holiday name").fill("Sommer");
  await expect(page.getByText("Showing 1 of 2 records")).toBeVisible();
  await expect(
    page.locator(".record-table").getByRole("cell", { name: "Sommerferien" }),
  ).toBeVisible();
  await expect(
    page.locator(".record-table").getByRole("cell", { name: "Herbstferien" }),
  ).not.toBeVisible();

  await page.getByLabel("Name").fill("");
  await page.getByLabel("Scope").selectOption("regional");
  await expect(page.getByText("Showing 1 of 2 records")).toBeVisible();
  await expect(
    page.locator(".record-table").getByRole("cell", { name: "Sommerferien" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coverage matrix" })).toBeVisible();
});

test("bulk review helpers select only the current visible batch set", async ({ page }) => {
  await page.goto("http://127.0.0.1:3010/");
  const selection = page.locator(".batch-selection");
  const approveSelected = page.getByRole("button", { name: "Approve selected" });

  await page.getByRole("button", { name: "Select READY · 0 issues" }).click();
  await expect(selection.locator('input[type="checkbox"]:checked')).toHaveCount(2);
  await expect(approveSelected).toBeDisabled();
  await expect(page.getByText("Enter reviewer name before approving.")).toBeVisible();

  await page.getByLabel("Bulk reviewer").fill("Fixture Reviewer");
  await expect(approveSelected).toBeEnabled();

  await page.getByLabel("Category").selectOption("school");
  await page.getByRole("button", { name: "Select none" }).click();
  await page.getByLabel("Category").selectOption("all");
  await expect(selection.locator('input[type="checkbox"]:checked')).toHaveCount(0);
  await expect(approveSelected).toBeDisabled();
  await expect(page.getByText("Select at least one READY · 0 issues batch.")).toBeVisible();

  await page.getByLabel("Category").selectOption("school");
  await page.getByRole("button", { name: "Select READY · 0 issues" }).click();
  await expect(selection.locator('input[type="checkbox"]')).toHaveCount(1);
  await expect(selection.locator('input[type="checkbox"]:checked')).toHaveCount(1);
});
