/**
 * Creates a Stripe Checkout session for one-time AI action packs.
 * Body: { tenant_id, pack_id: 'boost_200' | 'boost_500' | 'boost_2000' }.
 * Returns { url }. Requires STRIPE_SECRET_KEY, APP_URL, STRIPE_PRICE_BOOST_* envs.
 */

import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyTenantAccess } from '../_shared/authorization.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ActionPack {
  credits: number
  envKey: 'STRIPE_PRICE_BOOST_200' | 'STRIPE_PRICE_BOOST_500' | 'STRIPE_PRICE_BOOST_2000'
}

const ACTION_PACKS: Record<string, ActionPack> = {
  boost_200: { credits: 200, envKey: 'STRIPE_PRICE_BOOST_200' },
  boost_500: { credits: 500, envKey: 'STRIPE_PRICE_BOOST_500' },
  boost_2000: { credits: 2000, envKey: 'STRIPE_PRICE_BOOST_2000' },
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

  let body: { tenant_id?: string; pack_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const tenantId = body.tenant_id
  const packId = body.pack_id
  if (!tenantId || !packId) {
    return jsonResponse({ error: 'Missing tenant_id or pack_id' }, 400)
  }

  const pack = ACTION_PACKS[packId]
  if (!pack) {
    return jsonResponse({ error: 'Invalid pack_id' }, 400)
  }

  try {
    await verifyTenantAccess(req, tenantId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    return jsonResponse({ error: msg }, 401)
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeSecretKey) {
    return jsonResponse({ error: 'STRIPE_SECRET_KEY not configured' }, 500)
  }

  const priceId = Deno.env.get(pack.envKey)
  if (!priceId) {
    return jsonResponse({ error: `${pack.envKey} not configured` }, 500)
  }

  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5181'
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-11-20' })

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
      tier_id: 'sandbox',
      billing_period: 'monthly',
      status: 'incomplete',
    })
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      type: 'ai_action_pack',
      tenant_id: tenantId,
      pack_id: packId,
      credits: String(pack.credits),
    },
    success_url: `${appUrl}/settings?tab=ai-usage&success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/settings?tab=ai-usage&canceled=1`,
  })

  return jsonResponse({ url: session.url }, 200)
})
