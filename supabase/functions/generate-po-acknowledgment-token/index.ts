// Story 3.9: generate-po-acknowledgment-token Edge Function
// Epic 3: Purchase Order Generation & Supplier Communication
//
// Generates secure token for supplier PO acknowledgment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const { purchase_order_id } = await req.json()

    if (!purchase_order_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: purchase_order_id',
          code: 'MISSING_FIELDS'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch PO details
    const { data: po, error: poError } = await supabaseClient
      .from('purchase_orders')
      .select(`
        id,
        purchase_order_number,
        status,
        suppliers (email)
      `)
      .eq('id', purchase_order_id)
      .single()

    if (poError || !po) {
      return new Response(
        JSON.stringify({
          error: 'Purchase order not found',
          code: 'PO_NOT_FOUND'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if PO is in correct status for acknowledgment
    if (po.status !== 'sent') {
      return new Response(
        JSON.stringify({
          error: 'Purchase order must be in "sent" status for acknowledgment',
          code: 'INVALID_STATUS',
          current_status: po.status
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if active token already exists
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days expiration

    const { data: existingToken, error: _checkError } = await supabaseClient
      .from('po_acknowledgment_tokens')
      .select('token, expires_at')
      .eq('purchase_order_id', purchase_order_id)
      .gt('expires_at', new Date().toISOString())
      .is('acknowledged_at', null)
      .maybeSingle()

    if (existingToken) {
      const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://engproapp.com'
      return new Response(
        JSON.stringify({
          success: true,
          token: existingToken.token,
          acknowledgment_url: `${baseUrl}/po/acknowledge/${existingToken.token}`,
          expires_at: existingToken.expires_at,
          message: 'Active token already exists'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate new token
    const token = generateSecureToken()

    const { data: _tokenRecord, error: tokenError } = await supabaseClient
      .from('po_acknowledgment_tokens')
      .insert({
        purchase_order_id,
        token,
        supplier_email: (po.suppliers as any).email,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (tokenError) {
      console.error('Error creating token:', tokenError)
      return new Response(
        JSON.stringify({
          error: 'Failed to create acknowledgment token',
          code: 'TOKEN_CREATION_FAILED'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log activity
    const { data: project } = await supabaseClient
      .from('purchase_orders')
      .select('project_id')
      .eq('id', purchase_order_id)
      .single()

    if (project) {
      await supabaseClient
        .from('project_activities')
        .insert({
          project_id: project.project_id,
          activity_type: 'po_acknowledgment_token_generated',
          description: `Acknowledgment link generated for PO ${po.purchase_order_number}`,
          metadata: {
            purchase_order_id,
            purchase_order_number: po.purchase_order_number,
            expires_at: expiresAt.toISOString()
          }
        })
    }

    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://engproapp.com'

    return new Response(
      JSON.stringify({
        success: true,
        token,
        acknowledgment_url: `${baseUrl}/po/acknowledge/${token}`,
        expires_at: expiresAt.toISOString(),
        message: 'Acknowledgment token created successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVER_ERROR'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
