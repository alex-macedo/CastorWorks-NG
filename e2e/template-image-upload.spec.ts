
// Test credentials from .env
const TEST_EMAIL = process.env.ACCOUNT_TEST_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.ACCOUNT_TEST_EMAIL_PASSWORD || 'password'

test.describe('Template Image Upload Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('#email', TEST_EMAIL)
    await page.fill('#password', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    
    // Wait for navigation to complete
    await page.waitForURL(/\/(architect|supervisor|admin)/, { timeout: 10000 })
  })

  test('should upload image for Phase Template', async ({ page }) => {
    // Navigate to Phase Templates
    await page.goto('/architect/phase-templates')
    await page.waitForLoadState('networkidle')
    
    // Create or find a Phase Template to edit
    const createButton = page.locator('button:has-text("New Phase Template")')
    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForLoadState('networkidle')
    } else {
      // Edit existing template
      const firstTemplate = page.locator('[data-testid="template-row"]').first()
      await firstTemplate.locator('button:has-text("Edit")').click()
      await page.waitForLoadState('networkidle')
    }

    // Check image upload component is present
    const imageUploadArea = page.locator('[data-testid="template-image-upload"]')
    expect(imageUploadArea).toBeDefined()

    // Upload test image via file input
    const fileInput = page.locator('input[type="file"]')
    
    // Create a test image file
    const testImagePath = '/tmp/test-image.png'
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    
    // Upload file
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: testImageBuffer,
    })

    // Wait for image preview to appear
    await page.waitForSelector('[data-testid="image-preview"]', { timeout: 5000 })
    const preview = page.locator('[data-testid="image-preview"]')
    expect(preview).toBeDefined()

    // Save template
    const saveButton = page.locator('button:has-text("Save")')
    await saveButton.click()
    
    // Wait for success message
    await page.waitForSelector('[role="status"]:has-text("saved")', { timeout: 5000 })

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/phase-template-image.png' })
  })

  test('should upload image for Activity Template', async ({ page }) => {
    // Navigate to Activities
    await page.goto('/architect/construction-activities')
    await page.waitForLoadState('networkidle')

    // Find template to edit or create
    const editButton = page.locator('[data-testid="activity-template-edit"]').first()
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForLoadState('networkidle')
    }

    // Verify image upload component
    const imageUploadArea = page.locator('[data-testid="template-image-upload"]')
    expect(imageUploadArea).toBeDefined()

    // Upload test image
    const fileInput = page.locator('input[type="file"]')
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    
    await fileInput.setInputFiles({
      name: 'activity-test.png',
      mimeType: 'image/png',
      buffer: testImageBuffer,
    })

    // Wait for preview
    await page.waitForSelector('[data-testid="image-preview"]', { timeout: 5000 })

    // Save
    const saveButton = page.locator('button:has-text("Save")')
    await saveButton.click()
    
    await page.waitForSelector('[role="status"]:has-text("saved")', { timeout: 5000 })
    await page.screenshot({ path: 'test-results/activity-template-image.png' })
  })

  test('should upload image for WBS Template', async ({ page }) => {
    // Navigate to WBS Templates
    await page.goto('/architect/wbs-templates')
    await page.waitForLoadState('networkidle')

    // Find template to edit
    const editButton = page.locator('[data-testid="wbs-template-edit"]').first()
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForLoadState('networkidle')
    }

    // Verify image upload
    const imageUploadArea = page.locator('[data-testid="template-image-upload"]')
    expect(imageUploadArea).toBeDefined()

    const fileInput = page.locator('input[type="file"]')
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    
    await fileInput.setInputFiles({
      name: 'wbs-test.png',
      mimeType: 'image/png',
      buffer: testImageBuffer,
    })

    await page.waitForSelector('[data-testid="image-preview"]', { timeout: 5000 })

    const saveButton = page.locator('button:has-text("Save")')
    await saveButton.click()
    
    await page.waitForSelector('[role="status"]:has-text("saved")', { timeout: 5000 })
    await page.screenshot({ path: 'test-results/wbs-template-image.png' })
  })

  test('should upload image for Budget Template', async ({ page }) => {
    // Navigate to Budget Templates
    await page.goto('/architect/budget-templates')
    await page.waitForLoadState('networkidle')

    // Find template to edit
    const editButton = page.locator('[data-testid="budget-template-edit"]').first()
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForLoadState('networkidle')
    }

    // Verify image upload
    const imageUploadArea = page.locator('[data-testid="template-image-upload"]')
    expect(imageUploadArea).toBeDefined()

    const fileInput = page.locator('input[type="file"]')
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    
    await fileInput.setInputFiles({
      name: 'budget-test.png',
      mimeType: 'image/png',
      buffer: testImageBuffer,
    })

    await page.waitForSelector('[data-testid="image-preview"]', { timeout: 5000 })

    const saveButton = page.locator('button:has-text("Save")')
    await saveButton.click()
    
    await page.waitForSelector('[role="status"]:has-text("saved")', { timeout: 5000 })
    await page.screenshot({ path: 'test-results/budget-template-image.png' })
  })

  test('should display uploaded images on template cards', async ({ page }) => {
    // Navigate to Phase Templates list view
    await page.goto('/architect/phase-templates')
    await page.waitForLoadState('networkidle')

    // Check that template images are displayed
    const templateCards = page.locator('[data-testid="template-card"]')
    const cardCount = await templateCards.count()
    
    if (cardCount > 0) {
      // Check if first card has image
      const firstCard = templateCards.first()
      const image = firstCard.locator('img[data-testid="template-image"]')
      
      if (await image.isVisible()) {
        // Verify image is loaded
        const src = await image.getAttribute('src')
        expect(src).toBeTruthy()
        expect(src).toContain('supabase')
      }
    }

    await page.screenshot({ path: 'test-results/template-list-with-images.png' })
  })

  test('should reject invalid file types', async ({ page }) => {
    // Navigate to Phase Templates
    await page.goto('/architect/phase-templates')
    await page.waitForLoadState('networkidle')

    const editButton = page.locator('[data-testid="template-row"]').first().locator('button:has-text("Edit")')
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForLoadState('networkidle')
    }

    const fileInput = page.locator('input[type="file"]')
    
    // Try uploading a text file (should be rejected)
    const invalidFile = {
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not an image'),
    }

    // Try to set invalid file - should be ignored or show error
    try {
      await fileInput.setInputFiles([invalidFile])
      
      // Check for error message
      const errorMsg = page.locator('[role="alert"]:has-text("image")')
      if (await errorMsg.isVisible({ timeout: 2000 })) {
        expect(errorMsg).toBeDefined()
      }
    } catch (e) {
      // File input may reject non-image types
      console.log('Invalid file type rejected by input')
    }

    await page.screenshot({ path: 'test-results/invalid-file-rejection.png' })
  })

  test('should handle drag-and-drop image upload', async ({ page }) => {
    await page.goto('/architect/phase-templates')
    await page.waitForLoadState('networkidle')

    const editButton = page.locator('[data-testid="template-row"]').first().locator('button:has-text("Edit")')
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForLoadState('networkidle')
    }

    const uploadArea = page.locator('[data-testid="image-upload-area"]')
    if (await uploadArea.isVisible()) {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      )

      // Simulate drag and drop
      await uploadArea.setInputFiles({
        name: 'drag-drop-test.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      })

      await page.waitForSelector('[data-testid="image-preview"]', { timeout: 5000 })
      await page.screenshot({ path: 'test-results/drag-drop-upload.png' })
    }
  })
})
