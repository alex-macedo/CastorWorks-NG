// Story 2.3: Validate Approval Token Edge Function
// Epic 2: Customer Approval Portal & Workflow
// 
// This function validates customer approval tokens and returns purchase request data
// with quotes for the approval portal. Updates accessed_at timestamp on first access.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationResult {
  is_valid: boolean
  validation_message?: string
  id?: string
  customer_email?: string
  customer_phone?: string
  expires_at?: string
  accessed_at?: string
  approved_at?: string | null
  purchase_request_id?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get token from URL params or body
    const url = new URL(req.url)
    const token = url.searchParams.get('token') || (await req.json().catch(() => ({}))).token

    if (!token) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Token is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =====================================================================
    // Step 1: Validate token using database function
    // =====================================================================

    const { data: validation, error: validationError } = await supabaseClient
      .rpc('validate_approval_token', { _token: token })
      .single() as { data: ValidationResult | null, error: any }

    if (validationError) {
      console.error('Token validation error:', validationError)
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Token validation failed',
          details: validationError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if token is valid
    if (!validation || !validation.is_valid) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: validation?.validation_message || 'Invalid or expired token',
          expired: validation?.expires_at ? new Date(validation.expires_at) < new Date() : false,
          approved: validation?.approved_at !== null
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =====================================================================
    // Step 2: Fetch purchase request with all related data
    // =====================================================================

    const { data: purchaseRequest, error: prError } = await supabaseClient
      .from('project_purchase_requests')
      .select(`
        id,
        status,
        description,
        priority,
        delivery_date,
        created_at,
        project_id,
        projects (
          id,
          name,
          description
        ),
        purchase_request_items (
          id,
          description,
          quantity,
          unit,
          estimated_price
        )
      `)
      .eq('id', validation.purchase_request_id)
      .single()

    if (prError || !purchaseRequest) {
      console.error('Purchase request fetch error:', prError)
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Purchase request not found'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =====================================================================
    // Step 3: Fetch all quotes for this purchase request
    // =====================================================================

    const { data: quotes, error: quotesError } = await supabaseClient
      .from('quotes')
      .select(`
        id,
        quote_number,
        total_amount,
        currency_id,
        status,
        valid_until,
        delivery_estimate,
        notes,
        created_at,
        supplier_id,
        suppliers (
          id,
          name,
          contact_name,
          contact_email,
          phone
        ),
        quote_items (
          id,
          description,
          quantity,
          unit_price,
          total_price,
          notes
        )
      `)
      .eq('purchase_request_id', validation.purchase_request_id)
      .in('status', ['pending', 'submitted']) // Only show pending quotes

    if (quotesError) {
      console.error('Quotes fetch error:', quotesError)
      // Continue with empty quotes array
    }

    // =====================================================================
    // Step 4: Update accessed_at timestamp (first access only)
    // =====================================================================

    if (!validation.accessed_at) {
      const { error: updateError } = await supabaseClient
        .from('approval_tokens')
        .update({ accessed_at: new Date().toISOString() })
        .eq('id', validation.id)

      if (updateError) {
        console.error('Error updating accessed_at:', updateError)
        // Non-critical - continue
      }
    }

    // =====================================================================
    // Step 5: Return validated data
    // =====================================================================

    const response = {
      valid: true,
      token: {
        id: validation.id,
        customer_email: validation.customer_email,
        customer_phone: validation.customer_phone,
        expires_at: validation.expires_at,
        accessed_at: validation.accessed_at || new Date().toISOString()
      },
      purchase_request: {
        ...purchaseRequest,
        quote_count: quotes?.length || 0
      },
      quotes: quotes || [],
      message: 'Token validated successfully'
    }

    console.log('Token validated:', {
      token_id: validation.id,
      purchase_request_id: validation.purchase_request_id,
      quote_count: quotes?.length || 0,
      first_access: !validation.accessed_at
    })

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
