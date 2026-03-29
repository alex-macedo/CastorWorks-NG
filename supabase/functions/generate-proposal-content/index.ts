import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest, createServiceRoleClient, verifyProjectAccess } from '../_shared/authorization.ts';
import { getAICompletion } from '../_shared/aiProviderClient.ts';
import { getCachedInsight, cacheInsight } from '../_shared/aiCache.ts';
import { consumeAIActions } from '../_shared/ai-metering.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Helper function to validate UUID format
const isValidUUID = (id: string | undefined): boolean => {
  if (!id || typeof id !== 'string') return false;
  // Reject the literal string "undefined"
  if (id === 'undefined' || id === 'null' || id === '') return false;
  return UUID_REGEX.test(id);
};

const unauthorizedResponse = (message: string) =>
  new Response(
    JSON.stringify({ success: false, error: message }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    }
  );

interface ProposalContentRequest {
  estimateId?: string;
  briefingId?: string;
  projectId?: string;
  sections: string[];
  tone?: string;
  language?: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';
  companyInfo?: {
    name: string;
    phone?: string;
    email?: string;
  };
  forceRefresh?: boolean;
}

function buildProposalCacheKey(
  estimateId: string | undefined,
  briefingId: string | undefined,
  projectId: string | undefined,
  sections: string[],
  language: string,
  tone: string
): string {
  const sourceId = estimateId || briefingId || projectId || 'none';
  const sectionsKey = [...sections].sort().join(',');
  return `${sourceId}:${sectionsKey}:${language}:${tone}`.slice(0, 50);
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
    let token;
    try {
      ({ user, token } = await authenticateRequest(req));
    } catch (_authError) {
      return unauthorizedResponse('Unauthorized');
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
    const serviceClient = createServiceRoleClient();

    // Parse request
    const requestData: ProposalContentRequest = await req.json();
    const {
      estimateId,
      briefingId,
      projectId,
      sections,
      tone = 'professional',
      companyInfo,
      language = 'en-US',
      forceRefresh,
    } = requestData;

    // Fetch estimate details if provided
    let estimate = null;
    if (isValidUUID(estimateId)) {
      const { data: estimateData, error: estimateError } = await supabaseClient
        .from('estimates')
        .select('*, clients(name, email)')
        .eq('id', estimateId)
        .single();

      if (estimateError) {
        throw new Error(`Failed to fetch estimate: ${estimateError.message}`);
      }
      estimate = estimateData;
    }

    // Fetch briefing details if provided (architect-specific)
    let briefing = null;
    if (isValidUUID(briefingId)) {
      const { data: briefingData, error: briefingError } = await supabaseClient
        .from('architect_briefings')
        .select('*')
        .eq('id', briefingId)
        .single();

      if (briefingError) {
        console.warn('Failed to fetch briefing:', briefingError.message);
      } else {
        briefing = briefingData;
      }
    }

    // Fetch project details if provided
    let project = null;
    if (isValidUUID(projectId)) {
      const { data: projectData, error: projectError } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.warn('Failed to fetch project:', projectError.message);
      } else {
        project = projectData;
      }
    }

    // Verify project access
    const targetProjectId = estimate?.project_id || briefing?.project_id || projectId;
    if (targetProjectId) {
      try {
        await verifyProjectAccess(user.id, targetProjectId, serviceClient);
      } catch (accessError) {
        const message = accessError instanceof Error ? accessError.message : 'Access denied';
        return unauthorizedResponse(message);
      }
    }

    // AI Metering: consume credits before AI calls (10 actions per generate-proposal-content call)
    const tenantId = user.app_metadata?.tenant_id as string | undefined ?? '';
    const metering = await consumeAIActions({
      tenantId,
      feature: 'generate-proposal-content',
      actions: 10,
      userId: user.id,
      modelUsed: 'anthropic',
    });

    const cacheKey = buildProposalCacheKey(
      estimateId,
      briefingId,
      projectId,
      sections,
      language,
      tone
    );

    if (!forceRefresh) {
      const cached = await getCachedInsight(
        serviceClient,
        'generate-proposal-content',
        'proposals',
        targetProjectId ?? undefined,
        user.id,
        { promptVersion: cacheKey }
      );
      if (cached && typeof cached.content === 'object' && cached.content !== null) {
        const cachedSections = cached.content as Record<string, string>;
        if (Object.keys(cachedSections).length > 0) {
          console.log('✅ Returning cached proposal content for', cacheKey);
          return new Response(
            JSON.stringify({
              success: true,
              sections: cachedSections,
              cached: true,
              generatedAt: cached.generated_at,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Generate content for each section
    const generatedContent: Record<string, string> = {};

    // Language-specific instructions
    const languageInstructions: Record<string, string> = {
      'pt-BR': 'Escreva em Português do Brasil. Seja específico, preciso e relevante para o projeto.',
      'en-US': 'Write in English (US). Be specific, accurate, and relevant to the project.',
      'es-ES': 'Escriba en Español. Sea específico, preciso y relevante para el proyecto.',
      'fr-FR': 'Écrivez en Français. Soyez spécifique, précis et pertinent pour le projet.',
    };

    for (const section of sections) {
      let prompt = '';

      switch (section) {
        case 'cover_letter':
          prompt = `Write a ${tone} cover letter for a construction proposal.
 
Client: ${estimate?.clients?.name || (briefing?.client_name || 'Client')}
Project: ${project?.description || project?.name || estimate?.description || estimate?.name || 'Project'}
${estimate ? `Total Investment: $${estimate.total?.toFixed(2)}` : ''}
Company: ${companyInfo?.name || 'Your Company'}
 
Keep it concise (2-3 paragraphs), professional, and highlight the value you'll deliver. Express enthusiasm for the project and confidence in your team's ability to execute it successfully.`;
          break;

        case 'scope_of_work':
          if (!estimate?.line_items) {
            prompt = `Write a detailed scope of work for this project:
${project?.description || 'No specific project details provided'}
 
Format as clear, numbered items describing what will be done. Be specific about deliverables, materials, and workmanship standards. Use professional construction terminology.`;
          } else {
            prompt = `Write a detailed scope of work based on these line items:
${JSON.stringify(estimate.line_items, null, 2)}
 
Format as clear, numbered items describing what will be done. Be specific about deliverables, materials, and workmanship standards. Use professional construction terminology.`;
          }
          break;

        case 'exclusions':
          prompt = `Based on this construction project scope:
${estimate.description || estimate.name}

List 5-8 common exclusions that are typically not covered in this type of project. Format as bullet points. Be specific and clear about what is NOT included to manage client expectations.`;
          break;

        case 'payment_terms':
          prompt = `Suggest payment terms for a ${estimate ? `$${estimate.total?.toFixed(2)} ` : ''}construction project.
 
Include:
- Deposit percentage and amount
- Progress payment milestones (tied to project stages)
- Final payment upon completion
- Payment methods accepted
- Late payment terms
 
Be specific with percentages and timing. Format clearly with sections.`;
          break;

        case 'timeline':
          prompt = `Create a project timeline for this construction work:
${estimate.description || estimate.name}

Include:
- Estimated start date (assume 2 weeks from proposal acceptance)
- Key milestones and their durations
- Estimated completion date
- Factors that could affect timing

Be realistic and specific. Format as a clear schedule.`;
          break;

        case 'warranty':
          prompt = `Write standard warranty terms for construction work.

Include:
- Workmanship warranty (typically 1-2 years)
- Material warranties (manufacturer warranties)
- What is covered vs. not covered
- How to make warranty claims
- Warranty transfer conditions

Be comprehensive but clear. Format with clear sections.`;
          break;

        case 'terms_and_conditions':
          prompt = `Write standard terms and conditions for a construction proposal.

Include:
- Change order procedures
- Site access requirements
- Permits and inspections
- Insurance and liability
- Termination clauses
- Dispute resolution

Keep it professional and fair to both parties. Format with numbered sections.`;
          break;

        // Architect-specific sections
        case 'design_philosophy':
          prompt = `Write a design philosophy section for an architect proposal.

${briefing ? `Client preferences: ${briefing.style_preferences || 'Not specified'}
Project type: ${briefing.project_type || 'Not specified'}
Design style: ${briefing.design_style || 'Not specified'}
Sustainability focus: ${briefing.sustainability_focus || 'Not specified'}` : 'No briefing data provided'}

${project ? `Project: ${project.name}
Description: ${project.description || 'Not specified'}` : ''}

Write a compelling design philosophy that:
- Reflects the client's preferences and project vision
- Emphasizes functionality, aesthetics, and sustainability
- Demonstrates understanding of the project type
- Conveys the architect's unique approach and values

Keep it inspiring yet professional (2-3 paragraphs).`;
          break;

        case 'project_methodology':
          prompt = `Write a project methodology section for an architect proposal.

Describe the standard architect workflow phases:
1. Concept Design
2. Schematic Design
3. Design Development
4. Construction Documents
5. Bidding/Negotiation
6. Construction Administration

For each phase, include:
- Key deliverables
- Client involvement points
- Approximate timeline (as percentages)
- Decision milestones

${project ? `Project: ${project.name}
Type: ${project.project_type || 'Not specified'}` : ''}

Format as a clear, structured process that clients can understand.`;
          break;

        case 'fee_structure':
          prompt = `Write a fee structure section for an architect proposal.
 
${briefing ? `Project area: ${briefing.area_sqm || 'Not specified'} m²
Budget range: ${briefing.budget_range || 'Not specified'}
Complexity: ${briefing.complexity || 'Not specified'}
Project type: ${briefing.project_type || 'Not specified'}` : ''}
 
${estimate ? `Total estimate: $${estimate.total?.toFixed(2)}` : ''}
 
Include:
- Fee calculation method (percentage of construction cost, fixed fee, or hourly)
- Breakdown by project phase with percentages
- Additional fees (reimbursable expenses, permit fees, etc.)
- Payment schedule tied to project phases
- Terms for additional services or scope changes
 
Be transparent and professional. Format with clear sections.`;
          break;

        case 'sustainability_approach':
          prompt = `Write a sustainability approach section for an architect proposal.

${briefing ? `Sustainability focus: ${briefing.sustainability_focus || 'Not specified'}
Green building certifications: ${briefing.green_certifications || 'Not specified'}
Energy efficiency goals: ${briefing.energy_efficiency || 'Not specified'}` : ''}

${project ? `Project type: ${project.project_type || 'Not specified'}` : ''}

Include:
- Overall sustainability philosophy
- Specific strategies for:
  * Energy efficiency
  * Water conservation
  * Material selection (local, recycled, low-VOC)
  * Indoor environmental quality
  * Site impact minimization
- Potential green building certifications (LEED, BREEAM, etc.)
- Long-term operational benefits for the client

Be specific and actionable. Format with clear subsections.`;
          break;

        default:
          throw new Error(`Unknown section: ${section}`);
      }

      const aiResponse = await getAICompletion({
        prompt,
        systemMessage: `You are a professional proposal writer for construction and architecture firms. ${languageInstructions[language] || languageInstructions['en-US']} Write in a ${tone} tone. Be specific, accurate, and relevant to the project. Format your response in plain text that can be directly used in a proposal document.`,
        maxTokens: 1500,
        temperature: 0.7,
        preferredProvider: metering.degraded ? 'openrouter' : undefined,
      });

      generatedContent[section] = aiResponse.content;

      // Track AI usage
      await serviceClient.from('ai_usage').insert({
        user_id: user.id,
        feature: 'proposal_generation',
        model: aiResponse.model,
        input_tokens: 0,
        output_tokens: aiResponse.tokensUsed || 0,
        cost_usd: 0, // Costs vary by provider, handled by usage tracker later
        metadata: {
          section,
          estimateId,
          provider: aiResponse.provider,
        },
      });
    }

    await cacheInsight(serviceClient, {
      insightType: 'generate-proposal-content',
      domain: 'proposals',
      title: 'Proposal Content',
      content: generatedContent,
      confidenceLevel: 85,
      projectId: targetProjectId ?? undefined,
      userId: user.id,
      promptVersion: cacheKey,
      ttlHours: 24,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sections: generatedContent,
        cached: false,
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating proposal content:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const isUnauthorized =
      message === 'Unauthorized' ||
      message.includes('Access denied') ||
      message.includes('Administrator');

    if (isUnauthorized) {
      return unauthorizedResponse(message);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
