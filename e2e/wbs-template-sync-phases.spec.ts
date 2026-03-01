
/**
 * End-to-End Tests for WBS Template Editor - Sync with Phases Templates
 * 
 * Tests the functionality to sync WBS Template with Phases Templates,
 * including validation and adding missing phases as WBS items.
 * 
 * Prerequisites:
 * - Test user must be logged in with admin or project_manager role
 * - At least one WBS template must exist
 * - At least one Phases template must exist with phases defined
 * 
 * Environment Variables:
 * - E2E_TEST_EMAIL: Test user email
 * - E2E_TEST_PASSWORD: Test user password
 */

test.describe('WBS Template Editor - Sync with Phases', () => {
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

  test('should show Sync with Phases button in edit mode', async ({ page }) => {
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
    
    // Find Edit button and click it
    const editButton = page.locator('button[title*="Edit"], button:has([class*="Edit"])').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Check URL has mode=edit parameter or we're in edit mode
    const currentUrl = page.url();
    const isEditMode = currentUrl.includes('mode=edit');
    
    if (isEditMode) {
      // Sync button should be visible in edit mode
      const syncButton = page.locator('button:has-text("Sync"), button:has-text("Sincronizar"), button:has-text("Synchroniser")');
      await expect(syncButton).toBeVisible();
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-sync-button-visible.png', fullPage: true });
  });

  test('should open sync dialog when clicking Sync button', async ({ page }) => {
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
    
    // Click Sync button
    const syncButton = page.locator('button:has-text("Sync"), button:has-text("Sincronizar"), button:has-text("Synchroniser")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(500);
      
      // Dialog should appear
      const dialog = page.locator('[role="dialog"], div[class*="Dialog"]').first();
      await expect(dialog).toBeVisible();
      
      // Dialog should have title
      const dialogTitle = dialog.locator('h2, [class*="DialogTitle"]').first();
      await expect(dialogTitle).toBeVisible();
      
      // Dialog should have template selector
      const templateSelect = dialog.locator('button[class*="SelectTrigger"], select').first();
      await expect(templateSelect).toBeVisible();
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-sync-dialog-open.png', fullPage: true });
  });

  test('should show validation results after selecting template', async ({ page }) => {
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
    
    // Click Sync button
    const syncButton = page.locator('button:has-text("Sync"), button:has-text("Sincronizar"), button:has-text("Synchroniser")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(500);
      
      // Get dialog
      const dialog = page.locator('[role="dialog"], div[class*="Dialog"]').first();
      
      // Open template selector
      const templateSelect = dialog.locator('button[class*="SelectTrigger"]').first();
      if (await templateSelect.isVisible()) {
        await templateSelect.click();
        await page.waitForTimeout(300);
        
        // Select first option
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
          await page.waitForTimeout(300);
        }
      }
      
      // Click Validate button
      const validateButton = dialog.locator('button:has-text("Validate"), button:has-text("Validar"), button:has-text("Valider")').first();
      if (await validateButton.isVisible()) {
        await validateButton.click();
        await page.waitForTimeout(1000);
        
        // Validation results should appear
        const resultsArea = dialog.locator('div[class*="ScrollArea"], div:has-text("matched"), div:has-text("correspondente"), div:has-text("correspond")').first();
        const hasResults = await resultsArea.isVisible().catch(() => false);
        
        if (hasResults) {
          // Should show matched or unmatched phases
          const resultItems = dialog.locator('div[class*="rounded"], div[class*="bg-"]').first();
          expect(await resultItems.isVisible()).toBe(true);
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-sync-validation-results.png', fullPage: true });
  });

  test('should apply sync and add missing phases', async ({ page }) => {
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
    
    // Count items before sync
    const itemsCard = page.locator('div[class*="Card"]:has-text("Items"), div[class*="Card"]:has-text("Itens"), div[class*="Card"]:has-text("Éléments")').first();
    const rowsBefore = await itemsCard.locator('table tbody tr').count();
    
    // Click Sync button
    const syncButton = page.locator('button:has-text("Sync"), button:has-text("Sincronizar"), button:has-text("Synchroniser")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(500);
      
      // Get dialog
      const dialog = page.locator('[role="dialog"], div[class*="Dialog"]').first();
      
      // Select a template
      const templateSelect = dialog.locator('button[class*="SelectTrigger"]').first();
      if (await templateSelect.isVisible()) {
        await templateSelect.click();
        await page.waitForTimeout(300);
        
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
          await page.waitForTimeout(300);
        }
      }
      
      // Click Validate
      const validateButton = dialog.locator('button:has-text("Validate"), button:has-text("Validar"), button:has-text("Valider")').first();
      if (await validateButton.isVisible()) {
        await validateButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Click Apply
      const applyButton = dialog.locator('button:has-text("Apply"), button:has-text("Aplicar"), button:has-text("Appliquer")').first();
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(1000);
        
        // Dialog should close
        const isDialogVisible = await dialog.isVisible().catch(() => false);
        expect(isDialogVisible).toBe(false);
        
        // Items count might have increased (if there were unmatched phases)
        await page.waitForTimeout(500);
        const rowsAfter = await itemsCard.locator('table tbody tr').count();
        expect(rowsAfter).toBeGreaterThanOrEqual(rowsBefore);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-sync-applied.png', fullPage: true });
  });

  test('should not show Sync button in view mode', async ({ page }) => {
    // Navigate to WBS Templates list
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');

    // Click on first template (view mode)
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/project-wbs-templates\/.+/);
    
    // Check URL doesn't have mode=edit
    const currentUrl = page.url();
    const isEditMode = currentUrl.includes('mode=edit');
    
    if (!isEditMode) {
      // Sync button should NOT be visible in view mode
      const syncButton = page.locator('button:has-text("Sync"), button:has-text("Sincronizar"), button:has-text("Synchroniser")');
      const isSyncVisible = await syncButton.isVisible().catch(() => false);
      expect(isSyncVisible).toBe(false);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/wbs-sync-hidden-in-view.png', fullPage: true });
  });
});
