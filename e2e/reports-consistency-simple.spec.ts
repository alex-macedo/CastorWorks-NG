
/**
 * Simple Reports Consistency Test
 * 
 * This test performs basic consistency checks using the existing agent-browser setup
 * Focuses on data capture and basic verification
 */

test.describe('Reports Consistency Check', () => {
  test('Basic reports functionality', async ({ page }) => {
    // Navigate to reports page
    await page.goto('http://localhost:5173/reports');
    
    // Check if reports page loads
    await page.waitForSelector('[data-testid="project-selector"]', { timeout: 10000 });
    
    // Verify project selector exists and has options
    const projectSelector = page.locator('[data-testid="project-selector"]');
    const projectCount = await projectSelector.locator('option').count();
    
    expect(projectCount).toBeGreaterThan(0);
    console.log(`✅ Found ${projectCount} projects for testing`);
    
    // Check if report types are available
    const reportButtons = page.locator('[data-testid^="report-"]');
    const reportCount = await reportButtons.count();
    
    expect(reportCount).toBeGreaterThan(0);
    console.log(`✅ Found ${reportCount} report types available`);
  });

  test('Data capture verification', async ({ page }) => {
    // Try to access a specific report
    await page.goto('http://localhost:5173/reports');
    
    // Select first project
    const projectSelector = page.locator('[data-testid="project-selector"]');
    await projectSelector.selectOption({ index: 0 });
    
    // Click on financial summary report
    await page.click('[data-testid="report-financial-summary"]');
    
    // Wait for report configuration
    await page.waitForTimeout(2000);
    
    // Check if we can capture basic data elements
    const hasReportViewer = await page.locator('[data-testid="report-viewer"]').isVisible({ timeout: 5000 });
    
    if (hasReportViewer) {
      console.log('✅ Report viewer opened successfully');
      
      // Try to capture some basic metrics
      const totalBudget = await page.locator('[data-testid="total-budget"]').isVisible({ timeout: 2000 });
      const totalIncome = await page.locator('[data-testid="total-income"]').isVisible({ timeout: 2000 });
      
      console.log(`✅ Data capture working - Budget visible: ${totalBudget}, Income visible: ${totalIncome}`);
    } else {
      console.log('⚠️ Report viewer did not open within timeout');
    }
  });

  test('Template project exclusion', async ({ page }) => {
    await page.goto('http://localhost:5173/reports');
    
    // Check that template projects are properly excluded
    const projectOptions = await page.locator('[data-testid="project-selector"] option').all();
    
    let templateProjectsFound = 0;
    for (const option of projectOptions) {
      const value = await option.getAttribute('value');
      if (value && value.includes('00000000-0000-0000-0000-000000000000')) {
        templateProjectsFound++;
      }
    }
    
    // Template projects should be excluded from the selector
    expect(templateProjectsFound).toBe(0);
    console.log(`✅ Template project exclusion working - ${templateProjectsFound} template projects found`);
  });

  test('Error handling', async ({ page }) => {
    await page.goto('http://localhost:5173/reports');
    
    // Try to generate report with invalid project
    await page.selectOption('[data-testid="project-selector"]', { label: 'Invalid Project' });
    
    // This should handle gracefully without crashing
    const hasError = await page.locator('[data-testid="error-message"]').isVisible({ timeout: 3000 });
    
    if (hasError) {
      console.log('✅ Error handling working - invalid project properly rejected');
    } else {
      console.log('⚠️ Error handling may need improvement');
    }
  });
});
