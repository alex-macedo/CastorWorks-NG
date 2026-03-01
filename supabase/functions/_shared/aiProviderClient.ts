/**
 * AI Provider Client - Unified abstraction layer for multiple AI providers
 *
 * Supports:
 * - Anthropic (Claude)
 * - OpenAI (GPT)
 * - OLLAMA (Self-hosted open-source LLMs)
 *
 * Features:
 * - Intelligent fallback chain
 * - Provider configuration from database
 * - Normalized response format
 * - Error handling and logging
 */

import { createServiceRoleClient } from './authorization.ts';

// Types
export interface AIProviderConfig {
  id: string;
  provider_name: 'anthropic' | 'openai' | 'ollama' | 'openrouter';
  is_enabled: boolean;
  api_endpoint: string;
  api_key_encrypted: string | null;
  default_model: string;
  max_tokens: number;
  temperature: number;
  config_json: Record<string, any>;
  priority_order: number;
}

export interface AICompletionParams {
  prompt: string;
  systemMessage?: string;
  language?: string;
  insightType?: string;
  maxTokens?: number;
  temperature?: number;
  preferredProvider?: string;
}

export interface VisionContent {
    type: 'vision';
    imageUrls: string[];
    prompt: string;
    jsonOutput?: boolean;
    maxTokens?: number;
    temperature?: number;
    preferredProvider?: string;
}

export type AICompletionRequest = AICompletionParams | VisionContent;

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
}

/**
 * Translate technical API errors into human-readable messages
 */
function mapProviderError(provider: string, status: number, rawMessage: string): string {
  // Common error patterns
  const patterns = {
    auth: /invalid.{0,20}key|unauthorized|authentication.{0,20}failed|permission.{0,20}denied/i,
    billing: /credit balance is too low|insufficient.{0,20}(credit|fund|balance)|payment.{0,20}required|billing.{0,20}(issue|problem|error)|quota.{0,20}exceeded/i,
    rateLimit: /rate.{0,20}limit.{0,20}(exceeded|reached)|too.{0,5}many.{0,5}requests/i,
    model: /model.{0,20}not.{0,20}found|invalid.{0,20}model/i,
    overloaded: /overloaded|busy|temporary.{0,10}unavailable/i,
  };

  if (patterns.auth.test(rawMessage) || status === 401 || status === 403) {
    return `Authentication failed for ${provider}. Please check your API Key and ensure it is valid.`;
  }

  if (patterns.billing.test(rawMessage) || status === 402) {
    return `Insufficient credits or billing issue with ${provider}. Please check your provider account balance.`;
  }

  if (patterns.rateLimit.test(rawMessage) || status === 429) {
    return `Rate limit exceeded for ${provider}. Please wait a moment before trying again.`;
  }

  if (patterns.model.test(rawMessage)) {
    return `The requested AI model is not available for ${provider}. Please check your configuration.`;
  }

  if (patterns.overloaded.test(rawMessage) || status === 503) {
    return `${provider} is currently overloaded or temporarily unavailable. The system will automatically try another provider.`;
  }

  // If we can parse a clearer message from the raw error
  try {
    const parsed = JSON.parse(rawMessage);
    const clearer = parsed.error?.message || parsed.message || parsed.error;
    if (clearer && typeof clearer === 'string') {
      return `${provider} reported: ${clearer}`;
    }
  } catch {
    // Not JSON, continue
  }

  return `Connection to ${provider} failed (${status}). Please verify your settings or try again later.`;
}

/**
 * Load AI provider configurations from database
 * Filters to only enabled providers, sorted by priority
 */
async function loadProviderConfigs(): Promise<AIProviderConfig[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('ai_provider_configs')
    .select('*')
    .eq('is_enabled', true)
    .order('priority_order', { ascending: true });

  if (error) {
    console.error('[AI Provider] Failed to load configs:', error);
    return [];
  }

  return data || [];
}

/**
 * Call Anthropic API (Claude)
 */
async function callAnthropicAPI(
  config: AIProviderConfig,
  params: AICompletionRequest
): Promise<AIResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY') || config.api_key_encrypted;

  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const messages: any[] = [
      {
        role: 'user',
        content: [
            { type: 'text', text: params.prompt }
        ]
      }
  ];

  if ('imageUrls' in params && params.imageUrls) {
      for (const imageUrl of params.imageUrls) {
          const response = await fetch(imageUrl);
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const arrayBuffer = await response.arrayBuffer();
          const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          messages[0].content.push({
              type: 'image',
              source: {
                  type: 'base64',
                  media_type: contentType,
                  data: base64Image,
              },
          });
      }
  }

  const requestBody = {
    model: config.default_model,
    max_tokens: params.maxTokens || config.max_tokens,
    temperature: params.temperature ?? config.temperature,
    system: 'systemMessage' in params ? params.systemMessage : 'You are a helpful construction management AI assistant.',
    messages: messages
  };

  const response = await fetch(config.api_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(mapProviderError('Anthropic', response.status, errorText));
  }

  const data = await response.json();

  return {
    content: data.content[0].text,
    provider: 'anthropic',
    model: config.default_model,
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    finishReason: data.stop_reason
  };
}

/**
 * Call OpenAI API (GPT)
 */
async function callOpenAIAPI(
  config: AIProviderConfig,
  params: AICompletionRequest
): Promise<AIResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY') || config.api_key_encrypted;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const messages: any[] = [];

  if ('systemMessage' in params && params.systemMessage) {
    messages.push({
      role: 'system',
      content: params.systemMessage
    });
  }
  
  const userContent: any[] = [{ type: 'text', text: params.prompt }];

  if ('imageUrls' in params && params.imageUrls) {
      for (const imageUrl of params.imageUrls) {
          userContent.push({
              type: 'image_url',
              image_url: {
                  url: imageUrl,
              },
          });
      }
  }

  messages.push({
    role: 'user',
    content: userContent
  });

  const requestBody: any = {
    model: config.default_model,
    messages,
    max_tokens: params.maxTokens || config.max_tokens,
    temperature: params.temperature ?? config.temperature
  };

  if ('jsonOutput' in params && params.jsonOutput) {
      requestBody.response_format = { type: 'json_object' };
  }

  const response = await fetch(config.api_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(mapProviderError('OpenAI', response.status, errorText));
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    provider: 'openai',
    model: config.default_model,
    tokensUsed: data.usage?.total_tokens,
    finishReason: data.choices[0].finish_reason
  };
}

/**
 * Call OpenRouter API (OpenAI-compatible)
 */
async function callOpenRouterAPI(
  config: AIProviderConfig,
  params: AICompletionRequest
): Promise<AIResponse> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY') || config.api_key_encrypted;

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const messages: any[] = [];

  if ('systemMessage' in params && params.systemMessage) {
    messages.push({
      role: 'system',
      content: params.systemMessage
    });
  }
  
  const userContent: any[] = [{ type: 'text', text: params.prompt }];

  if ('imageUrls' in params && params.imageUrls) {
      for (const imageUrl of params.imageUrls) {
          userContent.push({
              type: 'image_url',
              image_url: {
                  url: imageUrl,
              },
          });
      }
  }

  messages.push({
    role: 'user',
    content: userContent
  });

  const requestBody: any = {
    model: config.default_model,
    messages,
    max_tokens: params.maxTokens || config.max_tokens,
    temperature: params.temperature ?? config.temperature
  };

  const response = await fetch(config.api_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://castorworks.cloud',
      'X-Title': 'CastorWorks'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(mapProviderError('OpenRouter', response.status, errorText));
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    provider: 'openrouter',
    model: config.default_model,
    tokensUsed: data.usage?.total_tokens,
    finishReason: data.choices[0].finish_reason
  };
}

/**
 * Call OLLAMA API (Self-hosted LLM)
 */
async function callOllamaAPI(
  config: AIProviderConfig,
  params: AICompletionRequest
): Promise<AIResponse> {
  if ('imageUrls' in params) {
      throw new Error('Ollama provider does not support vision.');
  }
  // OLLAMA uses chat completion format similar to OpenAI
  const messages: any[] = [];

  if ('systemMessage' in params && params.systemMessage) {
    messages.push({
      role: 'system',
      content: params.systemMessage
    });
  }

  messages.push({
    role: 'user',
    content: params.prompt
  });

  const requestBody = {
    model: config.default_model,
    messages,
    stream: false, // Non-streaming for now
    options: {
      temperature: params.temperature ?? config.temperature,
      num_predict: params.maxTokens || config.max_tokens
    }
  };

  const response = await fetch(config.api_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(mapProviderError('Ollama', response.status, errorText));
  }

  const data = await response.json();

  return {
    content: data.message?.content || '',
    provider: 'ollama',
    model: config.default_model,
    tokensUsed: data.eval_count, // OLLAMA uses eval_count for output tokens
    finishReason: data.done ? 'stop' : 'length'
  };
}

/**
 * Main function: Get AI completion with intelligent fallback
 *
 * Strategy:
 * 1. Check if preferred provider specified and enabled
 * 2. Try providers in fallback chain order
 * 3. On error, try next provider in chain
 * 4. Return error if all providers fail
 */
export async function getAICompletion(
  params: AICompletionRequest
): Promise<AIResponse> {
  // TEST_MODE shortcut for deterministic tests. When `TEST_MODE=stub` is set
  // in the environment, return a small deterministic response and avoid
  // calling external providers or the database.
  try {
    const mode = Deno.env.get('TEST_MODE');
    if (mode === 'stub') {
      return {
        content: JSON.stringify({
          progressSummary: '~10% site cleared, foundations started',
          weatherCondition: 'partly_cloudy',
          identifiedMaterials: ['concrete', 'rebar'],
          identifiedActivities: ['excavation', 'formwork'],
          estimatedProgress: 10,
          observations: 'Test-mode synthetic observations',
          suggestedChecklist: { 'secure-site': true }
        }),
        provider: 'mock',
        model: 'mock-model',
        tokensUsed: 12
      };
    }

    if (mode === 'malformed') {
      // Return a deliberately malformed / non-JSON response to test parser fallback
      return {
        content: '*** MALFORMED RESPONSE *** This is not JSON. Observed rubble and pipes.',
        provider: 'mock',
        model: 'mock-model',
        tokensUsed: 5
      };
    }
  } catch (e) {
    console.warn('TEST_MODE check failed:', e);
  }
  // loadProviderConfigs returns enabled providers sorted by priority_order (ascending)
  const configs = await loadProviderConfigs();

  if (configs.length === 0) {
    throw new Error('No AI providers are enabled. Please configure AI providers in Settings.');
  }

  // 1. Build attempt order
  const attemptOrder: AIProviderConfig[] = [];

  // Preferred provider first (if specified and enabled)
  if (params.preferredProvider) {
    const preferred = configs.find(c => c.provider_name === params.preferredProvider);
    if (preferred) {
      attemptOrder.push(preferred);
    }
  }

  // Add all enabled providers in their priority order from DB
  for (const config of configs) {
    if (!attemptOrder.includes(config)) {
      attemptOrder.push(config);
    }
  }

  // 2. Try each provider in order
  const errors: Array<{ provider: string; error: string }> = [];

  for (const config of attemptOrder) {
    try {
      console.log(`[AI Provider] Attempting ${config.provider_name} with model ${config.default_model}`);

      let response: AIResponse;

      switch (config.provider_name) {
        case 'anthropic':
          response = await callAnthropicAPI(config, params);
          break;
        case 'openai':
          response = await callOpenAIAPI(config, params);
          break;
        case 'ollama':
          response = await callOllamaAPI(config, params);
          break;
        case 'openrouter':
          response = await callOpenRouterAPI(config, params);
          break;
        default:
          throw new Error(`Unknown provider: ${config.provider_name}`);
      }

      console.log(`[AI Provider] Success with ${config.provider_name}`);
      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for billing errors - if found, we log it but MUST continue to next provider
      const isBillingError = /credit balance is too low|insufficient.{0,20}(credit|fund|balance)|payment.{0,20}required|billing.{0,20}(issue|problem|error)|quota.{0,20}exceeded/i.test(errorMessage);
      
      if (isBillingError) {
        console.warn(`[AI Provider] ${config.provider_name} failed with billing error. Switching to fallback.`);
      }

      console.error(`[AI Provider] Failed with ${config.provider_name}:`, errorMessage);
      errors.push({
        provider: config.provider_name,
        error: errorMessage
      });
      // Continue to next provider in attemptOrder
    }
  }

  // All providers failed
  const errorSummary = errors.map(e => `${e.provider}: ${e.error}`).join('; ');
  throw new Error(`All AI providers failed. Errors: ${errorSummary}`);
}

/**
 * Test connection to a specific provider
 * Used by the admin UI to verify provider configuration
 */
export async function testProviderConnection(
  providerName: string
): Promise<{ success: boolean; message: string; latency?: number }> {
  const configs = await loadProviderConfigs();
  const config = configs.find(c => c.provider_name === providerName);

  if (!config) {
    return {
      success: false,
      message: `Provider ${providerName} is not configured or not enabled`
    };
  }

  const startTime = Date.now();

  try {
    const response = await getAICompletion({
      prompt: 'Hello, respond with just "OK"',
      systemMessage: 'You are a test assistant. Respond with just "OK".',
      maxTokens: 10,
      preferredProvider: providerName
    });

    const latency = Date.now() - startTime;

    return {
      success: true,
      message: `Connected successfully. Model: ${response.model}`,
      latency
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
