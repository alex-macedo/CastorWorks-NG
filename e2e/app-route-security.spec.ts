test('/app route redirects to login when not authenticated', async ({ page }) => {
  // Clear any existing session data
  await page.goto('http://localhost:5173/login')
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Try to access /app without being logged in
  await page.goto('http://localhost:5173/app');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot for verification
  await page.screenshot({ path: 'test-results/app-route-unauthorized.png', fullPage: true });
  
  // Should be redirected to login page
  const currentUrl = page.url();
  console.log('Current URL after accessing /app:', currentUrl);
  
  // Verify we're on the login page
  expect(currentUrl).toContain('/login');
  
  // Verify login page content is shown, not app content
  const hasLoginForm = await page.locator('input[type="email"]').isVisible().catch(() => false);
  const hasPasswordField = await page.locator('input[type="password"]').isVisible().catch(() => false);
  
  expect(hasLoginForm).toBe(true);
  expect(hasPasswordField).toBe(true);
  
  // Make sure app content is NOT visible
  const bodyContent = await page.locator('body').innerHTML();
  const hasAppContent = bodyContent.includes('AppDashboard') || 
                        bodyContent.includes('bottom navigation') ||
                        bodyContent.includes('mobile-dashboard');
  
  console.log('Has app content:', hasAppContent);
  expect(hasAppContent).toBe(false);
});

test('/app route accessible when authenticated', async ({ page }) => {
  // First login
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  
  const email = process.env.ACCOUNT_TEST_EMAIL || 'test@example.com';
  const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || 'password';
  
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for login to complete
  await page.waitForTimeout(5000);
  
  // Now navigate to /app
  await page.goto('http://localhost:5173/app');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/app-route-authenticated.png', fullPage: true });
  
  // Should still be on /app (not redirected)
  const currentUrl = page.url();
  console.log('Current URL after accessing /app while authenticated:', currentUrl);
  
  expect(currentUrl).toContain('/app');
  
  // Verify app content is visible (look for mobile app layout indicators)
  const bodyContent = await page.locator('body').innerHTML();
  const hasAppContent = bodyContent.includes('Dashboard') || 
                        bodyContent.includes('Quick Actions') ||
                        bodyContent.includes('bottom-0') ||
                        bodyContent.includes('Tasks') ||
                        bodyContent.includes('Chat');
  
  console.log('Has app content:', hasAppContent);
  expect(hasAppContent).toBe(true);
});
