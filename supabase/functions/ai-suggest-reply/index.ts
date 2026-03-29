/**
 * ai-suggest-reply - Generate contextual reply suggestions for project messages
 *
 * Takes a message ID and generates 2-3 natural reply suggestions
 * using Claude API based on conversation context.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.0'
import { consumeAIActions } from '../_shared/ai-metering.ts'
import { getAICompletion } from '../_shared/aiProviderClient.ts'

interface RequestBody {
  projectId: string
  messageId: string
  conversationLength?: number
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!
})

export default async function aiSuggestReply(req: Request) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = (await req.json()) as RequestBody
    const { projectId, messageId, conversationLength = 10 } = body

    if (!projectId || !messageId) {
      return new Response(
        JSON.stringify({ error: 'Missing projectId or messageId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // AI Metering: consume credits before AI call
    const tenantId = user.app_metadata?.tenant_id as string | undefined ?? ''
    const metering = await consumeAIActions({
      tenantId,
      feature: 'ai-suggest-reply',
      actions: 1,
      userId: user.id,
      modelUsed: 'anthropic',
    })

    // Fetch message context (last N messages)
    const { data: messages, error: messagesError } = await supabase
      .from('project_messages')
      .select(`
        id,
        content,
        user:user_profiles!user_id(user_id, display_name),
        created_at
      `)
      .eq('project_id', projectId)
      .is('parent_message_id', null)
      .order('created_at', { ascending: false })
      .limit(conversationLength)

    if (messagesError || !messages) {
      throw messagesError
    }

    // Build conversation context
    const sortedMessages = messages.reverse()
    const conversationContext = sortedMessages
      .map(msg => {
        const name = msg.user?.display_name || 'Unknown'
        return `${name}: ${msg.content}`
      })
      .join('\n')

    const suggestionPrompt = `You are a helpful assistant in a construction project management chat.

Given this conversation:
${conversationContext}

Suggest 2-3 short, professional replies (1-2 sentences each) that would be natural continuations. Each suggestion should be practical and construction-related.

Return ONLY the suggestions as a numbered list, no explanations or preamble.

Example format:
1. That sounds good, let's schedule it for tomorrow.
2. Can you send me more details about that?`

    let suggestionText = ''

    if (metering.degraded) {
      // Degraded mode: route to cheapest provider via getAICompletion
      const aiResponse = await getAICompletion({
        prompt: suggestionPrompt,
        maxTokens: 300,
        preferredProvider: 'openrouter',
      })
      suggestionText = aiResponse.content
    } else {
      // Standard path: use Anthropic directly
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: suggestionPrompt }]
      })
      suggestionText = response.content[0].type === 'text' ? response.content[0].text : ''
    }

    // Parse suggestions from response (suggestionText already set above)
    const suggestions = suggestionText
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(s => s.length > 0 && s.length < 200)
      .slice(0, 3)

    return new Response(
      JSON.stringify({
        suggestions: suggestions.length > 0 ? suggestions : []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('[ai-suggest-reply] Error:', error)

    // Return empty suggestions on error instead of failing
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate suggestions',
        suggestions: []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
