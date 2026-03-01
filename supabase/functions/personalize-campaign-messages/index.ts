import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/authorization.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PersonalizationRequest {
  campaign_id: string;
  recipient_ids?: string[]; // If not provided, personalize all pending
}

interface PersonalizationResponse {
  success: boolean;
  personalized_count: number;
  failed_count: number;
  errors?: Array<{
    recipient_id: string;
    error: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user (service role or authenticated user)
    const authHeader = req.headers.get('authorization');
    const isServiceRole = authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY);

    if (!isServiceRole) {
      await authenticateRequest(req);
    }

    // Check API key
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Parse request
    const requestData: PersonalizationRequest = await req.json();
    const { campaign_id, recipient_ids } = requestData;

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    console.log(`Personalizing messages for campaign ${campaign_id}`);

    const _startTime = Date.now();

    // Initialize Supabase client
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('outbound_campaigns')
      .select('id, name, message_template, company_name, user_id')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaign_id}`);
    }

    if (!campaign.message_template) {
      throw new Error('Campaign has no message template');
    }

    // Get recipients to personalize
    let recipientsQuery = supabaseClient
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending');

    if (recipient_ids && recipient_ids.length > 0) {
      recipientsQuery = recipientsQuery.in('id', recipient_ids);
    }

    const { data: recipients, error: recipientsError } = await recipientsQuery;

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          personalized_count: 0,
          failed_count: 0,
        } as PersonalizationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Found ${recipients.length} recipients to personalize`);

    // Personalize each recipient's message
    const errors: Array<{ recipient_id: string; error: string }> = [];
    let personalizedCount = 0;

    for (const recipient of recipients) {
      try {
        // Update status to personalizing
        await supabaseClient
          .from('campaign_recipients')
          .update({ status: 'personalizing', updated_at: new Date().toISOString() })
          .eq('id', recipient.id);

        // Gather context for personalization
        const context = await gatherPersonalizationContext(
          supabaseClient,
          recipient,
          campaign.user_id
        );

        // Generate personalized message using Claude
        const personalizedMessage = await generatePersonalizedMessage(
          campaign.message_template,
          campaign.company_name || 'Our Company',
          context
        );

        // Update recipient with personalized message
        await supabaseClient
          .from('campaign_recipients')
          .update({
            personalized_message: personalizedMessage,
            personalization_context: context,
            status: 'pending', // Back to pending, ready to send
            personalized_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', recipient.id);

        personalizedCount++;

        // Log success
        await supabaseClient
          .from('campaign_logs')
          .insert({
            campaign_id: campaign.id,
            recipient_id: recipient.id,
            log_level: 'success',
            event_type: 'message_personalized',
            message: `Message personalized for ${recipient.contact_name}`,
            metadata: { contact_type: recipient.contact_type },
          });

      } catch (error) {
        console.error(`Failed to personalize for recipient ${recipient.id}:`, error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ recipient_id: recipient.id, error: errorMessage });

        // Update recipient status to failed
        await supabaseClient
          .from('campaign_recipients')
          .update({
            status: 'failed',
            error_message: errorMessage,
            failed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', recipient.id);

        // Log error
        await supabaseClient
          .from('campaign_logs')
          .insert({
            campaign_id: campaign.id,
            recipient_id: recipient.id,
            log_level: 'error',
            event_type: 'personalization_failed',
            message: `Failed to personalize message for ${recipient.contact_name}`,
            metadata: { error: errorMessage },
          });
      }
    }

    console.log(`Personalization completed: ${personalizedCount} succeeded, ${errors.length} failed`);

    const response: PersonalizationResponse = {
      success: true,
      personalized_count: personalizedCount,
      failed_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Personalization error:', error);

    const errorResponse: PersonalizationResponse = {
      success: false,
      personalized_count: 0,
      failed_count: 0,
      errors: [{ recipient_id: 'N/A', error: error instanceof Error ? error.message : 'Unknown error' }],
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to gather context for personalization
async function gatherPersonalizationContext(
  supabaseClient: any,
  recipient: any,
  userId: string
): Promise<any> {
  const context: any = {
    contactName: recipient.contact_name,
    contactType: recipient.contact_type,
    isVip: recipient.is_vip,
  };

  // Fetch past projects based on contact type
  try {
    if (recipient.contact_type === 'client') {
      // Get projects for this client
      const { data: projects } = await supabaseClient
        .from('projects')
        .select('id, name, completed_at, estimated_cost, location')
        .eq('client_id', recipient.contact_id)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false, nullsFirst: false })
        .limit(3);

      if (projects && projects.length > 0) {
        context.pastProjects = projects.map((p: any) => ({
          id: p.id,
          name: p.name,
          completedAt: p.completed_at,
          value: p.estimated_cost,
          location: p.location,
        }));
        context.totalProjectsCount = projects.length;
      }
    } else if (recipient.contact_type === 'supplier') {
      // Count purchase orders with this supplier
      const { count } = await supabaseClient
        .from('purchase_orders')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', recipient.contact_id);

      if (count && count > 0) {
        context.totalProjectsCount = count;
      }
    } else if (recipient.contact_type === 'contractor') {
      // This would require additional tables linking contractors to projects
      // For now, we'll just note they're a contractor
      context.totalProjectsCount = 0;
    }
  } catch (error) {
    console.error('Error gathering context:', error);
    // Continue without context rather than failing
  }

  return context;
}

// Helper function to generate personalized message using Claude
async function generatePersonalizedMessage(
  template: string,
  companyName: string,
  context: any
): Promise<string> {
  const systemPrompt = `You are a professional construction company representative writing personalized WhatsApp messages to business contacts. Your goal is to:

1. Create a warm, professional, and genuine message
2. Reference past collaborations when available to make it personal
3. Politely ask if they have any upcoming projects where the company can help
4. End with gratitude and a friendly sign-off

Keep the message concise (under 200 words), conversational, and suitable for WhatsApp.`;

  const userPrompt = `Create a personalized WhatsApp message for the following contact:

Contact Name: ${context.contactName}
Contact Type: ${context.contactType}
VIP Status: ${context.isVip ? 'Yes' : 'No'}
Company Name: ${companyName}

${context.pastProjects && context.pastProjects.length > 0 ? `
Past Projects:
${context.pastProjects.map((p: any, i: number) => `
${i + 1}. ${p.name}${p.location ? ` in ${p.location}` : ''}${p.completedAt ? ` (completed ${new Date(p.completedAt).getFullYear()})` : ''}
`).join('')}
` : context.totalProjectsCount > 0 ? `
We've worked together on ${context.totalProjectsCount} project(s).
` : 'This is a new contact - no past collaboration history.'}

Message Template (use this as a guide, but personalize it):
${template}

Requirements:
- Use the contact's name naturally
- If past projects exist, reference at least one specifically
- Ask about upcoming projects in a friendly, non-pushy way
- Thank them for working with ${companyName}
- End with "Talk to you soon" or similar friendly closing
- Keep it under 200 words
- Write in a conversational tone suitable for WhatsApp

Generate the personalized message now:`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', errorText);
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.content || !data.content[0] || !data.content[0].text) {
    throw new Error('Invalid response from Claude API');
  }

  return data.content[0].text.trim();
}
