/**
 * Generates and returns an invoice PDF for a tenant's Stripe invoice.
 * Body: { tenant_id, invoice_id }. Returns PDF binary. Verifies invoice belongs to tenant.
 */

import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1?target=denonext'
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

  let body: { tenant_id?: string; invoice_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const tenantId = body.tenant_id
  const invoiceId = body.invoice_id
  if (!tenantId || !invoiceId) {
    return jsonResponse({ error: 'Missing tenant_id or invoice_id' }, 400)
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
    return jsonResponse({ error: 'No billing account found' }, 404)
  }

  let inv: Stripe.Invoice
  try {
    inv = await stripe.invoices.retrieve(invoiceId, { expand: ['lines.data'] })
  } catch (_e) {
    return jsonResponse({ error: 'Invoice not found' }, 404)
  }

  const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
  if (customerId !== sub.stripe_customer_id) {
    return jsonResponse({ error: 'Invoice does not belong to this tenant' }, 403)
  }

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595, 842])
  const { width, height } = page.getSize()
  let y = height - 50

  const title = `Invoice ${inv.number ?? inv.id}`
  page.drawText(title, { x: 50, y, size: 18, font: bold })
  y -= 24

  const dateStr = inv.created
    ? new Date(inv.created * 1000).toISOString().slice(0, 10)
    : '—'
  page.drawText(`Date: ${dateStr}`, { x: 50, y, size: 12, font })
  y -= 20

  page.drawText('Line items', { x: 50, y, size: 12, font: bold })
  y -= 16

  const lineItems = inv.lines?.data ?? []
  for (const line of lineItems) {
    const desc = (line.description ?? '—').slice(0, 60)
    const amount = line.amount != null ? (line.amount / 100).toFixed(2) : '—'
    const currency = (inv.currency ?? 'usd').toUpperCase()
    page.drawText(desc, { x: 50, y, size: 10, font })
    page.drawText(`${amount} ${currency}`, { x: width - 120, y, size: 10, font })
    y -= 14
  }

  y -= 10
  const total = inv.amount_paid ?? inv.amount_due ?? 0
  const totalStr = `Total: ${(total / 100).toFixed(2)} ${(inv.currency ?? 'usd').toUpperCase()}`
  page.drawText(totalStr, { x: 50, y, size: 12, font: bold })

  const pdfBytes = await doc.save()
  const filename = `invoice-${(inv.number ?? inv.id).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`

  return new Response(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      ...CORS_HEADERS,
    },
  })
})
