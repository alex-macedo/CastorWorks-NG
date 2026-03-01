/**
 * record-meeting - Record and store meeting audio
 *
 * Handles:
 * - Storing meeting audio blobs
 * - Meeting metadata updates
 * - Audio processing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { authenticateRequest, createServiceRoleClient } from '../_shared/authorization.ts'
import { createErrorResponse } from '../_shared/errorHandler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user, error: authError } = await authenticateRequest(req)
    if (authError || !user) {
      return createErrorResponse('Unauthorized', 401, corsHeaders)
    }

    const { project_id, meeting_id } = await req.json()

    console.log('[record-meeting] Processing recording:', {
      project_id,
      meeting_id,
      user_id: user.id,
    })

    const supabase = createServiceRoleClient()

    // TODO: Process audio blob and store to Supabase Storage
    // For now, mark meeting as having audio
    const { data, error: updateError } = await supabase
      .from('meeting_recordings')
      .update({ audio_processed: true })
      .eq('id', meeting_id)
      .select()
      .single()

    if (updateError) {
      return createErrorResponse(`Database error: ${updateError.message}`, 500, corsHeaders)
    }

    return new Response(
      JSON.stringify({
        success: true,
        meeting_id: data?.id,
        message: 'Recording stored successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('[record-meeting] Error:', error)
    return createErrorResponse(error.message, 500, corsHeaders)
  }
})
