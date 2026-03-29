import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Wave 0 test scaffold for ai-metering shared helper
// Requirement: AI-04 — model routing via degraded flag
//
// These tests are intentionally RED — the source file
// supabase/functions/_shared/ai-metering.ts does not exist yet
// and will be created in Plan 02.

// Set required env vars for shared auth helpers
Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'https://test.supabase');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'service-role-key');
Deno.env.set('SUPABASE_ANON_KEY', Deno.env.get('SUPABASE_ANON_KEY') ?? 'anon-key');

// This import will fail (RED) until Plan 02 creates the file
import { consumeAIActions } from '../_shared/ai-metering.ts';

// ---------------------------------------------------------------------------
// AI-04: Model routing via degraded flag
// ---------------------------------------------------------------------------

Deno.test("consumeAIActions returns degraded=false when tenant has remaining credits", async () => {
  // Use stub mode to bypass real Supabase RPC
  Deno.env.set('TEST_MODE', 'stub');

  // Stub response simulates a tenant with 50 credits remaining
  const mockRpcResult = { allowed: true, degraded: false, remaining: 50 };

  // consumeAIActions in stub mode should return the stub result
  const result = await consumeAIActions({
    tenantId: 'tenant-with-credits',
    feature: 'ai-chat',
    actions: 1,
    userId: 'user-uuid',
    modelUsed: 'claude-sonnet',
    _stubResult: mockRpcResult,
  });

  assertEquals(result.degraded, false);
  assertEquals(result.allowed, true);
  // When degraded is false, preferredProvider should be undefined (use default routing)
  assertEquals(result.preferredProvider, undefined);
});

Deno.test("consumeAIActions returns degraded=true and preferredProvider='openrouter' when budget exhausted", async () => {
  // Use stub mode to bypass real Supabase RPC
  Deno.env.set('TEST_MODE', 'stub');

  // Stub response simulates a tenant with 0 credits remaining
  const mockRpcResult = { allowed: true, degraded: true, remaining: 0 };

  const result = await consumeAIActions({
    tenantId: 'tenant-exhausted',
    feature: 'ai-chat',
    actions: 1,
    userId: 'user-uuid',
    modelUsed: 'claude-sonnet',
    _stubResult: mockRpcResult,
  });

  assertEquals(result.degraded, true);
  assertEquals(result.allowed, true);
  // When degraded, helper should signal cheapest provider for model routing
  assertEquals(result.preferredProvider, 'openrouter');
});

Deno.test("consumeAIActions always returns allowed=true (silent degradation, never blocks)", async () => {
  Deno.env.set('TEST_MODE', 'stub');

  // Even with 0 remaining, action is always allowed
  const mockRpcResult = { allowed: true, degraded: true, remaining: 0 };

  const result = await consumeAIActions({
    tenantId: 'tenant-at-zero',
    feature: 'generate-proposal-content',
    actions: 10,
    userId: 'user-uuid',
    modelUsed: 'gpt-4o',
    _stubResult: mockRpcResult,
  });

  // Critical: allowed is ALWAYS true per CONTEXT.md locked decision
  assertEquals(result.allowed, true);
});

Deno.test("consumeAIActions enterprise tenant returns degraded=false regardless of usage", async () => {
  Deno.env.set('TEST_MODE', 'stub');

  // Enterprise RPC always returns degraded=false, remaining=999999
  const mockRpcResult = { allowed: true, degraded: false, remaining: 999999 };

  const result = await consumeAIActions({
    tenantId: 'enterprise-tenant-id',
    feature: 'financial-cashflow-forecast',
    actions: 10,
    userId: 'user-uuid',
    modelUsed: 'claude-sonnet',
    _stubResult: mockRpcResult,
  });

  assertEquals(result.degraded, false);
  assertEquals(result.allowed, true);
  // Enterprise: no preferredProvider override
  assertEquals(result.preferredProvider, undefined);
});
