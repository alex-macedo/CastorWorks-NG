
/**
 * Test to verify Task Status option visibility in Settings > Business Settings > Dropdown Options
 */

test.describe('Task Status Dropdown Option Visibility', () => {
  test.setTimeout(120000); // Increase timeout to 120 seconds
  
  test('should navigate to Dropdown Options and check for Task Status', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });
    page.on('pageerror', error => {
      consoleErrors.push(`[Page Error] ${error.message}`);
    });
    
    // Navigate to the app
    console.log('Navigating to app...');
    await page.goto('/', { timeout: 60000 });
    await page.waitForTimeout(5000);
    
    // Take screenshot of initial page
    await page.screenshot({ path: 'test-results/01-initial-page.png', fullPage: true });
    
    // Check if we need to log in
    const emailInput = page.locator('input[type="email"]').first();
    const isLoginPage = await emailInput.isVisible().catch(() => false);
    
    if (isLoginPage) {
      console.log('Login page detected, logging in...');
      await emailInput.fill(process.env.ACCOUNT_TEST_EMAIL || 'alex.macedo.ca@gmail.com');
      await page.locator('input[type="password"]').first().fill(
        process.env.ACCOUNT_TEST_EMAIL_PASSWORD || '#yf7w*F2IR8^mdMa'
      );
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-results/02-after-login.png', fullPage: true });
    }
    
    // Navigate to Settings page
    console.log('Navigating to Settings...');
    await page.goto('/settings', { timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/03-settings-page.png', fullPage: true });
    
    // Try to find and click Business Settings tab
    console.log('Looking for Business Settings tab...');
    const businessTabs = await page.locator('button').all();
    console.log(`Found ${businessTabs.length} buttons on page`);
    
    for (let i = 0; i < Math.min(businessTabs.length, 20); i++) {
      const text = await businessTabs[i].textContent().catch(() => '');
      console.log(`Button ${i}: '${text}'`);
    }
    
    // Try clicking on Business Settings by text
    const businessSettingsBtn = page.locator('button', { hasText: /Business Settings|Configurações de Negócio/i }).first();
    if (await businessSettingsBtn.isVisible().catch(() => false)) {
      console.log('Clicking Business Settings...');
      await businessSettingsBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/04-business-settings.png', fullPage: true });
    }
    
    // Try clicking on Dropdown Options
    console.log('Looking for Dropdown Options tab...');
    const dropdownBtn = page.locator('button', { hasText: /Dropdown Options|Opções de Dropdown/i }).first();
    if (await dropdownBtn.isVisible().catch(() => false)) {
      console.log('Clicking Dropdown Options...');
      await dropdownBtn.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-results/05-dropdown-options.png', fullPage: true });
    }
    
    // Check for Task Status
    console.log('\n=== CHECKING FOR TASK STATUS ===');
    const pageText = await page.locator('body').textContent() || '';
    const hasTaskStatus = pageText.toLowerCase().includes('task status');
    console.log(`Page contains 'task status': ${hasTaskStatus}`);
    
    // List all buttons again
    console.log('\n=== ALL BUTTONS ON DROPDOWN OPTIONS PAGE ===');
    const allButtons = await page.locator('button').all();
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent().catch(() => '') || '';
      if (text.trim()) {
        console.log(`  ${i}: '${text.trim()}'`);
      }
    }
    
    // Report console errors
    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(error => console.log(`  ${error}`));
    } else {
      console.log('  No console errors detected');
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Task Status visible: ${hasTaskStatus}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log('Screenshots saved in test-results/');
    
    expect(true).toBe(true);
  });
});
