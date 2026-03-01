import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { authenticateRequest, createServiceRoleClient, verifyAdminRole, verifyProjectAdminAccess } from "../_shared/authorization.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { sendWhatsAppViaTwilio } from "../_shared/providers/twilio.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const whatsappSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)'),
  message: z.string().trim().max(1600, 'Message too long (max 1600 characters)').optional(),
  projectId: z.string().uuid().optional(),
  /** Twilio Content Template SID - when provided, uses template instead of message body */
  contentSid: z.string().optional(),
  /** Template variables - e.g. {"1":"12/1","2":"3pm"} */
  contentVariables: z.record(z.string()).optional(),
}).refine(
  (data) => (typeof data.message === 'string' && data.message.length > 0) || (typeof data.contentSid === 'string' && data.contentSid.length > 0),
  { message: 'Either message (non-empty) or contentSid must be provided' }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();

    // Validate input
    const parsed = whatsappSchema.parse(requestData);
    const { phoneNumber, message, projectId, contentSid, contentVariables } = parsed;

    const { user } = await authenticateRequest(req);
    const supabaseClient = createServiceRoleClient();

    if (projectId) {
      await verifyProjectAdminAccess(user.id, projectId, supabaseClient);
    } else {
      await verifyAdminRole(user.id, supabaseClient);
    }

    const useTemplate = !!contentSid;
    console.log(`Sending WhatsApp notification to ${phoneNumber} (${useTemplate ? 'template' : 'freeform'})`);

    // Check if WhatsApp integration is enabled
    const { data: integrationSettings } = await supabaseClient
      .from('integration_settings')
      .select('*')
      .eq('integration_type', 'whatsapp')
      .single();

    if (!integrationSettings?.is_enabled) {
      throw new Error('WhatsApp integration is not enabled');
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      throw new Error('Twilio credentials not configured');
    }

    // Template: use contentSid from request, or env default when message is empty
    const effectiveContentSid = contentSid || (message ? undefined : Deno.env.get('TWILIO_WHATSAPP_CONTENT_SID'));

    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    const result = await sendWhatsAppViaTwilio(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_FROM,
      formattedPhone,
      message ?? '', // Required param; ignored when using template
      effectiveContentSid
        ? { contentSid: effectiveContentSid, contentVariables: contentVariables ?? {} }
        : undefined
    );

    if (!result.ok) {
      const errMsg = result.data?.message || JSON.stringify(result.data);
      throw new Error(`WhatsApp sending failed: ${errMsg}`);
    }

    console.log('WhatsApp message sent successfully:', result.data?.sid);

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: result.data?.sid,
        status: result.data?.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders);
  }
});
