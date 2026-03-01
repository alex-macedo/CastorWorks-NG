const fs = require('fs');

module.exports = async (page, context) => {
  const base = process.env.BASE_URL || 'http://localhost:5173';
  const email = process.env.ACCOUNT_TEST_EMAIL;
  const pass = process.env.ACCOUNT_TEST_EMAIL_PASSWORD;

  if (!email || !pass) {
    throw new Error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in environment');
  }

  console.log('🔍 Starting Timeline Circle Colors Verification...');
  
  // Login
  console.log('📝 Logging in...');
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', pass);
  await page.click('button[type=submit]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });

  // Navigate to timeline
  console.log('📊 Navigating to timeline...');
  await page.goto(`${base}/timeline`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Take screenshot
  console.log('📸 Taking screenshot...');
  await page.screenshot({ path: 'test-results/timeline-verification.png', fullPage: true });

  // Check for timeline circles
  const circles = await page.$$('[data-testid^="timeline-circle-"]');
  console.log(`🔵 Found ${circles.length} timeline circles`);

  // Analyze planned vs executed circles
  const plannedCircles = await page.$$('[data-testid^="timeline-circle-planned-"]');
  const executedCircles = await page.$$('[data-testid^="timeline-circle-executed-"]');
  
  console.log(`🔵 Found ${plannedCircles.length} planned circles`);
  console.log(`🔵 Found ${executedCircles.length} executed circles`);
  
  // Check if planned and executed circles have same colors
  for (let i = 0; i < Math.min(plannedCircles.length, 3); i++) {
    const plannedCircle = plannedCircles[i];
    const executedCircle = executedCircles[i];
    
    const plannedTestId = await plannedCircle.getAttribute('data-testid');
    const executedTestId = await executedCircle.getAttribute('data-testid');
    
    const plannedColor = await page.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    }, plannedCircle);
    
    const executedColor = await page.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    }, executedCircle);
    
    console.log(`Planned ${i + 1} (${plannedTestId}): ${plannedColor}`);
    console.log(`Executed ${i + 1} (${executedTestId}): ${executedColor}`);
    console.log(`Colors match: ${plannedColor === executedColor ? '✅' : '❌'}`);
    console.log('---');
  }

  // Check legend
  const legendItems = await page.$$('.mt-3 .flex.items-center.gap-2');
  console.log(`📋 Found ${legendItems.length} legend items`);

  for (let i = 0; i < legendItems.length; i++) {
    const item = legendItems[i];
    const text = await item.textContent();
    const colorElement = await item.$('span');
    const bgColor = await page.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    }, colorElement);
    
    console.log(`Legend ${i + 1}: ${text} - ${bgColor}`);
  }

  // Check upcoming definitions
  const upcomingDefs = await page.$('text="Upcoming definitions"');
  if (upcomingDefs) {
    console.log('📝 Found Upcoming definitions section');
    const upcomingSection = upcomingDefs.parentElement.parentElement;
    await upcomingSection.screenshot({ path: 'test-results/upcoming-definitions.png' });
  }

  console.log('✅ Timeline verification complete!');
  return {
    circlesFound: circles.length,
    legendItemsFound: legendItems.length,
    upcomingDefinitionsFound: upcomingDefs ? 1 : 0
  };
};
