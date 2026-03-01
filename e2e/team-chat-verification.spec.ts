
/**
 * Team Chat Verification - Phase 8
 * 
 * Verifies that the new Team Workspace routes (/chat and /communicationlog) 
 * load correctly and display the unified chat interface.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_EMAIL = process.env.ACCOUNT_TEST_EMAIL;
const TEST_PASSWORD = process.env.ACCOUNT_TEST_EMAIL_PASSWORD;

test.describe('Team Workspace - Route Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input[name="email"], input[type="email"], #email', TEST_EMAIL!);
    await page.fill('input[name="password"], input[type="password"], #password', TEST_PASSWORD!);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/(dashboard|architect|projects|admin)/, { timeout: 15000 });
  });

  test('Team Chat Route (/chat) - Loads correctly', async ({ page }) => {
    // Navigate to /chat
    await page.goto(`${BASE_URL}/chat`);

    // The page has a redirect if no project is selected. 
    // If it redirects to /projects, we select the first one.
    if (page.url().includes('/projects')) {
      console.log('Redirected to projects, selecting first project...');
      const projectCard = page.locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]').first();
      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForURL(/\/projects\/.+/);
        // Now navigate back to /chat with a project selected
        await page.goto(`${BASE_URL}/chat`);
      }
    }

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title/header
    const title = page.locator('h1').filter({
      hasText: /Team Chat|Chat do Equipo|Chat de l'Équipe|Chat do Time/
    });
    await expect(title.first()).toBeVisible({ timeout: 15000 });

    // Verify ChatInterface is rendered (check for "Messages" or "Conversations")
    const chatContainer = page.locator('h3').filter({
      hasText: /Messages|Mensagens|Mensajes|Messages/
    });
    await expect(chatContainer.first()).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({
      path: 'test-results/team-chat-route.png',
      fullPage: true
    });

    console.log('✅ Team Chat Route (/chat) - Verified successfully');
  });

  test('Communication Log Route (/communicationlog) - Loads correctly', async ({ page }) => {
    // Navigate to /communicationlog
    await page.goto(`${BASE_URL}/communicationlog`);

    // Handle redirect if needed
    if (page.url().includes('/projects')) {
      const projectCard = page.locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]').first();
      if (await projectCard.count() > 0) {
        await projectCard.click();
        await page.waitForURL(/\/projects\/.+/);
        await page.goto(`${BASE_URL}/communicationlog`);
      }
    }

    await page.waitForLoadState('networkidle');

    // Verify page title
    const title = page.locator('h1').filter({
      hasText: /Team Communication|Registro de Comunicaciones|Journal de Communication|Comunicação do Time/
    });
    await expect(title.first()).toBeVisible({ timeout: 15000 });

    // Take screenshot
    await page.screenshot({
      path: 'test-results/communication-log-route.png',
      fullPage: true
    });

    console.log('✅ Communication Log Route (/communicationlog) - Verified successfully');
  });
});
