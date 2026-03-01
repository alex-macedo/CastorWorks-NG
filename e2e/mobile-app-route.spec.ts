
/**
 * E2E test to verify the /app mobile PWA route works correctly
 */
test.describe('Mobile App Route', () => {
  test('should load AppDashboard on /app route after login', async ({ page }) => {
    // Get credentials from environment
    const email = process.env.ACCOUNT_TEST_EMAIL
    const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD

    if (!email || !password) {
      throw new Error('ACCOUNT_TEST_EMAIL and ACCOUNT_TEST_EMAIL_PASSWORD must be set')
    }

    // 1. Navigate to login page
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/01-login-page.png' })

    // 2. Fill login credentials
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.screenshot({ path: 'test-results/02-credentials-filled.png' })

    // 3. Click sign in button
    await page.click('button[type="submit"]')
    
    // 4. Wait for navigation to complete (should redirect after login)
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/03-after-login.png' })

    // 5. Navigate to /app route
    await page.goto('/app')
    await page.waitForLoadState('networkidle')
    
    // Wait for content to load (either dashboard or loading state)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/04-app-route.png' })

    // 6. Verify mobile app layout elements are present
    // Check for the header (sticky top bar)
    const header = page.locator('header').first()
    await expect(header).toBeVisible()

    // Check for bottom navigation
    const bottomNav = page.locator('nav').filter({ has: page.locator('button') })
    await expect(bottomNav).toBeVisible()

    // 7. Take final screenshot showing the mobile app
    await page.screenshot({ path: 'test-results/05-mobile-app-loaded.png', fullPage: true })

    // 8. Verify we're on the app route
    expect(page.url()).toContain('/app')

    // 9. Check for dashboard content (project selector or welcome message)
    const content = page.locator('main').first()
    await expect(content).toBeVisible()

    console.log('Mobile app route test passed!')
  })

  test('should show bottom navigation with correct items', async ({ page }) => {
    // Get credentials from environment
    const email = process.env.ACCOUNT_TEST_EMAIL
    const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD

    if (!email || !password) {
      throw new Error('ACCOUNT_TEST_EMAIL and ACCOUNT_TEST_EMAIL_PASSWORD must be set')
    }

    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

    // Navigate to /app
    await page.goto('/app')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Check bottom nav items
    const navButtons = page.locator('nav button')
    const navCount = await navButtons.count()
    
    console.log(`Found ${navCount} navigation buttons`)
    expect(navCount).toBe(5) // Home, Tasks, Chat, Finance, More

    await page.screenshot({ path: 'test-results/06-bottom-nav.png' })
  })

  test('should navigate between app pages', async ({ page }) => {
    // Get credentials from environment
    const email = process.env.ACCOUNT_TEST_EMAIL
    const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD

    if (!email || !password) {
      throw new Error('ACCOUNT_TEST_EMAIL and ACCOUNT_TEST_EMAIL_PASSWORD must be set')
    }

    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

    // Navigate to /app
    await page.goto('/app')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Click on Finance nav item (4th button)
    const financeButton = page.locator('nav button').nth(3)
    await financeButton.click()
    await page.waitForTimeout(1000)
    
    await page.screenshot({ path: 'test-results/07-finance-page.png' })
    expect(page.url()).toContain('/app/finance')

    // Click on Chat nav item (3rd button)
    const chatButton = page.locator('nav button').nth(2)
    await chatButton.click()
    await page.waitForTimeout(1000)
    
    await page.screenshot({ path: 'test-results/08-chat-page.png' })
    expect(page.url()).toContain('/app/chat')

    // Click on Home nav item (1st button) to go back
    const homeButton = page.locator('nav button').first()
    await homeButton.click()
    await page.waitForTimeout(1000)
    
    await page.screenshot({ path: 'test-results/09-back-to-home.png' })
    expect(page.url()).toMatch(/\/app\/?$/)

    console.log('Navigation test passed!')
  })
})
