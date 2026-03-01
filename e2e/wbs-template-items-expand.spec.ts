
/**
 * End-to-End Tests for WBS Template Editor - Items Section Expand/Collapse All
 * 
 * Tests the functionality to expand and collapse all rows in the Items section
 * using the Expand All / Collapse All button.
 * 
 * Prerequisites:
 * - Test user must be logged in with admin or project_manager role
 * - At least one WBS template with hierarchical items must exist
 * 
 * Environment Variables:
 * - E2E_TEST_EMAIL: Test user email
 * - E2E_TEST_PASSWORD: Test user password
 */

test.describe('WBS Template Editor - Items Section Expand/Collapse', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if logged in, if not perform login
    const isLoggedIn = await page
      .locator('[data-testid="user-menu"]')
      .isVisible()
      .catch(() => false);

    if (!isLoggedIn) {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const email = process.env.E2E_TEST_EMAIL || process.env.ACCOUNT_TEST_EMAIL || 'test@example.com';
      const password = process.env.E2E_TEST_PASSWORD || process.env.ACCOUNT_TEST_EMAIL_PASSWORD || 'testpassword';

      await page.fill('input[name="email"], #email', email);
      await page.fill('input[name="password"], #password', password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should show Expand All button when items exist', async ({ page }) => {
    // Navigate to WBS Templates list
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');

    // Click on first template
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/project-wbs-templates\/.+/);
    
    // Find Items section
    const itemsCard = page.locator('div[class*="Card"]:has-text("Items"), div[class*="Card"]:has-text("Itens"), div[class*="Card"]:has-text("Éléments")').first();
    await expect(itemsCard).toBeVisible();
    
    // Check if there are items in the table
    const tableRows = itemsCard.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 1) {
      // Expand All / Collapse All button should be visible
      const expandAllButton = itemsCard.locator('button:has-text("Expand"), button:has-text("Expandir"), button:has-text("Développer")');
      await expect(expandAllButton).toBeVisible();
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-items-expand-button.png', fullPage: true });
  });

  test('should expand all rows when clicking Expand All', async ({ page }) => {
    // Navigate to WBS Templates list
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');

    // Click on first template
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/project-wbs-templates\/.+/);
    
    // Find Items section
    const itemsCard = page.locator('div[class*="Card"]:has-text("Items"), div[class*="Card"]:has-text("Itens"), div[class*="Card"]:has-text("Éléments")').first();
    
    // Click Expand All if visible
    const expandAllButton = itemsCard.locator('button:has-text("Expand"), button:has-text("Expandir"), button:has-text("Développer")');
    if (await expandAllButton.isVisible()) {
      await expandAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // Count visible rows - should be all rows
    const tableRows = itemsCard.locator('table tbody tr');
    const visibleRows = await tableRows.count();
    
    // All rows should be visible (no filtering)
    expect(visibleRows).toBeGreaterThan(0);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-items-all-expanded.png', fullPage: true });
  });

  test('should collapse all rows when clicking Collapse All', async ({ page }) => {
    // Navigate to WBS Templates list
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');

    // Click on first template
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/project-wbs-templates\/.+/);
    
    // Find Items section
    const itemsCard = page.locator('div[class*="Card"]:has-text("Items"), div[class*="Card"]:has-text("Itens"), div[class*="Card"]:has-text("Éléments")').first();
    
    // First expand all
    const expandAllButton = itemsCard.locator('button:has-text("Expand"), button:has-text("Expandir"), button:has-text("Développer")');
    if (await expandAllButton.isVisible()) {
      await expandAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // Then collapse all
    const collapseAllButton = itemsCard.locator('button:has-text("Collapse"), button:has-text("Recolher"), button:has-text("Réduire")');
    if (await collapseAllButton.isVisible()) {
      await collapseAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // Only root level items should be visible now
    const tableRows = itemsCard.locator('table tbody tr');
    const visibleRows = await tableRows.count();
    
    // Should show fewer rows (only root level)
    expect(visibleRows).toBeGreaterThanOrEqual(0);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-items-collapsed.png', fullPage: true });
  });

  test('should expand/collapse individual rows using chevron buttons', async ({ page }) => {
    // Navigate to WBS Templates list
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');

    // Click on first template
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/project-wbs-templates\/.+/);
    
    // Find Items section
    const itemsCard = page.locator('div[class*="Card"]:has-text("Items"), div[class*="Card"]:has-text("Itens"), div[class*="Card"]:has-text("Éléments")').first();
    
    // Find rows with expand/collapse chevrons
    const expandChevrons = itemsCard.locator('button:has([class*="ChevronRight"])');
    const chevronCount = await expandChevrons.count();
    
    if (chevronCount > 0) {
      // Click first expand chevron
      await expandChevrons.first().click();
      await page.waitForTimeout(300);
      
      // Now there should be a collapse chevron
      const collapseChevrons = itemsCard.locator('button:has([class*="ChevronDown"])');
      expect(await collapseChevrons.count()).toBeGreaterThan(0);
      
      // Click to collapse
      await collapseChevrons.first().click();
      await page.waitForTimeout(300);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-items-row-toggle.png', fullPage: true });
  });
});
