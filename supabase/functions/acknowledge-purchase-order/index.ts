// Story 3.9: acknowledge-purchase-order Edge Function
// Epic 3: Purchase Order Generation & Supplier Communication
//
// Processes supplier PO acknowledgments

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { token, notes } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: token',
          code: 'MISSING_TOKEN'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Processing PO acknowledgment for token:', token.substring(0, 10) + '...')

    // Validate token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('po_acknowledgment_tokens')
      .select(`
        id,
        purchase_order_id,
        supplier_email,
        expires_at,
        acknowledged_at,
        purchase_orders (
          id,
          purchase_order_number,
          project_id,
          status,
          suppliers (name, email)
        )
      `)
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          error: 'This acknowledgment link has expired',
          code: 'TOKEN_EXPIRED',
          expired_at: tokenData.expires_at
        }),
        {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if already acknowledged
    if (tokenData.acknowledged_at) {
      return new Response(
        JSON.stringify({
          error: 'This purchase order has already been acknowledged',
          code: 'ALREADY_ACKNOWLEDGED',
          acknowledged_at: tokenData.acknowledged_at
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const po = (tokenData.purchase_orders as any)

    // Update token with acknowledgment
    const { error: updateTokenError } = await supabaseClient
      .from('po_acknowledgment_tokens')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledgment_method: 'link',
        notes: notes || null
      })
      .eq('id', tokenData.id)

    if (updateTokenError) {
      console.error('Error updating token:', updateTokenError)
      throw new Error('Failed to record acknowledgment')
    }

    // Update PO status to acknowledged
    const { error: updatePOError } = await supabaseClient
      .from('purchase_orders')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledgment_method: 'email'
      })
      .eq('id', tokenData.purchase_order_id)

    if (updatePOError) {
      console.error('Error updating PO:', updatePOError)
      // Continue even if PO update fails - acknowledgment is recorded
    }

    // Create activity log
    await supabaseClient
      .from('project_activities')
      .insert({
        project_id: po.project_id,
        activity_type: 'po_acknowledged',
        description: `Purchase order ${po.purchase_order_number} acknowledged by ${po.suppliers.name}`,
        metadata: {
          purchase_order_id: tokenData.purchase_order_id,
          purchase_order_number: po.purchase_order_number,
          supplier_email: tokenData.supplier_email,
          supplier_name: po.suppliers.name,
          acknowledgment_method: 'link',
          notes: notes || null
        }
      })

    // TODO: Send notification to project manager
    // This would call a notification edge function similar to story 2.9
    console.log('PO acknowledged - notification would be sent to PM')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Purchase order acknowledged successfully',
        purchase_order_number: po.purchase_order_number,
        supplier_name: po.suppliers.name,
        acknowledged_at: new Date().toISOString()
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
