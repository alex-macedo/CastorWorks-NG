
test.describe('Dropdown Options Manager', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.ACCOUNT_TEST_EMAIL || '')
    await page.fill('input[type="password"]', process.env.ACCOUNT_TEST_EMAIL_PASSWORD || '')
    await page.click('button[type="submit"]')
    
    // Wait for navigation after login
    await page.waitForURL(url => 
      url.pathname === '/' || 
      url.pathname.includes('architect') || 
      url.pathname.includes('dashboard') ||
      url.pathname.includes('supervisor'), 
      { timeout: 30000 }
    )
  })

  test('should navigate to Settings and access Dropdown Options tab', async ({ page }) => {
    // Navigate to Settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of Settings page
    await page.screenshot({ 
      path: 'test-results/dropdown-options-01-settings-page.png',
      fullPage: true 
    })

    // Click on Business Settings tab
    const businessSettingsTab = page.getByRole('tab', { name: /business settings/i })
    await businessSettingsTab.click()
    await page.waitForTimeout(1000)

    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/dropdown-options-02-business-settings.png',
      fullPage: true 
    })

    // Click on Dropdown Options tab
    const dropdownOptionsTab = page.getByRole('tab', { name: /dropdown options/i })
    await dropdownOptionsTab.click()
    await page.waitForTimeout(1000)

    // Take screenshot of Dropdown Options manager
    await page.screenshot({ 
      path: 'test-results/dropdown-options-03-manager-view.png',
      fullPage: true 
    })

    // Verify the component is visible
    await expect(page.getByRole('heading', { name: 'Task Priority', exact: true })).toBeVisible()
  })

  test('should display Task Priority options with colors', async ({ page }) => {
    // Navigate directly to settings with dropdown options tab
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Click on Business Settings tab
    const businessSettingsTab = page.getByRole('tab', { name: /business settings/i })
    await businessSettingsTab.click()
    await page.waitForTimeout(500)

    // Click on Dropdown Options tab
    const dropdownOptionsTab = page.getByRole('tab', { name: /dropdown options/i })
    await dropdownOptionsTab.click()
    await page.waitForTimeout(1000)

    // Verify Task Priority tab is active by default
    const taskPriorityTab = page.getByRole('tab', { name: /task priority/i })
    await expect(taskPriorityTab).toBeVisible()

    // Verify we can see the priority options
    await expect(page.getByRole('cell', { name: 'Low', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Medium', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'High', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Urgent', exact: true })).toBeVisible()

    // Take screenshot showing task priorities
    await page.screenshot({ 
      path: 'test-results/dropdown-options-04-task-priorities.png',
      fullPage: true 
    })
  })

  test('should switch between category tabs', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Navigate to Dropdown Options
    const businessSettingsTab = page.getByRole('tab', { name: /business settings/i })
    await businessSettingsTab.click()
    await page.waitForTimeout(500)

    const dropdownOptionsTab = page.getByRole('tab', { name: /dropdown options/i })
    await dropdownOptionsTab.click()
    await page.waitForTimeout(1000)

    // Click on Project Type tab
    const projectTypeTab = page.getByRole('tab', { name: /project type/i })
    await projectTypeTab.click()
    await page.waitForTimeout(500)

    // Verify Project Type options are visible
    await expect(page.getByRole('cell', { name: 'Residential', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Commercial', exact: true })).toBeVisible()

    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/dropdown-options-05-project-types.png',
      fullPage: true 
    })

    // Click on Construction Unit tab
    const constructionUnitTab = page.getByRole('tab', { name: /construction unit/i })
    await constructionUnitTab.click()
    await page.waitForTimeout(500)

    // Verify Construction Unit options
    await expect(page.getByRole('cell', { name: 'Square Meter (m²)', exact: true })).toBeVisible()

    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/dropdown-options-06-construction-units.png',
      fullPage: true 
    })
  })

  test('should open Add Option dialog', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Navigate to Dropdown Options
    const businessSettingsTab = page.getByRole('tab', { name: /business settings/i })
    await businessSettingsTab.click()
    await page.waitForTimeout(500)

    const dropdownOptionsTab = page.getByRole('tab', { name: /dropdown options/i })
    await dropdownOptionsTab.click()
    await page.waitForTimeout(1000)

    // Click Add Option button
    const addButton = page.getByRole('button', { name: /add option/i })
    await addButton.click()
    await page.waitForTimeout(500)

    // Verify dialog is open
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/display label/i)).toBeVisible()
    await expect(page.getByText(/value key/i)).toBeVisible()

    // Take screenshot of add dialog
    await page.screenshot({ 
      path: 'test-results/dropdown-options-07-add-dialog.png',
      fullPage: true 
    })

    // Close dialog
    const cancelButton = page.getByRole('button', { name: /cancel/i })
    await cancelButton.click()
    await page.waitForTimeout(300)
  })
})
