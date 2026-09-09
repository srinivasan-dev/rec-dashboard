import { expect, test, type Page } from '@playwright/test';

/**
 * Runs once per project configured in playwright.config.ts (chromium/desktop, mobile,
 * ipad-portrait, ipad-landscape) -- each project's viewport determines which breakpoint's
 * behavior this spec asserts, per docs/product-spec.md §11 and the breakpoint table documented
 * in apps/web/src/styles/tokens.css / breakpoints.ts:
 *   mobile <=599, tablet-portrait 600-1023, tablet-landscape 1024-1279, desktop >=1280.
 */

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill('m104@rapyd.com');
  await page.getByLabel('Password').fill('rapyd@2026');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: /settlement reconciliation/i })).toBeVisible();
}

test.describe('responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('renders the correct exceptions layout and reachable export button', async ({ page }) => {
    const width = page.viewportSize()?.width ?? 1280;
    const isTabletOrBelow = width <= 1023;

    if (isTabletOrBelow) {
      await expect(page.locator('table')).toHaveCount(0);
      await expect(page.getByRole('list', { name: /exceptions needing review/i })).toBeVisible();
    } else {
      await expect(page.getByRole('table')).toBeVisible();
    }

    await expect(page.getByRole('button', { name: /export exceptions/i })).toBeInViewport();

    await page.screenshot({
      path: `e2e/__screenshots__/dashboard-${width}.png`,
      fullPage: false,
    });
  });

  test('summary cards stack according to breakpoint', async ({ page }) => {
    const width = page.viewportSize()?.width ?? 1280;
    // SummaryCards.tsx renders its 4-stat grid as the page's one <dl> -- avoids depending on
    // CSS Modules' generated (hashed) class names, which this Vite build doesn't keep stable.
    const grid = page.locator('dl').first();
    const columnCount = await grid.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
    );

    if (width <= 599) {
      expect(columnCount).toBe(1);
    } else if (width <= 1023) {
      expect(columnCount).toBe(2);
    } else {
      // tablet-landscape (1024-1279) and desktop both render the original 4-col grid --
      // 1024px has room next to the sidebar rail, same as desktop.
      expect(columnCount).toBe(4);
    }
  });

  test('sidebar is a rail on tablet/desktop and an off-canvas drawer on mobile', async ({
    page,
  }) => {
    const width = page.viewportSize()?.width ?? 1280;

    if (width <= 599) {
      const toggle = page.getByRole('button', { name: /open navigation menu/i });
      await expect(toggle).toBeVisible();
      await expect(
        page.getByRole('navigation', { name: /client portal sections/i }),
      ).not.toBeInViewport();

      await toggle.click();
      await expect(
        page.getByRole('navigation', { name: /client portal sections/i }),
      ).toBeInViewport();
    } else {
      await expect(page.getByRole('button', { name: /open navigation menu/i })).not.toBeVisible();
      await expect(
        page.getByRole('navigation', { name: /client portal sections/i }),
      ).toBeInViewport();
    }
  });

  test('search chat becomes a full-screen overlay on tablet-portrait and below', async ({
    page,
  }) => {
    const width = page.viewportSize()?.width ?? 1280;

    // The placeholder text now cycles through an animated typewriter effect (GlobalSearchBar.tsx)
    // -- target the input by its stable accessible label instead, which doesn't change.
    await page.getByLabel(/search exceptions by transaction id/i).fill('duplicate');
    await page.keyboard.press('Enter');

    const panel = page.getByRole('complementary', { name: /search chat/i });
    await expect(panel).toBeVisible();

    const box = await panel.boundingBox();
    expect(box).not.toBeNull();

    if (width <= 1023) {
      expect(box!.width).toBeGreaterThan(width * 0.9);
    } else {
      expect(box!.width).toBeLessThan(width * 0.5);
    }

    await page.screenshot({
      path: `e2e/__screenshots__/chat-open-${width}.png`,
      fullPage: false,
    });
  });
});
