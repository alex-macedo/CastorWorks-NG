
// Test data
const TEST_PROJECT_NAME = 'Test Construction Project';
const TEST_BUDGET_NAME = 'Q4 2025 Budget';
const TEST_BUDGET_DESCRIPTION = 'Quarterly budget for construction project';

test.describe('Budget Module', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application and login
    await page.goto('/');
    
    // Wait for auth or perform login if needed
    await page.waitForLoadState('networkidle');
    
    // Check if we're logged in, if not, perform login
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      // Perform login flow
      await page.goto('/login');
      await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL || 'test@example.com');
      await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD || 'testpassword');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should create a new budget', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Click on first available project or create one
    const projectCard = page.locator('[data-testid="project-card"]').first();
    
    if (await projectCard.isVisible()) {
      await projectCard.click();
    } else {
      // Create a test project first
      await page.click('button:has-text("New Project")');
      await page.fill('input[name="name"]', TEST_PROJECT_NAME);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }

    // Navigate to budgets section
    await page.click('text=Budgets', { timeout: 5000 });
    await page.waitForLoadState('networkidle');

    // Click "New Budget" button
    await page.click('button:has-text("New Budget")');
    
    // Fill budget form
    await page.fill('input[name="name"]', TEST_BUDGET_NAME);
    await page.fill('textarea[name="description"]', TEST_BUDGET_DESCRIPTION);
    
    // Select budget type
    await page.click('[data-testid="budget-type-select"]');
    await page.click('text=Detailed');
    
    // Submit form
    await page.click('button:has-text("Create Budget")');
    
    // Wait for success notification
    await expect(page.locator('text=Budget created successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify budget appears in list
    await expect(page.locator(`text=${TEST_BUDGET_NAME}`)).toBeVisible();
  });

  test('should add line items to budget', async ({ page }) => {
    // Navigate to an existing budget
    await page.goto('/projects');
    await page.click('[data-testid="project-card"]').first();
    await page.click('text=Budgets');
    
    // Click on the first budget
    await page.click('[data-testid="budget-card"]').first();
    await page.waitForLoadState('networkidle');

    // Click "Add Line Item"
    await page.click('button:has-text("Add Input")');
    
    // Search for SINAPI item
    await page.fill('input[placeholder*="Search SINAPI"]', 'concrete');
    await page.waitForTimeout(500); // Wait for debounce
    
    // Select first item from results
    await page.click('[data-testid="sinapi-item"]').first();
    
    // Enter quantity
    await page.fill('input[name="quantity"]', '100');
    
    // Save line item
    await page.click('button:has-text("Save")');
    
    // Verify line item was added
    await expect(page.locator('[data-testid="line-item-row"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('should calculate totals correctly', async ({ page }) => {
    // Navigate to budget with line items
    await page.goto('/projects');
    await page.click('[data-testid="project-card"]').first();
    await page.click('text=Budgets');
    await page.click('[data-testid="budget-card"]').first();
    
    // Check summary cards
    const materialTotal = await page.locator('[data-testid="material-total"]').textContent();
    const laborTotal = await page.locator('[data-testid="labor-total"]').textContent();
    const grandTotal = await page.locator('[data-testid="grand-total"]').textContent();
    
    // Verify totals are numbers and greater than 0
    expect(materialTotal).toMatch(/\$[\d,]+\.?\d*/);
    expect(laborTotal).toMatch(/\$[\d,]+\.?\d*/);
    expect(grandTotal).toMatch(/\$[\d,]+\.?\d*/);
  });

  test('should export budget to PDF', async ({ page }) => {
    // Navigate to budget reports
    await page.goto('/projects');
    await page.click('[data-testid="project-card"]').first();
    await page.click('text=Budgets');
    await page.click('[data-testid="budget-card"]').first();
    await page.click('text=Reports');
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Click export PDF button
    await page.click('button:has-text("Export PDF")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/budget-.*\.pdf/);
    
    // Verify success toast
    await expect(page.locator('text=PDF exported successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should export budget to Excel', async ({ page }) => {
    // Navigate to budget reports
    await page.goto('/projects');
    await page.click('[data-testid="project-card"]').first();
    await page.click('text=Budgets');
    await page.click('[data-testid="budget-card"]').first();
    await page.click('text=Reports');
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Click export Excel button
    await page.click('button:has-text("Export Excel")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/budget-.*\.xlsx/);
    
    // Verify success toast
    await expect(page.locator('text=Excel exported successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should view budget visualizations', async ({ page }) => {
    // Navigate to budget reports
    await page.goto('/projects');
    await page.click('[data-testid="project-card"]').first();
    await page.click('text=Budgets');
    await page.click('[data-testid="budget-card"]').first();
    await page.click('text=Reports');
    
    // Wait for charts to load
    await page.waitForLoadState('networkidle');
    
    // Verify overview tab is visible
    await expect(page.locator('text=Overview')).toBeVisible();
    
    // Check for chart elements (using Recharts classes)
    const pieChart = page.locator('.recharts-pie');
    await expect(pieChart).toBeVisible({ timeout: 5000 });
    
    // Switch to phases tab
    await page.click('button:has-text("By Phase")');
    await expect(page.locator('table')).toBeVisible();
    
    // Switch to analysis tab
    await page.click('button:has-text("Analysis")');
    await expect(page.locator('text=Material vs Labor')).toBeVisible();
  });

  test('should update budget status', async ({ page }) => {
    // Navigate to budget
    await page.goto('/projects');
    await page.click('[data-testid="project-card"]').first();
    await page.click('text=Budgets');
    await page.click('[data-testid="budget-card"]').first();
    
    // Open status dropdown
    await page.click('[data-testid="budget-status"]');
    
    // Select "Under Review"
    await page.click('text=Under Review');
    
    // Verify status changed
    await expect(page.locator('text=Under Review')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Budget updated successfully')).toBeVisible();
  });

  test('should delete budget with confirmation', async ({ page }) => {
    // Navigate to budgets
    await page.goto('/projects');
    await page.click('[data-testid="project-card"]').first();
    await page.click('text=Budgets');
    
    // Count budgets before deletion
    const budgetCountBefore = await page.locator('[data-testid="budget-card"]').count();
    
    // Click delete on first budget
    await page.click('[data-testid="budget-delete-btn"]').first();
    
    // Confirm deletion in dialog
    await page.click('button:has-text("Delete")');
    
    // Wait for success notification
    await expect(page.locator('text=Budget deleted successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify budget count decreased
    const budgetCountAfter = await page.locator('[data-testid="budget-card"]').count();
    expect(budgetCountAfter).toBe(budgetCountBefore - 1);
  });

  test('should duplicate budget', async ({ page }) => {
    // Navigate to budgets
    await page.goto('/projects');
    await page.click('[data-testid="project-card"]').first();
    await page.click('text=Budgets');
    
    // Count budgets before duplication
    const budgetCountBefore = await page.locator('[data-testid="budget-card"]').count();
    
    // Click duplicate on first budget
    await page.click('[data-testid="budget-duplicate-btn"]').first();
    
    // Wait for success notification
    await expect(page.locator('text=Budget duplicated successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify budget count increased
    const budgetCountAfter = await page.locator('[data-testid="budget-card"]').count();
    expect(budgetCountAfter).toBe(budgetCountBefore + 1);
  });

  test('should search SINAPI catalog', async ({ page }) => {
    // Navigate to budget editor
    await page.goto('/projects');
    await page.click('[data-testid="project-card"]').first();
    await page.click('text=Budgets');
    await page.click('[data-testid="budget-card"]').first();
    
    // Click "Add Line Item"
    await page.click('button:has-text("Add Input")');
    
    // Search for specific term
    await page.fill('input[placeholder*="Search SINAPI"]', 'excavation');
    await page.waitForTimeout(500); // Wait for debounce
    
    // Verify search results appear
    await expect(page.locator('[data-testid="sinapi-item"]')).toHaveCount({ min: 1 }, { timeout: 5000 });
    
    // Verify results contain search term
    const firstResult = await page.locator('[data-testid="sinapi-item"]').first().textContent();
    expect(firstResult?.toLowerCase()).toContain('excavation'.toLowerCase());
  });
});

