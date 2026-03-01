// Story 2.7: approve-quote Edge Function
// Epic 2: Customer Approval Portal & Workflow
//
// This function processes customer quote approvals through the approval portal.
// It validates the approval token and calls the database RPC function to handle
// the approval transaction atomically.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getProjectManagerDetails,
  sendApprovalNotification,
  logEmailNotification
} from '../_shared/notifications.ts'
import { createErrorResponse } from "../_shared/errorHandler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  token: string
  selected_quote_id: string
  customer_note?: string
}

interface ApprovalResult {
  success: boolean
  error?: string
  code?: string
  details?: string
  message?: string
  quote_id?: string
  purchase_request_id?: string
  project_id?: string
  total_amount?: number
  currency?: string
  customer_email?: string
  customer_note?: string
  approved_at?: string
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
    const { token, selected_quote_id, customer_note }: RequestBody = await req.json()

    // Validate required fields
    if (!token || !selected_quote_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: token and selected_quote_id are required',
          code: 'MISSING_FIELDS'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Processing quote approval:', {
      token: token.substring(0, 10) + '...',
      quote_id: selected_quote_id,
      has_note: !!customer_note
    })

    // =================================================================
    // Call database RPC function to handle approval transaction
    // =================================================================
    const { data: result, error: rpcError } = await supabaseClient
      .rpc('approve_quote_transaction', {
        _token: token,
        _quote_id: selected_quote_id,
        _customer_note: customer_note || null
      })

    if (rpcError) {
      console.error('RPC error during approval:', rpcError)
      return new Response(
        JSON.stringify({
          error: 'Failed to process approval',
          details: rpcError.message,
          code: 'RPC_ERROR'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const approvalResult = result as ApprovalResult

    // Check if the RPC function returned an error
    if (!approvalResult.success) {
      const statusCode = approvalResult.code === 'INVALID_TOKEN' ? 401 :
                        approvalResult.code === 'QUOTE_NOT_FOUND' ? 404 :
                        approvalResult.code === 'ALREADY_APPROVED' ? 409 : 400

      return new Response(
        JSON.stringify({
          error: approvalResult.error,
          code: approvalResult.code,
          details: approvalResult.details
        }),
        {
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =================================================================
    // Log activity for the approval
    // =================================================================
    // Note: This is non-blocking - if it fails, we still return success
    // because the approval transaction already succeeded
    try {
      await supabaseClient
        .from('project_activities')
        .insert({
          project_id: approvalResult.project_id,
          activity_type: 'quote_approved',
          description: `Quote approved by customer via approval portal. Amount: ${approvalResult.currency} ${approvalResult.total_amount}`,
          metadata: {
            purchase_request_id: approvalResult.purchase_request_id,
            quote_id: approvalResult.quote_id,
            customer_email: approvalResult.customer_email,
            customer_note: approvalResult.customer_note,
            total_amount: approvalResult.total_amount,
            currency: approvalResult.currency,
            approved_at: approvalResult.approved_at
          }
        })
    } catch (logError) {
      console.error('Failed to create activity log (non-critical):', logError)
      // Continue - approval was successful even if logging failed
    }

    // =================================================================
    // Send notification to project manager (Story 2.9)
    // =================================================================
    // Note: This is non-blocking - if it fails, we still return success
    try {
      // Fetch project and quote details for notification
      const { data: projectData } = await supabaseClient
        .from('projects')
        .select('name, client_name, manager_id')
        .eq('id', approvalResult.project_id!)
        .single()

      const { data: quoteData } = await supabaseClient
        .from('quotes')
        .select('quote_number, suppliers(name)')
        .eq('id', approvalResult.quote_id!)
        .single()

      // Get project manager details
      const pmDetails = await getProjectManagerDetails(
        approvalResult.project_id!,
        supabaseClient
      )

      if (pmDetails && projectData && quoteData) {
        const supplierName = (quoteData.suppliers as any)?.name || 'Unknown Supplier'

        // Send email notification
        const emailResult = await sendApprovalNotification({
          project_id: approvalResult.project_id!,
          project_name: projectData.name,
          customer_name: projectData.client_name || 'Customer',
          customer_email: approvalResult.customer_email || '',
          project_manager_email: pmDetails.email,
          project_manager_name: pmDetails.name,
          supplier_name: supplierName,
          quote_number: quoteData.quote_number,
          total_amount: approvalResult.total_amount || 0,
          currency: approvalResult.currency || 'USD',
          customer_note: approvalResult.customer_note
        })

        // Log notification result
        await logEmailNotification(
          approvalResult.project_id!,
          pmDetails.email,
          `Quote Approved - ${projectData.name}`,
          `Quote ${quoteData.quote_number} approved`,
          'quote_approved',
          emailResult.success ? 'sent' : 'failed',
          emailResult.error,
          supabaseClient
        )

        console.log('Project manager notification:', emailResult.success ? 'sent' : 'failed')
      }
    } catch (notifError) {
      console.error('Failed to send project manager notification (non-critical):', notifError)
      // Continue - approval was successful even if notification failed
    }

    // =================================================================
    // Auto-generate purchase order (Story 3.2)
    // =================================================================
    // Note: This is non-blocking - if it fails, we still return success
    // because the approval transaction already succeeded
    try {
      console.log('Attempting to auto-generate purchase order for quote:', approvalResult.quote_id)

      const { data: poData, error: poError } = await supabaseClient.functions.invoke(
        'generate-purchase-order',
        {
          body: { quote_id: approvalResult.quote_id }
        }
      )

      if (poError) {
        console.error('Failed to auto-generate PO (non-critical):', poError)
      } else if (poData?.success) {
        console.log('Purchase order generated successfully:', poData.purchase_order?.purchase_order_number)

        // Log PO generation activity
        try {
          await supabaseClient
            .from('project_activities')
            .insert({
              project_id: approvalResult.project_id,
              activity_type: 'purchase_order_auto_generated',
              description: `Purchase order ${poData.purchase_order.purchase_order_number} automatically generated from approved quote`,
              metadata: {
                purchase_order_id: poData.purchase_order.id,
                purchase_order_number: poData.purchase_order.purchase_order_number,
                quote_id: approvalResult.quote_id,
                total_amount: poData.purchase_order.total_amount,
                currency: poData.purchase_order.currency_id
              }
            })
        } catch (logError) {
          console.error('Failed to log PO generation activity (non-critical):', logError)
        }
      } else if (poData?.already_exists) {
        console.log('Purchase order already exists for quote:', poData.purchase_order?.purchase_order_number)
      }
    } catch (poError) {
      console.error('Failed to auto-generate purchase order (non-critical):', poError)
      // Continue - approval was successful even if PO generation failed
    }

    // =================================================================
    // Return success response
    // =================================================================
    console.log('Quote approval successful:', {
      quote_id: approvalResult.quote_id,
      purchase_request_id: approvalResult.purchase_request_id,
      customer_email: approvalResult.customer_email
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Quote approved successfully',
        quote_id: approvalResult.quote_id,
        total_amount: approvalResult.total_amount,
        currency: approvalResult.currency,
        next_steps: 'Your project manager has been notified and will process your order.'
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
