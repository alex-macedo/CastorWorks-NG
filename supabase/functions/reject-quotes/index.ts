// Story 2.7: reject-quotes Edge Function
// Epic 2: Customer Approval Portal & Workflow
//
// This function processes customer quote rejections through the approval portal.
// It validates the approval token and rejection reason, then calls the database
// RPC function to handle the rejection transaction atomically.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getProjectManagerDetails,
  sendRejectionNotification,
  logEmailNotification
} from '../_shared/notifications.ts'
import { createErrorResponse } from "../_shared/errorHandler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  token: string
  rejection_reason: string
}

interface RejectionResult {
  success: boolean
  error?: string
  code?: string
  details?: string
  message?: string
  purchase_request_id?: string
  project_id?: string
  quote_count?: number
  rejection_reason?: string
  customer_email?: string
  rejected_at?: string
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
    const { token, rejection_reason }: RequestBody = await req.json()

    // Validate required fields
    if (!token) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: token is required',
          code: 'MISSING_TOKEN'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!rejection_reason || rejection_reason.trim() === '') {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: rejection_reason is required and must not be empty',
          code: 'MISSING_REASON'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Processing quote rejection:', {
      token: token.substring(0, 10) + '...',
      reason_length: rejection_reason.length
    })

    // =================================================================
    // Call database RPC function to handle rejection transaction
    // =================================================================
    const { data: result, error: rpcError } = await supabaseClient
      .rpc('reject_quotes_transaction', {
        _token: token,
        _rejection_reason: rejection_reason.trim()
      })

    if (rpcError) {
      console.error('RPC error during rejection:', rpcError)
      return new Response(
        JSON.stringify({
          error: 'Failed to process rejection',
          details: rpcError.message,
          code: 'RPC_ERROR'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const rejectionResult = result as RejectionResult

    // Check if the RPC function returned an error
    if (!rejectionResult.success) {
      const statusCode = rejectionResult.code === 'INVALID_TOKEN' ? 401 :
                        rejectionResult.code === 'MISSING_REASON' ? 400 :
                        rejectionResult.code === 'ALREADY_APPROVED' ? 409 : 400

      return new Response(
        JSON.stringify({
          error: rejectionResult.error,
          code: rejectionResult.code,
          details: rejectionResult.details
        }),
        {
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =================================================================
    // Log activity for the rejection
    // =================================================================
    // Note: This is non-blocking - if it fails, we still return success
    // because the rejection transaction already succeeded
    try {
      await supabaseClient
        .from('project_activities')
        .insert({
          project_id: rejectionResult.project_id,
          activity_type: 'quotes_rejected',
          description: `All quotes rejected by customer via approval portal. Reason: "${rejection_reason.trim()}"`,
          metadata: {
            purchase_request_id: rejectionResult.purchase_request_id,
            quote_count: rejectionResult.quote_count,
            customer_email: rejectionResult.customer_email,
            rejection_reason: rejectionResult.rejection_reason,
            rejected_at: rejectionResult.rejected_at
          }
        })
    } catch (logError) {
      console.error('Failed to create activity log (non-critical):', logError)
      // Continue - rejection was successful even if logging failed
    }

    // =================================================================
    // Send notification to project manager (Story 2.9)
    // =================================================================
    // Note: This is non-blocking - if it fails, we still return success
    try {
      // Fetch project details for notification
      const { data: projectData } = await supabaseClient
        .from('projects')
        .select('name, client_name, manager_id')
        .eq('id', rejectionResult.project_id!)
        .single()

      // Get project manager details
      const pmDetails = await getProjectManagerDetails(
        rejectionResult.project_id!,
        supabaseClient
      )

      if (pmDetails && projectData) {
        // Send email notification
        const emailResult = await sendRejectionNotification({
          project_id: rejectionResult.project_id!,
          project_name: projectData.name,
          customer_name: projectData.client_name || 'Customer',
          customer_email: rejectionResult.customer_email || '',
          project_manager_email: pmDetails.email,
          project_manager_name: pmDetails.name,
          quote_count: rejectionResult.quote_count || 0,
          rejection_reason: rejectionResult.rejection_reason || rejection_reason.trim()
        })

        // Log notification result
        await logEmailNotification(
          rejectionResult.project_id!,
          pmDetails.email,
          `Quotes Rejected - ${projectData.name}`,
          `${rejectionResult.quote_count} quotes rejected`,
          'quotes_rejected',
          emailResult.success ? 'sent' : 'failed',
          emailResult.error,
          supabaseClient
        )

        console.log('Project manager notification:', emailResult.success ? 'sent' : 'failed')
      }
    } catch (notifError) {
      console.error('Failed to send project manager notification (non-critical):', notifError)
      // Continue - rejection was successful even if notification failed
    }

    // =================================================================
    // Return success response
    // =================================================================
    console.log('Quote rejection successful:', {
      purchase_request_id: rejectionResult.purchase_request_id,
      quote_count: rejectionResult.quote_count,
      customer_email: rejectionResult.customer_email
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Quotes rejected successfully',
        quote_count: rejectionResult.quote_count,
        next_steps: 'Your project manager has been notified and will contact you to discuss alternatives.'
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
