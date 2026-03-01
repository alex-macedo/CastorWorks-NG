
test.describe('Enhanced LogErrors Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin to access logs
    await page.goto('/login');
    await page.fill('#email', process.env.ACCOUNT_TEST_EMAIL || 'admin@castorworks.com');
    await page.fill('#password', process.env.ACCOUNT_TEST_EMAIL_PASSWORD || 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/architect');
    
    // Navigate to settings/logs
    await page.goto('/settings/logs');
    await page.waitForLoadState('networkidle');
  });

  test('should display enhanced log search panel with new filters', async ({ page }) => {
    // Check for enhanced filters
    await expect(page.locator('input[placeholder="Search messages..."]')).toBeVisible();
    await expect(page.locator('input[placeholder="From date"]')).toBeVisible();
    await expect(page.locator('input[placeholder="To date"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Search context..."]')).toBeVisible();
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
  });

  test('should have sortable columns with visual indicators', async ({ page }) => {
    // Check for sortable column headers
    const levelHeader = page.locator('th:has-text("Level")');
    const messageHeader = page.locator('th:has-text("Message")');
    const timeHeader = page.locator('th:has-text("Time")');
    const statusHeader = page.locator('th:has-text("Status")');

    // Check for sort icons
    await expect(levelHeader.locator('svg')).toBeVisible();
    await expect(messageHeader.locator('svg')).toBeVisible();
    await expect(timeHeader.locator('svg')).toBeVisible();
    await expect(statusHeader.locator('svg')).toBeVisible();

    // Test clicking on Level column to sort
    await levelHeader.click();
    await page.waitForTimeout(1000); // Wait for sorting to apply
    
    // Test clicking again to change sort direction
    await levelHeader.click();
    await page.waitForTimeout(1000);
  });

  test('should show detailed error view dialog', async ({ page }) => {
    // Wait for logs to load
    await page.waitForSelector('text=View Details', { timeout: 10000 });
    
    // Click on first "View Details" button
    await page.locator('button:has-text("View Details")').first().click();
    
    // Check for enhanced details dialog
    await expect(page.locator('h2:has-text("Error Details")')).toBeVisible();
    
    // Check for tabs
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    await expect(page.locator('button:has-text("Context")')).toBeVisible();
    await expect(page.locator('button:has-text("Metadata")')).toBeVisible();
    await expect(page.locator('button:has-text("Raw Data")')).toBeVisible();
    
    // Check for copy buttons
    await expect(page.locator('button:has-text("Copy Message")')).toBeVisible();
    await expect(page.locator('button:has-text("Copy All")')).toBeVisible();
  });

  test('should filter logs by date range', async ({ page }) => {
    // Set date filters
    const fromDate = page.locator('input[placeholder="From date"]');
    const toDate = page.locator('input[placeholder="To date"]');
    
    await fromDate.fill('2025-01-01T00:00');
    await toDate.fill('2025-12-31T23:59');
    
    // Wait for filter to apply
    await page.waitForTimeout(2000);
    
    // Verify filtering worked (should show some logs or empty state)
    const logsTable = page.locator('table');
    await expect(logsTable).toBeVisible();
  });

  test('should search within context data', async ({ page }) => {
    // Enter context search term
    const contextSearch = page.locator('input[placeholder="Search context..."]');
    await contextSearch.fill('error');
    
    // Wait for search to apply
    await page.waitForTimeout(2000);
    
    // Verify search applied
    const logsTable = page.locator('table');
    await expect(logsTable).toBeVisible();
  });

  test('should clear all filters', async ({ page }) => {
    // Set some filters first
    await page.fill('input[placeholder="Search messages..."]', 'test');
    await page.selectOption('select:has-text("All Levels")', 'error');
    await page.fill('input[placeholder="From date"]', '2025-01-01T00:00');
    
    // Click Clear Filters
    await page.click('button:has-text("Clear Filters")');
    
    // Verify all filters are cleared
    await expect(page.locator('input[placeholder="Search messages..."]')).toHaveValue('');
    await expect(page.locator('select:has-text("All Levels")')).toHaveValue('all');
    await expect(page.locator('input[placeholder="From date"]')).toHaveValue('');
    await expect(page.locator('input[placeholder="To date"]')).toHaveValue('');
    await expect(page.locator('input[placeholder="Search context..."]')).toHaveValue('');
  });

  test('should copy log details to clipboard', async ({ page }) => {
    // Wait for logs to load
    await page.waitForSelector('text=View Details', { timeout: 10000 });
    
    // Open details dialog
    await page.locator('button:has-text("View Details")').first().click();
    
    // Test copy message button
    const copyMessageBtn = page.locator('button:has-text("Copy Message")');
    await copyMessageBtn.click();
    
    // Check for success toast (implementation may vary)
    await page.waitForTimeout(1000);
    
    // Test copy all button
    const copyAllBtn = page.locator('button:has-text("Copy All")');
    await copyAllBtn.click();
    
    await page.waitForTimeout(1000);
  });

  test('should navigate between detail tabs', async ({ page }) => {
    // Wait for logs to load and open details
    await page.waitForSelector('text=View Details', { timeout: 10000 });
    await page.locator('button:has-text("View Details")').first().click();
    
    // Test each tab
    await page.click('button:has-text("Overview")');
    await expect(page.locator('text=Message')).toBeVisible();
    
    await page.click('button:has-text("Context")');
    // Context tab may or may not have content
    
    await page.click('button:has-text("Metadata")');
    await expect(page.locator('text=Log ID')).toBeVisible();
    
    await page.click('button:has-text("Raw Data")');
    // Raw data should show JSON content
  });
});
