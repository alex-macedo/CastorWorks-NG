// Story 3.2: Auto-Generate Purchase Orders
// Epic 3: Purchase Order Generation & Supplier Communication
//
// This Edge Function automatically generates a purchase order when a quote is approved.
// It can be called from the approve-quote workflow or manually if needed.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Default Terms and Conditions
const DEFAULT_TERMS = `1. Payment: Payment is due within the specified payment terms.
2. Delivery: Supplier shall deliver goods to the specified address by the expected delivery date.
3. Quality: All goods must meet the specifications outlined in the original quote.
4. Inspection: Buyer reserves the right to inspect goods upon delivery.
5. Returns: Defective goods may be returned within 30 days.
6. Warranty: All goods are covered under standard manufacturer warranty.
7. Cancellation: Purchase order may be cancelled before shipment with mutual agreement.
8. Force Majeure: Neither party shall be liable for delays caused by circumstances beyond their control.`

interface GeneratePORequest {
  quote_id: string
}

interface QuoteData {
  id: string
  quote_number: string
  supplier_id: string
  project_id: string
  purchase_request_id: string
  subtotal: number
  tax_amount: number
  total_amount: number
  currency_id: string
  status: string
  delivery_estimate: number | null
  delivery_instructions: string | null
  special_instructions: string | null
  suppliers: {
    name: string
    default_payment_terms: string | null
  } | null
  projects: {
    name: string
    location: string | null
  } | null
  project_purchase_requests: {
    delivery_address: string | null
  } | null
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Also create service role client for operations that need it
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
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const { quote_id }: GeneratePORequest = await req.json()

    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: 'quote_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Generating PO for quote: ${quote_id}`)

    // ============================================================================
    // Step 1: Check if PO already exists for this quote (idempotency)
    // ============================================================================

    const { data: existingPO, error: existingPOError } = await supabaseServiceClient
      .from('purchase_orders')
      .select('*')
      .eq('quote_id', quote_id)
      .maybeSingle()

    if (existingPOError) {
      console.error('Error checking existing PO:', existingPOError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing purchase order' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (existingPO) {
      console.log(`PO already exists for quote ${quote_id}: ${existingPO.purchase_order_number}`)
      return new Response(
        JSON.stringify({
          success: true,
          purchase_order: existingPO,
          message: 'Purchase order already exists for this quote',
          already_exists: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================================================
    // Step 2: Fetch quote details with all required relationships
    // ============================================================================

    const { data: quote, error: quoteError } = await supabaseServiceClient
      .from('quotes')
      .select(`
        id,
        quote_number,
        supplier_id,
        project_id,
        purchase_request_id,
        subtotal,
        tax_amount,
        total_amount,
        currency_id,
        status,
        delivery_estimate,
        delivery_instructions,
        special_instructions,
        suppliers (
          name,
          default_payment_terms
        ),
        projects (
          name,
          location
        ),
        project_purchase_requests (
          delivery_address
        )
      `)
      .eq('id', quote_id)
      .single()

    if (quoteError || !quote) {
      console.error('Error fetching quote:', quoteError)
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const quoteData = quote as unknown as QuoteData

    // ============================================================================
    // Step 3: Validate quote is approved
    // ============================================================================

    if (quoteData.status !== 'approved') {
      return new Response(
        JSON.stringify({
          error: 'Quote must be approved before generating purchase order',
          current_status: quoteData.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================================================
    // Step 4: Verify user has access to the project
    // ============================================================================

    const { data: projectAccess, error: accessError } = await supabaseClient
      .from('projects')
      .select('id, manager_id')
      .eq('id', quoteData.project_id)
      .single()

    if (accessError || !projectAccess || projectAccess.manager_id !== user.id) {
      console.error('Access denied for user:', user.id)
      return new Response(
        JSON.stringify({ error: 'User does not have access to this project' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================================================
    // Step 5: Prepare purchase order data
    // ============================================================================

    // Determine delivery address (priority: purchase request → project location)
    const deliveryAddress =
      quoteData.project_purchase_requests?.delivery_address ||
      quoteData.projects?.location ||
      'Address to be determined'

    // Calculate expected delivery date based on quote estimate (in days)
    const expectedDeliveryDate = quoteData.delivery_estimate
      ? new Date(Date.now() + quoteData.delivery_estimate * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      : null

    // Determine payment terms (use supplier default or fallback to Net 30)
    const paymentTerms = quoteData.suppliers?.default_payment_terms || 'Net 30'

    // Calculate payment due date (default to 30 days from now)
    const daysUntilPayment = paymentTerms.toLowerCase().includes('net')
      ? parseInt(paymentTerms.match(/\d+/)?.[0] || '30')
      : 30

    const paymentDueDate = new Date(Date.now() + daysUntilPayment * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    // Prepare PO data object
    const purchaseOrderData = {
      purchase_order_number: '', // Will be auto-generated by trigger
      quote_id: quoteData.id,
      supplier_id: quoteData.supplier_id,
      project_id: quoteData.project_id,
      purchase_request_id: quoteData.purchase_request_id,
      subtotal: quoteData.subtotal,
      tax_amount: quoteData.tax_amount,
      total_amount: quoteData.total_amount,
      currency_id: quoteData.currency_id,
      delivery_address: deliveryAddress,
      expected_delivery_date: expectedDeliveryDate,
      delivery_instructions: quoteData.delivery_instructions,
      payment_terms: paymentTerms,
      payment_due_date: paymentDueDate,
      terms_and_conditions: DEFAULT_TERMS,
      special_instructions: quoteData.special_instructions,
      status: 'draft' as const,
    }

    console.log('Creating purchase order with data:', purchaseOrderData)

    // ============================================================================
    // Step 6: Create purchase order record
    // ============================================================================

    const { data: newPO, error: createError } = await supabaseServiceClient
      .from('purchase_orders')
      .insert(purchaseOrderData)
      .select('*')
      .single()

    if (createError || !newPO) {
      console.error('Error creating purchase order:', createError)
      return new Response(
        JSON.stringify({
          error: 'Failed to create purchase order',
          details: createError?.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Purchase order created successfully: ${newPO.purchase_order_number}`)

    // ============================================================================
    // Step 7: Log activity (non-blocking)
    // ============================================================================

    try {
      const activityData = {
        project_id: quoteData.project_id,
        activity_type: 'purchase_order_generated',
        description: `Purchase order ${newPO.purchase_order_number} generated from approved quote ${quoteData.quote_number}`,
        metadata: {
          purchase_order_id: newPO.id,
          purchase_order_number: newPO.purchase_order_number,
          quote_id: quoteData.id,
          quote_number: quoteData.quote_number,
          supplier_id: quoteData.supplier_id,
          supplier_name: quoteData.suppliers?.name,
          total_amount: newPO.total_amount,
          currency: newPO.currency_id,
        },
      }

      const { error: activityError } = await supabaseServiceClient
        .from('project_activities')
        .insert(activityData)

      if (activityError) {
        console.error('Failed to log activity (non-critical):', activityError)
      } else {
        console.log('Activity logged successfully')
      }
    } catch (activityError) {
      console.error('Error logging activity (non-critical):', activityError)
    }

    // ============================================================================
    // Step 8: Return success response
    // ============================================================================

    return new Response(
      JSON.stringify({
        success: true,
        purchase_order: newPO,
        message: `Purchase order ${newPO.purchase_order_number} created successfully`,
        next_steps: [
          'Generate PDF document',
          'Review purchase order details',
          'Send to supplier',
        ],
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
