# Requirements: v1.1 Trial & Subscription Management

**Milestone:** v1.1 Trial & Subscription Management  
**Goal:** Self-service trial, payment, and tier management.

---

## Trial

- [ ] **TRIAL-01**: User can start a 30-day trial with full access to licensed modules
- [ ] **TRIAL-02**: User sees a countdown UI for remaining trial days
- [ ] **TRIAL-03**: User can convert from trial to paid (trial-to-paid flow)
- [ ] **TRIAL-04**: When trial expires, tenant falls back to sandbox tier (no hard block)

## Payment

- [ ] **PAYMENT-01**: System integrates a payment gateway (Stripe or Brazilian gateway)
- [ ] **PAYMENT-02**: User can pay for subscription (new or after trial)

## Subscription Management

- [ ] **SUBS-01**: User can view and manage subscription (upgrade/downgrade/cancel) on a subscription management page
- [ ] **SUBS-02**: Tier change takes effect for the tenant (already supported by v1.0 licensing; ensure billing aligns)

## Billing & Invoices

- [ ] **BILL-01**: User can view billing history
- [ ] **BILL-02**: System can generate invoices (or link to gateway invoices)

## Automated Emails

- [ ] **EMAIL-01**: System sends trial reminder emails (e.g. 7 days, 3 days, 1 day before expiry)
- [ ] **EMAIL-02**: System sends trial expiration warning

---

## Future Requirements (deferred)

- Phase 4: AI Action Credits & Metering
- Phase 5: Storage & Data Isolation
- Phase 6: Edge Functions & API Security
- Phase 7: Super Admin & Operations
- Phase 8: Polish & Launch Prep

---

## Out of Scope (v1.1)

- Per-user pricing (PROJECT: flat-rate per tier)
- Offline payment only (gateway required for self-service)
- Multi-currency checkout (can be later phase)

---

## Traceability

| Requirement | Phase | Status   |
|-------------|-------|----------|
| TRIAL-01    | 3     | Pending  |
| TRIAL-02    | 3     | Pending  |
| TRIAL-03    | 4     | Pending  |
| TRIAL-04    | 3     | Pending  |
| PAYMENT-01  | 4     | Pending  |
| PAYMENT-02  | 4     | Pending  |
| SUBS-01     | 4     | Pending  |
| SUBS-02     | 4     | Pending  |
| BILL-01     | 5     | Pending  |
| BILL-02     | 5     | Pending  |
| EMAIL-01    | 6     | Pending  |
| EMAIL-02    | 6     | Pending  |

*Traceability filled by roadmap (v1.1).*
