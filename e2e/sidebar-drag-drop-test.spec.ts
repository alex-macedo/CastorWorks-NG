
test.describe('Sidebar Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:5173/login');
    
    // Fill login form
    await page.fill('input[type="email"]', process.env.ACCOUNT_TEST_EMAIL || 'admin@example.com');
    await page.fill('input[type="password"]', process.env.ACCOUNT_TEST_EMAIL_PASSWORD || 'password');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/');
    
    // Navigate to Settings
    await page.click('a[href="/settings"]');
    await page.waitForURL('**/settings');
  });

  test('should display menu order management tab', async ({ page }) => {
    // Click on Users tab first (since it's the default)
    await page.click('[data-state="active"][value="users"]');
    
    // Then click on Menu Order tab
    await page.click('button:has-text("Menu Order")');
    
    // Verify the menu order management interface is visible
    await expect(page.locator('h3:has-text("Menu Order Management")')).toBeVisible();
    await expect(page.locator('p:has-text("Drag and drop to reorder")')).toBeVisible();
    
    // Verify sidebar options are displayed
    await expect(page.locator('[data-testid="sortable-option"]').first()).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/sidebar-menu-order-management.png' });
  });

  test('should allow drag and drop reordering', async ({ page }) => {
    // Navigate to Menu Order tab
    await page.click('[data-state="active"][value="users"]');
    await page.click('button:has-text("Menu Order")');
    
    // Wait for options to load
    await page.waitForSelector('[data-testid="sortable-option"]');
    
    // Get the first option text
    const firstOption = page.locator('[data-testid="sortable-option"]').first();
    const firstOptionText = await firstOption.textContent();
    
    // Get the second option
    const secondOption = page.locator('[data-testid="sortable-option"]').nth(1);
    const secondOptionText = await secondOption.textContent();
    
    // Drag the first option and drop it on the second
    await firstOption.dragTo(secondOption);
    
    // Wait a moment for the reordering to complete
    await page.waitForTimeout(500);
    
    // Verify the order has changed (first option should now be second)
    const newFirstOption = page.locator('[data-testid="sortable-option"]').first();
    const newFirstOptionText = await newFirstOption.textContent();
    
    // The text should be different (unless they were the same)
    expect(newFirstOptionText).not.toBe(firstOptionText);
    
    // Save changes button should be enabled
    const saveButton = page.locator('button:has-text("Save Changes")');
    await expect(saveButton).toBeEnabled();
    
    // Click save
    await saveButton.click();
    
    // Wait for success message
    await expect(page.locator('text=Menu order updated successfully')).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/sidebar-drag-drop-after-save.png' });
  });

  test('should allow resetting to default order', async ({ page }) => {
    // Navigate to Menu Order tab
    await page.click('[data-state="active"][value="users"]');
    await page.click('button:has-text("Menu Order")');
    
    // Wait for options to load
    await page.waitForSelector('[data-testid="sortable-option"]');
    
    // Click reset button
    await page.click('button:has-text("Reset to Default")');
    
    // Wait for success message
    await expect(page.locator('text=Menu order reset to default')).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/sidebar-reset-to-default.png' });
  });

  test('should allow drag and drop reordering of tabs within options', async ({ page }) => {
    // Navigate to Menu Order tab
    await page.click('[data-state="active"][value="users"]');
    await page.click('button:has-text("Menu Order")');
    
    // Wait for options to load
    await page.waitForSelector('[data-testid="sortable-option"]');
    
    // Find a collapsible option with multiple tabs (like Projects)
    const projectsOption = page.locator('[data-testid="sortable-option"]:has-text("Projects")');
    await expect(projectsOption).toBeVisible();
    
    // Expand the Projects option
    await projectsOption.locator('button[aria-label="Expand"]').click();
    
    // Wait for tabs to be visible
    await page.waitForSelector('[data-testid="sortable-option"]:has-text("Projects") [data-testid="sortable-tab"]');
    
    // Get the tab elements within the Projects option
    const tabs = projectsOption.locator('[data-testid="sortable-tab"]');
    const tabCount = await tabs.count();
    
    if (tabCount >= 2) {
      // Get first and second tab text
      const firstTab = tabs.first();
      const secondTab = tabs.nth(1);
      const firstTabText = await firstTab.textContent();
      const secondTabText = await secondTab.textContent();
      
      // Drag first tab and drop it on second
      await firstTab.dragTo(secondTab);
      
      // Wait for reordering
      await page.waitForTimeout(500);
      
      // Verify order changed
      const newFirstTab = tabs.first();
      const newFirstTabText = await newFirstTab.textContent();
      
      // The text should be different
      expect(newFirstTabText).not.toBe(firstTabText);
      
      // Save changes button should be enabled
      const saveButton = page.locator('button:has-text("Save Changes")');
      await expect(saveButton).toBeEnabled();
      
      // Click save
      await saveButton.click();
      
      // Wait for success message
      await expect(page.locator('text=Menu order updated successfully')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/sidebar-tab-reorder-after-save.png' });
    } else {
      console.log('Not enough tabs to test reordering');
    }
  });
});
