---
phase: 7
slug: ai-action-credits-metering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (project-wide) |
| **Config file** | `vite.config.ts` (Vitest config embedded) |
| **Quick run command** | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts src/components/Settings/__tests__/AIUsagePage.test.tsx` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~13 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts src/components/Settings/__tests__/AIUsagePage.test.tsx`
- **After every plan wave:** Run `npm run test:run` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run lint` clean
- **Max feedback latency:** ~13 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | AI-01 | unit | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 | ⬜ pending |
| 7-01-02 | 01 | 1 | AI-01 | unit | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 | ⬜ pending |
| 7-01-03 | 01 | 1 | AI-02 | unit | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 | ⬜ pending |
| 7-01-04 | 01 | 1 | AI-02 | unit | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 | ⬜ pending |
| 7-02-01 | 02 | 1 | AI-03 | unit (mock RPC) | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 | ⬜ pending |
| 7-02-02 | 02 | 1 | AI-03 | unit (mock RPC) | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 | ⬜ pending |
| 7-03-01 | 03 | 2 | AI-04 | unit | `npm run test:run -- supabase/functions/__tests__/ai-metering.test.ts` | ❌ Wave 0 | ⬜ pending |
| 7-04-01 | 04 | 2 | AI-04 | unit (component) | `npm run test:run -- src/components/Settings/__tests__/AIUsagePage.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 7-04-02 | 04 | 2 | AI-04 | unit (component) | `npm run test:run -- src/components/Settings/__tests__/AIUsagePage.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 7-04-03 | 04 | 2 | AI-04 | unit (component) | `npm run test:run -- src/components/Settings/__tests__/AIUsagePage.test.tsx` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/__tests__/useAIUsage.test.ts` — stubs for AI-01, AI-02, AI-03 (mock Supabase client)
- [ ] `src/components/Settings/__tests__/AIUsagePage.test.tsx` — AI-04 UI states (80%, 90%, 100%, Enterprise)
- [ ] `supabase/functions/__tests__/ai-metering.test.ts` — AI-04 model routing (Deno test, TEST_MODE=stub pattern)

Reference: `supabase/functions/__tests__/analyze-site-photos.test.ts` for Deno test pattern.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe webhook credits AI pack purchase atomically | AI-03 | Requires live Stripe test webhook event | Use Stripe CLI `stripe trigger checkout.session.completed` with `metadata.type=ai_action_pack`; verify `ai_credits_purchased` incremented on tenant row |
| 90% degradation banner appears in AI feature areas | AI-04 | Requires seeded tenant at >90% usage | Seed `ai_usage_log` rows to reach 90% of tier budget; navigate to CastorMind / diary AI; verify banner displays with upgrade CTA |
| Enterprise tenant bypasses all degradation | AI-04 | Requires Enterprise tier tenant test account | Log in as Enterprise tenant; verify no badge, no banner, no model switch regardless of usage |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 13s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
