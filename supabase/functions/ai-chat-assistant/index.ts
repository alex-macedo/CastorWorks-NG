/**
 * AI Chat Assistant Edge Function
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Ensure ANTHROPIC_API_KEY is set in Supabase Edge Functions secrets:
 *    supabase secrets set ANTHROPIC_API_KEY=your_key_here
 * 
 * 2. Deploy the function:
 *    supabase functions deploy ai-chat-assistant
 * 
 * This function provides an AI-powered chat assistant for construction platform users.
 * It supports function calling for estimate creation, search, metrics, and project info.
 */

// deno-lint-ignore no-import-prefix
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// deno-lint-ignore no-import-prefix
import Anthropic from 'npm:@anthropic-ai/sdk@0.24.3';
import { authenticateRequest, createServiceRoleClient, verifyProjectAccess } from '../_shared/authorization.ts';
import { getAICompletion } from '../_shared/aiProviderClient.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an AI assistant for a construction estimating platform. You help contractors:
- Create estimates from descriptions
- Search for estimates and projects
- Get metrics and analytics
- Answer questions about their data

You have access to these functions:
1. create_estimate - Create a new AI estimate
2. search_estimates - Search existing estimates
3. get_metrics - Get business metrics
4. get_project_info - Get project details

When users ask you to perform actions, use the appropriate function. Always confirm before making changes.

Be helpful, concise, and professional. Format responses in markdown when appropriate.`;

const tools: Anthropic.Tool[] = [
  {
    name: 'create_estimate',
    description: 'Create a new AI-generated estimate for a construction project',
    input_schema: {
      type: 'object',
      properties: {
        projectType: {
          type: 'string',
          enum: ['kitchen', 'bathroom', 'basement', 'deck', 'roofing', 'addition', 'renovation'],
          description: 'Type of construction project',
        },
        location: {
          type: 'string',
          description: 'Project location (city, state or address)',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the project requirements',
        },
      },
      required: ['projectType', 'location', 'description'],
    },
  },
  {
    name: 'search_estimates',
    description: 'Search for existing estimates by keyword or criteria',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (name, description, or keywords)',
        },
        status: {
          type: 'string',
          enum: ['draft', 'pending', 'approved', 'rejected'],
          description: 'Filter by estimate status',
        },
        dateRange: {
          type: 'string',
          description: 'Date range filter (e.g., "last_7_days", "this_month")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_metrics',
    description: 'Get business metrics like conversion rate, revenue, etc.',
    input_schema: {
      type: 'object',
      properties: {
        metricType: {
          type: 'string',
          enum: ['conversion_rate', 'revenue', 'outstanding', 'estimate_count'],
          description: 'Type of metric to retrieve',
        },
        period: {
          type: 'string',
          enum: ['week', 'month', 'year'],
          description: 'Time period for the metric',
        },
      },
      required: ['metricType'],
    },
  },
  {
    name: 'get_project_info',
    description: 'Get detailed information about a specific project',
    input_schema: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'Name or partial name of the project to search for',
        },
      },
      required: ['projectName'],
    },
  },
];

const formatMessageContent = (content: Anthropic.MessageParam['content']): string => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map(block => {
        if (block.type === 'text') {
          return block.text;
        }
        if (block.type === 'tool_result') {
          return `Tool result: ${block.content}`;
        }
        return '[Unsupported content]';
      })
      .join('\n');
  }

  return String(content ?? '');
};

const buildPromptFromMessages = (messages: Anthropic.MessageParam[]): string => {
  return messages
    .map(message => {
      const roleLabel = message.role === 'assistant' ? 'Assistant' : 'User';
      return `${roleLabel}: ${formatMessageContent(message.content)}`;
    })
    .join('\n');
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const canUseAnthropic = Boolean(ANTHROPIC_API_KEY);

    if (!canUseAnthropic) {
      console.warn('ANTHROPIC_API_KEY is not configured; falling back to other providers.');
    }

    // Authenticate user
    let user;
    try {
      ({ user } = await authenticateRequest(req));
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createServiceRoleClient();

    // Parse request
    const { message, sessionId, context } = await req.json();
    const projectId =
      typeof context?.projectId === 'string'
        ? context.projectId
        : typeof context?.project_id === 'string'
          ? context.project_id
          : null;

    await verifyProjectAccess(user.id, projectId, supabaseClient);

    if (!message || !sessionId) {
      return new Response(
        JSON.stringify({ 
          error: 'Message and sessionId are required',
          code: 'MISSING_PARAMS'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Load recent conversation history
    const { data: history } = await supabaseClient
      .from('ai_chat_messages')
      .select('role, message')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(20);

    const messages: Anthropic.MessageParam[] = [
      ...(history?.map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.message,
      })) || []),
      { role: 'user', content: message },
    ];

    // Add context to system prompt
    const contextInfo = context?.currentPage
      ? `\n\nCurrent context: User is on ${context.currentPage} page.`
      : '';

    let assistantMessage = '';
    // deno-lint-ignore no-explicit-any
    const functionCalls: any[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    
    // Load enabled providers sorted by priority
    const { data: configs } = await supabaseClient
      .from('ai_provider_configs')
      .select('*')
      .eq('is_enabled', true)
      .order('priority_order', { ascending: true });

    const topProvider = configs?.[0]?.provider_name || 'anthropic';
    let providerUsed = topProvider;
    let modelUsed = configs?.[0]?.default_model || 'claude-3-5-sonnet-20241022';

    try {
      // If the top priority provider is Anthropic, use the optimized tool-calling logic
      if (topProvider === 'anthropic' && canUseAnthropic) {
        const anthropic = new Anthropic({
          apiKey: ANTHROPIC_API_KEY,
        });

        // Initial API call
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          system: SYSTEM_PROMPT + contextInfo,
          messages,
          tools,
        });

        totalInputTokens = response.usage.input_tokens;
        totalOutputTokens = response.usage.output_tokens;

        for (const block of response.content) {
          if (block.type === 'text') {
            assistantMessage += block.text;
          } else if (block.type === 'tool_use') {
            functionCalls.push({
              name: block.name,
              input: block.input,
            });

            // Execute function
            const result = await executeFunction(block.name, block.input, user.id, supabaseClient);

            // Continue conversation with result
            const followUp = await anthropic.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 1000,
              system: SYSTEM_PROMPT,
              messages: [
                ...messages,
                { role: 'assistant', content: response.content },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'tool_result',
                      tool_use_id: block.id,
                      content: JSON.stringify(result),
                    },
                  ],
                },
              ],
            });

            totalInputTokens += followUp.usage.input_tokens;
            totalOutputTokens += followUp.usage.output_tokens;

            // Extract text from follow-up
            for (const followUpBlock of followUp.content) {
              if (followUpBlock.type === 'text') {
                assistantMessage += followUpBlock.text;
              }
            }
          }
        }
      } else {
        // Use generic completion for non-Anthropic priority (e.g., OLLAMA or OpenAI)
        // or as a broad fallback if Anthropic is not configured
        console.log(`[AI Chat] Using prioritized provider chain starting with: ${topProvider}`);
        const prompt = buildPromptFromMessages(messages);
        const fallbackResponse = await getAICompletion({
          prompt,
          systemMessage: SYSTEM_PROMPT + contextInfo,
          maxTokens: 2000,
          temperature: 0.7,
          preferredProvider: topProvider
        });

        assistantMessage = fallbackResponse.content.trim();
        providerUsed = fallbackResponse.provider;
        modelUsed = fallbackResponse.model;
        totalOutputTokens = fallbackResponse.tokensUsed ?? 0;
      }
    } catch (chatError) {
      console.error('[AI Chat] Primary provider attempt failed, attempting broad fallback:', chatError);
      
      // If we haven't already tried getAICompletion, try it now as a final catch-all
      if (assistantMessage === '') {
        const prompt = buildPromptFromMessages(messages);
        const fallbackResponse = await getAICompletion({
          prompt,
          systemMessage: SYSTEM_PROMPT + contextInfo,
          maxTokens: 2000,
          temperature: 0.7,
        });

        assistantMessage = fallbackResponse.content.trim();
        providerUsed = fallbackResponse.provider;
        modelUsed = fallbackResponse.model;
        totalOutputTokens = fallbackResponse.tokensUsed ?? 0;
      } else {
        throw chatError; // Rethrow if we already have a message but something else failed (unlikely here)
      }
    }

    // If no text content, provide a default message
    if (!assistantMessage) {
      assistantMessage = 'I executed the requested action. Is there anything else I can help you with?';
    }

    // Store messages
    await supabaseClient.from('ai_chat_messages').insert([
      {
        user_id: user.id,
        session_id: sessionId,
        role: 'user',
        message,
        context
      },
      {
        user_id: user.id,
        session_id: sessionId,
        role: 'assistant',
        message: assistantMessage,
        function_calls: functionCalls.length > 0 ? functionCalls : null,
        tokens_used: totalInputTokens + totalOutputTokens,
        model: modelUsed,
      },
    ]);

    // Log usage
    const processingTime = Date.now() - startTime;
    const costEstimate = providerUsed === 'anthropic'
      ? (totalInputTokens * 0.003 + totalOutputTokens * 0.015) / 1000
      : 0;

    await supabaseClient.from('ai_usage_logs').insert({
      user_id: user.id,
      feature: 'chat',
      model: modelUsed,
      tokens_input: totalInputTokens,
      tokens_output: totalOutputTokens,
      processing_time_ms: processingTime,
      cost_estimate: costEstimate,
      success: true,
    });

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        functionCalls,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Chat assistant error:', error);

    // Log failed usage if we have user context
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const { user } = await authenticateRequest(req);
        const supabaseClient = createServiceRoleClient();
        await supabaseClient.from('ai_usage_logs').insert({
          user_id: user.id,
          feature: 'chat',
          model: 'claude-3-5-sonnet-20241022',
          tokens_input: 0,
          tokens_output: 0,
          processing_time_ms: Date.now() - startTime,
          success: false,
          error_message: error.message,
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const normalizedMessage = errorMessage.toLowerCase();
    const statusCode = normalizedMessage.includes('unauthorized') ? 401 :
      normalizedMessage.includes('access denied') ? 403 :
      normalizedMessage.includes('not configured') ? 503 :
      normalizedMessage.includes('required') ? 400 : 500;

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// deno-lint-ignore no-explicit-any
async function executeFunction(name: string, input: any, userId: string, client: any) {
  console.log(`Executing function: ${name}`, input);

  switch (name) {
    case 'search_estimates': {
      const { query, status } = input;
      let queryBuilder = client
        .from('estimates')
        .select('id, name, status, total, created_at, description')
        .eq('user_id', userId)
        .limit(5);

      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      }

      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      const { data: estimates, error } = await queryBuilder;

      if (error) {
        console.error('Search estimates error:', error);
        return { error: 'Failed to search estimates' };
      }

      return {
        estimates: estimates || [],
        count: estimates?.length || 0,
      };
    }

    case 'get_metrics': {
      const { metricType, period } = input;

      if (metricType === 'estimate_count') {
        const { count, error } = await client
          .from('estimates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (error) {
          console.error('Get metrics error:', error);
          return { error: 'Failed to retrieve metrics' };
        }

        return {
          metric: 'estimate_count',
          value: count || 0,
          period: period || 'all_time',
        };
      }

      // Add more metrics as needed
      return {
        metric: metricType,
        value: 0,
        message: 'Metric calculation not yet implemented',
      };
    }

    case 'get_project_info': {
      const { projectName } = input;

      const { data: projects, error } = await client
        .from('projects')
        .select('id, name, status, start_date, end_date, budget, description')
        .eq('user_id', userId)
        .ilike('name', `%${projectName}%`)
        .limit(5);

      if (error) {
        console.error('Get project info error:', error);
        return { error: 'Failed to retrieve project information' };
      }

      return {
        projects: projects || [],
        count: projects?.length || 0,
      };
    }

    case 'create_estimate': {
      // Note: This would typically call the generate-construction-estimate function
      // For now, return a message indicating the action needs to be confirmed
      return {
        message: 'To create an estimate, please use the Estimates page or provide more details about your project.',
        projectType: input.projectType,
        location: input.location,
        description: input.description,
      };
    }

    default:
      return { error: 'Unknown function' };
  }
}
