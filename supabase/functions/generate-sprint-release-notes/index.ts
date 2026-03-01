/**
 * Generate AI-powered Release Notes for a closed sprint.
 * Reads completed items from sprint_items_snapshot, calls AI to produce
 * professional release notes in Markdown, and updates sprints.release_notes.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getAICompletion } from '../_shared/aiProviderClient.ts'
import { authenticateRequest, createServiceRoleClient } from '../_shared/authorization.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let _user
  try {
    const auth = await authenticateRequest(req)
    _user = auth.user
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { sprint_id: sprintId } = await req.json()
    if (!sprintId) {
      return new Response(
        JSON.stringify({ error: 'sprint_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createServiceRoleClient()

    const { data: sprint, error: sprintError } = await supabase
      .from('sprints')
      .select('id, sprint_identifier, title, start_date, end_date, status')
      .eq('id', sprintId)
      .single()

    if (sprintError || !sprint) {
      return new Response(
        JSON.stringify({ error: 'Sprint not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (sprint.status !== 'closed') {
      return new Response(
        JSON.stringify({ error: 'Sprint is not closed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: doneItems, error: snapshotError } = await supabase
      .from('sprint_items_snapshot')
      .select('item_title, item_description, item_category, item_priority, completed_at')
      .eq('sprint_id', sprintId)
      .eq('item_status', 'done')
      .order('completed_at', { ascending: true })

    if (snapshotError) {
      console.error('[generate-sprint-release-notes] Snapshot error:', snapshotError)
      return new Response(
        JSON.stringify({ error: 'Failed to load completed items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const itemsList = (doneItems || []).map(
      (i: { item_title: string; item_description?: string; item_category?: string; item_priority?: string; completed_at?: string }) =>
        `- **${i.item_title}** (${i.item_category || 'N/A'}, ${i.item_priority || 'N/A'})${i.item_description ? `\n  ${i.item_description}` : ''}`
    ).join('\n')

    const prompt = `You are a technical writer for CastorWorks. Generate a concise, professional Release Notes document in Markdown for this sprint.

Sprint: ${sprint.sprint_identifier} - ${sprint.title}
Period: ${sprint.start_date} to ${sprint.end_date}

Completed issues (${(doneItems || []).length} items):
${itemsList || '(No completed items)'}

Write:
1. A short title and one-paragraph summary of the release.
2. A "What's included" or "Completed work" section with bullet points for each item, written in user-facing language (not raw task titles).
3. Keep it scannable and professional. Use clear Markdown (## for sections, ** for emphasis). Do not invent details not present in the list.`

    const aiResponse = await getAICompletion({
      prompt,
      systemMessage: 'You are CastorMind AI. Generate clear, professional release notes in Markdown. Be concise and user-facing.',
      maxTokens: 2000,
      temperature: 0.4,
    })

    const releaseNotesMarkdown = aiResponse.content.trim()

    const { error: updateError } = await supabase
      .from('sprints')
      .update({
        release_notes: releaseNotesMarkdown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sprintId)

    if (updateError) {
      console.error('[generate-sprint-release-notes] Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save release notes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        sprint_id: sprintId,
        release_notes: releaseNotesMarkdown,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err: unknown) {
    console.error('[generate-sprint-release-notes] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
