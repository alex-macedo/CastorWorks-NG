---
status: testing
phase: 02-module-based-licensing
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md]
started: "2026-03-01T19:00:00.000Z"
updated: "2026-03-01T19:00:00.000Z"
---

## Current Test

number: 1
name: Sidebar reflects tenant license
expected: |
  Log in and open the main app (dashboard). The sidebar shows only navigation items the tenant is licensed for. For example, with a sandbox-tier tenant, items like Financials, Architect, or Templates may be hidden; core items (e.g. Dashboard, Projects) remain visible. No console errors related to licensing or get_tenant_licensed_modules.
awaiting: user response

## Tests

### 1. Sidebar reflects tenant license
expected: Sidebar shows only options for which the tenant has the required module; module-gated items are hidden when not licensed. No licensing-related console errors.
result: pending

### 2. Admin tenants list shows Modules column
expected: As super_admin, open /admin/tenants. The table has columns Name, Slug, Status, and Modules. Each row has a "Modules" (or localized) link to that tenant's module management page.
result: pending

### 3. Tenant modules page loads
expected: As super_admin, open /admin/tenants/:id/modules (via link from list or URL). Page shows tenant name, list of override modules (or "No override modules"), an "Add module" dropdown and button, and a back link to /admin/tenants.
result: pending

### 4. Add override module
expected: On tenant modules page, select a module from the Add module dropdown and click Add. The module appears in the override list and a success message (toast or inline) is shown.
result: pending

### 5. Remove override module
expected: On tenant modules page, click Remove on an override module. The module disappears from the list and a success message is shown.
result: pending

### 6. Upgrade prompt when feature not licensed
expected: When the tenant lacks a module required by a feature (e.g. route or section wrapped in ModuleGuard), the user sees the upgrade/upsell message (UpgradePrompt) instead of the feature content, with no crash or blank screen.
result: pending

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

[none yet]
