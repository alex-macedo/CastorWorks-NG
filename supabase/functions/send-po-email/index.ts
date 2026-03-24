// Story 3.4: Send Purchase Order Email to Supplier
// Epic 3: Purchase Order Generation & Supplier Communication
//
// This Edge Function sends professional emails to suppliers with PO PDF attachments
// and updates the PO status to 'sent'.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { sendEmailViaHostinger } from '../_shared/providers/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendPOEmailRequest {
  purchase_order_id: string
  force_resend?: boolean // Allow re-sending even if already sent
}

interface POData {
  id: string
  purchase_order_number: string
  subtotal: number
  tax_amount: number
  total_amount: number
  currency_id: string
  delivery_address: string | null
  expected_delivery_date: string | null
  payment_terms: string | null
  payment_due_date: string | null
  special_instructions: string | null
  delivery_instructions: string | null
  status: string
  pdf_url: string | null
  sent_at: string | null
  project_id: string
  supplier_id: string
  suppliers: {
    name: string
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
  } | null
  projects: {
    name: string
    client_name: string | null
    manager_id: string
    users: {
      email: string
      full_name: string | null
    } | null
  } | null
}

// Helper function to format currency
function formatCurrency(amount: number, currencyCode: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'BRL': 'R$',
    'EUR': '€',
    'GBP': '£',
  }

  const symbol = symbols[currencyCode] || currencyCode
  return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

// Helper function to format date
function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Generate professional email HTML
function generateEmailHTML(po: POData): string {
  const supplier = po.suppliers || { name: 'Supplier', contact_name: null }
  const project = po.projects || { name: 'Project', client_name: null }
  // @ts-expect-error - users property may not exist on all project types
  const pm = project.users || { full_name: null, email: '' }

  const contactName = supplier.contact_name || 'Supplier Contact'
  const pmName = pm.full_name || pm.email.split('@')[0]

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .summary-box {
      background-color: #f8fafc;
      border-left: 4px solid #1a365d;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .summary-box h2 {
      margin: 0 0 15px 0;
      color: #1a365d;
      font-size: 22px;
    }
    .summary-box p {
      margin: 8px 0;
      font-size: 15px;
    }
    .summary-box strong {
      color: #2d3748;
      display: inline-block;
      min-width: 140px;
    }
    .section {
      margin: 25px 0;
    }
    .section h3 {
      color: #1a365d;
      font-size: 18px;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .section p, .section ol {
      margin: 10px 0;
      font-size: 15px;
    }
    .section ol {
      padding-left: 20px;
    }
    .section ol li {
      margin: 8px 0;
    }
    .highlight {
      background-color: #fff3cd;
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #ffc107;
      margin: 20px 0;
    }
    .contact-box {
      background-color: #e8f4f8;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .signature {
      margin: 30px 0 20px 0;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .signature p {
      margin: 5px 0;
      font-size: 15px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 5px 0;
      font-size: 13px;
      color: #64748b;
    }
    .footer a {
      color: #1a365d;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📄 Purchase Order</h1>
      <p>EngPro Engineering Procurement Platform</p>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Greeting -->
      <div class="greeting">
        <p>Dear <strong>${contactName}</strong>,</p>
      </div>

      <!-- Introduction -->
      <p>We are pleased to send you the following purchase order. Please review the attached PDF document for complete details.</p>

      <!-- PO Summary Box -->
      <div class="summary-box">
        <h2>PO #: ${po.purchase_order_number}</h2>
        <p><strong>Project:</strong> ${project.name}</p>
        ${project.client_name ? `<p><strong>Client:</strong> ${project.client_name}</p>` : ''}
        <p><strong>Total Amount:</strong> <span style="color: #1a365d; font-size: 18px; font-weight: 600;">${formatCurrency(po.total_amount, po.currency_id)}</span></p>
        <p><strong>Expected Delivery:</strong> ${formatDate(po.expected_delivery_date)}</p>
        <p><strong>Payment Terms:</strong> ${po.payment_terms || 'As agreed'}</p>
        ${po.payment_due_date ? `<p><strong>Payment Due:</strong> ${formatDate(po.payment_due_date)}</p>` : ''}
      </div>

      <!-- Delivery Instructions -->
      ${po.delivery_address || po.delivery_instructions ? `
      <div class="section">
        <h3>📦 Delivery Information</h3>
        ${po.delivery_address ? `<p><strong>Delivery Address:</strong><br>${po.delivery_address.replace(/\n/g, '<br>')}</p>` : ''}
        ${po.delivery_instructions ? `<p><strong>Special Instructions:</strong><br>${po.delivery_instructions}</p>` : ''}
      </div>
      ` : ''}

      <!-- Special Instructions -->
      ${po.special_instructions ? `
      <div class="highlight">
        <p><strong>⚠️ Special Instructions:</strong></p>
        <p>${po.special_instructions}</p>
      </div>
      ` : ''}

      <!-- Next Steps -->
      <div class="section">
        <h3>📋 Next Steps</h3>
        <ol>
          <li><strong>Review</strong> the attached purchase order PDF carefully</li>
          <li><strong>Confirm</strong> receipt and acceptance of this order</li>
          <li><strong>Prepare</strong> items for delivery according to specifications</li>
          <li><strong>Provide</strong> shipping and tracking information once dispatched</li>
          <li><strong>Deliver</strong> by the expected delivery date: <strong>${formatDate(po.expected_delivery_date)}</strong></li>
        </ol>
      </div>

      <!-- Contact Information -->
      <div class="section">
        <h3>📞 Questions or Concerns?</h3>
        <div class="contact-box">
          <p style="margin: 0;">If you have any questions about this purchase order, please contact:</p>
          <p style="margin: 10px 0 0 0;">
            <strong>${pmName}</strong><br>
            Project Manager<br>
            Email: <a href="mailto:${pm.email}">${pm.email}</a><br>
            Project: ${project.name}
          </p>
        </div>
      </div>

      <!-- Signature -->
      <div class="signature">
        <p>Best regards,</p>
        <p><strong>EngPro Procurement Team</strong></p>
        <p style="color: #64748b; font-size: 14px;">Engineering Procurement Platform</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>EngPro</strong> | Engineering Procurement Platform</p>
      <p>Email: <a href="mailto:orders@engpro.com">orders@engpro.com</a> | Web: <a href="https://engpro.com">www.engpro.com</a></p>
      <p style="margin-top: 15px; font-size: 12px;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Create service role client for operations that need it
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { purchase_order_id, force_resend }: SendPOEmailRequest = await req.json()

    if (!purchase_order_id) {
      return new Response(JSON.stringify({ error: 'purchase_order_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Sending PO email for: ${purchase_order_id}`)

    // ============================================================================
    // Step 1: Fetch PO data with all relationships
    // ============================================================================

    const { data: po, error: poError } = await supabaseServiceClient
      .from('purchase_orders')
      .select(
        `
        *,
        suppliers (
          name,
          contact_name,
          contact_email,
          contact_phone
        ),
        projects (
          name,
          client_name,
          manager_id,
          users!inner(email, full_name)
        )
      `
      )
      .eq('id', purchase_order_id)
      .single()

    if (poError || !po) {
      console.error('Error fetching purchase order:', poError)
      return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const poData = po as unknown as POData

    // ============================================================================
    // Step 2: Verify user has access to the project
    // ============================================================================

    const { data: projectAccess, error: accessError } = await supabaseClient
      .from('projects')
      .select('id, manager_id')
      .eq('id', poData.project_id)
      .single()

    if (accessError || !projectAccess || projectAccess.manager_id !== user.id) {
      console.error('Access denied for user:', user.id)
      return new Response(JSON.stringify({ error: 'User does not have access to this project' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ============================================================================
    // Step 3: Validate PO has PDF generated
    // ============================================================================

    if (!poData.pdf_url) {
      return new Response(
        JSON.stringify({
          error: 'Purchase order PDF not generated',
          message: 'Please generate the PDF first before sending email',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================================================
    // Step 4: Validate supplier has contact email
    // ============================================================================

    const supplierEmail = poData.suppliers?.contact_email

    if (!supplierEmail) {
      return new Response(
        JSON.stringify({
          error: 'Supplier contact email not configured',
          message: 'Please update supplier contact information before sending',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================================================
    // Step 5: Check if already sent (warn if not force_resend)
    // ============================================================================

    if (poData.status === 'sent' && poData.sent_at && !force_resend) {
      return new Response(
        JSON.stringify({
          error: 'Purchase order already sent',
          message: `PO was sent on ${formatDate(poData.sent_at)}. Use force_resend=true to resend.`,
          sent_at: poData.sent_at,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================================================
    // Step 6: Resolve PDF URL and download PDF from storage
    // ============================================================================

    let pdfUrlToFetch = ''

    try {
      // If pdf_url already looks like a public URL, use it directly
      if (/^https?:\/\//i.test(String(poData.pdf_url))) {
        pdfUrlToFetch = String(poData.pdf_url)
      } else {
        // Otherwise treat pdf_url as a storage path and generate a signed URL server-side
        // Use centralized helper (same pattern as generate-po-pdf)
        const { getSignedUrl, DEFAULT_TTLS } = await import('../../../src/utils/supabaseStorage.ts')

        const signed = await getSignedUrl(supabaseServiceClient as any, 'purchase-orders', String(poData.pdf_url), DEFAULT_TTLS.long)

        if (signed.error || !signed.signedUrl) {
          console.error('Error creating signed URL for PDF:', signed.error)
          return new Response(
            JSON.stringify({ error: 'Failed to generate signed URL for PDF' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        pdfUrlToFetch = signed.signedUrl
      }
    } catch (err) {
      console.error('Error resolving PDF URL:', err)
      return new Response(
        JSON.stringify({ error: 'Failed to resolve PDF URL', details: err instanceof Error ? err.message : String(err) }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Downloading PDF from (resolved):', pdfUrlToFetch)

    const pdfResponse = await fetch(pdfUrlToFetch)

    if (!pdfResponse.ok) {
      console.error('Failed to download PDF:', pdfResponse.statusText)
      return new Response(
        JSON.stringify({
          error: 'Failed to download PDF',
          details: 'Could not fetch PDF from storage',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)))

    console.log(`PDF downloaded, size: ${pdfBuffer.byteLength} bytes`)

    // ============================================================================
    // Step 7: Generate email HTML
    // ============================================================================

    const emailHtml = generateEmailHTML(poData)
    const pmEmail = poData.projects?.users?.email || ''

    // ============================================================================
    // Step 8: Send email via Hostinger SMTP
    // ============================================================================

    const hostingerFromEmail = Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
      ?? Deno.env.get('HOSTINGER_SMTP_USER')

    if (!hostingerFromEmail) {
      console.error('Hostinger SMTP not configured')
      return new Response(
        JSON.stringify({
          error: 'Email service not configured',
          message: 'Hostinger SMTP environment variables are not set',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const emailSubject = `Purchase Order ${poData.purchase_order_number} - ${poData.projects?.name}`

    console.log('Sending email to:', supplierEmail)

    let emailResult

    try {
      emailResult = await sendEmailViaHostinger({
        attachments: [
          {
            filename: `${poData.purchase_order_number}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          },
        ],
        cc: pmEmail ? [pmEmail] : [],
        fromEmail: hostingerFromEmail,
        fromName: 'CastorWorks Orders',
        html: emailHtml,
        subject: emailSubject,
        to: [supplierEmail],
      })
    } catch (error) {
      console.error('Email send failed:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: error instanceof Error ? error.message : error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Email sent successfully:', emailResult)

    // ============================================================================
    // Step 9: Update PO status to 'sent'
    // ============================================================================

    const { error: updateError } = await supabaseServiceClient
      .from('purchase_orders')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: user.id,
      })
      .eq('id', purchase_order_id)

    if (updateError) {
      console.error('Failed to update PO status (non-critical):', updateError)
      // Continue - email was sent successfully
    }

    // ============================================================================
    // Step 10: Log email notification
    // ============================================================================

    try {
      await supabaseServiceClient.from('email_notifications').insert({
        project_id: poData.project_id,
        recipient_email: supplierEmail,
        email_type: 'purchase_order_sent',
        subject: emailSubject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          purchase_order_id: poData.id,
          purchase_order_number: poData.purchase_order_number,
          supplier_id: poData.supplier_id,
          supplier_name: poData.suppliers?.name,
          total_amount: poData.total_amount,
          currency: poData.currency_id,
          cc: pmEmail,
        },
      })
    } catch (logError) {
      console.error('Failed to log email notification (non-critical):', logError)
    }

    // ============================================================================
    // Step 11: Log activity
    // ============================================================================

    try {
      await supabaseServiceClient.from('project_activities').insert({
        project_id: poData.project_id,
        activity_type: 'purchase_order_sent',
        description: `Purchase order ${poData.purchase_order_number} sent to ${poData.suppliers?.name} (${supplierEmail})`,
        metadata: {
          purchase_order_id: poData.id,
          purchase_order_number: poData.purchase_order_number,
          supplier_id: poData.supplier_id,
          supplier_name: poData.suppliers?.name,
          supplier_email: supplierEmail,
          total_amount: poData.total_amount,
          currency: poData.currency_id,
          sent_by: user.id,
        },
      })
    } catch (activityError) {
      console.error('Failed to log activity (non-critical):', activityError)
    }

    // ============================================================================
    // Step 12: Return success response
    // ============================================================================

    return new Response(
      JSON.stringify({
        success: true,
        message: `Purchase order sent to ${supplierEmail}`,
        purchase_order_number: poData.purchase_order_number,
        supplier_name: poData.suppliers?.name,
        supplier_email: supplierEmail,
        sent_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
