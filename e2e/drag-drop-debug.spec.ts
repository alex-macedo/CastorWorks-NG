
test.describe('Drag and Drop Debug', () => {
  test('debug dropdown options drag and drop', async ({ page }) => {
    // Use test credentials from environment
    const testEmail = process.env.ACCOUNT_TEST_EMAIL || 'admin@castorworks.com';
    const testPassword = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || 'admin123';
    
    console.log('Using test credentials:', { email: testEmail });
    
    // Go to login page
    await page.goto('http://localhost:5173/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('**/architect', { timeout: 10000 });
    
    console.log('Successfully logged in');
    
    // Navigate to Settings
    await page.click('text=Settings');
    await page.waitForURL('**/settings', { timeout: 5000 });
    
    console.log('Navigated to Settings');
    
    // Navigate to Business Settings -> Dropdown Options
    await page.click('text=Business Settings');
    await page.waitForTimeout(1000);
    
    const dropdownOptionsLink = await page.locator('text=Dropdown Options').first();
    const hasDropdownOptions = await dropdownOptionsLink.isVisible();
    
    if (hasDropdownOptions) {
      await dropdownOptionsLink.click();
      console.log('Clicked Dropdown Options');
    } else {
      console.log('Dropdown Options not found, looking for alternative...');
      // Try to find any link containing "dropdown"
      await page.click('a:has-text("dropdown")', { timeout: 5000 }).catch(() => {
        console.log('No dropdown link found');
      });
    }
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check page content
    const pageContent = await page.content();
    console.log('Page has content:', pageContent.length > 0);
    
    // Look for any debug info
    const debugInfo = await page.locator('.bg-blue-100, .border-blue-500, [class*="debug"]').first();
    const hasDebugInfo = await debugInfo.isVisible().catch(() => false);
    
    if (hasDebugInfo) {
      const debugText = await debugInfo.textContent();
      console.log('DEBUG INFO FOUND:', debugText);
    }
    
    // Look for Task Status tab
    const taskStatusTab = await page.locator('text=Task Status').first();
    const hasTaskStatusTab = await taskStatusTab.isVisible().catch(() => false);
    console.log('Task Status tab visible:', hasTaskStatusTab);
    
    if (hasTaskStatusTab) {
      await taskStatusTab.click();
      await page.waitForTimeout(1000);
      console.log('Clicked Task Status tab');
    }
    
    // Check for table elements
    const table = await page.locator('table').first();
    const hasTable = await table.isVisible().catch(() => false);
    console.log('Table visible:', hasTable);
    
    if (hasTable) {
      const rows = await table.locator('tr').all();
      console.log('Table rows found:', rows.length);
      
      // Check first few rows for content
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        const rowText = await rows[i].textContent();
        console.log(`Row ${i}:`, rowText);
      }
    }
    
    // Check for drag handles
    const dragHandles = await page.locator('.cursor-grab, svg[class*="grip"], [data-dnd]').all();
    console.log('Potential drag handles found:', dragHandles.length);
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'drag-drop-debug.png', fullPage: true });
    console.log('Screenshot saved as drag-drop-debug.png');
    
    // Check console for any errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const message = msg.text();
      consoleMessages.push(message);
      if (message.includes('🔧') || message.includes('ERROR')) {
        console.log('Browser console:', message);
      }
    });
    
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });
    
    // Wait a bit more to capture any console output
    await page.waitForTimeout(5000);
    
    // Print all console messages for debugging
    console.log('All console messages:', consoleMessages);
  });
});
