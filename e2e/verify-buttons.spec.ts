
test('Verify sidebar HTML structure', async ({ page }) => {
  await page.goto('http://localhost:5173/app/moodboard')
  
  // Login if needed
  if (await page.url().includes('/login')) {
    await page.fill('input[type="email"]', 'alex.macedo.ca@gmail.com')
    await page.fill('input[type="password"]', '#yf7w*F2IR8^mdMa')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)
    await page.goto('http://localhost:5173/app/moodboard')
  }
  
  await page.waitForTimeout(1000)
  
  const html = await page.content()
  const dashboardWithClick = html.includes('onClick') && html.includes('Dashboard')
  console.log(`Has onClick and Dashboard in HTML: ${dashboardWithClick}`)
})
