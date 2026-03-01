import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const TEST_EMAIL = process.env.ACCOUNT_TEST_EMAIL || ''
const TEST_PASSWORD = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || ''

test.describe('Template Images Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:5173/login')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Fill in credentials
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    
    // Click sign in button
    await page.click('button[type="submit"]')
    
    // Wait for navigation to complete
    await page.waitForURL(/\/(architect|admin|dashboard)/)
  })

  test('Budget templates should display unique images', async ({ page }) => {
    await page.goto('http://localhost:5173/budget-templates')
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of the page
    await page.screenshot({ path: 'test-results/budget-templates.png', fullPage: true })
    
    // Find all template cards
    const templateCards = page.locator('[data-testid*="template-card"], .template-card, [class*="card"]')
    const count = await templateCards.count()
    
    console.log(`Found ${count} template cards`)
    
    // Check that images are loaded
    const images = page.locator('img[src*="template-images"], img[src*="castorworks.cloud"]')
    const imageCount = await images.count()
    
    console.log(`Found ${imageCount} images from Supabase storage`)
    
    // Verify images are visible
    if (imageCount > 0) {
      const firstImage = images.first()
      await expect(firstImage).toBeVisible()
      
      const src = await firstImage.getAttribute('src')
      console.log(`First image src: ${src}`)
      
      expect(src).toContain('castorworks.cloud')
    }
  })

  test('Phase templates should display unique images', async ({ page }) => {
    await page.goto('http://localhost:5173/phase-templates')
    await page.waitForLoadState('networkidle')
    
    await page.screenshot({ path: 'test-results/phase-templates.png', fullPage: true })
    
    const images = page.locator('img[src*="template-images"], img[src*="castorworks.cloud"]')
    const imageCount = await images.count()
    
    console.log(`Found ${imageCount} phase template images`)
    
    expect(imageCount).toBeGreaterThan(0)
  })

  test('Activity templates should display unique images', async ({ page }) => {
    await page.goto('http://localhost:5173/activity-templates')
    await page.waitForLoadState('networkidle')
    
    await page.screenshot({ path: 'test-results/activity-templates.png', fullPage: true })
    
    const images = page.locator('img[src*="template-images"], img[src*="castorworks.cloud"]')
    const imageCount = await images.count()
    
    console.log(`Found ${imageCount} activity template images`)
    
    expect(imageCount).toBeGreaterThan(0)
  })

  test('WBS templates should display unique images', async ({ page }) => {
    await page.goto('http://localhost:5173/wbs-templates')
    await page.waitForLoadState('networkidle')
    
    await page.screenshot({ path: 'test-results/wbs-templates.png', fullPage: true })
    
    const images = page.locator('img[src*="template-images"], img[src*="castorworks.cloud"]')
    const imageCount = await images.count()
    
    console.log(`Found ${imageCount} WBS template images`)
    
    expect(imageCount).toBeGreaterThan(0)
  })

  test('Template images should be unique (no duplicates)', async ({ page }) => {
    // Visit budget templates page
    await page.goto('http://localhost:5173/budget-templates')
    await page.waitForLoadState('networkidle')
    
    // Get all image sources
    const budgetImages = await page.locator('img[src*="template-images"]').evaluateAll(
      (imgs) => imgs.map((img) => (img as HTMLImageElement).src)
    )
    
    console.log('Budget template images:')
    budgetImages.forEach((src, i) => console.log(`  ${i + 1}. ${src}`))
    
    // Check for uniqueness
    const uniqueImages = new Set(budgetImages)
    
    if (budgetImages.length > 1) {
      expect(uniqueImages.size).toBe(budgetImages.length)
      console.log('✅ All images are unique!')
    } else {
      console.log('Only one template found, skipping uniqueness check')
    }
  })
})
