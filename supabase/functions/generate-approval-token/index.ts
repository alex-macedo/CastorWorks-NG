// Story 2.2: Generate Approval Token Edge Function
// Epic 2: Customer Approval Portal & Workflow
// 
// This function generates secure approval links for customers to review and approve quotes
// without requiring user accounts. Validates prerequisites and returns shareable URL.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createErrorResponse } from "../_shared/errorHandler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  purchase_request_id: string
  customer_email: string
  customer_phone?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (bypass RLS for validation)
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

    // Parse request body
    const { purchase_request_id, customer_email, customer_phone }: RequestBody = await req.json()

    // Validate required fields
    if (!purchase_request_id || !customer_email) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: purchase_request_id and customer_email are required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =====================================================================
    // Step 1: Validate purchase request exists and has status 'quoted'
    // =====================================================================

    const { data: purchaseRequest, error: prError } = await supabaseClient
      .from('project_purchase_requests')
      .select('id, status, project_id')
      .eq('id', purchase_request_id)
      .single()

    if (prError || !purchaseRequest) {
      console.error('Purchase request not found:', prError)
      return new Response(
        JSON.stringify({ 
          error: 'Purchase request not found',
          details: prError?.message
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if purchase request has quotes ready for approval
    // Accept both 'quoted' and 'pending' status (pending can have quotes)
    if (purchaseRequest.status !== 'quoted' && purchaseRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          error: 'Purchase request must have status "quoted" or "pending" to generate approval link',
          current_status: purchaseRequest.status
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =====================================================================
    // Step 2: Verify at least one quote exists with pending status
    // =====================================================================

    const { data: quotes, error: quotesError } = await supabaseClient
      .from('quotes')
      .select('id, status')
      .eq('purchase_request_id', purchase_request_id)

    if (quotesError) {
      console.error('Error fetching quotes:', quotesError)
      return new Response(
        JSON.stringify({ 
          error: 'Error checking quotes',
          details: quotesError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!quotes || quotes.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No quotes found for this purchase request. At least one quote must exist before generating approval link.',
          quote_count: 0
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Count pending quotes (quotes ready for customer approval)
    const pendingQuotes = quotes.filter(q => q.status === 'pending' || q.status === 'submitted')
    if (pendingQuotes.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No pending quotes available for approval. All quotes have already been approved or rejected.',
          total_quotes: quotes.length,
          pending_quotes: 0
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =====================================================================
    // Step 3: Check if active token already exists for this purchase request
    // =====================================================================

    const { data: existingTokens, error: tokenCheckError } = await supabaseClient
      .from('approval_tokens')
      .select('id, token, expires_at, approved_at')
      .eq('purchase_request_id', purchase_request_id)
      .gt('expires_at', new Date().toISOString()) // Not expired
      .is('approved_at', null) // Not already approved
      .order('created_at', { ascending: false })
      .limit(1)

    if (tokenCheckError) {
      console.error('Error checking existing tokens:', tokenCheckError)
      // Continue anyway - we'll create a new token
    }

    // If active token exists, return it instead of creating new one
    if (existingTokens && existingTokens.length > 0) {
      const existingToken = existingTokens[0]
      const approvalUrl = `${Deno.env.get('APP_URL') || 'https://engproapp.com'}/approve/${existingToken.token}`
      
      console.log('Reusing existing token:', existingToken.id)
      
      return new Response(
        JSON.stringify({ 
          success: true,
          token: existingToken.token,
          approval_url: approvalUrl,
          expires_at: existingToken.expires_at,
          reused: true,
          message: 'Existing active approval token found and returned'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =====================================================================
    // Step 4: Generate new secure token
    // =====================================================================

    // Call the generate_approval_token() database function
    const { data: tokenData, error: tokenGenError } = await supabaseClient
      .rpc('generate_approval_token')

    if (tokenGenError || !tokenData) {
      console.error('Error generating token:', tokenGenError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate secure token',
          details: tokenGenError?.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const secureToken = tokenData

    // =====================================================================
    // Step 5: Create approval_tokens record
    // =====================================================================

    const { data: newToken, error: createError } = await supabaseClient
      .from('approval_tokens')
      .insert({
        purchase_request_id,
        token: secureToken,
        customer_email,
        customer_phone: customer_phone || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()

    if (createError || !newToken) {
      console.error('Error creating approval token:', createError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create approval token',
          details: createError?.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =====================================================================
    // Step 6: Create activity log entry
    // =====================================================================

    const { error: logError } = await supabaseClient
      .from('project_activities')
      .insert({
        project_id: purchaseRequest.project_id,
        activity_type: 'approval_link_generated',
        description: `Approval link generated for purchase request. Email: ${customer_email}`,
        metadata: {
          purchase_request_id,
          token_id: newToken.id,
          customer_email,
          expires_at: newToken.expires_at,
          quote_count: pendingQuotes.length
        }
      })

    if (logError) {
      console.error('Error creating activity log:', logError)
      // Non-critical - continue
    }

    // =====================================================================
    // Step 7: Return success with approval URL
    // =====================================================================

    const approvalUrl = `${Deno.env.get('APP_URL') || 'https://engproapp.com'}/approve/${secureToken}`

    console.log('Approval token generated successfully:', {
      token_id: newToken.id,
      purchase_request_id,
      customer_email,
      pending_quotes: pendingQuotes.length
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        token: secureToken,
        approval_url: approvalUrl,
        expires_at: newToken.expires_at,
        quote_count: pendingQuotes.length,
        reused: false,
        message: 'Approval token generated successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return createErrorResponse(error, corsHeaders);
  }
})
