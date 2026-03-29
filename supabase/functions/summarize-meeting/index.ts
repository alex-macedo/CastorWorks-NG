import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { getCachedInsight, cacheInsight } from '../_shared/aiCache.ts'
import { authenticateRequest, verifyProjectAccess } from '../_shared/authorization.ts'
import { consumeAIActions } from '../_shared/ai-metering.ts'
import { getAICompletion } from '../_shared/aiProviderClient.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

interface SummaryRequest {
  daily_log_id: string
  transcript: string
  project_id: string
  forceRefresh?: boolean
}

async function hashTranscript(transcript: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(transcript))
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 50)
}

const SUMMARY_PROMPT = `Create a concise executive summary of the following meeting/work session transcript.

The summary should:
1. Be 2-3 sentences max
2. Cover the main topics discussed
3. Highlight the most important outcome or decision
4. Be professional and clear

Transcript:
`

async function generateSummaryWithClaude(transcript: string): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: SUMMARY_PROMPT + transcript,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Claude API error: ${JSON.stringify(error)}`)
    }

    const result = await response.json()
    const summary = result.content[0]?.text || ''

    return summary.trim()
  } catch (error) {
    throw new Error(`Claude summary generation failed: ${(error as Error).message}`)
  }
}

async function updateSummary(dailyLogId: string, summary: string) {
  const { error } = await supabase
    .from('daily_logs')
    .update({
      summary: summary,
      summary_generated_at: new Date().toISOString(),
    })
    .eq('id', dailyLogId)

  if (error) {
    throw new Error(`Failed to update summary: ${error.message}`)
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let user
  try {
    const auth = await authenticateRequest(req)
    user = auth.user
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const payload: SummaryRequest = await req.json()
    const { daily_log_id, transcript, project_id, forceRefresh } = payload

    if (!daily_log_id || !transcript) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: daily_log_id, transcript' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify project access
    try {
      await verifyProjectAccess(user.id, project_id, supabase)
    } catch (_error) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this project' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // AI Metering: consume credits before AI call (5 actions per summarize-meeting call)
    const tenantId = user.app_metadata?.tenant_id as string | undefined ?? ''
    const metering = await consumeAIActions({
      tenantId,
      feature: 'summarize-meeting',
      actions: 5,
      userId: user.id,
      modelUsed: 'anthropic',
    })

    console.log(`Generating summary for daily_log_id: ${daily_log_id}`)

    const promptVersion = await hashTranscript(transcript)

    // Check cache (7-day TTL; meeting content is immutable)
    if (!forceRefresh && project_id) {
      const cached = await getCachedInsight(
        supabase,
        'summarize-meeting',
        'meetings',
        project_id,
        undefined,
        { promptVersion }
      )
      if (cached && cached.content) {
        const summary = typeof cached.content === 'string' ? cached.content : String(cached.content)
        console.log('✅ Returning cached meeting summary for', daily_log_id)

        return new Response(
          JSON.stringify({
            success: true,
            daily_log_id,
            summary,
            message: 'Summary generation completed successfully',
            cached: true,
            generatedAt: cached.generated_at,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generate summary — route to cheapest provider when degraded
    let summary: string
    if (metering.degraded) {
      const aiResponse = await getAICompletion({
        prompt: SUMMARY_PROMPT + transcript,
        maxTokens: 256,
        preferredProvider: 'openrouter',
      })
      summary = aiResponse.content.trim()
    } else {
      summary = await generateSummaryWithClaude(transcript)
    }
    console.log('Summary generation complete')

    // Update database with summary
    await updateSummary(daily_log_id, summary)
    console.log('Summary saved to database')

    // Cache result (7 days)
    if (project_id) {
      await cacheInsight(supabase, {
        insightType: 'summarize-meeting',
        domain: 'meetings',
        title: 'Meeting Summary',
        content: summary,
        confidenceLevel: 90,
        projectId: project_id,
        promptVersion,
        ttlHours: 24 * 7,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        daily_log_id,
        summary,
        message: 'Summary generation completed successfully',
        cached: false,
        generatedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Summary generation error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
