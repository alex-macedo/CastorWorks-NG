/**
 * Activates a subscription plan directly, bypassing Stripe payment.
 * For use in pre-payment / demo mode.
 * Body: { tenant_id, tier_id, billing_period: 'monthly' | 'annual' }.
 * Returns { success: true }.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyTenantAccess } from '../_shared/authorization.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: { tenant_id?: string; tier_id?: string; billing_period?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const tenantId = body.tenant_id
  const tierId = body.tier_id
  const billingPeriod = body.billing_period

  if (!tenantId || !tierId || !billingPeriod) {
    return jsonResponse({ error: 'Missing tenant_id, tier_id, or billing_period' }, 400)
  }
  if (billingPeriod !== 'monthly' && billingPeriod !== 'annual') {
    return jsonResponse({ error: 'billing_period must be monthly or annual' }, 400)
  }

  try {
    await verifyTenantAccess(req, tenantId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    return jsonResponse({ error: msg }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Verify the tier exists and is active
  const { data: tierRow, error: tierError } = await supabase
    .from('subscription_tiers')
    .select('id, name')
    .eq('id', tierId)
    .eq('is_active', true)
    .single()

  if (tierError || !tierRow) {
    return jsonResponse({ error: 'Tier not found or inactive' }, 400)
  }

  const now = new Date()
  const periodEnd = new Date(now)
  if (billingPeriod === 'annual') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  // Check if a subscription already exists for this tenant
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    // Update existing subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        tier_id: tierId,
        billing_period: billingPeriod,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('Failed to update subscription:', updateError)
      return jsonResponse({ error: 'Failed to activate subscription' }, 500)
    }
  } else {
    // Insert new subscription
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        tenant_id: tenantId,
        tier_id: tierId,
        billing_period: billingPeriod,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      })

    if (insertError) {
      console.error('Failed to insert subscription:', insertError)
      return jsonResponse({ error: 'Failed to activate subscription' }, 500)
    }
  }

  // Update the tenant's subscription_tier_id so get_tenant_licensed_modules returns the correct modules
  const { error: tenantUpdateError } = await supabase
    .from('tenants')
    .update({ subscription_tier_id: tierId })
    .eq('id', tenantId)

  if (tenantUpdateError) {
    console.error('Failed to update tenant subscription_tier_id:', tenantUpdateError)
    return jsonResponse({ error: 'Failed to update tenant tier' }, 500)
  }

  return jsonResponse({ success: true, tier_id: tierId, billing_period: billingPeriod }, 200)
})
