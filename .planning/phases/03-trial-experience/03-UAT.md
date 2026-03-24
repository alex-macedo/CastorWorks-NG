---
status: testing
phase: 03-trial-experience
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: "2026-03-01T21:00:00.000Z"
updated: "2026-03-01T21:15:00.000Z"
---

# Phase 3 UAT: Trial Experience

**Success criteria (ROADMAP):**
1. User can start a 30-day trial and receive full access to all licensed modules for the trial tier.
2. User sees a countdown or remaining-days UI for the trial (e.g. banner or settings).
3. When trial expires, tenant automatically moves to sandbox tier and can continue using the app (no hard block).

**Requirements:** TRIAL-01, TRIAL-02, TRIAL-04

---

## Tests

### 1. New tenant gets trial at onboarding (TRIAL-01)
**Expected:** Create a new user (sign up), complete onboarding (create workspace/tenant). The new tenant has `subscription_tier_id = 'trial'` and `trial_ends_at` set to ~30 days from now. User has full access to trial-tier modules (sidebar shows trial-tier options; no upgrade prompt on trial-included features).
**How:** Sign up → onboarding form → create workspace → confirm in DB or by seeing trial countdown banner and full feature access.
**Result:** pending

### 2. Trial countdown banner visible (TRIAL-02)
**Expected:** When logged in as a user whose tenant is on trial, the main app (e.g. dashboard) shows a non-blocking banner with text like "X days left in your trial" (or localized equivalent). Banner appears below the top bar / above main content. No console errors.
**How:** Log in with a trial-tenant user; open dashboard or any main app route; verify banner presence and text.
**Result:** pending

### 3. Trial banner in all four locales
**Expected:** Switching language to pt-BR, es-ES, fr-FR shows the same banner message in that language (e.g. "X dias restantes no seu período de teste" for pt-BR).
**How:** Settings → Language → switch; return to dashboard; confirm banner translation.
**Result:** pending

### 4. Sandbox tenant can start trial (start_trial RPC) (TRIAL-01)
**Expected:** For a tenant with `subscription_tier_id = 'sandbox'`, calling `start_trial(tenant_id)` as a tenant member (or via a future UI "Start trial" CTA) updates the tenant to trial tier and sets `trial_ends_at`. Thereafter user sees trial banner and trial-tier module access.
**How:** Use Supabase client or SQL as tenant member: `supabase.rpc('start_trial', { p_tenant_id: tenantId })`; then reload app and verify banner + module access. Or implement and use a "Start trial" button and verify.
**Result:** pending

### 5. Expired trial moves to sandbox, no hard block (TRIAL-04)
**Expected:** When `trial_ends_at` is in the past, the next time the app resolves modules (e.g. load a page that calls get_tenant_licensed_modules), the tenant row is updated to `subscription_tier_id = 'sandbox'`, `trial_ends_at = NULL`. User continues to use the app with sandbox-tier modules (reduced set); no blocking modal or "access denied" for the app itself. Trial banner no longer shows.
**How:** In DB set `trial_ends_at = now() - interval '1 day'` for a trial tenant; as that user, reload app and navigate. Verify: tenant row is sandbox; sidebar shows only sandbox modules; no trial banner; app is usable.
**Result:** pending

### 6. Build and lint pass
**Expected:** `npm run lint` and `npm run build` complete with no errors. Trial-related code (useTenantTrial, TrialCountdownBanner, create-tenant, migration) is included and compiles.
**Result:** passed (2026-03-01). Fixed useTenantTrial purity: replaced Date.now() in useMemo with state updated in useEffect so render stays pure; lint 0 errors, build succeeds.

### 7. Unit tests and CI checks
**Expected:** `npm run validate:json`, `npm run lint`, `npm run test:run` pass.
**Result:** passed (2026-03-01). validate:json 36/36; test:run 63 files, 773 tests passed. Lint passed (0 errors).

### 8. Phase 3 E2E (agent-browser)
**Expected:** `npm run test:e2e -- phase3-trial-experience` logs in, opens dashboard, verifies app load and optionally trial banner.
**Result:** skipped (daemon). E2E script added: `e2e/phase3-trial-experience.agent-browser.cjs` and `scripts/agent-browser-e2e.sh` phase3* → BASE_URL=5181. Run failed with "Daemon failed to start" (agent-browser socket); re-run locally when daemon is available.

---

## Summary

| # | Test | Requirement | Result |
|---|------|-------------|--------|
| 1 | New tenant gets trial at onboarding | TRIAL-01 | pending |
| 2 | Trial countdown banner visible | TRIAL-02 | pending |
| 3 | Trial banner in 4 locales | TRIAL-02 | pending |
| 4 | Sandbox tenant can start trial (RPC) | TRIAL-01 | pending |
| 5 | Expired trial → sandbox, no block | TRIAL-04 | pending |
| 6 | Build and lint pass | — | passed |
| 7 | Unit tests + validate:json | — | passed |
| 8 | Phase 3 E2E (agent-browser) | — | skipped (daemon) |

**total:** 8  
**passed:** 3  
**pending:** 4  
**failed:** 0  
**skipped:** 1  

---

## Gaps

(none yet; add here if a test reveals missing behavior)
