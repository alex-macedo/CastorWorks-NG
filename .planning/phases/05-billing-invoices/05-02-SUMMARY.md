# Phase 05 Plan 02 — Summary

**Phase:** 05-billing-invoices  
**Plan:** 02  
**Status:** Complete

## Delivered

### Billing tab and BillingPage

- **Settings.tsx:** Added `TabsTrigger` value="billing" (after subscription) with label `t('settings:tabs.billing')`. Added `TabsContent` value="billing" rendering `<BillingPage />`.
- **BillingPage.tsx:** Card-based layout (same pattern as SubscriptionPage). "Billing history" card with table of items (date, number, amount, status, attempt_count). Empty state with message from `t('settings:billing.emptyState')` ("No billing history yet") when items are empty. "Download invoice" button per row for paid/open invoices; calls get-invoice-pdf via fetch (blob response) and triggers PDF download.

### useBillingHistory hook

- **Path:** `src/hooks/useBillingHistory.ts`
- **Behavior:** Uses `useTenantId()`, then `useQuery` that invokes `supabase.functions.invoke('list-billing-history', { body: { tenant_id } })`. Returns `{ items, isLoading, error }` from the response body.

### i18n

- **settings.tabs.billing** and **settings.tabs.subscription** added in en-US, pt-BR, es-ES, fr-FR.
- **settings.billing.title**, **settings.billing.emptyState**, **settings.billing.downloadInvoice** added in all four locales.

## Verification

- Billing tab is separate from Subscription tab.
- Billing history shows invoices and payment attempt context (attempt_count when > 1).
- Empty state shown when no history.
- Download invoice uses fetch to get-invoice-pdf and delivers our-generated PDF with correct filename from Content-Disposition.

## Success criteria

- [x] User can view billing history (invoices and payment attempt info) in a dedicated Billing tab in Settings.
- [x] User sees empty state "No billing history yet" when there are no items.
- [x] User can download an invoice as our-generated PDF via "Download invoice" in the app.
