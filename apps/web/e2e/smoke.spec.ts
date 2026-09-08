import { expect, test } from '@playwright/test';

// Placeholder smoke test against today's placeholder shell. Real journeys (understand
// reconciliation health, investigate an exception, export data — see docs/product-spec.md §4)
// get their own specs here once the dashboard exists (Phase 5+).
test('portal shell loads and renders the page heading', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /settlement reconciliation/i })).toBeVisible();
});
