# Phase 05 Plan 01 — Summary

**Phase:** 05-billing-invoices  
**Plan:** 01  
**Status:** Complete

## Delivered

### Edge Function: list-billing-history

- **Path:** `supabase/functions/list-billing-history/index.ts`
- **Behavior:** POST body `{ tenant_id }`. Uses `verifyTenantAccess(req, tenantId)`. Resolves `stripe_customer_id` from `subscriptions` (same pattern as create-billing-portal-session). If no customer, returns `200` with `{ items: [] }`. Calls Stripe `invoices.list({ customer, limit: 100 })`. Maps each invoice to: `id`, `number`, `date`, `amount_due`, `amount_paid`, `status`, `currency`, `attempt_count`, `paid_at`. Returns `{ items }`. No DB cache — Stripe is single source of truth.

### Edge Function: get-invoice-pdf

- **Path:** `supabase/functions/get-invoice-pdf/index.ts`
- **Behavior:** POST body `{ tenant_id, invoice_id }`. Verifies tenant with `verifyTenantAccess`. Resolves `stripe_customer_id` from subscriptions. Retrieves Stripe invoice with `stripe.invoices.retrieve(invoice_id, { expand: ['lines.data'] })`. Verifies `invoice.customer` matches tenant’s `stripe_customer_id`. Generates PDF with pdf-lib (invoice number, date, line items, total). Returns `Response` with PDF body, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="invoice-{number}.pdf"`. Wrong customer returns 403/404.

## Verification

- `deno check` passes for both functions.
- list-billing-history: returns items from Stripe only; no DB reads for invoice data.
- get-invoice-pdf: returns our-generated PDF; tenant ownership enforced.

## Success criteria

- [x] Backend can return billing history (invoices + payment attempt info) for the tenant from Stripe.
- [x] Backend can generate and serve an invoice PDF for a tenant’s Stripe invoice.
