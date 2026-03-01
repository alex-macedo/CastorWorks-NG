/**
 * send-email - Send project emails to clients
 *
 * Handles:
 * - Sending project update emails
 * - Email scheduling
 * - Template rendering
 * - Recipient management
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { authenticateRequest, createServiceRoleClient } from '../_shared/authorization.ts'
import { createErrorResponse } from '../_shared/errorHandler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sendEmailSchema = z.object({
  project_id: z.string().uuid(),
  recipients: z.array(z.string().email()).min(1),
  subject: z.string(),
  body: z.string(),
  schedule_time: z.string().datetime().optional(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user, error: authError } = await authenticateRequest(req)
    if (authError || !user) {
      return createErrorResponse('Unauthorized', 401, corsHeaders)
    }

    const body = await req.json()
    const { project_id, recipients, subject, body: emailBody, schedule_time } = sendEmailSchema.parse(body)

    console.log('[send-email] Processing email request:', {
      project_id,
      recipient_count: recipients.length,
      subject,
      user_id: user.id,
    })

    const supabase = createServiceRoleClient()

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // Store email in database for tracking
    const { data: emailRecord, error: dbError } = await supabase
      .from('project_emails')
      .insert({
        project_id,
        recipients,
        subject,
        body: emailBody,
        scheduled_for: schedule_time || null,
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      return createErrorResponse(`Database error: ${dbError.message}`, 500, corsHeaders)
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailRecord?.id,
        message: 'Email queued for delivery',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('[send-email] Error:', error)
    return createErrorResponse(error.message, 500, corsHeaders)
  }
})
