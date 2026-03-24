#!/usr/bin/env node
/**
 * Phase 4 Stripe setup: create Products and Prices in Stripe, register webhook, output SQL.
 * Run: STRIPE_SECRET_KEY=sk_xxx APP_URL=https://devng.castorworks.cloud node scripts/stripe-phase4-setup.mjs
 * Optional: load from docs/.env.supabase (no quotes, one KEY=value per line).
 */

import Stripe from 'stripe'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const paths = [
    join(__dirname, '..', 'docs', '.env.supabase'),
    join(__dirname, '..', '.env.local'),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const eq = trimmed.indexOf('=')
          if (eq > 0) {
            const key = trimmed.slice(0, eq).trim()
            const value = trimmed.slice(eq + 1).trim()
            if (!process.env[key]) process.env[key] = value
          }
        }
      }
    }
  }
}

loadEnv()

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const APP_URL = process.env.APP_URL || 'https://devng.castorworks.cloud'

if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_')) {
  console.error('Missing or invalid STRIPE_SECRET_KEY. Set it in env or in docs/.env.supabase')
  process.exit(1)
}

// Omit apiVersion so Stripe uses account default (e.g. 2026-02-25.clover)
const stripe = new Stripe(STRIPE_SECRET_KEY)

const TIERS = [
  { id: 'arch_office', name: 'Architect Office', monthlyBrl: 349, annualBrlPerMonth: 279 },
  { id: 'arch_office_ai', name: 'Architect Office + AI', monthlyBrl: 599, annualBrlPerMonth: 479 },
  { id: 'construction', name: 'Construction', monthlyBrl: 999, annualBrlPerMonth: 799 },
  { id: 'construction_ai', name: 'Construction + AI', monthlyBrl: 1499, annualBrlPerMonth: 1199 },
]

async function main() {
  const priceIds = {}

  for (const tier of TIERS) {
    const product = await stripe.products.create({
      name: tier.name,
      metadata: { tier_id: tier.id },
    })
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      currency: 'brl',
      unit_amount: tier.monthlyBrl * 100,
      recurring: { interval: 'month' },
      metadata: { tier_id: tier.id, interval: 'month' },
    })
    const annualPrice = await stripe.prices.create({
      product: product.id,
      currency: 'brl',
      unit_amount: tier.annualBrlPerMonth * 100,
      recurring: { interval: 'year' },
      metadata: { tier_id: tier.id, interval: 'year' },
    })
    priceIds[tier.id] = { monthly: monthlyPrice.id, annual: annualPrice.id }
    console.log(`Created product ${tier.name}: monthly ${monthlyPrice.id}, annual ${annualPrice.id}`)
  }

  const webhookUrl = `${APP_URL.replace(/\/$/, '')}/functions/v1/stripe-webhook`
  const existing = await stripe.webhookEndpoints.list({ limit: 100 })
  const found = existing.data.find((e) => e.url === webhookUrl)
  let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (found) {
    console.log(`Webhook already exists: ${webhookUrl} (id: ${found.id})`)
    if (!webhookSecret) console.log('Reveal signing secret in Stripe Dashboard → Developers → Webhooks')
  } else {
    const endpoint = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      description: 'CastorWorks-NG Phase 4',
      enabled_events: [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
      ],
    })
    console.log(`Created webhook: ${webhookUrl}`)
    console.log('Signing secret (add to STRIPE_WEBHOOK_SECRET on server):', endpoint.secret || '(reveal in Dashboard)')
    webhookSecret = endpoint.secret
  }

  const sqlLines = ['BEGIN;']
  for (const tier of TIERS) {
    const { monthly, annual } = priceIds[tier.id]
    sqlLines.push(
      `UPDATE public.subscription_tiers SET stripe_price_id_monthly = '${monthly}', stripe_price_id_annual = '${annual}' WHERE id = '${tier.id}';`
    )
  }
  sqlLines.push('COMMIT;')
  const sql = sqlLines.join('\n')

  const outDir = join(__dirname, '.stripe-phase4-out')
  mkdirSync(outDir, { recursive: true })
  const sqlPath = join(outDir, 'price-ids.sql')
  const secretPath = join(outDir, 'webhook-secret.txt')
  writeFileSync(sqlPath, sql, 'utf8')
  if (webhookSecret) writeFileSync(secretPath, webhookSecret.trim(), 'utf8')
  console.log('\n--- SQL (also written to scripts/.stripe-phase4-out/price-ids.sql) ---\n')
  console.log(sql)
  console.log('\n--- End SQL ---')
  if (webhookSecret) {
    console.log('\nWebhook secret written to scripts/.stripe-phase4-out/webhook-secret.txt')
    console.log('Run: npm run stripe:phase4-apply  to apply SQL on NG DB and set secret on server.')
  } else {
    console.log('\nAdd STRIPE_WEBHOOK_SECRET in Stripe Dashboard, then set it on server and restart Edge Functions.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
