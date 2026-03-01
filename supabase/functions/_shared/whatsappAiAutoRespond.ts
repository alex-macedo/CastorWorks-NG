/**
 * WA-8.1: CastorMind AI Auto-Responder for WhatsApp
 *
 * Answers incoming WhatsApp queries based on project data.
 * Requires: integration_settings.ai_auto_responder_enabled for whatsapp,
 * WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN for sending.
 */

import { getAICompletion } from './aiProviderClient.ts'
import { WhatsAppClient } from './whatsapp-client.ts'

export interface AiAutoRespondInput {
  fromPhone: string;
  text: string;
  phoneNumberId?: string;
}

export interface AiAutoRespondResult {
  sent: boolean
  error?: string
  provider?: string
  model?: string
}

interface ProjectContext {
  name: string
  status: string
  schedule_status?: string
  total_area: string | null
  manager: string | null
  client_name?: string | null
  budget: string | null
  location?: string | null
}

/**
 * Handle AI auto-response for incoming WhatsApp message
 */
export async function handleAiAutoRespond(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  input: AiAutoRespondInput
): Promise<AiAutoRespondResult> {
  try {
    // Check if AI auto-responder is enabled
    const { data: integration } = await supabase
      .from('integration_settings')
      .select('is_enabled, configuration')
      .eq('integration_type', 'whatsapp')
      .single();

    const config = integration?.configuration as Record<string, unknown> | null;
    const aiEnabled = config?.ai_auto_responder_enabled === true;
    const whatsappEnabled = integration?.is_enabled === true;

    if (!whatsappEnabled || !aiEnabled) {
      return { sent: false };
    }

    const trimmedText = input.text.trim();
    if (trimmedText.length < 2) {
      return { sent: false };
    }

    // Respect opt-out: do not send if user has opted out (compliance)
    const phoneE164 = input.fromPhone.startsWith('+')
      ? input.fromPhone
      : `+${input.fromPhone.replace(/\D/g, '').replace(/^0/, '')}`;
    const { data: optIn } = await supabase
      .from('whatsapp_opt_ins')
      .select('opted_in')
      .eq('phone_number', phoneE164)
      .maybeSingle();
    if (optIn && optIn.opted_in === false) {
      return { sent: false };
    }

    const projectContext = await resolveProjectContext(supabase, input.fromPhone)
    const projectData = projectContext?.projectData ?? null

    const statusDisplay = projectData ? (projectData.schedule_status ?? projectData.status) : 'N/A'
    const contextBlock = projectData
      ? `
## Project Context (live data)
- Project: ${projectData.name}
- Status: ${statusDisplay}
- Location: ${projectData.location ?? 'N/A'}
- Area: ${projectData.total_area ?? 'N/A'} m²
- Manager: ${projectData.manager ?? 'N/A'}
- Client: ${projectData.client_name ?? 'N/A'}
- Budget: ${projectData.budget ?? 'N/A'}
`
      : `
## Project Context
No project linked to this phone number. Respond helpfully and suggest they contact their project manager or specify which project they're asking about.
`;

    const systemMessage = `You are CastorMind AI, the assistant for CastorWorks construction project management. You answer incoming WhatsApp queries from clients and team members.

${contextBlock}

Guidelines:
- Be concise and professional (WhatsApp message length)
- Answer based on the project data above when available
- If no project data: politely offer to help once the contact is linked to a project
- Respond in the same language the user writes in
- Do not make up project details`;

    const prompt = `Incoming WhatsApp query from contact:\n\n"${trimmedText}"\n\nProvide a helpful, data-driven response (max ~500 chars).`;

    const response = await getAICompletion({
      prompt,
      systemMessage,
      insightType: 'whatsapp-auto-responder',
      maxTokens: 400,
      temperature: 0.3,
    })

    const replyText = (response.content || '').trim()
    if (!replyText) return { sent: false }

    const phoneId = input.phoneNumberId ?? Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    if (!phoneId || !accessToken) {
      return { sent: false, error: 'WhatsApp credentials not configured' }
    }
    const client = new WhatsAppClient({ phoneNumberId: phoneId, accessToken })
    await client.sendTextMessage({ to: phoneE164, message: replyText })

    // Log successful AI response for auditing
    try {
      await supabase.from('whatsapp_ai_auto_responder_logs').insert({
        phone_number: phoneE164,
        project_id: projectContext?.projectId ?? null,
        incoming_message: trimmedText,
        ai_response: replyText,
        provider: response.provider,
        model: response.model,
      })
    } catch (_logErr) {
      // Log table may not exist yet; ignore
    }

    return { sent: true, provider: response.provider, model: response.model }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Log failed attempt for debugging
    try {
      const phoneE164 = input.fromPhone.startsWith('+')
        ? input.fromPhone
        : `+${input.fromPhone.replace(/\D/g, '').replace(/^0/, '')}`;
      await supabase.from('whatsapp_ai_auto_responder_logs').insert({
        phone_number: phoneE164,
        project_id: null,
        incoming_message: input.text?.trim() || '',
        ai_response: null,
        provider: null,
        model: null,
        error_message: msg,
      });
    } catch (_logErr) {
      // ignore
    }
    return { sent: false, error: msg };
  }
}

/**
 * Resolve project context from sender phone number.
 * Tries whatsapp_contacts first, then evolution_contacts.
 */
async function resolveProjectContext(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  fromPhone: string
): Promise<{ projectId: string; projectData: ProjectContext } | null> {
  const digitsOnly = fromPhone.replace(/\D/g, '')

  let projectId: string | null = null

  try {
    const { data: waContacts } = await supabase
      .from('whatsapp_contacts')
      .select('project_id, phone_number')
      .not('project_id', 'is', null)
    const waMatch = (waContacts ?? []).find((c: { phone_number?: string }) => {
      const cDigits = (c.phone_number ?? '').replace(/\D/g, '')
      return cDigits === digitsOnly
    })
    if (waMatch?.project_id) projectId = waMatch.project_id
  } catch {
    // whatsapp_contacts may not exist
  }

  if (!projectId) {
    try {
      const { data: evoList } = await supabase
        .from('evolution_contacts')
        .select('project_id, phone_number')
        .not('project_id', 'is', null)
      const evoMatch = (evoList ?? []).find((c: { phone_number?: string }) => {
        const cDigits = (c.phone_number ?? '').replace(/\D/g, '')
        return cDigits === digitsOnly
      })
      if (evoMatch?.project_id) projectId = evoMatch.project_id
    } catch {
      // evolution_contacts may not exist
    }
  }

  if (!projectId) return null

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, schedule_status, total_area, total_gross_floor_area, budget_total, estimated_cost, manager_id, client_name, location')
    .eq('id', projectId)
    .single();

  if (!project) return null;

  let manager: string | null = null;
  if (project.manager_id) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', project.manager_id)
      .single();
    manager = profile?.display_name ?? null;
  }

  const area = project.total_area ?? project.total_gross_floor_area;
  const budget = project.budget_total ?? project.estimated_cost;

  return {
    projectId,
    projectData: {
      name: project.name ?? 'Unknown',
      status: project.status ?? 'N/A',
      schedule_status: project.schedule_status ?? undefined,
      total_area: typeof area === 'number' ? String(area) : (area ?? null),
      manager,
      client_name: project.client_name ?? null,
      budget: budget != null ? String(budget) : null,
      location: project.location ?? null,
    },
  }
}
