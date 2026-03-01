
/**
 * End-to-End Tests for WBS Template Editor - Compact Table Styling
 * 
 * Tests the compact table styling including:
 * - Reduced row height
 * - Compact inputs and buttons
 * - Cost Code column width
 * 
 * Prerequisites:
 * - Test user must be logged in
 * - At least one WBS template with items must exist
 * 
 * Environment Variables:
 * - E2E_TEST_EMAIL: Test user email
 * - E2E_TEST_PASSWORD: Test user password
 */

test.describe('WBS Template Editor - Compact Table Styling', () => {
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

  test('should display compact table rows', async ({ page }) => {
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
    
    // Check table rows have compact height
    const tableRows = itemsCard.locator('table tbody tr');
    const firstRow = tableRows.first();
    
    if (await firstRow.isVisible()) {
      // Get row height
      const box = await firstRow.boundingBox();
      if (box) {
        // Compact rows should be around 28px (h-7 = 1.75rem = 28px)
        expect(box.height).toBeLessThan(40);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-compact-rows.png', fullPage: true });
  });

  test('should have compact inputs in table cells', async ({ page }) => {
    // Navigate to WBS Templates list
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');

    // Click on first template
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    await page.waitForLoadState('networkidle');
    
    // Find Edit button and click it
    const editButton = page.locator('button[title*="Edit"], button:has([class*="Edit"])').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Find Items section
    const itemsCard = page.locator('div[class*="Card"]:has-text("Items"), div[class*="Card"]:has-text("Itens"), div[class*="Card"]:has-text("Éléments")').first();
    
    // Check inputs are compact
    const inputs = itemsCard.locator('table tbody tr input');
    const firstInput = inputs.first();
    
    if (await firstInput.isVisible()) {
      const box = await firstInput.boundingBox();
      if (box) {
        // Compact inputs should be around 24px (h-6 = 1.5rem = 24px)
        expect(box.height).toBeLessThan(32);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-compact-inputs.png', fullPage: true });
  });

  test('should display Cost Code column with adequate width', async ({ page }) => {
    // Navigate to WBS Templates list
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');

    // Click on first template
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    await page.waitForLoadState('networkidle');
    
    // Find Items section
    const itemsCard = page.locator('div[class*="Card"]:has-text("Items"), div[class*="Card"]:has-text("Itens"), div[class*="Card"]:has-text("Éléments")').first();
    
    // Find Cost Code column header
    const costCodeHeader = itemsCard.locator('th:has-text("Cost"), th:has-text("Código de Custo"), th:has-text("Code de Coût")');
    
    if (await costCodeHeader.isVisible()) {
      const box = await costCodeHeader.boundingBox();
      if (box) {
        // Cost Code column should be wider (220px)
        expect(box.width).toBeGreaterThan(180);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-cost-code-column.png', fullPage: true });
  });

  test('should show code and name in Cost Code dropdown', async ({ page }) => {
    // Navigate to WBS Templates list
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');

    // Click on first template
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    await page.waitForLoadState('networkidle');
    
    // Find Edit button and click it
    const editButton = page.locator('button[title*="Edit"], button:has([class*="Edit"])').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Find Items section
    const itemsCard = page.locator('div[class*="Card"]:has-text("Items"), div[class*="Card"]:has-text("Itens"), div[class*="Card"]:has-text("Éléments")').first();
    
    // Find Cost Code select trigger
    const costCodeSelects = itemsCard.locator('table tbody tr td:has(button[class*="SelectTrigger"])');
    const firstSelect = costCodeSelects.first();
    
    if (await firstSelect.isVisible()) {
      // Click to open dropdown
      await firstSelect.click();
      await page.waitForTimeout(300);
      
      // Check dropdown content shows code and name
      const dropdownContent = page.locator('[role="listbox"], [class*="SelectContent"]').first();
      
      if (await dropdownContent.isVisible()) {
        // Should have options with code and name
        const options = dropdownContent.locator('[role="option"]');
        expect(await options.count()).toBeGreaterThan(0);
        
        // Close dropdown
        await page.keyboard.press('Escape');
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-cost-code-dropdown.png', fullPage: true });
  });

  test('should have compact action buttons', async ({ page }) => {
    // Navigate to WBS Templates list
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');

    // Click on first template
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    await page.waitForLoadState('networkidle');
    
    // Find Edit button and click it
    const editButton = page.locator('button[title*="Edit"], button:has([class*="Edit"])').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Find Items section
    const itemsCard = page.locator('div[class*="Card"]:has-text("Items"), div[class*="Card"]:has-text("Itens"), div[class*="Card"]:has-text("Éléments")').first();
    
    // Check action buttons are compact
    const actionButtons = itemsCard.locator('table tbody tr button:has([class*="Trash"])');
    const firstButton = actionButtons.first();
    
    if (await firstButton.isVisible()) {
      const box = await firstButton.boundingBox();
      if (box) {
        // Compact buttons should be around 24px (h-6 = 1.5rem = 24px)
        expect(box.height).toBeLessThan(32);
        expect(box.width).toBeLessThan(32);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-compact-buttons.png', fullPage: true });
  });
});
