
/**
 * End-to-End Tests for WBS Template Editor - Template Section Expand/Collapse
 * 
 * Tests the functionality to expand and collapse the Template section
 * in the Project WBS Template Editor page.
 * 
 * Prerequisites:
 * - Test user must be logged in with admin or project_manager role
 * - At least one WBS template must exist
 * 
 * Environment Variables:
 * - E2E_TEST_EMAIL: Test user email
 * - E2E_TEST_PASSWORD: Test user password
 */

test.describe('WBS Template Editor - Template Section Expand/Collapse', () => {
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

  test('Template section should be collapsed by default', async ({ page }) => {
    // Navigate to WBS Templates list
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');

    // Click on first template to view/edit
    const templateCards = page.locator('div[class*="Card"]').first();
    await expect(templateCards).toBeVisible();
    
    // Click view button on first template
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      // Click on the card itself
      await templateCards.click();
    }
    
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the editor page
    await expect(page).toHaveURL(/\/project-wbs-templates\/.+/);
    
    // Check that Template section is collapsed by default
    // The CardContent should not be visible initially
    const templateCard = page.locator('div[class*="Card"]:has-text("Template"), div[class*="Card"]:has-text("Modelo")').first();
    await expect(templateCard).toBeVisible();
    
    // The expand/collapse button should be visible
    const expandButton = templateCard.locator('button:has([class*="Chevron"])');
    await expect(expandButton).toBeVisible();
    
    // Template content (inputs) should NOT be visible when collapsed
    const templateInputs = templateCard.locator('input, textarea').first();
    const isInputVisible = await templateInputs.isVisible().catch(() => false);
    expect(isInputVisible).toBe(false);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-template-collapsed-default.png', fullPage: true });
  });

  test('should expand Template section when clicking expand button', async ({ page }) => {
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
    
    // Find Template card and expand button
    const templateCard = page.locator('div[class*="Card"]:has-text("Template"), div[class*="Card"]:has-text("Modelo")').first();
    const expandButton = templateCard.locator('button:has([class*="ChevronDown"])');
    
    // Click to expand
    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);
    }
    
    // Now template inputs should be visible
    const templateNameInput = templateCard.locator('input').first();
    await expect(templateNameInput).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-template-expanded.png', fullPage: true });
  });

  test('should collapse Template section when clicking collapse button', async ({ page }) => {
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
    
    // Find Template card
    const templateCard = page.locator('div[class*="Card"]:has-text("Template"), div[class*="Card"]:has-text("Modelo")').first();
    
    // First expand
    const expandButton = templateCard.locator('button:has([class*="ChevronDown"])');
    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);
    }
    
    // Then collapse
    const collapseButton = templateCard.locator('button:has([class*="ChevronUp"])');
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      await page.waitForTimeout(500);
    }
    
    // Template inputs should be hidden again
    const templateInputs = templateCard.locator('input').first();
    const isInputVisible = await templateInputs.isVisible().catch(() => false);
    expect(isInputVisible).toBe(false);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-template-collapsed-again.png', fullPage: true });
  });
});
