/**
 * Creates a Stripe Checkout session for subscription.
 * Body: { tenant_id, tier_id, billing_period: 'monthly' | 'annual' }.
 * Returns { url }. Requires STRIPE_SECRET_KEY, APP_URL.
 */

import Stripe from 'https://esm.sh/stripe@14?target=denonext'
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
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-11-20' })
  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5181'

  const { data: tierRow, error: tierError } = await supabase
    .from('subscription_tiers')
    .select('stripe_price_id_monthly, stripe_price_id_annual')
    .eq('id', tierId)
    .single()

  if (tierError || !tierRow) {
    return jsonResponse({ error: 'Tier not found' }, 400)
  }

  const priceId =
    billingPeriod === 'annual'
      ? tierRow.stripe_price_id_annual
      : tierRow.stripe_price_id_monthly
  if (!priceId) {
    return jsonResponse(
      { error: 'Stripe price not configured for this tier. Contact support.' },
      400
    )
  }

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let stripeCustomerId: string

  if (existingSub?.stripe_customer_id) {
    stripeCustomerId = existingSub.stripe_customer_id
  } else {
    const customer = await stripe.customers.create({
      metadata: { tenant_id: tenantId },
    })
    stripeCustomerId = customer.id
    await supabase.from('subscriptions').insert({
      tenant_id: tenantId,
      stripe_customer_id: stripeCustomerId,
      tier_id: tierId,
      billing_period: billingPeriod,
      status: 'incomplete',
    })
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { tenant_id: tenantId, tier_id: tierId, billing_period: billingPeriod },
    subscription_data: {
      metadata: { tenant_id: tenantId, tier_id: tierId, billing_period: billingPeriod },
    },
    success_url: `${appUrl}/settings/subscription?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/settings/subscription?canceled=1`,
  })

  return jsonResponse({ url: session.url }, 200)
})
