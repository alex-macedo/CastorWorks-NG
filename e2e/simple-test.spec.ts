
test('Simple app load test', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  
  // Add console logging
  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[ERROR] ${err.message}`));
  
  console.log('\n🌐 Starting test - navigating to http://localhost:5173');
  await page.goto('http://localhost:5173');
  
  console.log('⏳ Waiting 3 seconds for app to load...');
  await page.waitForTimeout(3000);
  
  // Get page info
  const title = await page.title();
  const url = page.url();
  console.log(`📄 Title: ${title}`);
  console.log(`🔗 URL: ${url}`);
  
  // Get full page text
  const allText = await page.evaluate(() => document.body.innerText);
  console.log(`\n📝 Page content preview:\n${allText.substring(0, 500)}`);
  
  // Check for key elements
  const hasInputs = await page.locator('input').count();
  const hasButtons = await page.locator('button').count();
  console.log(`\n🔍 Page elements:`);
  console.log(`   Inputs: ${hasInputs}`);
  console.log(`   Buttons: ${hasButtons}`);
  
  // Look for email input
  const emailInput = page.locator('input[type="email"]').first();
  const emailExists = await emailInput.isVisible().catch(() => false);
  console.log(`   Email input visible: ${emailExists}`);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/app-load.png', fullPage: true });
  console.log('\n📸 Screenshot saved to test-results/app-load.png');
});
