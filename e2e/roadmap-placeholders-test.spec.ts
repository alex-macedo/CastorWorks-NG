
/**
 * Test: Verify Roadmap Placeholder Translations
 * 
 * This test verifies that all roadmap placeholders display correctly
 * in the UI after fixing the empty translation strings bug.
 * 
 * Bug Context: All roadmap translation keys in all 4 language files
 * contained empty strings (""), causing blank placeholders.
 */

const TEST_EMAIL = process.env.ACCOUNT_TEST_EMAIL || 'alex.macedo.ca@gmail.com';
const TEST_PASSWORD = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || '#yf7w*F2IR8^mdMa';

test.describe('Roadmap Placeholders', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set longer timeout for this hook
    test.setTimeout(60000);
    
    // Clear all cookies and storage to force fresh load
    await context.clearCookies();
    await context.clearPermissions();
    
    // Navigate to login page with cache bypass
    await page.goto('http://localhost:5173/login?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // Fill in login credentials
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Click sign in button
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000); // Wait for auth to complete
    
    // Now navigate directly to roadmap page with cache bypass
    await page.goto('http://localhost:5173/roadmap?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Wait for i18n to load and page to render
  });

  test('should display search placeholder', async ({ page }) => {
    // Look for search input with placeholder
    const searchInput = page.locator('input[type="search"], input[placeholder*="roadmap"], input[placeholder*="Search"]').first();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/roadmap-search-input.png', fullPage: false });
    
    // Verify placeholder is not empty
    const placeholder = await searchInput.getAttribute('placeholder');
    console.log('Search placeholder:', placeholder);
    
    expect(placeholder).toBeTruthy();
    expect(placeholder).not.toBe('');
    expect(placeholder?.length).toBeGreaterThan(5);
  });

  test('should display placeholders when creating new item', async ({ page }) => {
    // Look for "New Item" or "Create" button
    const newItemButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Novo"), button:has-text("Crear"), button:has-text("Créer")').first();
    
    if (await newItemButton.isVisible()) {
      // Click to open dialog
      await newItemButton.click();
      
      // Wait for dialog to appear
      await page.waitForTimeout(1000);
      
      // Take screenshot of dialog
      await page.screenshot({ path: 'test-results/roadmap-new-item-dialog.png', fullPage: true });
      
      // Check for title input placeholder
      const titleInput = page.locator('input[placeholder*="title"], input[placeholder*="título"], input[placeholder*="titre"]').first();
      if (await titleInput.isVisible()) {
        const titlePlaceholder = await titleInput.getAttribute('placeholder');
        console.log('Title placeholder:', titlePlaceholder);
        expect(titlePlaceholder).toBeTruthy();
        expect(titlePlaceholder).not.toBe('');
      }
      
      // Check for description textarea placeholder
      const descriptionTextarea = page.locator('textarea[placeholder*="description"], textarea[placeholder*="descrição"], textarea[placeholder*="descripción"]').first();
      if (await descriptionTextarea.isVisible()) {
        const descPlaceholder = await descriptionTextarea.getAttribute('placeholder');
        console.log('Description placeholder:', descPlaceholder);
        expect(descPlaceholder).toBeTruthy();
        expect(descPlaceholder).not.toBe('');
      }
    } else {
      console.log('New item button not found - roadmap might be in different state');
    }
  });

  test('should display category filter placeholder', async ({ page }) => {
    // Look for category filter/select
    const categoryFilter = page.locator('select, button:has-text("Categor"), button:has-text("All")').first();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/roadmap-filters.png', fullPage: false });
    
    if (await categoryFilter.isVisible()) {
      const text = await categoryFilter.textContent();
      console.log('Category filter text:', text);
      expect(text).toBeTruthy();
      expect(text).not.toBe('');
    }
  });

  test('full page screenshot for manual verification', async ({ page }) => {
    // Take full page screenshot
    await page.screenshot({ path: 'test-results/roadmap-full-page.png', fullPage: true });
    
    console.log('Full page screenshot saved to test-results/roadmap-full-page.png');
  });
});
