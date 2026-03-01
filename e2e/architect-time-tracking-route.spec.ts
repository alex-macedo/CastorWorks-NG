
test.describe('Architect Time Tracking Route', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'alex.macedo.ca@gmail.com');
    await page.fill('input[type="password"]', '#yf7w*F2IR8^mdMa');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });
  });

  test('should navigate to /architect/time-tracking successfully', async ({ page }) => {
    // Navigate directly to the time tracking page
    await page.goto('http://localhost:5173/architect/time-tracking');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the correct page
    expect(page.url()).toContain('/architect/time-tracking');
    
    // Verify the page has loaded by checking for time tracking elements
    // Check for tabs (timeline, timesheet, reports)
    await expect(page.locator('text=/Timeline|Timesheet|Reports/i').first()).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Successfully navigated to /architect/time-tracking');
  });

  test('should access time tracking via sidebar navigation', async ({ page }) => {
    // Navigate to architect dashboard
    await page.goto('http://localhost:5173/architect');
    
    // Wait for page to be fully loaded
    await page.waitForSelector('a[href="/architect/time-tracking"]', { timeout: 10000 });
    
    // Find and click the time tracking link in the sidebar
    const timesheetLink = page.locator('a[href="/architect/time-tracking"]');
    
    await expect(timesheetLink).toBeVisible();
    await timesheetLink.click();
    
    // Wait for navigation
    await page.waitForURL('**/architect/time-tracking', { timeout: 10000 });
    
    // Verify we're on the correct page
    expect(page.url()).toContain('/architect/time-tracking');
    
    console.log('✅ Successfully navigated via sidebar to /architect/time-tracking');
  });

  test('new route /architect/time-tracking should be accessible', async ({ page }) => {
    // Navigate to the new route
    await page.goto('http://localhost:5173/architect/time-tracking');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we successfully loaded the time tracking page (not a 404 or error page)
    expect(page.url()).toContain('/architect/time-tracking');
    
    // Verify the page has time tracking content
    await expect(page.locator('text=/Timeline|Timesheet|Reports/i').first()).toBeVisible({ timeout: 10000 });
    
    console.log('✅ New route /architect/time-tracking is accessible');
  });
});
