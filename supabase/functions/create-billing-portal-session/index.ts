/**
 * Creates a Stripe Customer Portal session for subscription management.
 * Body: { tenant_id }. Returns { url }. Requires STRIPE_SECRET_KEY, APP_URL.
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

  let body: { tenant_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const tenantId = body.tenant_id
  if (!tenantId) {
    return jsonResponse({ error: 'Missing tenant_id' }, 400)
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

  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (subError || !sub?.stripe_customer_id) {
    return jsonResponse({ error: 'No billing account found' }, 400)
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appUrl}/settings/subscription`,
  })

  return jsonResponse({ url: portalSession.url }, 200)
})
