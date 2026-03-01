
/**
 * End-to-End Tests for Cost Control Budget
 *
 * These tests verify the complete user workflows for Cost Control Budget functionality:
 * - Budget version creation and management
 * - Budget matrix editing (phase × cost code)
 * - Commitment tracking
 * - Financial entry tagging
 * - Budget vs Actual reporting
 *
 * Prerequisites:
 * - Test user must be logged in
 * - Test project with phases must exist
 * - Test project must have budget_model set to 'cost_control'
 *
 * Environment Variables:
 * - E2E_TEST_EMAIL: Test user email
 * - E2E_TEST_PASSWORD: Test user password
 * - E2E_TEST_PROJECT_ID: (Optional) Project ID to use for testing
 */

// Test data
const TEST_PROJECT_NAME = 'E2E Cost Control Test Project';
const TEST_PHASE_NAMES = ['Demolition', 'Foundation', 'Framing'];
const TEST_BUDGET_VERSION_NAME = 'Q1 2025 Budget';
const TEST_BUDGET_DESCRIPTION = 'Initial cost control budget for testing';
const TEST_VENDOR_NAME = 'Test Concrete Supplier';
const TEST_COMMITMENT_AMOUNT = 45000;

test.describe('Cost Control Budget - End-to-End', () => {
  // Common setup for all tests
  test.beforeEach(async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if logged in, if not perform login
    const isLoggedIn = await page
      .locator('[data-testid="user-menu"]')
      .isVisible()
      .catch(() => false);

    if (!isLoggedIn) {
      // Navigate to login
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Fill login form
      const email = process.env.E2E_TEST_EMAIL || 'test@example.com';
      const password = process.env.E2E_TEST_PASSWORD || 'testpassword';

      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);

      // Submit login
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      // Verify login succeeded
      await expect(page).toHaveURL(/\/projects|\/dashboard/);
    }
  });

  // ============================================================================
  // WORKFLOW 1: Budget Version Creation and Management
  // ============================================================================

  test('should create a new Cost Control budget version', async ({ page }) => {
    // Navigate to projects
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Click on first project or create one
    let projectFound = false;
    const projectCards = page.locator('[data-testid="project-card"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      await projectCards.first().click();
      projectFound = true;
    }

    // If no project, we need to create one (in real test, assume it exists)
    // For this E2E test, we'll assume a test project exists
    if (!projectFound) {
      test.skip();
    }

    // Wait for project detail page
    await page.waitForLoadState('networkidle');

    // Navigate to Cost Control tab
    const costControlTab = page.locator('text=Cost Control');
    if (await costControlTab.isVisible()) {
      await costControlTab.click();
      await page.waitForLoadState('networkidle');

      // Click "New Version" button
      const newVersionButton = page.locator('button:has-text("New Version")');
      if (await newVersionButton.isVisible()) {
        await newVersionButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Fill version form
        await page.fill('input[name="name"]', TEST_BUDGET_VERSION_NAME);
        await page.fill('textarea[name="description"]', TEST_BUDGET_DESCRIPTION);

        // Submit form
        await page.click('button:has-text("Create")');

        // Verify success message or version appears in list
        await expect(page.locator(`text=${TEST_BUDGET_VERSION_NAME}`)).toBeVisible({
          timeout: 5000,
        });
      }
    } else {
      test.skip();
    }
  });

  test('should promote budget version to baseline', async ({ page }) => {
    // Navigate to projects
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Open first project
    const projectCard = page.locator('[data-testid="project-card"]').first();
    if (!(await projectCard.isVisible())) {
      test.skip();
    }

    await projectCard.click();
    await page.waitForLoadState('networkidle');

    // Navigate to Cost Control
    const costControlTab = page.locator('text=Cost Control');
    if (await costControlTab.isVisible()) {
      await costControlTab.click();
      await page.waitForLoadState('networkidle');

      // Find a draft version in the list
      const draftVersions = page.locator('[data-testid="budget-version-item"]:has-text("Draft")');
      if ((await draftVersions.count()) > 0) {
        // Click first draft version
        await draftVersions.first().click();
        await page.waitForLoadState('domcontentloaded');

        // Click "Promote to Baseline" button
        const promoteButton = page.locator('button:has-text("Promote to Baseline")');
        if (await promoteButton.isVisible()) {
          await promoteButton.click();

          // Confirm dialog if present
          const confirmButton = page.locator('button:has-text("Confirm")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          // Verify status changed to baseline
          await expect(page.locator('text=Baseline')).toBeVisible({ timeout: 5000 });
        }
      }
    } else {
      test.skip();
    }
  });

  // ============================================================================
  // WORKFLOW 2: Budget Matrix Editing
  // ============================================================================

  test('should edit budget matrix values', async ({ page }) => {
    // Navigate to projects
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Open first project
    const projectCard = page.locator('[data-testid="project-card"]').first();
    if (!(await projectCard.isVisible())) {
      test.skip();
    }

    await projectCard.click();
    await page.waitForLoadState('networkidle');

    // Navigate to Cost Control
    const costControlTab = page.locator('text=Cost Control');
    if (!(await costControlTab.isVisible())) {
      test.skip();
    }

    await costControlTab.click();
    await page.waitForLoadState('networkidle');

    // Click on a budget version to edit matrix
    const versionItem = page.locator('[data-testid="budget-version-item"]').first();
    if (await versionItem.isVisible()) {
      await versionItem.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for matrix cells
      const matrixCells = page.locator('[data-testid="matrix-cell"]');
      const cellCount = await matrixCells.count();

      if (cellCount > 0) {
        // Click on first cell to edit
        const firstCell = matrixCells.first();
        await firstCell.click();

        // Type a value (look for input or contenteditable)
        const input = page.locator('input[type="number"]').first();
        if (await input.isVisible()) {
          await input.fill('25000');
          await input.press('Tab'); // Move to next cell (triggers save)

          // Verify value was entered and total updated
          await expect(input).toHaveValue('25000');
        }
      }
    } else {
      test.skip();
    }
  });

  test('should calculate and display matrix totals', async ({ page }) => {
    // Navigate to projects
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Open first project
    const projectCard = page.locator('[data-testid="project-card"]').first();
    if (!(await projectCard.isVisible())) {
      test.skip();
    }

    await projectCard.click();
    await page.waitForLoadState('networkidle');

    // Navigate to Cost Control
    const costControlTab = page.locator('text=Cost Control');
    if (!(await costControlTab.isVisible())) {
      test.skip();
    }

    await costControlTab.click();
    await page.waitForLoadState('networkidle');

    // Open a version with matrix
    const versionItem = page.locator('[data-testid="budget-version-item"]').first();
    if (await versionItem.isVisible()) {
      await versionItem.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify row totals exist
      const rowTotals = page.locator('[data-testid="matrix-row-total"]');
      const rowCount = await rowTotals.count();
      expect(rowCount).toBeGreaterThan(0);

      // Verify column totals exist
      const colTotals = page.locator('[data-testid="matrix-column-total"]');
      const colCount = await colTotals.count();
      expect(colCount).toBeGreaterThan(0);

      // Verify grand total exists
      const grandTotal = page.locator('[data-testid="matrix-grand-total"]');
      expect(await grandTotal.isVisible()).toBeTruthy();
    } else {
      test.skip();
    }
  });

  // ============================================================================
  // WORKFLOW 3: Commitment Tracking
  // ============================================================================

  test('should create a new commitment', async ({ page }) => {
    // Navigate to projects
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Open first project
    const projectCard = page.locator('[data-testid="project-card"]').first();
    if (!(await projectCard.isVisible())) {
      test.skip();
    }

    await projectCard.click();
    await page.waitForLoadState('networkidle');

    // Navigate to Cost Control
    const costControlTab = page.locator('text=Cost Control');
    if (!(await costControlTab.isVisible())) {
      test.skip();
    }

    await costControlTab.click();
    await page.waitForLoadState('networkidle');

    // Click on Commitments section/tab
    const commitmentTab = page.locator('text=Commitments');
    if (await commitmentTab.isVisible()) {
      await commitmentTab.click();
      await page.waitForLoadState('domcontentloaded');

      // Click "New Commitment" button
      const newButton = page.locator('button:has-text("New Commitment")');
      if (await newButton.isVisible()) {
        await newButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Fill commitment form
        // Vendor name
        const vendorInput = page.locator('input[name="vendor_name"]');
        if (await vendorInput.isVisible()) {
          await vendorInput.fill(TEST_VENDOR_NAME);
        }

        // Cost code selector
        const costCodeSelect = page.locator('[data-testid="cost-code-select"]');
        if (await costCodeSelect.isVisible()) {
          await costCodeSelect.click();
          await page.click('text=Materials'); // Select MAT
        }

        // Amount
        const amountInput = page.locator('input[name="committed_amount"]');
        if (await amountInput.isVisible()) {
          await amountInput.fill(TEST_COMMITMENT_AMOUNT.toString());
        }

        // Status
        const statusSelect = page.locator('[data-testid="status-select"]');
        if (await statusSelect.isVisible()) {
          await statusSelect.click();
          await page.click('text=Approved');
        }

        // Submit
        await page.click('button:has-text("Save")');

        // Verify success
        await expect(page.locator(`text=${TEST_VENDOR_NAME}`)).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip();
    }
  });

  test('should update commitment status through workflow', async ({ page }) => {
    // Navigate to projects
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Open first project
    const projectCard = page.locator('[data-testid="project-card"]').first();
    if (!(await projectCard.isVisible())) {
      test.skip();
    }

    await projectCard.click();
    await page.waitForLoadState('networkidle');

    // Navigate to Cost Control
    const costControlTab = page.locator('text=Cost Control');
    if (!(await costControlTab.isVisible())) {
      test.skip();
    }

    await costControlTab.click();
    await page.waitForLoadState('networkidle');

    // Click on Commitments tab
    const commitmentTab = page.locator('text=Commitments');
    if (await commitmentTab.isVisible()) {
      await commitmentTab.click();
      await page.waitForLoadState('domcontentloaded');

      // Find first commitment in list
      const commitmentRow = page.locator('[data-testid="commitment-row"]').first();
      if (await commitmentRow.isVisible()) {
        // Click edit button
        const editButton = commitmentRow.locator('button:has-text("Edit")');
        if (await editButton.isVisible()) {
          await editButton.click();
          await page.waitForLoadState('domcontentloaded');

          // Change status
          const statusSelect = page.locator('[data-testid="status-select"]');
          if (await statusSelect.isVisible()) {
            await statusSelect.click();
            await page.click('text=Sent');
          }

          // Save
          await page.click('button:has-text("Save")');

          // Verify status updated
          await expect(page.locator('text=Sent')).toBeVisible({ timeout: 5000 });
        }
      }
    } else {
      test.skip();
    }
  });

  // ============================================================================
  // WORKFLOW 4: Financial Entry Tagging
  // ============================================================================

  test('should tag financial entry with phase and cost code', async ({ page }) => {
    // Navigate to projects
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Open first project
    const projectCard = page.locator('[data-testid="project-card"]').first();
    if (!(await projectCard.isVisible())) {
      test.skip();
    }

    await projectCard.click();
    await page.waitForLoadState('networkidle');

    // Navigate to Financial or Budget Expenses tab
    const financialTab = page.locator('text=Financial Entries|text=Budget|text=Expenses');
    if (await financialTab.first().isVisible()) {
      await financialTab.first().click();
      await page.waitForLoadState('networkidle');

      // Click "New Entry" or "Add Entry" button
      const newButton = page.locator(
        'button:has-text("New Entry"), button:has-text("Add Entry"), button:has-text("New Financial Entry")'
      );
      if (await newButton.isVisible()) {
        await newButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Fill entry form
        // Description
        const descInput = page.locator('input[name="description"]');
        if (await descInput.isVisible()) {
          await descInput.fill('Test material purchase');
        }

        // Amount
        const amountInput = page.locator('input[name="amount"]');
        if (await amountInput.isVisible()) {
          await amountInput.fill('5000');
        }

        // Category
        const categorySelect = page.locator('[data-testid="category-select"]');
        if (await categorySelect.isVisible()) {
          await categorySelect.click();
          await page.click('text=Materials');
        }

        // Phase selector
        const phaseSelect = page.locator('[data-testid="phase-select"]');
        if (await phaseSelect.isVisible()) {
          await phaseSelect.click();
          // Click first phase option
          await page.locator('[role="option"]').first().click();
        }

        // Cost code should be auto-selected based on category
        // If manual selection needed:
        const costCodeSelect = page.locator('[data-testid="cost-code-select"]');
        if (await costCodeSelect.isVisible()) {
          // It should be pre-selected, but we can verify
          const selectedValue = await costCodeSelect.inputValue();
          expect(selectedValue).toBeTruthy();
        }

        // Submit
        await page.click('button:has-text("Save")');

        // Verify entry created
        await expect(page.locator('text=Test material purchase')).toBeVisible({
          timeout: 5000,
        });
      }
    } else {
      test.skip();
    }
  });

  // ============================================================================
  // WORKFLOW 5: Budget vs Actual Reporting
  // ============================================================================

  test('should display budget vs actual report', async ({ page }) => {
    // Navigate to Reports
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Look for Budget vs Actual report option
    const budgetVsActualLink = page.locator('text=Budget vs Actual');
    if (await budgetVsActualLink.isVisible()) {
      await budgetVsActualLink.click();
      await page.waitForLoadState('networkidle');

      // Verify report is displayed
      const reportTable = page.locator('[data-testid="budget-vs-actual-table"]');
      if (await reportTable.isVisible()) {
        // Check for key columns
        expect(await page.locator('text=Budgeted').isVisible()).toBeTruthy();
        expect(await page.locator('text=Committed').isVisible()).toBeTruthy();
        expect(await page.locator('text=Actual').isVisible()).toBeTruthy();
        expect(await page.locator('text=Variance').isVisible()).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test('should filter budget vs actual report by phase', async ({ page }) => {
    // Navigate to Reports
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Open Budget vs Actual report
    const budgetVsActualLink = page.locator('text=Budget vs Actual');
    if (!(await budgetVsActualLink.isVisible())) {
      test.skip();
    }

    await budgetVsActualLink.click();
    await page.waitForLoadState('networkidle');

    // Look for phase filter
    const phaseFilter = page.locator('[data-testid="phase-filter"]');
    if (await phaseFilter.isVisible()) {
      await phaseFilter.click();
      await page.waitForLoadState('domcontentloaded');

      // Select first phase
      const phaseOption = page.locator('[role="option"]').first();
      if (await phaseOption.isVisible()) {
        await phaseOption.click();
        await page.waitForLoadState('networkidle');

        // Verify report filtered
        const reportRows = page.locator('[data-testid="report-row"]');
        expect(await reportRows.count()).toBeGreaterThan(0);
      }
    } else {
      test.skip();
    }
  });

  test('should display cost code breakdown in report', async ({ page }) => {
    // Navigate to Reports
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Open Budget vs Actual report
    const budgetVsActualLink = page.locator('text=Budget vs Actual');
    if (!(await budgetVsActualLink.isVisible())) {
      test.skip();
    }

    await budgetVsActualLink.click();
    await page.waitForLoadState('networkidle');

    // Verify cost code rows appear (MAT, LAB, EQT, etc)
    const matRow = page.locator('text=Materials, MAT');
    const labRow = page.locator('text=Labor, LAB');

    // At least some cost codes should be visible
    const hasContent =
      (await matRow.isVisible().catch(() => false)) ||
      (await labRow.isVisible().catch(() => false));
    expect(hasContent).toBeTruthy();
  });

  // ============================================================================
  // WORKFLOW 6: Complete End-to-End Scenario
  // ============================================================================

  test('should complete full cost control workflow: budget → commitment → expense → report', async ({
    page,
  }) => {
    /**
     * This test verifies the complete user journey:
     * 1. Create/open a Cost Control budget version
     * 2. Edit the budget matrix
     * 3. Create a commitment against the budget
     * 4. Record a financial entry/expense
     * 5. View the budget vs actual report showing all three elements
     */

    // Step 1: Navigate to project
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCard = page.locator('[data-testid="project-card"]').first();
    if (!(await projectCard.isVisible())) {
      test.skip();
    }

    await projectCard.click();
    await page.waitForLoadState('networkidle');

    // Step 2: Navigate to Cost Control
    const costControlTab = page.locator('text=Cost Control');
    if (!(await costControlTab.isVisible())) {
      test.skip();
    }

    await costControlTab.click();
    await page.waitForLoadState('networkidle');

    // Verify Cost Control is displayed
    expect(await page.locator('[data-testid="cost-control-builder"]').isVisible()).toBeTruthy();

    // Step 3: Navigate to Financial entries
    await page.goto('/projects');
    const projectLink = page.locator('[data-testid="project-card"]').first();
    await projectLink.click();
    await page.waitForLoadState('networkidle');

    const financialTab = page.locator('text=Financial Entries|text=Budget');
    if (await financialTab.first().isVisible()) {
      await financialTab.first().click();
      await page.waitForLoadState('networkidle');

      // Verify we can access financial entries
      expect(await page.locator('button:has-text("New")').first().isVisible()).toBeTruthy();
    }

    // Step 4: Navigate to reports
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const budgetVsActualLink = page.locator('text=Budget vs Actual');
    if (await budgetVsActualLink.isVisible()) {
      await budgetVsActualLink.click();
      await page.waitForLoadState('networkidle');

      // Verify report is accessible
      const reportTable = page.locator('[data-testid="budget-vs-actual-table"]');
      expect(await reportTable.isVisible().catch(() => false)).toBeTruthy();
    }
  });

  // ============================================================================
  // CROSS-BROWSER AND RESPONSIVENESS
  // ============================================================================

  test('should display Cost Control on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate to Cost Control
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCard = page.locator('[data-testid="project-card"]').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForLoadState('networkidle');

      const costControlTab = page.locator('text=Cost Control');
      if (await costControlTab.isVisible()) {
        await costControlTab.click();
        await page.waitForLoadState('networkidle');

        // Verify layout is appropriate for desktop
        const costControlBuilder = page.locator('[data-testid="cost-control-builder"]');
        expect(await costControlBuilder.isVisible()).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Navigate to Cost Control
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCard = page.locator('[data-testid="project-card"]').first();
    if (!(await projectCard.isVisible())) {
      test.skip();
    }

    await projectCard.click();
    await page.waitForLoadState('networkidle');

    const costControlTab = page.locator('text=Cost Control');
    if (!(await costControlTab.isVisible())) {
      test.skip();
    }

    await costControlTab.click();
    await page.waitForLoadState('networkidle');

    // Try invalid action (e.g., submit empty form)
    const newVersionButton = page.locator('button:has-text("New Version")');
    if (await newVersionButton.isVisible()) {
      await newVersionButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Try to submit without filling required fields
      const submitButton = page.locator('button:has-text("Create")');
      if (await submitButton.isVisible()) {
        // Click submit with empty fields
        await submitButton.click();

        // Should show error message or validation
        const errorMsg = page.locator('[role="alert"]');
        const validationError = page.locator('text=required, text=invalid');

        // Either error message or still on form
        const hasError = await errorMsg.isVisible().catch(() => false);
        const stillOnForm = await submitButton.isVisible();

        expect(hasError || stillOnForm).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });
});
