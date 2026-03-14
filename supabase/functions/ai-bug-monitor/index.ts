import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createErrorResponse } from '../_shared/errorHandler.ts'
import { sendEmailViaHostinger } from '../_shared/providers/index.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const HOSTINGER_FROM_EMAIL = Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
  ?? Deno.env.get('HOSTINGER_SMTP_USER')
  ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// -------------------------------------------------------------------
// AI Bug Monitor — Hourly Triage Edge Function
//
// Triggered by pg_cron every hour.  Finds new roadmap items that have
// NOT yet been tracked in `ai_bug_monitor_runs`, uses OpenAI to decide
// whether each is a genuine bug, and queues confirmed bugs for the
// local agent to investigate + fix.
// -------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // ---------------------------------------------------------------
    // 1. Find new roadmap items NOT yet in ai_bug_monitor_runs
    //    (only items created in the last 48 h to keep scope bounded)
    // ---------------------------------------------------------------
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: newItems, error: queryErr } = await supabase
      .from('roadmap_items')
      .select(`
        id, title, description, category, priority, status, created_by, created_at,
        roadmap_item_attachments ( id, file_name, file_type, file_url )
      `)
      .gte('created_at', cutoff)
      .not('id', 'in', `(SELECT roadmap_item_id FROM ai_bug_monitor_runs)`)
      .order('created_at', { ascending: true })

    // Fallback: if the subquery filter is not supported by PostgREST,
    // we fetch already-tracked IDs separately and filter in memory.
    let itemsToProcess = newItems ?? []

    if (queryErr) {
      console.warn('Subquery filter failed, falling back to in-memory filter:', queryErr.message)

      const { data: allRecent } = await supabase
        .from('roadmap_items')
        .select(`
          id, title, description, category, priority, status, created_by, created_at,
          roadmap_item_attachments ( id, file_name, file_type, file_url )
        `)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: true })

      const { data: tracked } = await supabase
        .from('ai_bug_monitor_runs')
        .select('roadmap_item_id')

      const trackedIds = new Set((tracked ?? []).map((r: { roadmap_item_id: string }) => r.roadmap_item_id))
      itemsToProcess = (allRecent ?? []).filter((item: { id: string }) => !trackedIds.has(item.id))
    }

    if (itemsToProcess.length === 0) {
      return new Response(JSON.stringify({ message: 'No new items to process', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[ai-bug-monitor] Found ${itemsToProcess.length} new item(s) to triage`)

    // ---------------------------------------------------------------
    // 2. Find the currently active sprint (for assignment)
    // ---------------------------------------------------------------
    const { data: activeSprint } = await supabase
      .from('sprints')
      .select('id, code, title')
      .eq('status', 'active')
      .limit(1)
      .single()

    const results: Array<{ id: string; status: string }> = []
    let quotaExhaustedNotified = false  // Only notify admins once per run

    // ---------------------------------------------------------------
    // 3. Triage each item via OpenAI
    // ---------------------------------------------------------------
    for (const item of itemsToProcess) {
      try {
        const triageResult = await triageItem(item)

        // Track if OpenAI quota was hit (to notify admins once at end)
        if (triageResult._quotaExhausted) {
          quotaExhaustedNotified = true
        }

        if (!triageResult.is_bug) {
          // Not a bug — mark as skipped
          await supabase.from('ai_bug_monitor_runs').upsert({
            roadmap_item_id: item.id,
            status: 'skipped',
            triage_result: triageResult,
          }, { onConflict: 'roadmap_item_id' })

          await postComment(supabase, item.id,
            `🤖 **AI Bug Monitor — Skipped**\n\nThis item was reviewed and determined to be *not a bug* (confidence: ${(triageResult.confidence * 100).toFixed(0)}%).\n\n> ${triageResult.summary}`)

          results.push({ id: item.id, status: 'skipped' })
        } else {
          // Confirmed bug — assign to sprint and queue for fixing
          const updatePayload: Record<string, unknown> = { status: 'in_progress' }
          if (activeSprint) {
            updatePayload.sprint_id = activeSprint.id
          }
          await supabase.from('roadmap_items').update(updatePayload).eq('id', item.id)

          await supabase.from('ai_bug_monitor_runs').upsert({
            roadmap_item_id: item.id,
            status: 'pending',
            triage_result: triageResult,
          }, { onConflict: 'roadmap_item_id' })

          const sprintNote = activeSprint
            ? `Assigned to sprint **${activeSprint.code}** (${activeSprint.title}).`
            : 'No active sprint found — item set to *in_progress* without sprint assignment.'

          await postComment(supabase, item.id,
            `🤖 **AI Bug Monitor — Bug Confirmed**\n\nConfidence: ${(triageResult.confidence * 100).toFixed(0)}%\n\n${sprintNote}\n\n**Summary:** ${triageResult.summary}\n\n**Reproduction Steps:**\n${(triageResult.reproduction_steps ?? []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}\n\n_Investigation will begin shortly._`)

          results.push({ id: item.id, status: 'pending' })
        }
      } catch (itemErr) {
        console.error(`[ai-bug-monitor] Error processing item ${item.id}:`, itemErr)

        await supabase.from('ai_bug_monitor_runs').upsert({
          roadmap_item_id: item.id,
          status: 'failed',
          error_log: String(itemErr),
        }, { onConflict: 'roadmap_item_id' })

        results.push({ id: item.id, status: 'failed' })
      }
    }

    // ---------------------------------------------------------------
    // 4. Notify admins if OpenAI quota was exhausted during this run
    // ---------------------------------------------------------------
    if (quotaExhaustedNotified) {
      await notifyAdminsQuotaExhausted(supabase, results)
    }

    // Log to cron_job_log
    await supabase.from('cron_job_log').insert({
      job_name: 'ai-bug-monitor-hourly',
      status: 'success',
      response: { processed: results.length, results },
    })

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[ai-bug-monitor] Fatal error:', error)

    await supabase.from('cron_job_log').insert({
      job_name: 'ai-bug-monitor-hourly',
      status: 'failed',
      error_message: String(error),
    }).catch(() => {})

    return createErrorResponse(error, corsHeaders)
  }
})

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

interface TriageResult {
  is_bug: boolean
  confidence: number
  summary: string
  reproduction_steps: string[]
  _quotaExhausted?: boolean  // Internal flag: OpenAI quota was exhausted
}

async function triageItem(item: Record<string, unknown>): Promise<TriageResult> {
  if (!OPENAI_API_KEY) {
    // Fallback: use category heuristic when no API key
    const isBugCategory = item.category === 'bug_fix' || item.category === 'bug'
    return {
      is_bug: isBugCategory,
      confidence: isBugCategory ? 0.8 : 0.2,
      summary: isBugCategory
        ? 'Categorised as bug by the reporter.'
        : 'Item category does not indicate a bug.',
      reproduction_steps: [],
    }
  }

  const attachments = (item.roadmap_item_attachments as Array<Record<string, string>>) ?? []
  const attachmentInfo = attachments.length > 0
    ? `\n\nAttachments (${attachments.length}):\n${attachments.map(a => `- ${a.file_name} (${a.file_type})`).join('\n')}`
    : ''

  const systemPrompt = `You are a senior QA engineer triaging incoming product reports for a construction management SaaS called CastorWorks.
Determine whether the report describes a SOFTWARE BUG (broken feature, crash, visual glitch, data issue) or something else (feature request, question, enhancement, documentation).

Respond with ONLY valid JSON matching this schema:
{
  "is_bug": boolean,
  "confidence": number (0-1),
  "summary": "one-sentence explanation of your decision",
  "reproduction_steps": ["step 1", "step 2", ...] // only if is_bug=true
}`

  const userPrompt = `Title: ${item.title}
Category: ${item.category}
Priority: ${item.priority}
Description: ${item.description || '(no description)'}${attachmentInfo}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    const isQuotaError = response.status === 429 || errText.includes('insufficient_quota')
    console.warn(`[ai-bug-monitor] OpenAI API error ${response.status}${isQuotaError ? ' (QUOTA EXHAUSTED)' : ''}, falling back to category heuristic: ${errText.slice(0, 200)}`)
    // Graceful fallback: use category heuristic when API is unavailable
    const isBug = item.category === 'bug_fix' || item.category === 'bug'
    return {
      is_bug: isBug,
      confidence: isBug ? 0.7 : 0.2,
      summary: `OpenAI API unavailable (${response.status}); falling back to category heuristic.`,
      reproduction_steps: [],
      _quotaExhausted: isQuotaError,
    } as TriageResult
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? '{}'

  try {
    return JSON.parse(content) as TriageResult
  } catch {
    console.error('[ai-bug-monitor] Failed to parse triage JSON:', content)
    // Fallback to category heuristic
    const isBug = item.category === 'bug_fix' || item.category === 'bug'
    return {
      is_bug: isBug,
      confidence: 0.5,
      summary: 'AI response was malformed; falling back to category heuristic.',
      reproduction_steps: [],
    }
  }
}

async function postComment(
  supabase: ReturnType<typeof createClient>,
  roadmapItemId: string,
  content: string,
) {
  // Use a system user ID if available, otherwise skip user_id requirement
  // The service role client bypasses RLS, so we need a valid user_id
  const { data: adminUser } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .limit(1)
    .single()

  const userId = adminUser?.user_id

  if (!userId) {
    console.warn('[ai-bug-monitor] No admin user found for posting comments')
    return
  }

  const { error } = await supabase.from('roadmap_item_comments').insert({
    roadmap_item_id: roadmapItemId,
    user_id: userId,
    content,
  })

  if (error) {
    console.error('[ai-bug-monitor] Failed to post comment:', error.message)
  }
}

/**
 * Notify all admin users via email when OpenAI quota is exhausted.
 * Sends a single consolidated email and logs to cron_job_log.
 */
async function notifyAdminsQuotaExhausted(
  supabase: ReturnType<typeof createClient>,
  results: Array<{ id: string; status: string }>,
) {
  console.warn('[ai-bug-monitor] 🚨 OpenAI API quota exhausted — notifying admins')

  // Log the quota issue to cron_job_log
  await supabase.from('cron_job_log').insert({
    job_name: 'ai-bug-monitor-quota-alert',
    status: 'failed',
    error_message: 'OpenAI API quota exhausted. Bug triage is using category heuristic fallback.',
    response: { processed: results.length, results },
  }).catch(() => {})

  // Fetch all admin emails
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id, users!inner(email, full_name)')
    .eq('role', 'admin')

  if (!admins || admins.length === 0) {
    console.warn('[ai-bug-monitor] No admin users found for quota notification')
    return
  }

  const adminEmails = admins
    .map((a: Record<string, unknown>) => {
      const user = a.users as Record<string, string> | null
      return user?.email
    })
    .filter(Boolean) as string[]

  if (adminEmails.length === 0) {
    console.warn('[ai-bug-monitor] No admin emails found')
    return
  }

  // Send email via Hostinger SMTP
  if (!HOSTINGER_FROM_EMAIL) {
    console.warn('[ai-bug-monitor] Hostinger SMTP not configured — cannot send quota alert email')
    return
  }

  const itemsProcessed = results.length
  const bugsQueued = results.filter(r => r.status === 'pending').length
  const skipped = results.filter(r => r.status === 'skipped').length

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .alert-box { background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 15px 0; }
        .stats { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .stat-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">🚨 OpenAI API Quota Exhausted</h2>
        </div>
        <div class="content">
          <div class="alert-box">
            <strong>The AI Bug Monitor could not use AI-powered triage</strong> because the OpenAI API quota has been exceeded.
            Bug reports are being triaged using the category heuristic fallback (less accurate).
          </div>

          <div class="stats">
            <h3 style="margin-top: 0;">This Run's Results</h3>
            <div class="stat-row"><span>Items processed:</span> <strong>${itemsProcessed}</strong></div>
            <div class="stat-row"><span>Bugs queued:</span> <strong>${bugsQueued}</strong></div>
            <div class="stat-row"><span>Non-bugs skipped:</span> <strong>${skipped}</strong></div>
          </div>

          <p><strong>Action Required:</strong></p>
          <ul>
            <li>Check the <a href="https://platform.openai.com/usage">OpenAI billing dashboard</a></li>
            <li>Add credits or upgrade the plan to restore AI-powered triage</li>
            <li>The monitor will automatically resume AI triage once quota is available</li>
          </ul>

          <div class="footer">
            <p>— CastorWorks AI Bug Monitor</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await sendEmailViaHostinger({
      fromEmail: HOSTINGER_FROM_EMAIL,
      fromName: 'CastorWorks AI',
      html: emailHtml,
      subject: '🚨 AI Bug Monitor — OpenAI API Quota Exhausted',
      to: adminEmails,
    })
    console.log(`[ai-bug-monitor] Quota alert email sent to ${adminEmails.length} admin(s): ${adminEmails.join(', ')}`)
  } catch (emailErr) {
    console.error('[ai-bug-monitor] Error sending quota alert email:', emailErr)
  }
}
