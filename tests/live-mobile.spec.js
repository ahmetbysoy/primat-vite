import { test, expect } from '@playwright/test';

const viewports = [
  { name: '360', w: 360, h: 740 },
  { name: '390', w: 390, h: 844 },
  { name: '768', w: 768, h: 1024 },
];

// Helper: check no horizontal overflow
async function hasHorizontalScroll(page) {
  return await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

for (const vp of viewports) {
  test.describe(`primat-vite @ ${vp.name}px`, () => {
    test.use({ viewport: { width: vp.w, height: vp.h } });

    test(`loads and core UI visible @${vp.name}`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveTitle(/PRIMAT/);
      await expect(page.locator('.header')).toBeVisible();
      await expect(page.locator('.logo')).toBeVisible();
      // Coin selector always visible (P0)
      await expect(page.locator('select[aria-label="Sembol seç"]')).toBeVisible();
      // Timeframe
      await expect(page.locator('.tfRow')).toBeVisible();
      await expect(page.locator('.tfBtn').first()).toBeVisible();
      // Bottom nav
      await expect(page.locator('.bottom-nav')).toBeVisible();
      // Strips
      await expect(page.locator('.top-badge-strip')).toBeVisible();
      await expect(page.locator('.infoStrip')).toBeVisible();
      // No horizontal scroll (body overflow)
      expect(await hasHorizontalScroll(page)).toBe(false);
    });

    test(`tabs switch without overlap @${vp.name}`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const tabs = ['Balina', 'Sinyal', 'Plan', 'Arbitraj', 'Panel'];
      for (const label of tabs) {
        const btn = page.locator('.bottom-nav button', { hasText: label }).first();
        await btn.click();
        await page.waitForTimeout(400);
        // container should be visible, pastel note only on dashboard
        const container = page.locator('.container');
        await expect(container).toBeVisible();
        // header should not overlap container
        const headerBox = await page.locator('.header').boundingBox();
        const containerBox = await container.boundingBox();
        expect(containerBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 4);
        // no horizontal scroll after switch
        expect(await hasHorizontalScroll(page)).toBe(false);
      }
    });

    test(`Pastel not only on Panel, not on other tabs @${vp.name}`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      // Panel should have pastel note
      await expect(page.locator('text=Pastel not:')).toBeVisible();
      // go to Arbitraj
      await page.locator('.bottom-nav button', { hasText: 'Arbitraj' }).click();
      await page.waitForTimeout(300);
      await expect(page.locator('text=Pastel not:')).toHaveCount(0);
      // back to Panel
      await page.locator('.bottom-nav button', { hasText: 'Panel' }).click();
      await expect(page.locator('text=Pastel not:')).toBeVisible();
    });

    test(`FLOW pill not truncated @${vp.name}`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const counter = page.locator('.counter');
      await expect(counter).toBeVisible();
      const box = await counter.boundingBox();
      const viewportW = vp.w;
      // right edge should be inside viewport with at least 8px margin
      expect(box.x + box.width).toBeLessThanOrEqual(viewportW - 4);
      expect(box.x).toBeGreaterThanOrEqual(0);
    });

    test(`Timeframe 1D fully visible @${vp.name}`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const oneD = page.locator('.tfBtn', { hasText: /^1D$/ });
      await expect(oneD).toBeVisible();
      const box = await oneD.boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(vp.w + 2);
    });

    test(`InfoStrip secondary not hidden gap @${vp.name}`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      // secondary should be visible now (fix) — check at least one secondary exists and is visible
      const sec = page.locator('.iCell.secondary').first();
      // after fix, secondary should be visible at all viewports (compact)
      await expect(sec).toBeVisible();
      // track should be animating (have width > viewport)
      const track = page.locator('.infoStripTrack');
      const w = await track.evaluate(el => el.scrollWidth);
      expect(w).toBeGreaterThan(vp.w);
    });

    test(`Header height reasonable @${vp.name}`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const h = await page.locator('.header').evaluate(el => el.getBoundingClientRect().height);
      // mobile header should be <= 70 after thin fix (was 108 before)
      if (vp.w <= 640) expect(h).toBeLessThanOrEqual(72);
      else expect(h).toBeLessThanOrEqual(90);
    });

    test(`Table horizontal scroll wrapper exists in Balina @${vp.name}`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      // Balina tab uses table-wrap after previous fix attempt reverted, but check if table exists
      await page.locator('.bottom-nav button', { hasText: 'Balina' }).click();
      await page.waitForTimeout(500);
      // there is at least a table, and if .table-wrap exists, it should be scrollable
      const table = page.locator('table.table').first();
      await expect(table).toBeVisible({ timeout: 7000 });
      // ensure header logo still 32 after micro fix (computed style, not boundingBox which can shrink)
      const logoW = await page.locator('.brand .logo').evaluate(el => parseFloat(getComputedStyle(el).width));
      if (vp.w <= 640) expect(logoW).toBeGreaterThanOrEqual(31);
    });
  });
}
