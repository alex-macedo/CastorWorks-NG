/**
 * generate-ai-images - AI Image generation for moodboard
 *
 * Handles:
 * - Text-to-image generation
 * - Image storage
 * - Metadata tagging
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

    const { project_id, prompt, style_tags } = await req.json()

    console.log('[generate-ai-images] Generating image:', {
      project_id,
      prompt,
      user_id: user.id,
    })

    // TODO: Integrate with Replicate, Stability AI, or Claude Vision
    // For now, return placeholder
    const supabase = createServiceRoleClient()

    const imageRecord = {
      project_id,
      prompt,
      style_tags: style_tags || [],
      status: 'processing',
      created_by: user.id,
    }

    const { data, error: dbError } = await supabase
      .from('moodboard_images')
      .insert(imageRecord)
      .select()
      .single()

    if (dbError) {
      return createErrorResponse(`Database error: ${dbError.message}`, 500, corsHeaders)
    }

    return new Response(
      JSON.stringify({
        success: true,
        image_id: data?.id,
        status: 'generating',
        message: 'Image generation started',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('[generate-ai-images] Error:', error)
    return createErrorResponse(error.message, 500, corsHeaders)
  }
})
