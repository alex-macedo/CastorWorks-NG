# WBS Template Editor - E2E Test Suite

This directory contains end-to-end tests for the WBS Template Editor enhancements delivered in the recent update.

## Test Files

### 1. `wbs-template-section-expand.spec.ts`
Tests the Template section expand/collapse functionality:
- Template section collapsed by default
- Expand button works correctly
- Collapse button works correctly

### 2. `wbs-template-items-expand.spec.ts`
Tests the Items section expand/collapse all functionality:
- Expand All button visibility
- Expand All expands all rows
- Collapse All collapses to root level only
- Individual row expand/collapse with chevron buttons

### 3. `wbs-template-sync-phases.spec.ts`
Tests the Sync with Phases Templates functionality:
- Sync button visible only in edit mode
- Sync dialog opens correctly
- Template selection works
- Validation results display correctly
- Apply sync adds missing phases
- Sync button hidden in view mode

### 4. `wbs-template-compact-styling.spec.ts`
Tests the compact table styling:
- Compact row heights (< 40px)
- Compact input fields
- Cost Code column width (> 180px)
- Cost Code dropdown shows code and name
- Compact action buttons

### 5. `wbs-template-complete-workflow.spec.ts`
Comprehensive test covering all features in one workflow:
- Complete user journey from list to editor
- All expand/collapse interactions
- Sync functionality
- Visual verification of compact styling

## Prerequisites

1. **Environment Variables** (set in `.env` or environment):
   ```
   E2E_TEST_EMAIL=test@example.com
   E2E_TEST_PASSWORD=testpassword
   # OR use the existing:
   ACCOUNT_TEST_EMAIL=test@example.com
   ACCOUNT_TEST_EMAIL_PASSWORD=testpassword
   ```

2. **Test Data Requirements**:
   - At least one WBS template with hierarchical items (parent/child relationships)
   - At least one Phases template with phases defined
   - Test user must have `admin` or `project_manager` role

3. **Application Running**:
   ```bash
   ./castorworks.sh start
   ```

## Running the Tests

### Run all WBS Template tests:
```bash
npm run test:e2e -- wbs-template
```

### Run specific test file:
```bash
npm run test:e2e -- wbs-template-section-expand
npm run test:e2e -- wbs-template-items-expand
npm run test:e2e -- wbs-template-sync-phases
npm run test:e2e -- wbs-template-compact-styling
npm run test:e2e -- wbs-template-complete-workflow
```

### Run with UI mode (for debugging):
```bash
npx playwright test e2e/wbs-template-complete-workflow.spec.ts --ui
```

### Run in headed mode (see browser):
```bash
npx playwright test e2e/wbs-template-complete-workflow.spec.ts --headed
```

## Test Results

Screenshots are saved to `test-results/` directory:
- `wbs-template-collapsed-default.png` - Template section collapsed
- `wbs-template-expanded.png` - Template section expanded
- `wbs-items-expand-button.png` - Expand All button visible
- `wbs-items-all-expanded.png` - All rows expanded
- `wbs-items-collapsed.png` - Only root items visible
- `wbs-items-row-toggle.png` - Individual row expansion
- `wbs-sync-button-visible.png` - Sync button in edit mode
- `wbs-sync-dialog-open.png` - Sync dialog opened
- `wbs-sync-validation-results.png` - Validation results displayed
- `wbs-sync-applied.png` - After applying sync
- `wbs-sync-hidden-in-view.png` - No sync button in view mode
- `wbs-compact-rows.png` - Compact table styling
- `wbs-compact-inputs.png` - Compact input fields
- `wbs-cost-code-column.png` - Cost Code column width
- `wbs-cost-code-dropdown.png` - Cost Code dropdown
- `wbs-compact-buttons.png` - Compact action buttons
- `wbs-complete-workflow.png` - Full workflow screenshot

## Troubleshooting

### Tests failing due to missing data:
Ensure you have:
1. At least one WBS template in the database
2. At least one Phases template with phases
3. WBS template items with parent/child hierarchy

### Login failures:
Check that environment variables are set correctly:
```bash
echo $E2E_TEST_EMAIL
echo $E2E_TEST_PASSWORD
```

### Element not found errors:
The tests use flexible selectors that work across all 4 supported languages (EN, PT, ES, FR). If you're using a different language, you may need to update the selectors.

### Screenshots not saving:
Ensure the `test-results/` directory exists and is writable:
```bash
mkdir -p test-results
chmod 755 test-results
```

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run WBS Template E2E Tests
  run: npm run test:e2e -- wbs-template
  env:
    E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
    E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
```

## Maintenance

When modifying the WBS Template Editor:
1. Update these tests if selectors change
2. Add new tests for new features
3. Run the complete workflow test before committing
4. Update this README with any new test files
