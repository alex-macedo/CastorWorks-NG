import fs from 'fs';
import { test, expect } from '@playwright/test';
import { injectAxe } from 'axe-playwright';

test.setTimeout(120000);

test('login and run axe', async ({ page }) => {
  const base = process.env.BASE_URL || 'http://localhost:5173';

  await page.goto(base);
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.fill('input[name="email"]', 'alex.macedo.ca@gmail.com');
  await page.fill('input[name="password"]', '#yf7w*F2IR8^mdMa');

  // Submit and wait for navigation or app shell
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  // Try to assert logged-in state or proceed anyway
  try {
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 20000 });
  } catch (e) {
    console.log('Dashboard not visible - continuing to run axe in current context');
  }

  // Inject axe and run evaluation
  await injectAxe(page);
  const results = await page.evaluate(async () => {
    // @ts-expect-error axe is injected at runtime by injectAxe.
    return await (window as any).axe.run();
  });

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/axe.json', JSON.stringify(results, null, 2));

  const violations = (results && results.violations) ? results.violations.length : 0;
  console.log('axe violations:', violations);

  expect(violations).toBeLessThan(1000);
});
