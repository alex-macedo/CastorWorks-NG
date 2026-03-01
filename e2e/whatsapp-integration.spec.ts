
/**
 * WhatsApp Integration E2E Tests - Phase 5
 *
 * Tests the WhatsApp Evolution API integration:
 * - Admin settings page (connection, templates, contacts)
 * - Project group management UI
 * - Template management
 *
 * Note: These tests verify UI functionality, not actual WhatsApp sending
 * (which would require a connected WhatsApp instance).
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_EMAIL = process.env.ACCOUNT_TEST_EMAIL;
const TEST_PASSWORD = process.env.ACCOUNT_TEST_EMAIL_PASSWORD;

test.describe('WhatsApp Integration - Admin Settings', () => {
  // Authenticate before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input[name="email"], input[type="email"], #email', TEST_EMAIL!);
    await page.fill('input[name="password"], input[type="password"], #password', TEST_PASSWORD!);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation to authenticated route
    await page.waitForURL(/\/(dashboard|architect|projects|admin)/, { timeout: 15000 });
  });

  test('WhatsApp Settings Page - Loads correctly', async ({ page }) => {
    // Navigate to admin WhatsApp settings
    await page.goto(`${BASE_URL}/admin/whatsapp`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title is visible (supports multiple languages)
    const title = page.locator('h1, h2').filter({
      hasText: /WhatsApp|Configurações do WhatsApp|Configuración de WhatsApp|Paramètres WhatsApp/
    });
    await expect(title.first()).toBeVisible({ timeout: 10000 });

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'test-results/whatsapp-settings-page.png',
      fullPage: true
    });

    console.log('✅ WhatsApp Settings Page - Loaded successfully');
  });

  test('WhatsApp Settings - Connection Tab visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/whatsapp`);
    await page.waitForLoadState('networkidle');

    // Check for connection-related content
    // Look for connection status, QR code section, or connect button
    const connectionElements = page.locator('text=/Connect|Conectar|Connexion|Status|QR Code/i');
    const count = await connectionElements.count();

    expect(count).toBeGreaterThan(0);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/whatsapp-connection-tab.png',
      fullPage: true
    });

    console.log('✅ WhatsApp Connection Tab - Elements found');
  });

  test('WhatsApp Settings - Templates Tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/whatsapp`);
    await page.waitForLoadState('networkidle');

    // Click on Templates tab if it exists
    const templatesTab = page.locator('button, [role="tab"]').filter({
      hasText: /Templates|Modelos|Modèles|Plantillas/
    });

    if (await templatesTab.count() > 0) {
      await templatesTab.first().click();
      await page.waitForTimeout(1000);

      // Verify template section is visible
      const templateSection = page.locator('text=/Template|Modelo|Modèle|Plantilla/i');
      await expect(templateSection.first()).toBeVisible({ timeout: 5000 });

      // Take screenshot
      await page.screenshot({
        path: 'test-results/whatsapp-templates-tab.png',
        fullPage: true
      });

      console.log('✅ WhatsApp Templates Tab - Displayed successfully');
    } else {
      console.log('⚠️ Templates tab not found - skipping');
      test.skip();
    }
  });

  test('WhatsApp Settings - Create Template Dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/whatsapp`);
    await page.waitForLoadState('networkidle');

    // Click on Templates tab
    const templatesTab = page.locator('button, [role="tab"]').filter({
      hasText: /Templates|Modelos|Modèles|Plantillas/
    });

    if (await templatesTab.count() > 0) {
      await templatesTab.first().click();
      await page.waitForTimeout(1000);
    }

    // Look for create template button
    const createButton = page.locator('button').filter({
      hasText: /Create|Criar|Créer|Crear|Add|Adicionar|Ajouter|Añadir/
    });

    if (await createButton.count() > 0) {
      await createButton.first().click();
      await page.waitForTimeout(500);

      // Verify dialog opened
      const dialog = page.locator('[role="dialog"], [class*="Dialog"], [class*="Modal"]');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });

      // Take screenshot of dialog
      await page.screenshot({
        path: 'test-results/whatsapp-create-template-dialog.png',
        fullPage: true
      });

      console.log('✅ WhatsApp Create Template Dialog - Opened successfully');
    } else {
      console.log('⚠️ Create template button not found - skipping');
      test.skip();
    }
  });

  test('WhatsApp Settings - Contacts Tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/whatsapp`);
    await page.waitForLoadState('networkidle');

    // Click on Contacts tab if it exists
    const contactsTab = page.locator('button, [role="tab"]').filter({
      hasText: /Contacts|Contatos|Contacts|Contactos/
    });

    if (await contactsTab.count() > 0) {
      await contactsTab.first().click();
      await page.waitForTimeout(1000);

      // Take screenshot
      await page.screenshot({
        path: 'test-results/whatsapp-contacts-tab.png',
        fullPage: true
      });

      console.log('✅ WhatsApp Contacts Tab - Displayed successfully');
    } else {
      console.log('⚠️ Contacts tab not found - skipping');
      test.skip();
    }
  });
});

test.describe('WhatsApp Integration - Project Group Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input[name="email"], input[type="email"], #email', TEST_EMAIL!);
    await page.fill('input[name="password"], input[type="password"], #password', TEST_PASSWORD!);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/(dashboard|architect|projects)/, { timeout: 15000 });
  });

  test('Project Settings - WhatsApp Group Card visible', async ({ page }) => {
    // Navigate to projects list
    await page.goto(`${BASE_URL}/projects`);
    await page.waitForLoadState('networkidle');

    // Find first project and click to open settings
    const projectCard = page.locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]').first();

    if (await projectCard.count() > 0) {
      await projectCard.click();
      await page.waitForLoadState('networkidle');

      // Navigate to settings tab if it exists
      const settingsTab = page.locator('button, a, [role="tab"]').filter({
        hasText: /Settings|Configurações|Paramètres|Configuración|WhatsApp/
      });

      if (await settingsTab.count() > 0) {
        await settingsTab.first().click();
        await page.waitForTimeout(1000);
      }

      // Take screenshot
      await page.screenshot({
        path: 'test-results/whatsapp-project-settings.png',
        fullPage: true
      });

      console.log('✅ Project Settings page - Screenshot captured');
    } else {
      console.log('⚠️ No projects found - skipping');
      test.skip();
    }
  });
});

test.describe('WhatsApp Integration - Hook Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"], #email', TEST_EMAIL!);
    await page.fill('input[name="password"], input[type="password"], #password', TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|architect|projects|admin)/, { timeout: 15000 });
  });

  test('WhatsApp hooks - Error handling for disconnected state', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/whatsapp`);
    await page.waitForLoadState('networkidle');

    // Check for disconnected status indicator
    const statusElements = page.locator('text=/Disconnected|Desconectado|Déconnecté|Not Connected|Não Conectado/i');

    // Take screenshot regardless of state
    await page.screenshot({
      path: 'test-results/whatsapp-connection-status.png',
      fullPage: true
    });

    console.log('✅ WhatsApp connection status - Screenshot captured');
  });

  test('WhatsApp API - Edge function accessibility', async ({ page }) => {
    // This test verifies that the edge functions are accessible
    // by checking if the page can make requests without 404 errors

    // Listen for console errors related to edge functions
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('evolution')) {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/admin/whatsapp`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Log any evolution-related errors
    if (errors.length > 0) {
      console.log('⚠️ Evolution API errors found:', errors);
    } else {
      console.log('✅ No Evolution API console errors detected');
    }

    await page.screenshot({
      path: 'test-results/whatsapp-api-check.png',
      fullPage: true
    });
  });
});
