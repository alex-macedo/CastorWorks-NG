/**
 * Lists billing history (invoices) from Stripe for the tenant.
 * Body: { tenant_id }. Returns { items: Array }. No DB cache — Stripe is source of truth.
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

  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (subError || !sub?.stripe_customer_id) {
    return jsonResponse({ items: [] }, 200)
  }

  const invoices = await stripe.invoices.list({
    customer: sub.stripe_customer_id,
    limit: 100,
  })

  const items = invoices.data.map((inv: Stripe.Invoice) => ({
    id: inv.id,
    number: inv.number ?? inv.id,
    date: inv.status_transitions?.paid_at
      ? Math.floor((inv.status_transitions.paid_at as number) / 1000)
      : inv.created,
    amount_due: inv.amount_due,
    amount_paid: inv.amount_paid,
    status: inv.status,
    currency: inv.currency ?? 'usd',
    attempt_count: inv.attempt_count ?? 0,
    paid_at: inv.status_transitions?.paid_at
      ? Math.floor((inv.status_transitions.paid_at as number) / 1000)
      : null,
  }))

  return jsonResponse({ items }, 200)
})
