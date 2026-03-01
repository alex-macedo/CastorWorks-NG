
test.describe('Project Documents - dialogs -> sheets', () => {
  test.beforeEach(async ({ page }) => {
    // Use env var PW_BASE_URL if provided (example: PW_BASE_URL=http://localhost:5174)
    await page.goto('/projects/1/documents', { waitUntil: 'domcontentloaded' });
  });

  test('opens New Folder sheet and shows folder name input', async ({ page }) => {
    const newFolderBtn = page.getByRole('button', { name: /New Folder/i });
    await expect(newFolderBtn).toBeVisible();
    await newFolderBtn.click();

    const folderInput = page.locator('#folder-name');
    await expect(folderInput).toBeVisible({ timeout: 5000 });
  });

  test('opens Upload File sheet and shows file input', async ({ page }) => {
    const uploadBtn = page.getByRole('button', { name: /Upload File/i });
    await expect(uploadBtn).toBeVisible();
    await uploadBtn.click();

    const fileInput = page.locator('input[type="file"]#file-upload');
    await expect(fileInput).toBeVisible({ timeout: 5000 });
  });
});
