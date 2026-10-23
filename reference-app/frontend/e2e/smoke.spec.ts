import { expect, test } from "@playwright/test";

// Requires: mock ERP (8001), API (8000) and the UI (5173 or E2E_BASE_URL) running.
// Invoice numbers are made unique per run so re-runs are not flagged as duplicates.

function invoiceText(number: string, qty: number, unit: number): string {
  return [
    "INVOICE",
    `Invoice Number: ${number}`,
    "Vendor ID: V-400",
    "Vendor Name: Initech Office Solutions",
    "PO Number: PO-1004",
    "Invoice Date: 2026-10-20",
    "Currency: EUR",
    "Bank Account (IBAN): NL91ABNA0417164300",
    "Lines:",
    `- LAP-15 | Laptop | qty ${qty} | unit ${unit.toFixed(2)}`,
    `Total: ${(qty * unit).toFixed(2)}`,
  ].join("\n");
}

test("sample invoice shows the three-way-match evidence", async ({ page }) => {
  await page.goto("/submit");
  await page.getByRole("button", { name: /Price Variance/ }).click();
  await expect(page.getByText("Evidence: invoice vs PO vs goods receipt")).toBeVisible();
  await expect(page.getByRole("cell", { name: "GLV-01" })).toBeVisible();
  await expect(page.getByText("Agent timeline (audit trail)")).toBeVisible();
});

test("human approves a high-value invoice (HITL)", async ({ page }) => {
  await page.goto("/submit");
  await page.locator("textarea").fill(invoiceText(`INV-E2E-${Date.now()}`, 12, 1150));
  await page.getByRole("button", { name: "Run triage" }).click();
  await expect(page.getByText("Needs review")).toBeVisible();
  await expect(page.getByText("High Value").first()).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/Closed by/)).toBeVisible();
});
