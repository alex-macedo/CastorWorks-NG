
test('Check /app route renders mobile dashboard', async ({ page }) => {
  // First login
  await page.goto('http://localhost:5173/login')
  await page.waitForLoadState('networkidle')
  
  // Take screenshot of login page
  await page.screenshot({ path: 'test-results/01-login-page.png' })
  
  // Fill login credentials from env
  const email = process.env.ACCOUNT_TEST_EMAIL || 'test@example.com'
  const password = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || 'password'
  
  console.log('Using email:', email)
  
  // Wait for email input to be visible and fill it
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  
  await page.screenshot({ path: 'test-results/02-credentials-filled.png' })
  
  // Click submit
  await page.click('button[type="submit"]')
  
  // Wait longer for login to complete
  await page.waitForTimeout(5000)
  await page.screenshot({ path: 'test-results/03-after-login-wait.png' })
  
  console.log('URL after login:', page.url())
  
  // If we're still on login, check for error messages
  if (page.url().includes('login')) {
    const errorText = await page.locator('.text-destructive, .text-red-500, [role="alert"]').textContent().catch(() => 'No error found')
    console.log('Login error:', errorText)
  }
  
  // Now navigate to /app
  await page.goto('http://localhost:5173/app')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/04-app-route.png', fullPage: true })
  
  // Log the page URL and content
  console.log('Current URL:', page.url())
  console.log('Page title:', await page.title())
  
  // Check what's rendered
  const bodyContent = await page.locator('body').innerHTML()
  console.log('Body has MobileAppLayout:', bodyContent.includes('bg-slate-950'))
  console.log('Body has Dashboard:', bodyContent.includes('Dashboard') || bodyContent.includes('Quick Actions'))
  console.log('Body has bottom nav:', bodyContent.includes('bottom-0'))
})
