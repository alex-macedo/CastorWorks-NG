---
status: testing
phase: 05-billing-invoices
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md]
started: "2026-03-02T00:00:00.000Z"
updated: "2026-03-02T00:00:00.000Z"
---

## Current Test

number: 2
name: Billing page shows empty state when no history
expected: |
  When on the Billing tab, a "Billing history" card is shown. If the tenant has no Stripe customer or no invoices, the card shows an empty state with the message "No billing history yet" (or the equivalent in the current locale).
awaiting: user response

## Tests

### 1. Billing tab visible in Settings
expected: In Settings, a "Billing" tab is visible in the tabs list, placed after the "Subscription" tab. The tab label is localized (e.g. "Billing" in English). Clicking it switches to the Billing content (no navigation away from Settings).
result: issue
reported: "The Settings page has no tabs at all. The current implementation uses separate sidebar nav links (/settings/organization and /settings/billing as distinct routes), not a tabbed interface within a single Settings page. No tab list is present; no Subscription tab, no Billing tab. 'Faturamento' exists only as a sidebar link that navigates away to /settings/billing."
severity: major

### 2. Billing page shows empty state when no history
expected: When on the Billing tab, a "Billing history" card is shown. If the tenant has no Stripe customer or no invoices, the card shows an empty state with the message "No billing history yet" (or the equivalent in the current locale).
result: pending

### 3. Billing history list shows invoices when data exists
expected: When the tenant has Stripe invoices, the Billing history card shows a table with rows for each invoice: date, invoice number, amount (with currency), status (e.g. paid/open), and when relevant an attempt count. Data loads without errors.
result: pending

### 4. Download invoice button triggers PDF download
expected: For each invoice row that is paid or open, a "Download invoice" button (or equivalent label) is present. Clicking it triggers a file download of a PDF. The downloaded file is a valid PDF containing invoice details (number, date, line items, total) and has a filename like "invoice-{number}.pdf".
result: pending

### 5. Billing tab separate from Subscription
expected: The Billing tab and the Subscription tab are distinct. Subscription shows current plan, renewal, Change Plan, Manage Billing. Billing shows only billing history and invoice list/download. No billing history content appears on the Subscription tab.
result: pending

## Summary

total: 5
passed: 0
issues: 1
pending: 4
skipped: 0

## Gaps

- truth: "In Settings, a Billing tab is visible in the tabs list, placed after the Subscription tab; clicking it switches to Billing content without navigating away."
  status: failed
  reason: "User reported: Settings has no tabs; uses separate sidebar nav links (/settings/organization, /settings/billing as distinct routes). 'Faturamento' is only a sidebar link to /settings/billing."
  severity: major
  test: 1
  artifacts: []
  missing: []
