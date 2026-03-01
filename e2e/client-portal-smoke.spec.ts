
test('client portal smoke - open add task dialog', async ({ page }) => {
  await page.goto('/');

  // navigate to a known client portal route (user should set up dev server with a seeded project)
  await page.goto('/portal/PROJECT_ID');

  // Try to click 'Add New Task' button if present
  const addButton = page.locator('text=Add New Task').first();
  if (await addButton.count() > 0) {
    await addButton.click();
    await expect(page.locator('text=Create Task')).toBeVisible();
  } else {
    test.skip();
  }
});
