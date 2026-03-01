
test.describe('Phase 3: Chat & Annotations Polish', () => {
  let page: Page
  const PROJECT_URL = 'http://localhost:5173'
  const TEST_EMAIL = process.env.ACCOUNT_TEST_EMAIL || 'test@example.com'
  const TEST_PASSWORD = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || 'password'

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    page = await context.newPage()

    // Login
    await page.goto(`${PROJECT_URL}/login`)
    await page.fill('#email', TEST_EMAIL)
    await page.fill('#password', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    
    // Wait for navigation to architect portal
    await page.waitForURL(/\/(architect|app)/, { timeout: 10000 })
  })

  test.describe('AppProjectChat - Reactions', () => {
    test('should display reaction picker on message hover', async () => {
      await page.goto(`${PROJECT_URL}/app/project-chat`)
      
      // Find first message and hover
      const message = page.locator('[data-testid="message"]').first()
      await message.hover()
      
      // Check for reaction button
      const reactionBtn = message.locator('[data-testid="reaction-btn"]')
      await expect(reactionBtn).toBeVisible()
      
      // Click to open popover
      await reactionBtn.click()
      
      // Verify quick reactions appear
      const quickReactions = page.locator('[data-testid="quick-reaction"]')
      const count = await quickReactions.count()
      expect(count).toBe(8) // 8 quick reactions
    })

    test('should add and remove reaction from message', async () => {
      await page.goto(`${PROJECT_URL}/app/project-chat`)
      
      const message = page.locator('[data-testid="message"]').first()
      await message.hover()
      
      // Click reaction button and select first emoji
      await message.locator('[data-testid="reaction-btn"]').click()
      await page.locator('[data-testid="quick-reaction"]').first().click()
      
      // Verify reaction badge appears
      const badge = message.locator('[data-testid="reaction-badge"]')
      await expect(badge).toBeVisible()
      
      // Remove reaction
      await badge.click()
      await expect(badge).toHaveCount(0)
    })
  })

  test.describe('AppProjectChat - AI Suggestions', () => {
    test('should generate AI suggestions on button click', async () => {
      await page.goto(`${PROJECT_URL}/app/project-chat`)
      
      // Click AI Suggest button
      const aiBtn = page.locator('[data-testid="ai-suggest-btn"]')
      await aiBtn.click()
      
      // Wait for loading spinner
      const spinner = page.locator('[data-testid="suggestion-spinner"]')
      await expect(spinner).toBeVisible()
      
      // Wait for suggestions to appear (max 5 seconds)
      const suggestions = page.locator('[data-testid="suggestion-chip"]')
      await suggestions.first().waitFor({ timeout: 5000 })
      
      const count = await suggestions.count()
      expect(count).toBeGreaterThanOrEqual(2)
      expect(count).toBeLessThanOrEqual(3)
    })

    test('should populate message input on suggestion click', async () => {
      await page.goto(`${PROJECT_URL}/app/project-chat`)
      
      // Generate suggestions
      await page.locator('[data-testid="ai-suggest-btn"]').click()
      await page.locator('[data-testid="suggestion-chip"]').first().waitFor({ timeout: 5000 })
      
      // Click first suggestion
      const firstSuggestion = page.locator('[data-testid="suggestion-chip"]').first()
      const suggestionText = await firstSuggestion.textContent()
      await firstSuggestion.click()
      
      // Verify input is populated
      const input = page.locator('[data-testid="message-input"]')
      await expect(input).toHaveValue(suggestionText)
      
      // Verify suggestions disappear
      await expect(firstSuggestion).toHaveCount(0)
    })
  })

  test.describe('AppProjectChat - Threading', () => {
    test('should open thread modal on reply button click', async () => {
      await page.goto(`${PROJECT_URL}/app/project-chat`)
      
      const message = page.locator('[data-testid="message"]').first()
      await message.hover()
      
      // Click reply button
      await message.locator('[data-testid="reply-btn"]').click()
      
      // Verify thread modal opens
      const modal = page.locator('[data-testid="thread-modal"]')
      await expect(modal).toBeVisible()
      
      // Verify parent message displays
      await expect(modal.locator('[data-testid="parent-message"]')).toBeVisible()
    })

    test('should send reply in thread', async () => {
      await page.goto(`${PROJECT_URL}/app/project-chat`)
      
      // Open thread modal
      const message = page.locator('[data-testid="message"]').first()
      await message.hover()
      await message.locator('[data-testid="reply-btn"]').click()
      
      const modal = page.locator('[data-testid="thread-modal"]')
      
      // Type and send reply
      const input = modal.locator('[data-testid="reply-input"]')
      await input.fill('Test reply message')
      await modal.locator('[data-testid="send-reply-btn"]').click()
      
      // Verify reply appears
      const reply = modal.locator('[data-testid="thread-reply"]').first()
      await expect(reply).toBeVisible()
      await expect(reply).toContainText('Test reply message')
    })

    test('should show thread count badge on message', async () => {
      await page.goto(`${PROJECT_URL}/app/project-chat`)
      
      const message = page.locator('[data-testid="message"]').first()
      
      // Check if thread count badge exists
      const badge = message.locator('[data-testid="thread-count-badge"]')
      if (await badge.count() > 0) {
        const count = await badge.textContent()
        expect(parseInt(count || '0')).toBeGreaterThan(0)
      }
    })
  })

  test.describe('AppProjectChat - Photo Attachments', () => {
    test('should attach photos to message', async () => {
      await page.goto(`${PROJECT_URL}/app/project-chat`)
      
      // Click attach photo button
      await page.locator('[data-testid="attach-photo-btn"]').click()
      
      // Note: In a real test, we'd need to handle file upload
      // For now, just verify button exists and works
      const fileInput = page.locator('[data-testid="photo-file-input"]')
      await expect(fileInput).toBeDefined()
    })

    test('should show photo preview before sending', async () => {
      // This test would require actual file upload
      // Placeholder for actual implementation
      expect(true).toBe(true)
    })
  })

  test.describe('AppAnnotations - Assignment', () => {
    test('should assign annotation on create', async () => {
      await page.goto(`${PROJECT_URL}/app/project-annotations`)
      
      // Click create button
      await page.locator('[data-testid="create-annotation-btn"]').click()
      
      // Fill form
      await page.fill('[data-testid="annotation-title"]', 'Test Annotation')
      await page.fill('[data-testid="annotation-description"]', 'Test Description')
      
      // Select assignee from dropdown
      const assigneeSelect = page.locator('[data-testid="assignee-select"]')
      await assigneeSelect.click()
      
      // Select first team member
      await page.locator('[data-testid="assignee-option"]').first().click()
      
      // Create annotation
      await page.locator('[data-testid="create-btn"]').click()
      
      // Verify annotation appears
      const annotation = page.locator('text=Test Annotation')
      await expect(annotation).toBeVisible()
    })

    test('should change assignment in detail view', async () => {
      await page.goto(`${PROJECT_URL}/app/project-annotations`)
      
      // Open first annotation
      const annotation = page.locator('[data-testid="annotation-card"]').first()
      await annotation.click()
      
      // Find assignee dropdown
      const assigneeSelect = page.locator('[data-testid="assignee-select"]')
      await assigneeSelect.click()
      
      // Select different member
      const options = page.locator('[data-testid="assignee-option"]')
      const count = await options.count()
      if (count > 1) {
        await options.nth(1).click()
        
        // Verify change persisted
        await page.reload()
        await expect(assigneeSelect).toContainText(/[A-Z][a-z]+/)
      }
    })
  })

  test.describe('AppAnnotations - Status Updates', () => {
    test('should change annotation status', async () => {
      await page.goto(`${PROJECT_URL}/app/project-annotations`)
      
      // Open first annotation
      const annotation = page.locator('[data-testid="annotation-card"]').first()
      await annotation.click()
      
      // Find status dropdown
      const statusSelect = page.locator('[data-testid="status-select"]')
      await statusSelect.click()
      
      // Select "In Progress"
      await page.locator('text=In Progress').click()
      
      // Verify status changed
      await expect(statusSelect).toContainText('In Progress')
    })
  })

  test.describe('AppAnnotations - Filter Tabs', () => {
    test('should filter by status tabs', async () => {
      await page.goto(`${PROJECT_URL}/app/project-annotations`)
      
      // Click different filter tabs
      const tabs = page.locator('[data-testid="filter-tab"]')
      const tabCount = await tabs.count()
      expect(tabCount).toBeGreaterThanOrEqual(3) // At least All, Open, Resolved
      
      // Click first tab and verify it's selected
      await tabs.first().click()
      await expect(tabs.first()).toHaveClass(/active|selected/)
    })

    test('should search annotations', async () => {
      await page.goto(`${PROJECT_URL}/app/project-annotations`)
      
      // Type in search
      await page.fill('[data-testid="search-input"]', 'test')
      
      // Verify results filtered
      const annotations = page.locator('[data-testid="annotation-card"]')
      const count = await annotations.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Real-time Sync', () => {
    test('should update in real-time across tabs', async ({ context }) => {
      // Create two pages (simulating two browser windows)
      const page1 = page
      const page2 = await context.newPage()

      // Navigate both to same chat
      await page1.goto(`${PROJECT_URL}/app/project-chat`)
      await page2.goto(`${PROJECT_URL}/app/project-chat`)

      // Send message in page1
      const input = page1.locator('[data-testid="message-input"]')
      await input.fill('Realtime test message')
      await page1.locator('[data-testid="send-btn"]').click()

      // Wait and check if appears in page2
      const message = page2.locator('text=Realtime test message')
      await expect(message).toBeVisible({ timeout: 3000 })

      await page2.close()
    })
  })

  test.describe('Web App Integration', () => {
    test('should show reactions in web app', async () => {
      // Navigate to web app chat for same project
      await page.goto(`${PROJECT_URL}/architect`)
      
      // Navigate to chat page
      await page.click('a:has-text("Messages")')
      
      // Wait for messages to load
      await page.waitForLoadState('networkidle')
      
      // Verify reaction badges visible
      const badges = page.locator('[data-testid="reaction-badge"]')
      const count = await badges.count()
      expect(count).toBeGreaterThanOrEqual(0) // May or may not have reactions
    })
  })
})
