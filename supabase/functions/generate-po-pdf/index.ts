// Story 3.3: Generate Purchase Order PDF
// Epic 3: Purchase Order Generation & Supplier Communication
//
// This Edge Function generates professional PDF documents for purchase orders
// and stores them in Supabase Storage.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import pdfMake from 'https://esm.sh/pdfmake@0.2.9/build/pdfmake.js'
import pdfFonts from 'https://esm.sh/pdfmake@0.2.9/build/vfs_fonts.js'

// Initialize pdfMake with fonts
// @ts-expect-error - pdfMake types are not fully compatible
pdfMake.vfs = pdfFonts.pdfMake.vfs

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GeneratePDFRequest {
  purchase_order_id: string
  force_regenerate?: boolean // Force regeneration even if data unchanged
}

interface QuoteItem {
  description: string
  quantity: number
  unit_price: number
  total_price: number
  category: string | null
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
  terms_and_conditions: string | null
  special_instructions: string | null
  status: string
  document_version: number
  pdf_url: string | null
  pdf_generated_at: string | null
  created_at: string
  updated_at: string
  project_id: string
  quote_id: string
  suppliers: {
    name: string
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
    address: string | null
  } | null
  projects: {
    name: string
    client_name: string | null
    manager_id: string
  } | null
  quotes: {
    quote_number: string
    quote_items: QuoteItem[]
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
  return `${symbol} ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
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

// Generate PDF document definition
function generatePODocumentDefinition(po: POData): any {
  const supplier = po.suppliers || {
    name: 'Unknown Supplier',
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    address: null,
  }

  const project = po.projects || {
    name: 'Unknown Project',
    client_name: null,
  }

  const quoteItems = po.quotes?.quote_items || []

  // Build line items table
  const lineItemsTableBody = [
    [
      { text: '#', style: 'tableHeader', bold: true },
      { text: 'Description', style: 'tableHeader', bold: true },
      { text: 'Qty', style: 'tableHeader', bold: true, alignment: 'right' },
      { text: 'Unit Price', style: 'tableHeader', bold: true, alignment: 'right' },
      { text: 'Total', style: 'tableHeader', bold: true, alignment: 'right' },
    ],
  ]

  quoteItems.forEach((item, index) => {
    lineItemsTableBody.push([
      { text: (index + 1).toString(), style: 'tableCell', bold: false },
      { text: item.description || 'N/A', style: 'tableCell', bold: false },
      { text: item.quantity.toString(), style: 'tableCell', bold: false, alignment: 'right' },
      {
        text: formatCurrency(item.unit_price, po.currency_id),
        style: 'tableCell',
        bold: false,
        alignment: 'right',
      },
      {
        text: formatCurrency(item.total_price, po.currency_id),
        style: 'tableCell',
        bold: false,
        alignment: 'right',
      },
    ])
  })

  // Parse terms and conditions into lines
  const termsLines = (po.terms_and_conditions || '')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => ({ text: line, style: 'termsText', margin: [0, 2, 0, 2] }))

  // Build document definition
  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [40, 60, 40, 60],
    content: [
      // Header
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'EngPro', style: 'companyName', bold: true },
              { text: 'Engineering Procurement Platform', style: 'companyTagline' },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: 'PURCHASE ORDER', style: 'documentTitle', alignment: 'right' },
              { text: po.purchase_order_number, style: 'poNumber', alignment: 'right' },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // PO Metadata
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: `Date: ${formatDate(po.created_at)}`, style: 'metadata' },
              { text: `Status: ${po.status.charAt(0).toUpperCase() + po.status.slice(1)}`, style: 'metadata' },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: `Version: ${po.document_version}`, style: 'metadata', alignment: 'right' },
              {
                text: `Generated: ${formatDate(new Date().toISOString())}`,
                style: 'metadata',
                alignment: 'right',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // Supplier Information
      {
        text: 'SUPPLIER INFORMATION',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10],
      },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { text: supplier.name, bold: true, fontSize: 11 },
                  supplier.contact_name ? { text: `Contact: ${supplier.contact_name}`, fontSize: 10 } : null,
                  supplier.contact_email ? { text: `Email: ${supplier.contact_email}`, fontSize: 10 } : null,
                  supplier.contact_phone ? { text: `Phone: ${supplier.contact_phone}`, fontSize: 10 } : null,
                  supplier.address ? { text: `Address: ${supplier.address}`, fontSize: 10 } : null,
                ].filter(Boolean),
                margin: [5, 5, 5, 5],
              },
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15],
      },

      // Project Information
      {
        text: 'PROJECT INFORMATION',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10],
      },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Project:', bold: true, fontSize: 10 },
              { text: project.name, fontSize: 10, margin: [0, 2, 0, 10] },
              { text: 'Client:', bold: true, fontSize: 10 },
              { text: project.client_name || 'N/A', fontSize: 10, margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Delivery Address:', bold: true, fontSize: 10 },
              { text: po.delivery_address || 'N/A', fontSize: 10, margin: [0, 2, 0, 10] },
              { text: 'Expected Delivery:', bold: true, fontSize: 10 },
              { text: formatDate(po.expected_delivery_date), fontSize: 10, margin: [0, 2, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // Line Items
      {
        text: 'LINE ITEMS',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: [30, '*', 50, 80, 80],
          body: lineItemsTableBody,
        },
        layout: {
          fillColor: function (rowIndex: number) {
            return rowIndex === 0 ? '#EEEEEE' : null
          },
          hLineWidth: function (i: number, node: any) {
            return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5
          },
          vLineWidth: function () {
            return 0.5
          },
          hLineColor: function () {
            return '#CCCCCC'
          },
          vLineColor: function () {
            return '#CCCCCC'
          },
        },
        margin: [0, 0, 0, 15],
      },

      // Totals
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            table: {
              widths: ['*', 80],
              body: [
                [
                  { text: 'Subtotal:', alignment: 'right', fontSize: 10 },
                  {
                    text: formatCurrency(po.subtotal, po.currency_id),
                    alignment: 'right',
                    fontSize: 10,
                  },
                ],
                [
                  { text: 'Tax:', alignment: 'right', fontSize: 10 },
                  {
                    text: formatCurrency(po.tax_amount, po.currency_id),
                    alignment: 'right',
                    fontSize: 10,
                  },
                ],
                [
                  {
                    text: 'TOTAL:',
                    alignment: 'right',
                    bold: true,
                    fontSize: 11,
                  },
                  {
                    text: formatCurrency(po.total_amount, po.currency_id),
                    alignment: 'right',
                    bold: true,
                    fontSize: 11,
                  },
                ],
              ],
            },
            layout: 'noBorders',
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // Payment Terms
      {
        text: 'PAYMENT TERMS',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10],
      },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Terms:', bold: true, fontSize: 10 },
              { text: po.payment_terms || 'N/A', fontSize: 10, margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Payment Due Date:', bold: true, fontSize: 10 },
              { text: formatDate(po.payment_due_date), fontSize: 10, margin: [0, 2, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // Terms and Conditions
      {
        text: 'TERMS AND CONDITIONS',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10],
      },
      {
        stack: termsLines.length > 0 ? termsLines : [{ text: 'Standard terms apply.', fontSize: 10 }],
        margin: [0, 0, 0, 20],
      },

      // Special Instructions (if any)
      po.special_instructions
        ? {
            text: 'SPECIAL INSTRUCTIONS',
            style: 'sectionHeader',
            margin: [0, 10, 0, 10],
          }
        : null,
      po.special_instructions
        ? {
            text: po.special_instructions,
            fontSize: 10,
            margin: [0, 0, 0, 20],
          }
        : null,
    ].filter(Boolean), // Remove null entries

    footer: function (currentPage: number, pageCount: number) {
      return {
        columns: [
          {
            width: '*',
            text: 'EngPro | engineering@engpro.com | www.engpro.com',
            fontSize: 8,
            color: '#666666',
            alignment: 'left',
            margin: [40, 0, 0, 0],
          },
          {
            width: 'auto',
            text: `Page ${currentPage} of ${pageCount}`,
            fontSize: 8,
            color: '#666666',
            alignment: 'right',
            margin: [0, 0, 40, 0],
          },
        ],
      }
    },

    styles: {
      companyName: {
        fontSize: 20,
        color: '#1a365d',
      },
      companyTagline: {
        fontSize: 9,
        color: '#4a5568',
        margin: [0, 2, 0, 0],
      },
      documentTitle: {
        fontSize: 18,
        bold: true,
        color: '#1a365d',
      },
      poNumber: {
        fontSize: 14,
        color: '#2d3748',
        margin: [0, 2, 0, 0],
      },
      metadata: {
        fontSize: 10,
        color: '#4a5568',
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: '#1a365d',
        decoration: 'underline',
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        fillColor: '#EEEEEE',
      },
      tableCell: {
        fontSize: 10,
      },
      termsText: {
        fontSize: 9,
        color: '#2d3748',
      },
    },

    defaultStyle: {
      font: 'Helvetica',
    },
  }

  return docDefinition
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

    // Create service role client for storage operations
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
    const { purchase_order_id, force_regenerate }: GeneratePDFRequest = await req.json()

    if (!purchase_order_id) {
      return new Response(JSON.stringify({ error: 'purchase_order_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Generating PDF for purchase order: ${purchase_order_id}`)

    // =================================================================
    // Step 1: Fetch PO data with all relationships
    // =================================================================

    const { data: po, error: poError } = await supabaseServiceClient
      .from('purchase_orders')
      .select(
        `
        *,
        suppliers (
          name,
          contact_name,
          contact_email,
          contact_phone,
          address
        ),
        projects (
          name,
          client_name,
          manager_id
        ),
        quotes (
          quote_number,
          quote_items (
            description,
            quantity,
            unit_price,
            total_price,
            category
          )
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

    // =================================================================
    // Step 2: Verify user has access to the project
    // =================================================================

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

    // =================================================================
    // Step 3: Check if regeneration needed
    // =================================================================

    const needsRegeneration =
      force_regenerate ||
      !poData.pdf_url ||
      !poData.pdf_generated_at ||
      new Date(poData.updated_at) > new Date(poData.pdf_generated_at)

    if (!needsRegeneration && poData.pdf_url) {
      console.log('PDF up to date, returning existing URL')
      return new Response(
        JSON.stringify({
          success: true,
          pdf_url: poData.pdf_url,
          version: poData.document_version,
          message: 'PDF already up to date',
          regenerated: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // =================================================================
    // Step 4: Generate PDF
    // =================================================================

    console.log('Generating new PDF...')

    const docDefinition = generatePODocumentDefinition(poData)
    const pdfDoc = pdfMake.createPdf(docDefinition)

    // Generate PDF buffer
    const pdfBuffer = await new Promise<Uint8Array>((resolve, _reject) => {
      pdfDoc.getBuffer((buffer: any) => {
        resolve(new Uint8Array(buffer))
      })
    })

    console.log(`PDF generated, size: ${pdfBuffer.length} bytes`)

    // =================================================================
    // Step 5: Upload to Supabase Storage
    // =================================================================

    const newVersion = poData.document_version + (needsRegeneration && poData.pdf_url ? 1 : 0)
    const fileName = `${poData.purchase_order_number}-v${newVersion}.pdf`
    const filePath = `${poData.project_id}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabaseServiceClient.storage
      .from('purchase-orders')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      return new Response(JSON.stringify({ error: 'Failed to upload PDF', details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('PDF uploaded successfully:', uploadData.path)

    // Get signed URL (purchase-orders is a private bucket)
    // Store stable storage path in DB and return a signed URL in the response
    // so the DB doesn't contain an expiring URL.
    // Use centralized helper for signed URL creation.
    // Note: import dynamic to avoid Deno import cycles in edge runtime
    const { getSignedUrl, DEFAULT_TTLS } = await import('../../../src/utils/supabaseStorage.ts')

    const signed = await getSignedUrl(supabaseServiceClient as any, 'purchase-orders', filePath, DEFAULT_TTLS.long)

    if (signed.error || !signed.signedUrl) {
      console.error('Error creating signed URL:', signed.error)
      return new Response(JSON.stringify({ error: 'Failed to generate PDF URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pdfUrl = signed.signedUrl

    // =================================================================
    // Step 6: Update purchase_orders table - store the storage path, not the signed URL
    // =================================================================

    const { error: updateError } = await supabaseServiceClient
      .from('purchase_orders')
      .update({
        pdf_url: filePath,
        pdf_generated_at: new Date().toISOString(),
        document_version: newVersion,
      })
      .eq('id', purchase_order_id)

    if (updateError) {
      console.error('Error updating purchase order:', updateError)
      // Non-critical - PDF was generated and uploaded successfully
    }

    // =================================================================
    // Step 7: Log activity
    // =================================================================

    try {
      await supabaseServiceClient.from('project_activities').insert({
        project_id: poData.project_id,
        activity_type: 'purchase_order_pdf_generated',
        description: `PDF generated for purchase order ${poData.purchase_order_number} (version ${newVersion})`,
        metadata: {
          purchase_order_id: poData.id,
          purchase_order_number: poData.purchase_order_number,
          version: newVersion,
          file_size: pdfBuffer.length,
          file_path: filePath,
        },
      })
    } catch (activityError) {
      console.error('Failed to log activity (non-critical):', activityError)
    }

    // =================================================================
    // Step 8: Return success response
    // =================================================================

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: pdfUrl,
        version: newVersion,
        file_size: pdfBuffer.length,
        message: `PDF generated successfully (version ${newVersion})`,
        regenerated: true,
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
