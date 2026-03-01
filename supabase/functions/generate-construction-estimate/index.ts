import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, createServiceRoleClient, verifyProjectAccess } from '../_shared/authorization.ts';
import { getCachedInsight, cacheInsight } from '../_shared/aiCache.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const unauthorizedResponse = (message: string) =>
  new Response(
    JSON.stringify({ error: message }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    }
  );

interface EstimateRequest {
  projectType: string;
  location: string;
  squareFootage?: number;
  qualityLevel: string;
  clientBudget?: number;
  description: string;
  projectId?: string;
  language?: string;
  forceRefresh?: boolean;
}

async function hashEstimateInput(input: EstimateRequest): Promise<string> {
  const str = JSON.stringify({
    projectType: input.projectType,
    location: input.location,
    squareFootage: input.squareFootage,
    qualityLevel: input.qualityLevel,
    clientBudget: input.clientBudget,
    description: input.description,
    language: input.language || 'en-US',
  });
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 50);
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check API key
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    let user;
    try {
      ({ user } = await authenticateRequest(req));
    } catch (_authError) {
      return unauthorizedResponse('Unauthorized');
    }

    const supabaseClient = createServiceRoleClient();

    // Parse request
    const requestData: EstimateRequest = await req.json();
    const {
      projectType,
      location,
      squareFootage,
      qualityLevel,
      clientBudget,
      description,
      projectId,
      forceRefresh,
    } = requestData;

    try {
      await verifyProjectAccess(user.id, projectId ?? null, supabaseClient);
    } catch (accessError) {
      const message = accessError instanceof Error ? accessError.message : 'Access denied';
      return unauthorizedResponse(message);
    }

    const language = requestData.language || 'en-US';
    const promptVersion = await hashEstimateInput(requestData);

    if (!forceRefresh) {
      const cached = await getCachedInsight(
        supabaseClient,
        'generate-construction-estimate',
        'estimates',
        projectId,
        user.id,
        { promptVersion }
      );
      if (cached && cached.content) {
        const content = cached.content as Record<string, unknown>;
        if (content.lineItems && Array.isArray(content.lineItems)) {
          console.log('✅ Returning cached construction estimate');
          const lineItemsWithIds = content.lineItems.map((item: Record<string, unknown>) => ({
            ...item,
            id: crypto.randomUUID(),
          }));
          return new Response(
            JSON.stringify({
              ...content,
              lineItems: lineItemsWithIds,
              cached: true,
              generatedAt: cached.generated_at,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }
    }

    // Language-specific instructions
    const languageInstructions: Record<string, string> = {
      'pt-BR': 'Responda em Português do Brasil. Use nomes de materiais e termos de construção locais.',
      'en-US': 'Respond in English (US). Use standard construction terminology.',
      'es-ES': 'Responda en Español. Use términos de construcción estándar.',
      'fr-FR': 'Répondez en Français. Utilisez la terminologie de la construction standard.',
    };

    const langInstruction = languageInstructions[language] || languageInstructions['en-US'];

    // Build prompt for Claude
    const prompt = `You are an expert construction estimator. Generate a detailed, accurate construction estimate for the following project:

**Project Type:** ${projectType.replace('_', ' ')}
**Location:** ${location}
${squareFootage ? `**Size:** ${squareFootage} square feet` : ''}
**Quality Level:** ${qualityLevel}
${clientBudget ? `**Client Budget:** $${clientBudget}` : ''}

**Project Description:**
${description}

${langInstruction}

Generate a comprehensive estimate with the following JSON structure:

{
  "lineItems": [
    {
      "category": "demolition | materials | labor | equipment | permits | disposal | contingency",
      "description": "Detailed description of the line item",
      "quantity": number,
      "unit": "sf | lf | ea | hr | day | cy | ton | gal",
      "unitPrice": number,
      "total": number,
      "notes": "Optional notes or specifications"
    }
  ],
  "estimatedDurationDays": number,
  "confidenceScore": number (0-100),
  "assumptions": ["list of assumptions made"],
  "recommendations": ["list of recommendations"],
  "alternativeOptions": [
    {
      "description": "Alternative approach description",
      "priceDifference": number (+ or -),
      "impact": "Description of impact"
    }
  ]
}

Guidelines:
1. Include all necessary categories: demolition, materials, labor, equipment, permits, disposal, and contingency (typically 10%)
2. Break down materials into specific items with realistic quantities and prices
3. Calculate labor hours based on typical crew sizes and productivity rates
4. Use location-specific pricing for ${location}
5. Adjust pricing for ${qualityLevel} quality level
6. Be comprehensive but realistic
7. Include only the JSON response, no additional text

Respond ONLY with valid JSON.`;

    // Use prioritized AI provider via shared client
    const { getAICompletion } = await import('../_shared/aiProviderClient.ts');

    // Set a longer timeout for estimate generation (it's complex)
    const aiResponse = await getAICompletion({
      prompt,
      systemMessage: `You are an expert construction estimator. Respond ONLY with valid JSON. ${langInstruction}`,
      maxTokens: 4096,
      temperature: 0.7,
      language,
    });

    // Parse JSON response
    let estimateData;
    try {
      // Clean up response if it contains markdown code blocks
      const cleanContent = aiResponse.content.replace(/```json\n?|\n?```/g, '').trim();
      estimateData = JSON.parse(cleanContent);
    } catch (_parseError) {
      console.error('Failed to parse AI response:', aiResponse.content);
      throw new Error('AI returned invalid JSON format');
    }

    // Add IDs to line items
    const lineItemsWithIds = estimateData.lineItems.map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
    }));

    const result = {
      ...estimateData,
      lineItems: lineItemsWithIds,
    };

    await cacheInsight(supabaseClient, {
      insightType: 'generate-construction-estimate',
      domain: 'estimates',
      title: 'Construction Estimate',
      content: result,
      confidenceLevel: estimateData.confidenceScore ?? 80,
      projectId: projectId ?? undefined,
      userId: user.id,
      promptVersion,
      ttlHours: 24,
    });

    // Log usage for tracking (optional)
    try {
      await supabaseClient.from('ai_usage_logs').insert({
        user_id: user.id,
        feature: 'estimate_generation',
        model: aiResponse.model,
        tokens_input: 0,
        tokens_output: aiResponse.tokensUsed || 0,
        success: true,
      });
    } catch (logError) {
      console.error('Failed to log usage:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({
        ...result,
        cached: false,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error generating estimate:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';

    if (
      message === 'Unauthorized' ||
      message.includes('Access denied') ||
      message.includes('Administrator')
    ) {
      return unauthorizedResponse(message);
    }

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
