
/**
 * Comprehensive End-to-End Test for WBS Template Editor
 * 
 * Tests all new features in one workflow:
 * 1. Template section expand/collapse
 * 2. Items section expand all/collapse all
 * 3. Individual row expansion
 * 4. Sync with Phases Templates
 * 5. Compact table styling
 * 
 * Prerequisites:
 * - Test user must be logged in with admin or project_manager role
 * - At least one WBS template with hierarchical items must exist
 * - At least one Phases template must exist
 * 
 * Environment Variables:
 * - E2E_TEST_EMAIL: Test user email
 * - E2E_TEST_PASSWORD: Test user password
 */

test.describe('WBS Template Editor - Complete Feature Test', () => {
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

      await page.fill('#email', email);
      await page.fill('#password', password);
      await page.click('button[type="submit"]');
      
      // Wait for navigation after login
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');
      
      // Verify we're logged in by checking URL
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        throw new Error('Login failed - still on login page');
      }
    }
  });

  test('complete workflow: template section, items expansion, and sync', async ({ page }) => {
    // Step 1: Navigate to WBS Templates
    await page.goto('/project-wbs-templates');
    await page.waitForLoadState('networkidle');
    
    console.log('✓ Navigated to WBS Templates list');
    
    // Step 2: Click on first template
    const viewButton = page.locator('button[title*="View"], button:has([class*="Eye"])').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/project-wbs-templates\/.+/);
    
    console.log('✓ Opened WBS Template editor');
    
    // Step 3: Verify Template section is collapsed by default
    const templateCard = page.locator('div[class*="Card"]:has-text("Template"), div[class*="Card"]:has-text("Modelo")').first();
    const templateInputs = templateCard.locator('input').first();
    const isTemplateCollapsed = !(await templateInputs.isVisible().catch(() => false));
    expect(isTemplateCollapsed).toBe(true);
    
    console.log('✓ Template section is collapsed by default');
    
    // Step 4: Expand Template section
    const expandTemplateBtn = templateCard.locator('button:has([class*="ChevronDown"])');
    if (await expandTemplateBtn.isVisible()) {
      await expandTemplateBtn.click();
      await page.waitForTimeout(300);
    }
    
    // Verify template inputs are now visible
    await expect(templateInputs).toBeVisible();
    console.log('✓ Template section expanded');
    
    // Step 5: Find Items section and verify expand/collapse all button
    const itemsCard = page.locator('div[class*="Card"]:has-text("Items"), div[class*="Card"]:has-text("Itens"), div[class*="Card"]:has-text("Éléments")').first();
    const expandAllBtn = itemsCard.locator('button:has-text("Expand"), button:has-text("Expandir"), button:has-text("Développer")');
    
    if (await expandAllBtn.isVisible()) {
      console.log('✓ Expand All button is visible');
      
      // Click Expand All
      await expandAllBtn.click();
      await page.waitForTimeout(500);
      console.log('✓ Clicked Expand All');
      
      // Verify Collapse All button appears
      const collapseAllBtn = itemsCard.locator('button:has-text("Collapse"), button:has-text("Recolher"), button:has-text("Réduire")');
      if (await collapseAllBtn.isVisible()) {
        console.log('✓ Collapse All button is now visible');
        
        // Click Collapse All
        await collapseAllBtn.click();
        await page.waitForTimeout(500);
        console.log('✓ Clicked Collapse All');
      }
    }
    
    // Step 6: Test individual row expansion
    const expandChevrons = itemsCard.locator('button:has([class*="ChevronRight"])');
    const chevronCount = await expandChevrons.count();
    
    if (chevronCount > 0) {
      await expandChevrons.first().click();
      await page.waitForTimeout(300);
      console.log('✓ Expanded individual row');
      
      // Verify collapse chevron appears
      const collapseChevrons = itemsCard.locator('button:has([class*="ChevronDown"])');
      expect(await collapseChevrons.count()).toBeGreaterThan(0);
      console.log('✓ Row expansion working correctly');
    }
    
    // Step 7: Switch to edit mode for sync test
    const editButton = page.locator('button[title*="Edit"], button:has([class*="Edit"])').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✓ Switched to edit mode');
    }
    
    // Step 8: Test Sync with Phases
    const syncButton = page.locator('button:has-text("Sync"), button:has-text("Sincronizar"), button:has-text("Synchroniser")').first();
    
    if (await syncButton.isVisible()) {
      console.log('✓ Sync button is visible in edit mode');
      
      // Click Sync button
      await syncButton.click();
      await page.waitForTimeout(500);
      console.log('✓ Opened sync dialog');
      
      // Verify dialog opened
      const dialog = page.locator('[role="dialog"], div[class*="Dialog"]').first();
      await expect(dialog).toBeVisible();
      
      // Select a phases template
      const templateSelect = dialog.locator('button[class*="SelectTrigger"]').first();
      if (await templateSelect.isVisible()) {
        await templateSelect.click();
        await page.waitForTimeout(300);
        
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
          await page.waitForTimeout(300);
          console.log('✓ Selected phases template');
        }
      }
      
      // Click Validate
      const validateButton = dialog.locator('button:has-text("Validate"), button:has-text("Validar"), button:has-text("Valider")').first();
      if (await validateButton.isVisible()) {
        await validateButton.click();
        await page.waitForTimeout(1000);
        console.log('✓ Validated phases against WBS items');
        
        // Check validation results
        const resultsArea = dialog.locator('div[class*="ScrollArea"]').first();
        if (await resultsArea.isVisible()) {
          console.log('✓ Validation results displayed');
        }
      }
      
      // Close dialog (don't apply to avoid modifying data)
      const cancelButton = dialog.locator('button:has-text("Cancel"), button:has-text("Cancelar"), button:has-text("Annuler")').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await page.waitForTimeout(300);
        console.log('✓ Closed sync dialog');
      }
    }
    
    // Step 9: Verify compact styling
    const tableRows = itemsCard.locator('table tbody tr');
    const firstRow = tableRows.first();
    
    if (await firstRow.isVisible()) {
      const box = await firstRow.boundingBox();
      if (box) {
        // Verify compact row height (< 40px)
        expect(box.height).toBeLessThan(40);
        console.log('✓ Table rows are compact (height < 40px)');
      }
    }
    
    // Step 10: Verify Cost Code column width
    const costCodeHeader = itemsCard.locator('th:has-text("Cost"), th:has-text("Código"), th:has-text("Coût")').first();
    if (await costCodeHeader.isVisible()) {
      const box = await costCodeHeader.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThan(180);
        console.log('✓ Cost Code column has adequate width (> 180px)');
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/wbs-complete-workflow.png', fullPage: true });
    console.log('✓ Complete workflow test finished successfully');
  });
});
