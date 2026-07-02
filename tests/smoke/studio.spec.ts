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
  await expect(page.getByPlaceholder("Search holiday name")).toBeEnabled();
  const selection = page.locator(".batch-selection");
  const batchCategory = page.locator(".batch-toolbar").getByLabel("Category");
  const approveSelected = page.getByRole("button", { name: "Approve selected" });

  await page.getByRole("button", { name: "Select READY · 0 issues" }).click();
  await expect(selection.locator('input[type="checkbox"]:checked')).toHaveCount(1);
  await expect(approveSelected).toBeDisabled();
  await expect(page.getByText("Enter reviewer name before approving.")).toBeVisible();

  await page.getByLabel("Bulk reviewer").fill("Fixture Reviewer");
  await expect(approveSelected).toBeEnabled();

  await batchCategory.selectOption("school");
  await page.getByRole("button", { name: "Select none" }).click();
  await batchCategory.selectOption("all");
  await expect(selection.locator('input[type="checkbox"]:checked')).toHaveCount(0);
  await expect(approveSelected).toBeDisabled();
  await expect(page.getByText("Select at least one READY · 0 issues batch.")).toBeVisible();

  await batchCategory.selectOption("school");
  await page.getByRole("button", { name: "Select READY · 0 issues" }).click();
  await expect(selection.locator('input[type="checkbox"]')).toHaveCount(1);
  await expect(selection.locator('input[type="checkbox"]:checked')).toHaveCount(1);
});

test("regional advisories are approvable and distinct from true blockers", async ({ page }) => {
  await page.goto("http://127.0.0.1:3010/");
  await expect(page.getByPlaceholder("Search holiday name")).toBeEnabled();

  await page.getByLabel("Batch").selectOption("public-th-2026");
  await expect(page.getByText("1 regional applicability advisory", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "This source batch can be reviewed and approved for statewide public-holiday coverage.",
      { exact: false },
    ),
  ).toBeVisible();
  const advisory = page.locator(".issue-advisory");
  await expect(
    advisory.getByRole("heading", { name: "Regional applicability advisory" }),
  ).toBeVisible();
  await expect(advisory).toContainText("Fronleichnam");
  await expect(advisory).toContainText("Scope: regional");
  await expect(advisory).toContainText("Approval does not confirm the exact municipality list.");
  await expect(advisory.getByRole("link", { name: "Open source" })).toHaveAttribute(
    "href",
    "https://landesrecht.thueringen.de/test",
  );
  await expect(page.getByRole("button", { name: "Accept source change" })).toHaveCount(0);

  const approveBatch = page.getByRole("button", { name: "Approve batch" });
  await expect(approveBatch).toBeDisabled();
  await page.getByLabel("Reviewer", { exact: true }).fill("Fixture Reviewer");
  await expect(approveBatch).toBeEnabled();

  const selection = page.locator(".batch-selection");
  const advisoryRow = selection.locator(".batch-select-row").filter({ hasText: "DE-TH" });
  const blockerRow = selection.locator(".batch-select-row").filter({ hasText: "DE-BY" });
  await expect(advisoryRow.locator('input[type="checkbox"]')).toBeEnabled();
  await expect(blockerRow.locator('input[type="checkbox"]')).toBeDisabled();
  await advisoryRow.locator('input[type="checkbox"]').check();
  await expect(page.getByRole("button", { name: "Approve selected" })).toBeEnabled();

  await page.getByLabel("Batch").selectOption("public-by-2026");
  await expect(
    page.getByText(/Blocked batches require resolving issues before approval/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Mariä Himmelfahrt has unresolved regional applicability/,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve batch" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Accept source change" })).toBeEnabled();
});
