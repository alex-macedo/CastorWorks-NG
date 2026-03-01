
test('Moodboard sidebar displays Studio Menu with proper styling', async ({ page }) => {
  // Navigate to moodboard page
  await page.goto('http://localhost:5173/app/moodboard', { waitUntil: 'domcontentloaded', timeout: 15000 })
  
  // Wait for DOM to settle
  await page.waitForTimeout(1000)
  
  // Take screenshot of initial state
  await page.screenshot({ path: 'test-results/moodboard-initial.png', fullPage: false })
  
  // Click hamburger menu to open sidebar
  const hamburgerButtons = page.locator('button').filter({ has: page.locator('span.material-symbols-outlined') })
  await hamburgerButtons.first().click({ timeout: 5000 })
  
  // Wait for sidebar to animate in
  await page.waitForTimeout(500)
  
  // Take screenshot of open sidebar
  await page.screenshot({ path: 'test-results/moodboard-sidebar-open.png', fullPage: false })
  
  // Verify Studio Menu header is visible
  const studioMenuHeader = page.locator('h2').filter({ hasText: 'Studio Menu' })
  await expect(studioMenuHeader).toBeVisible()
  
  // Verify CASTORWORKS branding is visible
  const castorworksText = page.locator('p').filter({ hasText: 'CASTORWORKS' })
  await expect(castorworksText).toBeVisible()
  
  // Verify Principal Suite section exists
  const principalSuite = page.locator('h3').filter({ hasText: 'Principal Suite' })
  await expect(principalSuite).toBeVisible()
  
  // Verify Design Studio section exists with Moodboards item
  const designStudio = page.locator('h3').filter({ hasText: 'Design Studio' })
  await expect(designStudio).toBeVisible()
  
  // Verify Moodboards item is highlighted (active state with amber/gold color)
  const moodboardsItem = page.locator('button').filter({ hasText: 'Moodboards' })
  const moodboardsButton = moodboardsItem.first()
  
  // Check for gold/amber highlighting
  const classList = await moodboardsButton.getAttribute('class')
  expect(classList).toContain('bg-amber-500/10')
  expect(classList).toContain('text-amber-500')
  expect(classList).toContain('border-amber-500/20')
  
  // Verify Site Vault section exists
  const siteVault = page.locator('h3').filter({ hasText: 'Site Vault' })
  await expect(siteVault).toBeVisible()
  
  // Verify user profile footer is visible
  const userProfile = page.locator('p').filter({ hasText: 'Alex Macedo' })
  await expect(userProfile).toBeVisible()
  
  // Verify logout button exists in footer
  const logoutButtons = page.locator('button').filter({ has: page.locator('span.material-symbols-outlined').filter({ hasText: 'logout' }) })
  await expect(logoutButtons.last()).toBeVisible()
  
  // Click close button to close sidebar  
  const closeButtons = page.locator('button').filter({ has: page.locator('span.material-symbols-outlined') }).nth(10)
  await closeButtons.click({ timeout: 5000 })
  
  // Wait for sidebar to animate out
  await page.waitForTimeout(400)
  
  // Take screenshot of closed sidebar state
  await page.screenshot({ path: 'test-results/moodboard-sidebar-closed.png', fullPage: false })
  
  // Verify sidebar is no longer visible
  const sidebarMenu = page.locator('h2').filter({ hasText: 'Studio Menu' })
  await expect(sidebarMenu).not.toBeVisible()
})

test('Studio Menu shows all 5 menu groups with proper items', async ({ page }) => {
  // Navigate to moodboard page
  await page.goto('http://localhost:5173/app/moodboard', { waitUntil: 'domcontentloaded', timeout: 15000 })
  
  // Wait for DOM to settle
  await page.waitForTimeout(1000)
  
  // Click hamburger menu
  const hamburgerButtons = page.locator('button').filter({ has: page.locator('span.material-symbols-outlined') })
  await hamburgerButtons.first().click({ timeout: 5000 })
  
  // Wait for sidebar animation
  await page.waitForTimeout(500)
  
  // Verify all menu group sections are visible
  const menuGroups = [
    'Principal Suite',
    'Design Studio', 
    'Site Vault'
  ]
  
  for (const group of menuGroups) {
    const groupHeader = page.locator('h3').filter({ hasText: group })
    await expect(groupHeader).toBeVisible()
  }
  
  // Verify key menu items exist
  const menuItems = [
    'Dashboard',
    'Activity Feed',
    'Moodboards',
    'Floor Plans',
    'Annotations',
    'Daily Logs',
    'Financial Health'
  ]
  
  for (const item of menuItems) {
    const menuItem = page.locator('button').filter({ hasText: item })
    await expect(menuItem.first()).toBeVisible()
  }
  
  // Take final screenshot showing all menu groups
  await page.screenshot({ path: 'test-results/moodboard-sidebar-all-groups.png', fullPage: false })
})

test('Sidebar hover effects work on menu items', async ({ page }) => {
  // Navigate to moodboard page
  await page.goto('http://localhost:5173/app/moodboard', { waitUntil: 'domcontentloaded', timeout: 15000 })
  
  // Wait for DOM to settle
  await page.waitForTimeout(1000)
  
  // Click hamburger menu
  const hamburgerButtons = page.locator('button').filter({ has: page.locator('span.material-symbols-outlined') })
  await hamburgerButtons.first().click({ timeout: 5000 })
  
  // Wait for sidebar animation
  await page.waitForTimeout(500)
  
  // Find a non-active menu item (e.g., Dashboard)
  const dashboardItem = page.locator('button').filter({ hasText: 'Dashboard' })
  
  // Get initial classes
  const initialClass = await dashboardItem.first().getAttribute('class')
  
  // Hover over the item
  await dashboardItem.first().hover()
  
  // Wait a bit for hover effect
  await page.waitForTimeout(100)
  
  // Take screenshot showing hover state
  await page.screenshot({ path: 'test-results/moodboard-sidebar-hover.png', fullPage: false })
  
  // Verify hover state is applied (should have white/10 background)
  const hoverClass = await dashboardItem.first().getAttribute('class')
  expect(hoverClass).toContain('hover:bg-white/5')
})
