import { expect, test } from '@playwright/test';

/** Plays from the first screen into the valley and visits every page, failing on any page error. */
test('start → title → intro → valley, and the site pages', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  // Start fresh (no saved progress) without reloading mid-load.
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();

  // Start screen → title → intro slides.
  await canvas.click();
  await page.waitForTimeout(1500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) {
    await canvas.click();
    await page.waitForTimeout(800);
  }
  // "6 months later" card, then the valley with the controls pop-up.
  const popup = page.locator('.popup');
  await expect(popup).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Enter');
  await expect(popup).toBeHidden();

  // Site pages.
  await page.locator('.site-nav a[href="#/about"]').click();
  await expect(page.locator('.people .person').first()).toBeVisible();
  await page.locator('.site-nav a[href="#/bibliography"]').click();
  await expect(page.locator('#page')).toContainText(/\S/);
  await page.locator('.site-nav a[href="#/simulation"]').click();
  await expect(canvas).toBeVisible();

  expect(errors).toEqual([]);
});
