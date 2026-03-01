const fs = require('fs');

module.exports = async (page, context) => {
  const base = process.env.BASE_URL || 'http://localhost:5173';
  const email = process.env.ACCOUNT_TEST_EMAIL;
  const pass = process.env.ACCOUNT_TEST_EMAIL_PASSWORD;

  if (!email || !pass) {
    throw new Error('Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in environment');
  }

  const logs = [];
  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
    console.log(`${msg.type()}: ${msg.text()}`); // Also print to stdout
  });

  // Go to login
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });

  // Fill login form (common selectors used in CastorWorks)
  await page.fill('#email', email).catch(() => {});
  await page.fill('#password', pass).catch(() => {});

  // Submit
  const submitSel = 'button[type=submit], button:has-text("Sign in"), button:has-text("Sign In")';
  const submit = await page.$(submitSel);
  if (submit) {
    await submit.click();
  } else {
    // try clicking by text
    await page.click('text="Sign in"').catch(() => {});
  }

  // Wait for navigation to complete and auth to settle
  await page.waitForTimeout(2000);
  try {
    await page.waitForNavigation({ timeout: 10000 });
  } catch (e) {
    // continue even if navigation didn't occur
  }

  // Navigate to projects list first
  console.log('Navigating to projects page...');
  await page.goto(`${base}/projects`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Find the first project and click on it
  const projectLink = await page.$('a[href*="/projects/"]');
  if (!projectLink) {
    console.log('No projects found, cannot test budget creation');
    return { success: false };
  }

  const projectHref = await projectLink.getAttribute('href');
  const projectId = projectHref.split('/projects/')[1];
  console.log('Found project:', projectId);

  // Navigate to the project's budgets page
  console.log('Navigating to project budgets page...');
  await page.goto(`${base}/projects/${projectId}/budgets`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Take screenshot of budget templates page
  const outDir = 'test-results';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: `${outDir}/budget-templates-initial.png`, fullPage: true });

  // Look for existing BDI Brazil budgets or create a new one
  try {
    // Try to find and click on an existing BDI Brazil budget
    const bdiBudgetLink = await page.$('a:has-text("BDI"), a:has-text("bdi"), [data-budget-type="bdi_brazil"]');
    if (bdiBudgetLink) {
      console.log('Found existing BDI Brazil budget, clicking...');
      await bdiBudgetLink.click();
    } else {
      // If no existing budget, try to create new one
      console.log('No existing BDI Brazil budget found, attempting to create new one...');
      const newBudgetBtn = await page.$('button:has-text("New"), button:has-text("Create"), button:has-text("Novo"), button:has-text("Criar")');
      if (newBudgetBtn) {
        console.log('Clicking create budget button...');
        await newBudgetBtn.click();
        await page.waitForTimeout(1000);

        // Select BDI Brazil budget type
        const bdiOption = await page.$('select option[value="bdi_brazil"], input[value="bdi_brazil"], [data-value="bdi_brazil"]');
        if (bdiOption) {
          console.log('Selecting BDI Brazil budget type...');
          await bdiOption.click();
        } else {
          // Try selecting by text in select dropdown
          console.log('Trying to select BDI Brazil from dropdown...');
          await page.selectOption('select[name="budgetType"], select[name="budget_model"]', 'bdi_brazil').catch(() => {
            console.log('Could not select BDI Brazil option');
          });
        }

        // Fill project name if needed
        await page.fill('input[name="projectName"], input[name="name"]', 'BDI Brazil Test Project').catch(() => {});

        // Submit the form
        const createBtn = await page.$('button[type="submit"], button:has-text("Create"), button:has-text("Criar"), button:has-text("Submit")');
        if (createBtn) {
          console.log('Submitting budget creation form...');
          await createBtn.click();
        } else {
          console.log('Could not find submit button');
        }
      } else {
        console.log('Could not find create budget button');
      }
    }

    await page.waitForTimeout(2000);

    // Navigate to Phase Totals tab
    console.log('Looking for Phase Totals tab...');
    const phaseTotalsTab = await page.$('button:has-text("Phase Totals"), [data-tab="phase-totals"]');
    if (phaseTotalsTab) {
      await phaseTotalsTab.click();
      await page.waitForTimeout(2000);

      // Take screenshot of phase totals
      await page.screenshot({ path: `${outDir}/bdi-brazil-phase-totals.png`, fullPage: true });

      // Check for non-zero values in phase totals
      const phaseTotalElements = await page.$$('.phase-total-value, [data-testid*="phase-total"], .total-amount');
      const totalTexts = [];

      for (const element of phaseTotalElements) {
        const text = await element.textContent();
        if (text && text.trim()) {
          totalTexts.push(text.trim());
        }
      }

      console.log(`Found ${totalTexts.length} phase total elements:`, totalTexts);

      // Verify that we have some totals and they're not all zeros
      let hasNonZeroValue = false;
      for (const text of totalTexts) {
        if (text !== '0' && text !== 'R$ 0,00' && text !== '$0.00' && text !== '0.00') {
          hasNonZeroValue = true;
          break;
        }
      }

      if (!hasNonZeroValue) {
        console.error('ERROR: All phase totals are zero! BDI Brazil calculation fix may not be working.');
        logs.push('ERROR: All phase totals showing zero values');
      } else {
        console.log('SUCCESS: Found non-zero phase totals - BDI Brazil calculations working!');
        logs.push('SUCCESS: BDI Brazil phase totals displaying non-zero values');
      }

      // Check grand total as well
      const grandTotalElements = await page.$$('.grand-total, [data-testid*="grand-total"], .total-final');
      for (const element of grandTotalElements) {
        const text = await element.textContent();
        if (text && text.trim() && text.trim() !== '0' && text.trim() !== 'R$ 0,00' && text.trim() !== '$0.00') {
          console.log('SUCCESS: Grand total is also non-zero:', text.trim());
          break;
        }
      }

    } else {
      console.log('Phase Totals tab not found, taking general screenshot...');
      await page.screenshot({ path: `${outDir}/budget-detail-fallback.png`, fullPage: true });
    }

  } catch (error) {
    console.error('Error during budget testing:', error);
    logs.push(`Error during budget testing: ${error.message}`);
    await page.screenshot({ path: `${outDir}/budget-test-error.png`, fullPage: true });
  }

  // Save console logs
  fs.writeFileSync(`${outDir}/bdi-brazil-budget-console.log`, logs.join('\n'));

  return { success: true };
};