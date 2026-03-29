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

interface NotesRequest {
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

const NOTES_EXTRACTION_PROMPT = `Extract key information from the following meeting/work session transcript.

Identify and organize:
1. **Key Decisions** - Important conclusions or decisions made
2. **Action Items** - Tasks that need to be done (with owners if mentioned)
3. **Risks/Issues** - Problems identified or concerns raised
4. **Next Steps** - What happens next
5. **Important Metrics** - Any numbers, measurements, or KPIs mentioned

Format the response as JSON with these exact keys:
{
  "key_decisions": ["decision 1", "decision 2"],
  "action_items": [{"task": "...", "owner": "..."}, ...],
  "risks_issues": ["risk 1", "risk 2"],
  "next_steps": ["step 1", "step 2"],
  "metrics": ["metric 1", "metric 2"]
}

Transcript:
`

async function extractNotesWithClaude(transcript: string): Promise<object> {
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
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: NOTES_EXTRACTION_PROMPT + transcript,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Claude API error: ${JSON.stringify(error)}`)
    }

    const result = await response.json()
    const content = result.content[0]?.text || ''

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Claude response')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    throw new Error(`Claude extraction failed: ${(error as Error).message}`)
  }
}

async function saveLogs(
  dailyLogId: string,
  projectId: string,
  notes: object,
  transcript: string
) {
  const { error } = await supabase.from('daily_log_notes').insert({
    daily_log_id: dailyLogId,
    project_id: projectId,
    transcript: transcript,
    notes: notes,
    created_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(`Failed to save notes: ${error.message}`)
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
    const payload: NotesRequest = await req.json()
    const { daily_log_id, transcript, project_id, forceRefresh } = payload

    // Verify project access
    try {
      await verifyProjectAccess(user.id, project_id, supabase)
    } catch (_error) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this project' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!daily_log_id || !transcript) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: daily_log_id, transcript' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // AI Metering: consume credits before AI call (5 actions per extract-meeting-notes call)
    const tenantId = user.app_metadata?.tenant_id as string | undefined ?? ''
    const metering = await consumeAIActions({
      tenantId,
      feature: 'extract-meeting-notes',
      actions: 5,
      userId: user.id,
      modelUsed: 'anthropic',
    })

    console.log(`Extracting notes for daily_log_id: ${daily_log_id}`)

    const promptVersion = await hashTranscript(transcript)

    // Check cache (7-day TTL; meeting content is immutable)
    if (!forceRefresh && project_id) {
      const cached = await getCachedInsight(
        supabase,
        'extract-meeting-notes',
        'meetings',
        project_id,
        undefined,
        { promptVersion }
      )
      if (cached && cached.content) {
        const notes = cached.content as object
        console.log('✅ Returning cached meeting notes for', daily_log_id)

        return new Response(
          JSON.stringify({
            success: true,
            daily_log_id,
            notes,
            message: 'Notes extraction completed successfully',
            cached: true,
            generatedAt: cached.generated_at,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Extract notes — route to cheapest provider when degraded
    let notes: object
    if (metering.degraded) {
      const aiResponse = await getAICompletion({
        prompt: NOTES_EXTRACTION_PROMPT + transcript,
        maxTokens: 1024,
        preferredProvider: 'openrouter',
      })
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Failed to parse JSON from AI response')
      notes = JSON.parse(jsonMatch[0])
    } else {
      notes = await extractNotesWithClaude(transcript)
    }
    console.log('Notes extraction complete')

    // Save to database
    await saveLogs(daily_log_id, project_id, notes, transcript)
    console.log('Notes saved to database')

    // Cache result (7 days)
    if (project_id) {
      await cacheInsight(supabase, {
        insightType: 'extract-meeting-notes',
        domain: 'meetings',
        title: 'Meeting Notes',
        content: notes,
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
        notes,
        message: 'Notes extraction completed successfully',
        cached: false,
        generatedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Notes extraction error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
