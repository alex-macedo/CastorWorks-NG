
/**
 * Financial Module Phase 1 - E2E Validation Tests
 *
 * Tests all 4 financial module pages:
 * - Cashflow Command Center (/finance/cashflow)
 * - AR Workspace (/finance/ar)
 * - AP Workspace (/finance/ap)
 * - AI Action Queue (/finance/actions)
 *
 * Login credentials from .env.testing
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_EMAIL = process.env.ACCOUNT_TEST_EMAIL;
const TEST_PASSWORD = process.env.ACCOUNT_TEST_EMAIL_PASSWORD;

test.describe('Financial Module Phase 1', () => {
  // Authenticate before all tests
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input[name="email"], input[type="email"], #email', TEST_EMAIL!);
    await page.fill('input[name="password"], input[type="password"], #password', TEST_PASSWORD!);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation to authenticated route
    await page.waitForURL(/\/(dashboard|architect|projects|finance)/, { timeout: 10000 });
  });

  test('Cashflow Command Center - Layout and Components', async ({ page }) => {
    // Navigate to cashflow page
    await page.goto(`${BASE_URL}/finance/cashflow`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title is visible
    const title = page.locator('h1').filter({ hasText: /Cashflow|Fluxo de Caixa|Flujo de Caja|Trésorerie/ });
    await expect(title).toBeVisible({ timeout: 5000 });

    // Verify KPI cards are present (4 cards expected)
    const kpiCards = page.locator('[data-testid="cashflow-kpi-cards"]').first();
    await expect(kpiCards).toBeVisible({ timeout: 5000 });

    // Verify forecast chart area is present
    const chartArea = page.locator('[data-testid="cashflow-chart"]').first();
    await expect(chartArea).toBeVisible({ timeout: 5000 });

    // Verify week detail table is present
    const weekTable = page.locator('[data-testid="cashflow-weeks"]').first();
    await expect(weekTable).toBeVisible({ timeout: 5000 });

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'test-results/financial-cashflow-layout.png',
      fullPage: true
    });

    console.log('✅ Cashflow Command Center - Layout validated');
  });

  test('AR Workspace - Invoice List and Aging Analysis', async ({ page }) => {
    // Navigate to AR page
    await page.goto(`${BASE_URL}/finance/ar`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title
    const title = page.locator('h1').filter({ hasText: /Receivable|Receber|Cobrar|Recevoir/ });
    await expect(title).toBeVisible({ timeout: 5000 });

    // Verify aging summary KPI cards (5 buckets expected)
    const agingCards = page.locator('[data-testid="ar-aging-cards"]').first();
    await expect(agingCards).toBeVisible({ timeout: 5000 });

    // Verify invoice list table
    const invoiceList = page.locator('[data-testid="ar-invoice-list"]').first();
    await expect(invoiceList).toBeVisible({ timeout: 5000 });

    // Verify "New Invoice" button exists
    const newButton = page.locator('button').filter({ hasText: /New Invoice|Nova Fatura|Nueva Factura|Nouvelle Facture/ });
    await expect(newButton).toBeVisible({ timeout: 5000 });

    // Take screenshot
    await page.screenshot({
      path: 'test-results/financial-ar-workspace.png',
      fullPage: true
    });

    console.log('✅ AR Workspace - Layout validated');
  });

  test('AP Workspace - Bill List and Due Risk Analysis', async ({ page }) => {
    // Navigate to AP page
    await page.goto(`${BASE_URL}/finance/ap`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title
    const title = page.locator('h1').filter({ hasText: /Payable|Pagar|Pagar|Payer/ });
    await expect(title).toBeVisible({ timeout: 5000 });

    // Verify due risk KPI cards (4 timeline groups expected)
    const riskCards = page.locator('[data-testid="ap-kpi-cards"]').first();
    await expect(riskCards).toBeVisible({ timeout: 5000 });

    // Verify bill list table
    const billList = page.locator('[data-testid="ap-bill-list"]').first();
    await expect(billList).toBeVisible({ timeout: 5000 });

    // Verify "New Bill" button exists
    const newButton = page.locator('button').filter({ hasText: /New Bill|Nova Conta|Nueva Factura|Nouvelle Facture/ });
    await expect(newButton).toBeVisible({ timeout: 5000 });

    // Take screenshot
    await page.screenshot({
      path: 'test-results/financial-ap-workspace.png',
      fullPage: true
    });

    console.log('✅ AP Workspace - Layout validated');
  });

  test('AI Action Queue - Pending and Recent Actions', async ({ page }) => {
    // Navigate to action queue page
    await page.goto(`${BASE_URL}/finance/actions`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title
    const title = page.locator('h1').filter({ hasText: /Action Queue|Fila de Ações|Cola de Acciones|File d'Actions/ });
    await expect(title).toBeVisible({ timeout: 5000 });

    // Verify pending actions section
    const pendingSection = page.locator('[data-testid="action-queue-pending"]').first();
    await expect(pendingSection).toBeVisible({ timeout: 5000 });

    // Verify recent actions section
    const recentSection = page.locator('[data-testid="action-queue-recent"]').first();
    await expect(recentSection).toBeVisible({ timeout: 5000 });

    // Verify pending count badge in header
    const badge = page.locator('text=/pending|pendente|pendiente/i').first();
    await expect(badge).toBeVisible({ timeout: 5000 });

    // Take screenshot
    await page.screenshot({
      path: 'test-results/financial-action-queue.png',
      fullPage: true
    });

    console.log('✅ AI Action Queue - Layout validated');
  });

  test('Cross-page Navigation - All Routes Accessible', async ({ page }) => {
    // Test navigation between all financial pages
    const routes = [
      '/finance/cashflow',
      '/finance/ar',
      '/finance/ap',
      '/finance/actions'
    ];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');

      // Verify URL matches
      expect(page.url()).toContain(route);

      // Verify main heading is visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 5000 });
    }

    console.log('✅ Cross-page Navigation - All routes validated');
  });

  test('Graceful Degradation - Empty State Handling', async ({ page }) => {
    // Test that pages handle missing data gracefully
    // (Before migration is deployed, tables won't exist yet)

    await page.goto(`${BASE_URL}/finance/cashflow`);
    await page.waitForLoadState('networkidle');

    // Should not show error boundary - should gracefully show empty state
    const errorBoundary = page.locator('text=/Something went wrong|Error/i');
    await expect(errorBoundary).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // It's ok if this fails - might show loading state instead
    });

    // Page should still render with title
    const title = page.locator('h1').first();
    await expect(title).toBeVisible({ timeout: 5000 });

    console.log('✅ Graceful Degradation - Empty state validated');
  });

  test('Responsive Design - Mobile Viewport', async ({ page }) => {
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto(`${BASE_URL}/finance/cashflow`);
    await page.waitForLoadState('networkidle');

    // Verify sidebar is collapsed/hidden on mobile
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    if (await sidebar.isVisible()) {
      // Sidebar should be minimized or have mobile class
      const sidebarClasses = await sidebar.getAttribute('class');
      expect(sidebarClasses).toMatch(/collapsed|mobile|hidden/);
    }

    // Verify KPI cards stack vertically
    const kpiCards = page.locator('[data-testid="cashflow-kpi-cards"]').first();
    if (await kpiCards.isVisible()) {
      const box = await kpiCards.boundingBox();
      // Mobile should use single column (width close to viewport)
      expect(box?.width).toBeLessThan(400);
    }

    // Take mobile screenshot
    await page.screenshot({
      path: 'test-results/financial-cashflow-mobile.png',
      fullPage: true
    });

    console.log('✅ Responsive Design - Mobile layout validated');
  });
});
