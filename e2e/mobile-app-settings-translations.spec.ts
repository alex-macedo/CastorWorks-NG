
test.describe('Mobile App Settings Translations', () => {
  const BASE_URL = 'http://localhost:5173';
  const LOGIN_URL = `${BASE_URL}/login`;
  const SETTINGS_URL = `${BASE_URL}/app/settings`;
  
  // Test credentials from .env
  const TEST_EMAIL = process.env.ACCOUNT_TEST_EMAIL || 'alex.macedo.ca@gmail.com';
  const TEST_PASSWORD = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || '#yf7w*F2IR8^mdMa';

  // Helper function to login
  async function loginUser(page: any) {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
    
    // Fill email
    await page.fill('input[type="email"]', TEST_EMAIL);
    
    // Fill password
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Click submit button
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForURL((url: string) => !url.includes('/login'), { timeout: 10000 }).catch(() => {});
      await page.waitForLoadState('networkidle');
    }
  }

  test.beforeEach(async ({ page, context }) => {
    // Create a new context to ensure clean state
    await context.clearCookies();
  });

  test('Settings page should display all translations in English', async ({ page }) => {
    await loginUser(page);
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');
    
    // Check for English text
    const bodyText = await page.textContent('body');
    
    // Should contain English labels, NOT translation keys
    expect(bodyText).toContain('Profile');
    expect(bodyText).toContain('Company');
    expect(bodyText).toContain('Localization');
    expect(bodyText).toContain('Language');
    expect(bodyText).toContain('Currency');
    expect(bodyText).toContain('Theme');
    
    // Should NOT contain raw translation keys
    expect(bodyText).not.toContain('settings.profile');
    expect(bodyText).not.toContain('settings.company');
    expect(bodyText).not.toContain('settings.localization');
    expect(bodyText).not.toContain('settings.language');
    expect(bodyText).not.toContain('settings.currency');
    expect(bodyText).not.toContain('settings.theme');
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/settings-english.png', fullPage: true });
  });

  test('Settings page should display all translations in Portuguese', async ({ page }) => {
    await loginUser(page);
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');
    
    // Switch to Portuguese
    const ptButton = page.locator('button').filter({ hasText: /pt|PT|português|Português/ }).first();
    
    if (await ptButton.isVisible().catch(() => false)) {
      await ptButton.click();
      await page.waitForTimeout(500);
    }
    
    // Navigate to settings again to ensure translations are applied
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');
    
    const bodyText = await page.textContent('body');
    
    // Should contain Portuguese labels, NOT translation keys
    expect(bodyText).toContain('Perfil');
    expect(bodyText).toContain('Empresa');
    expect(bodyText).toContain('Localização');
    expect(bodyText).toContain('Idioma');
    expect(bodyText).toContain('Moeda');
    expect(bodyText).toContain('Tema');
    
    // Should NOT contain raw translation keys
    expect(bodyText).not.toContain('settings.profile');
    expect(bodyText).not.toContain('settings.company');
    expect(bodyText).not.toContain('settings.localization');
    expect(bodyText).not.toContain('settings.language');
    expect(bodyText).not.toContain('settings.currency');
    expect(bodyText).not.toContain('settings.theme');
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/settings-portuguese.png', fullPage: true });
  });

  test('Settings translations should load correctly without showing raw i18n keys', async ({ page }) => {
    await loginUser(page);
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');
    
    const bodyText = await page.textContent('body') || '';
    
    // Check that NO translation keys are displayed as raw text
    const hasTranslationKeys = /settings\.[a-zA-Z]+/.test(bodyText);
    
    // Should be false - no raw keys should be visible
    expect(hasTranslationKeys).toBe(false);
    
    // Should have actual translated content
    expect(bodyText.length).toBeGreaterThan(100);
    
    console.log('Settings translations loaded correctly - no raw i18n keys found');
    
    await page.screenshot({ path: 'test-results/settings-no-raw-keys.png', fullPage: true });
  });
});
