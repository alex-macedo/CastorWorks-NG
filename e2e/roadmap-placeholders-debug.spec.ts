
test.describe('Roadmap Placeholders - Debug Translation Loading', () => {
  test.beforeEach(async ({ page, context }) => {
    // Listen to console logs
    page.on('console', msg => {
      if (msg.text().includes('[LocalizationContext]') || msg.text().includes('roadmap')) {
        console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
      }
    });
    
    // Clear all browser storage and cache
    await context.clearCookies();
    await context.clearPermissions();
    await page.goto('http://localhost:5173');
    
    // Clear localStorage, sessionStorage, and IndexedDB
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      indexedDB.databases().then((dbs) => {
        dbs.forEach((db) => {
          if (db.name) indexedDB.deleteDatabase(db.name);
        });
      });
    });

    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'alex.macedo.ca@gmail.com');
    await page.fill('input[type="password"]', '#yf7w*F2IR8^mdMa');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete (login redirects to / or /supervisor/hub)
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });
  });

  test('should load and display translated placeholders correctly', async ({ page }) => {
    // Navigate to roadmap page
    await page.goto('http://localhost:5173/roadmap');
    
    // Wait for page to fully load and i18n to initialize
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give i18n time to initialize and re-render
    
    console.log('=== Page loaded, checking i18n status ===');
    
    // Check i18n status in browser console
    const i18nStatus = await page.evaluate(() => {
      // @ts-expect-error - accessing global i18n for debugging
      const i18n = window.i18next || window.i18n;
      if (!i18n) return { error: 'i18next not found on window' };
      
      return {
        language: i18n.language,
        isInitialized: i18n.isInitialized,
        searchPlaceholder: i18n.t('roadmap.searchPlaceholder'),
        allCategories: i18n.t('roadmap.allCategories'),
        titlePlaceholder: i18n.t('roadmap.titlePlaceholder'),
        // Check if the translation exists in resources
        hasRoadmapTranslations: !!i18n.store?.data?.[i18n.language]?.translation?.roadmap,
        availableLanguages: i18n.languages,
      };
    });
    
    console.log('i18n Status:', JSON.stringify(i18nStatus, null, 2));
    
    // Take screenshot of the page
    await page.screenshot({ 
      path: 'test-results/roadmap-debug-full-page.png',
      fullPage: true 
    });
    
    // Check search input placeholder - look for the ROADMAP page search input specifically
    // The page has multiple search inputs (TopBar + Roadmap page), we want the one inside the main content area
    const searchInput = page.locator('main').locator('input[placeholder]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Wait for the placeholder to be translated (it should change from "searchPlaceholder" to actual text)
    await page.waitForFunction(() => {
      const input = document.querySelector('main input[placeholder]') as HTMLInputElement;
      return input && input.placeholder !== 'searchPlaceholder' && input.placeholder !== '';
    }, { timeout: 10000 }).catch(() => {
      console.log('Timeout waiting for search placeholder to be translated');
    });
    
    const searchPlaceholder = await searchInput.getAttribute('placeholder');
    console.log('Roadmap page search input placeholder:', searchPlaceholder);
    
    await page.screenshot({ 
      path: 'test-results/roadmap-debug-search-input.png'
    });
    
    // Check category filter
    const categoryFilter = page.locator('button').filter({ hasText: /categor/i }).first();
    const categoryText = await categoryFilter.textContent();
    console.log('Category filter text:', categoryText);
    
    // Assertions
    expect(searchPlaceholder).not.toBe('searchPlaceholder');
    expect(searchPlaceholder).not.toBe('');
    expect(categoryText).not.toContain('allCategories');
    
    // Should contain actual translated text
    if (i18nStatus.language === 'en-US' || i18nStatus.language === 'en') {
      expect(searchPlaceholder).toContain('Search');
      expect(categoryText && (categoryText.includes('Categories') || categoryText.includes('Category'))).toBe(true);
    }
    
    console.log('=== Test Results ===');
    console.log('✅ Search placeholder is translated:', searchPlaceholder);
    console.log('✅ Category text is translated:', categoryText);
    console.log('✅ i18n is working correctly');
  });

  test('should verify i18n resources are loaded', async ({ page }) => {
    await page.goto('http://localhost:5173/roadmap');
    await page.waitForLoadState('networkidle');
    
    // Deep inspection of i18n resources
    const resources = await page.evaluate(() => {
      // @ts-expect-error - accessing global i18n for debugging
      const i18n = window.i18next || window.i18n;
      if (!i18n) return { error: 'i18next not found' };
      
      const lang = i18n.language;
      const store = i18n.store?.data?.[lang];
      
      return {
        currentLanguage: lang,
        hasTranslationNamespace: !!store?.translation,
        hasRoadmapSection: !!store?.translation?.roadmap,
        roadmapKeys: store?.translation?.roadmap ? Object.keys(store.translation.roadmap) : [],
        sampleTranslations: {
          searchPlaceholder: i18n.t('roadmap.searchPlaceholder'),
          allCategories: i18n.t('roadmap.allCategories'),
          titlePlaceholder: i18n.t('roadmap.titlePlaceholder'),
        }
      };
    });
    
    console.log('i18n Resources:', JSON.stringify(resources, null, 2));
    
    expect(resources.hasTranslationNamespace).toBe(true);
    expect(resources.hasRoadmapSection).toBe(true);
    expect(resources.roadmapKeys?.length || 0).toBeGreaterThan(0);
  });
});
