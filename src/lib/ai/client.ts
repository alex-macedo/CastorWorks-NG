import { supabase } from '@/integrations/supabase/client';
import { RateLimitError, AIProviderError } from './types';

/**
 * Base function to call Supabase Edge Functions for AI features
 */
async function callEdgeFunction<TRequest, TResponse>(
  functionName: string,
  payload: TRequest
): Promise<TResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated. Please log in to use AI features.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  // Handle rate limiting
  if (response.status === 429) {
    const error = await response.json();
    throw new RateLimitError(
      error.remaining || 0,
      new Date(error.resetAt || Date.now() + 3600000),
      error.limit || 0
    );
  }

  // Handle other errors
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
    }));

    throw new AIProviderError(
      error.error || error.message || 'AI request failed',
      'anthropic', // Default, will be provider-specific in actual implementations
      response.status
    );
  }

  return response.json();
}

/**
 * AI Client for all AI features
 * This provides typed interfaces for calling AI Edge Functions
 */
export const aiClient = {
  /**
   * Generate construction estimate from description
   */
  generateEstimate: async (input: {
    projectType: string;
    location: string;
    description: string;
    squareFootage?: number;
    qualityLevel?: string;
    clientBudget?: number;
  }) => {
    return callEdgeFunction('generate-construction-estimate', input);
  },

  /**
   * Transcribe voice input using Whisper
   */
  transcribeVoice: async (input: {
    audioUrl: string;
    filePath?: string;
    language?: string;
    estimateId?: string;
  }) => {
    return callEdgeFunction('transcribe-voice-input', input);
  },

  /**
   * Process document with OCR
   */
  processDocument: async (input: {
    fileUrl: string;
    fileType: string;
  }) => {
    return callEdgeFunction('process-document-ocr', input);
  },

  /**
   * Generate proposal content
   */
  generateProposal: async (input: {
    estimateId: string;
    sections: string[];
    companyInfo: Record<string, unknown>;
    clientName: string;
    tone?: string;
  }) => {
    return callEdgeFunction('generate-proposal-content', input);
  },

  /**
   * AI chat assistant
   */
  chat: async (input: {
    message: string;
    sessionId: string;
    context?: Record<string, unknown>;
  }) => {
    return callEdgeFunction('ai-chat-assistant', input);
  },

  /**
   * Super Bot chat assistant for NL data operations
   */
  superBot: async (input: {
    message: string;
    sessionId: string;
    context?: Record<string, unknown>;
    forceUpdate?: boolean;
    overridePhrase?: string;
  }) => {
    return callEdgeFunction('super-bot-assistant', input);
  },

  /**
   * Generate analytics insights (migrated from Gemini)
   */
  generateInsights: async (input: {
    insightType: string;
    projectId?: string;
    projectData?: Record<string, unknown>;
    timeframe?: string;
  }) => {
    return callEdgeFunction('generate-analytics-insights-v2', input);
  },

  /**
   * Predict project cost (migrated from Gemini)
   */
  predictCost: async (input: {
    projectDetails: Record<string, unknown>;
    region: string;
  }) => {
    return callEdgeFunction('predict-project-cost-v2', input);
  },

  /**
   * Analyze budget intelligence (Phase 2)
   * Comprehensive budget analysis including variance prediction, anomaly detection,
   * spending patterns, optimization recommendations, and alerts
   */
  analyzeBudgetIntelligence: async (input: {
    projectId: string;
    analysisTypes?: ('variance' | 'anomaly' | 'patterns' | 'optimization' | 'alerts')[];
    timeframe?: {
      startDate?: string;
      endDate?: string;
    };
    forceRefresh?: boolean;
    language?: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';
  }) => {
    return callEdgeFunction('analyze-budget-intelligence', input);
  },

  /**
   * Analyze site photos for construction diary generation
   */
  analyzeSitePhotos: async (input: {
    photoUrls: string[];
    projectId?: string;
    language?: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';
    forceRefresh?: boolean;
  }) => {
    return callEdgeFunction('analyze-site-photos', input);
  },
};

/**
 * Helper to check if error is rate limit error
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

/**
 * Helper to check if error is AI provider error
 */
export function isAIProviderError(error: unknown): error is AIProviderError {
  return error instanceof AIProviderError;
}

/**
 * Parse and sanitize raw API error messages
 * Handles JSON error responses from AI providers (Anthropic, OpenAI, OLLAMA)
 */
function sanitizeErrorMessage(message: string): string {
  // Try to parse if message looks like JSON
  if (message.startsWith('{') || message.startsWith('[')) {
    try {
      const parsed = JSON.parse(message);

      // Handle Anthropic error format: {"type":"error","error":{"type":"...","message":"..."}}
      if (parsed.error?.message) {
        return sanitizeErrorMessage(parsed.error.message);
      }

      // Handle OpenAI/OpenRouter error format: {"error":{"message":"...","type":"...","code":"..."}}
      if (parsed.error?.message) {
        return sanitizeErrorMessage(parsed.error.message);
      }

      if (parsed.message) {
        return sanitizeErrorMessage(parsed.message);
      }
    } catch {
      // Not valid JSON, continue with string processing
    }
  }

  // Detect billing/credit-related errors and provide friendly message
  const billingPatterns = [
    /credit balance is too low/i,
    /insufficient.{0,20}(credit|fund|balance)/i,
    /payment.{0,20}required/i,
    /billing.{0,20}(issue|problem|error)/i,
    /quota.{0,20}exceeded/i,
    /rate.{0,20}limit.{0,20}(exceeded|reached)/i,
    /exceeded.{0,20}(limit|quota)/i,
  ];

  for (const pattern of billingPatterns) {
    if (pattern.test(message)) {
      return 'AI service is temporarily unavailable due to provider configuration. The system will automatically try alternative providers.';
    }
  }

  // Detect connection/network errors
  const networkPatterns = [
    /connection.{0,20}(refused|failed|timeout)/i,
    /ECONNREFUSED/i,
    /network.{0,20}(error|unreachable)/i,
    /dns.{0,20}(resolution|lookup).{0,20}failed/i,
    /timeout/i,
  ];

  for (const pattern of networkPatterns) {
    if (pattern.test(message)) {
      return 'Unable to connect to AI service. Please check your connection and try again.';
    }
  }

  // Detect model/configuration errors
  const configPatterns = [
    /model.{0,20}not.{0,20}found/i,
    /invalid.{0,20}(model|api.{0,5}key)/i,
    /unauthorized/i,
    /authentication.{0,20}failed/i,
  ];

  for (const pattern of configPatterns) {
    if (pattern.test(message)) {
      return 'AI service configuration error. Please contact your administrator.';
    }
  }

  // If the message contains technical details (long strings, stack traces, etc.), sanitize
  if (message.length > 200 || message.includes('at ') || message.includes('Error:')) {
    return 'An error occurred while processing your request. Please try again.';
  }

  // Return the message if it's already user-friendly
  return message;
}

/**
 * Format AI error for user display
 * Sanitizes raw API errors into professional, user-friendly messages
 */
export function formatAIError(error: unknown): string {
  if (isRateLimitError(error)) {
    return `You've reached the rate limit. Please try again after ${error.resetAt.toLocaleTimeString()}.`;
  }

  if (isAIProviderError(error)) {
    if (error.statusCode === 503) {
      return 'AI service is temporarily unavailable. Please try again in a moment.';
    }
    if (error.statusCode === 401) {
      return 'Authentication failed. Please refresh the page and try again.';
    }
    if (error.statusCode === 402 || error.statusCode === 403) {
      return 'AI service is temporarily unavailable due to provider configuration. Please try again later.';
    }
    if (error.statusCode === 500) {
      return 'The AI service encountered an internal error. Please try again.';
    }
    // Sanitize the error message before returning
    return sanitizeErrorMessage(error.message);
  }

  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message);
  }

  return 'An unexpected error occurred. Please try again.';
}
