/**
 * Stripe webhook handler: signature verification, idempotency via stripe_events,
 * subscription lifecycle handling, and change_tenant_tier sync.
 * Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20',
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const rawBody = await req.text()
  const sig = req.headers.get('Stripe-Signature') ?? req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig!,
      webhookSecret,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed'
    console.error('Webhook signature verification failed:', err)
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  const { error: insertError } = await supabase
    .from('stripe_events')
    .insert({ stripe_event_id: event.id, event_type: event.type })

  if (insertError?.code === '23505') {
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (insertError) {
    console.error('Failed to log stripe event:', insertError)
    return new Response('Internal Server Error', { status: 500 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const tenantId = sub.metadata?.tenant_id
        if (!tenantId) {
          console.warn('Subscription missing metadata.tenant_id:', sub.id)
          break
        }
        const tierId = sub.metadata?.tier_id
        const item = sub.items.data[0]
        const billingPeriod: 'monthly' | 'annual' =
          item?.plan?.interval === 'year' ? 'annual' : 'monthly'

        await supabase.from('subscriptions').upsert(
          {
            tenant_id: tenantId,
            stripe_customer_id:
              typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
            stripe_subscription_id: sub.id,
            stripe_price_id: item?.price?.id ?? null,
            tier_id: tierId ?? 'sandbox',
            billing_period: billingPeriod,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
          },
          { onConflict: 'stripe_subscription_id' }
        )

        if (tierId) {
          await supabase.rpc('change_tenant_tier', {
            p_tenant_id: tenantId,
            p_new_tier_id: tierId,
            p_stripe_subscription_id: sub.id,
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const tenantId = sub.metadata?.tenant_id
        if (tenantId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('stripe_subscription_id', sub.id)
          await supabase.rpc('change_tenant_tier', {
            p_tenant_id: tenantId,
            p_new_tier_id: 'sandbox',
            p_stripe_subscription_id: sub.id,
          })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id
        if (stripeSubId && invoice.period_start != null && invoice.period_end != null) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date(invoice.period_start * 1000).toISOString(),
              current_period_end: new Date(invoice.period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', stripeSubId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id
        if (stripeSubId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', stripeSubId)
        }
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata ?? {}
        if (metadata.type !== 'ai_action_pack') {
          break
        }

        const tenantId = metadata.tenant_id
        const credits = Number(metadata.credits ?? '0')
        if (!tenantId || !Number.isFinite(credits) || credits <= 0) {
          console.warn('Invalid ai_action_pack metadata:', metadata)
          break
        }

        const { error: addCreditsError } = await supabase.rpc('add_ai_credits', {
          p_tenant_id: tenantId,
          p_credits: credits,
        })
        if (addCreditsError) {
          throw addCreditsError
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }
  } catch (err) {
    console.error('Error processing event:', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
