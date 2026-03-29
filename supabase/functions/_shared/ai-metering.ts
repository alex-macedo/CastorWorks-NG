/**
 * AI Metering shared helper
 *
 * Calls the consume_ai_actions Postgres RPC (service_role) to atomically
 * deduct action credits and determine the degraded routing flag.
 *
 * Key behaviours (LOCKED from CONTEXT.md):
 * - allowed is ALWAYS true — 100% exhaustion degrades silently, never blocks
 * - degraded=true signals the caller to use preferredProvider: 'openrouter'
 * - Enterprise tenants return remaining=999999 and degraded=false
 * - TEST_MODE=stub bypasses the real RPC and returns _stubResult
 */

import { createServiceRoleClient } from './authorization.ts';

export interface AIActionResult {
  allowed: boolean;
  degraded: boolean;
  remaining: number;
  /** Convenience: 'openrouter' when degraded, undefined otherwise */
  preferredProvider?: 'openrouter';
}

export interface ConsumeAIActionsParams {
  tenantId: string;
  feature: string;
  actions: number;
  userId?: string | null;
  modelUsed: string;
  tokensIn?: number;
  tokensOut?: number;
  costBrl?: number;
  cached?: boolean;
  /** Test-only: return this stub result instead of calling the RPC */
  _stubResult?: { allowed: boolean; degraded: boolean; remaining: number };
}

export async function consumeAIActions(
  params: ConsumeAIActionsParams
): Promise<AIActionResult> {
  const {
    tenantId,
    feature,
    actions,
    userId,
    modelUsed,
    tokensIn = 0,
    tokensOut = 0,
    costBrl = 0,
    cached = false,
    _stubResult,
  } = params;

  // Fail-open: metering must never hard-block AI features
  if (!tenantId || !isUuid(tenantId)) {
    return {
      allowed: true,
      degraded: false,
      remaining: 0,
      preferredProvider: undefined,
    };
  }

  const safeUserId = userId && isUuid(userId) ? userId : null;

  // Stub mode: used by Deno tests to bypass real Supabase RPC
  if (Deno.env.get('TEST_MODE') === 'stub' && _stubResult) {
    const degraded = _stubResult.degraded === true;
    return {
      allowed: _stubResult.allowed,
      degraded,
      remaining: _stubResult.remaining,
      preferredProvider: degraded ? 'openrouter' : undefined,
    };
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc('consume_ai_actions', {
    p_tenant_id: tenantId,
    p_feature: feature,
    p_actions: actions,
    p_user_id: safeUserId,
    p_model_used: modelUsed,
    p_tokens_in: tokensIn,
    p_tokens_out: tokensOut,
    p_cost_brl: costBrl,
    p_cached: cached,
  });

  if (error) {
    console.error('AI metering RPC failed, continuing in fail-open mode:', error.message);
    return {
      allowed: true,
      degraded: false,
      remaining: 0,
      preferredProvider: undefined,
    };
  }

  const result = Array.isArray(data) ? data[0] : data;
  const degraded = result?.degraded === true;
  return {
    allowed: result?.allowed ?? true,
    degraded,
    remaining: result?.remaining ?? 0,
    preferredProvider: degraded ? 'openrouter' : undefined,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
