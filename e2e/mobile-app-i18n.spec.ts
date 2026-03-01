
test.describe('Mobile App i18n Language Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to mobile app
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForLoadState('domcontentloaded')
  })

  test('should display English text by default', async ({ page }) => {
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/mobile-app-english-initial.png', fullPage: true })

    // Verify English text is visible
    await expect(page.getByText('Dashboard', { exact: true })).toBeVisible()
    await expect(page.getByText('Active Projects', { exact: true })).toBeVisible()
    await expect(page.getByText('Billable Hours', { exact: true })).toBeVisible()
    await expect(page.getByText('Current Portfolio', { exact: true })).toBeVisible()
    await expect(page.getByText('Studio Tools', { exact: true })).toBeVisible()
    await expect(page.getByText('Milestones', { exact: true })).toBeVisible()
    await expect(page.getByText('Financial Health', { exact: true })).toBeVisible()
  })

  test('should switch to Portuguese and show translated content', async ({ page }) => {
    // Click the menu button
    const menuButton = page.locator('button').filter({ has: page.getByText('menu').first() }).first()
    await menuButton.click()
    await page.waitForTimeout(500)

    // Take screenshot of sidebar with language selector
    await page.screenshot({ path: 'test-results/mobile-app-sidebar-open.png', fullPage: true })

    // Find and click Portuguese button
    const portugueseButton = page.locator('button').filter({ hasText: 'Português' }).first()
    await expect(portugueseButton).toBeVisible()
    await portugueseButton.click()
    await page.waitForTimeout(1000) // Wait for translations to apply

    // Take screenshot after language change
    await page.screenshot({ path: 'test-results/mobile-app-portuguese-after-switch.png', fullPage: true })

    // Close sidebar
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Verify Portuguese text is now visible
    await expect(page.getByText('Painel', { exact: true })).toBeVisible()
    await expect(page.getByText('Projetos Ativos', { exact: true })).toBeVisible()
    await expect(page.getByText('Horas Faturáveis', { exact: true })).toBeVisible()
    await expect(page.getByText('Portfólio Atual', { exact: true })).toBeVisible()
    await expect(page.getByText('Ferramentas do Estúdio', { exact: true })).toBeVisible()
    await expect(page.getByText('Marcos', { exact: true })).toBeVisible()
    await expect(page.getByText('Saúde Financeira', { exact: true })).toBeVisible()

    // Take final screenshot showing Portuguese content
    await page.screenshot({ path: 'test-results/mobile-app-portuguese-final.png', fullPage: true })
  })

  test('should switch to Spanish and show translated content', async ({ page }) => {
    // Click the menu button
    const menuButton = page.locator('button').filter({ has: page.getByText('menu').first() }).first()
    await menuButton.click()
    await page.waitForTimeout(500)

    // Find and click Spanish button
    const spanishButton = page.locator('button').filter({ hasText: 'Español' }).first()
    await expect(spanishButton).toBeVisible()
    await spanishButton.click()
    await page.waitForTimeout(1000)

    // Close sidebar
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Verify Spanish text is visible
    await expect(page.getByText('Panel', { exact: true })).toBeVisible()
    await expect(page.getByText('Proyectos Activos', { exact: true })).toBeVisible()
    await expect(page.getByText('Horas Facturables', { exact: true })).toBeVisible()
    await expect(page.getByText('Portafolio Actual', { exact: true })).toBeVisible()
    await expect(page.getByText('Herramientas del Estudio', { exact: true })).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/mobile-app-spanish.png', fullPage: true })
  })

  test('should switch to French and show translated content', async ({ page }) => {
    // Click the menu button
    const menuButton = page.locator('button').filter({ has: page.getByText('menu').first() }).first()
    await menuButton.click()
    await page.waitForTimeout(500)

    // Find and click French button
    const frenchButton = page.locator('button').filter({ hasText: 'Français' }).first()
    await expect(frenchButton).toBeVisible()
    await frenchButton.click()
    await page.waitForTimeout(1000)

    // Close sidebar
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Verify French text is visible
    await expect(page.getByText('Tableau de Bord', { exact: true })).toBeVisible()
    await expect(page.getByText('Projets Actifs', { exact: true })).toBeVisible()
    await expect(page.getByText('Heures Facturables', { exact: true })).toBeVisible()
    await expect(page.getByText('Portefeuille Actuel', { exact: true })).toBeVisible()
    await expect(page.getByText('Outils du Studio', { exact: true })).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/mobile-app-french.png', fullPage: true })
  })

  test('should persist language preference after page reload', async ({ page }) => {
    // Click the menu button
    const menuButton = page.locator('button').filter({ has: page.getByText('menu').first() }).first()
    await menuButton.click()
    await page.waitForTimeout(500)

    // Click Portuguese
    const portugueseButton = page.locator('button').filter({ hasText: 'Português' }).first()
    await portugueseButton.click()
    await page.waitForTimeout(1000)

    // Close sidebar
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Verify Portuguese is showing
    await expect(page.getByText('Painel', { exact: true })).toBeVisible()

    // Reload page
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForLoadState('domcontentloaded')

    // Verify Portuguese is still showing after reload
    await expect(page.getByText('Painel', { exact: true })).toBeVisible()
    await expect(page.getByText('Projetos Ativos', { exact: true })).toBeVisible()

    // Take screenshot confirming persistence
    await page.screenshot({ path: 'test-results/mobile-app-portuguese-persisted.png', fullPage: true })
  })

  test('should verify localStorage stores language preference', async ({ page }) => {
    // Click the menu button
    const menuButton = page.locator('button').filter({ has: page.getByText('menu').first() }).first()
    await menuButton.click()
    await page.waitForTimeout(500)

    // Click Portuguese
    const portugueseButton = page.locator('button').filter({ hasText: 'Português' }).first()
    await portugueseButton.click()
    await page.waitForTimeout(1000)

    // Check localStorage
    const localStorage = await page.evaluate(() => {
      const cached = window.localStorage.getItem('user-preferences-cache')
      return cached ? JSON.parse(cached) : null
    })

    // Verify language is stored
    expect(localStorage).toBeTruthy()
    expect(localStorage.language).toBe('pt-BR')
  })

  test('should show language selector in sidebar', async ({ page }) => {
    // Click the menu button
    const menuButton = page.locator('button').filter({ has: page.getByText('menu').first() }).first()
    await menuButton.click()
    await page.waitForTimeout(500)

    // Verify language selector section exists
    await expect(page.getByText('Language / Idioma')).toBeVisible()

    // Verify all 4 language buttons are present
    await expect(page.locator('button').filter({ hasText: 'English' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Português' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Español' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Français' })).toBeVisible()

    // Verify flags are visible
    await expect(page.getByText('🇺🇸')).toBeVisible()
    await expect(page.getByText('🇧🇷')).toBeVisible()
    await expect(page.getByText('🇪🇸')).toBeVisible()
    await expect(page.getByText('🇫🇷')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/mobile-app-language-selector.png', fullPage: true })
  })

  test('should verify bottom navigation is translated', async ({ page }) => {
    // Click the menu button
    const menuButton = page.locator('button').filter({ has: page.getByText('menu').first() }).first()
    await menuButton.click()
    await page.waitForTimeout(500)

    // Click Portuguese
    const portugueseButton = page.locator('button').filter({ hasText: 'Português' }).first()
    await portugueseButton.click()
    await page.waitForTimeout(1000)

    // Close sidebar
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Verify bottom nav is translated to Portuguese
    // Look for Portuguese nav labels
    const pageContent = await page.content()
    expect(pageContent).toContain('Projetos') // Portuguese for Projects
    expect(pageContent).toContain('Tarefas') // Portuguese for Tasks
    expect(pageContent).toContain('Finanças') // Portuguese for Finance

    // Take screenshot of bottom nav
    await page.screenshot({ path: 'test-results/mobile-app-bottom-nav-portuguese.png', fullPage: true })
  })
})
