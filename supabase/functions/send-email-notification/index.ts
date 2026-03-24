import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import DOMPurify from "https://esm.sh/isomorphic-dompurify@2.9.0";
import { authenticateRequest, createServiceRoleClient, verifyAdminRole, verifyProjectAdminAccess } from "../_shared/authorization.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { sendEmailViaHostinger } from "../_shared/providers/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const emailSchema = z.object({
  recipientEmail: z.string().email().max(255),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(50000),
  projectId: z.string().uuid().optional(),
  notificationType: z.string().max(50).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    // Validate input
    const validated = emailSchema.parse(requestData);
    const { recipientEmail, subject, projectId, notificationType } = validated;

    const { user } = await authenticateRequest(req);
    const supabaseClient = createServiceRoleClient();

    if (projectId) {
      await verifyProjectAdminAccess(user.id, projectId, supabaseClient);
    } else {
      await verifyAdminRole(user.id, supabaseClient);
    }
    
    // Sanitize HTML body to prevent XSS
    const sanitizedBody = DOMPurify.sanitize(validated.body, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'div', 'span'],
      ALLOWED_ATTR: ['href', 'style', 'target']
    });

    console.log(`Sending email notification to ${recipientEmail}`);

    // Check if email integration is enabled
    const { data: integrationSettings } = await supabaseClient
      .from('integration_settings')
      .select('*')
      .eq('integration_type', 'email')
      .single();

    if (!integrationSettings?.is_enabled) {
      throw new Error('Email integration is not enabled');
    }

    const hostingerFromEmail = Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
      ?? Deno.env.get('HOSTINGER_SMTP_USER');
    if (!hostingerFromEmail) {
      throw new Error('Hostinger SMTP not configured');
    }

    // Get company settings for sender info
    const { data: companySettings } = await supabaseClient
      .from('company_settings')
      .select('*')
      .single();

    const senderName = companySettings?.company_name || 'Construction Management';
    const senderEmail = companySettings?.email || hostingerFromEmail;

    // Create notification record
    const { data: notification, error: notificationError } = await supabaseClient
      .from('email_notifications')
      .insert({
        project_id: projectId,
        recipient_email: recipientEmail,
        subject,
        body: sanitizedBody,
        notification_type: notificationType,
        status: 'pending',
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    try {
      const result = await sendEmailViaHostinger({
        fromEmail: hostingerFromEmail,
        fromName: senderName,
        html: sanitizedBody,
        replyTo: senderEmail,
        subject,
        to: [recipientEmail],
      });
      console.log('Email sent successfully:', result);

      // Update notification status
      await supabaseClient
        .from('email_notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

      return new Response(
        JSON.stringify({ success: true, notificationId: notification.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (emailError) {
      console.error('Email sending error:', emailError);

      // Update notification with error
      await supabaseClient
        .from('email_notifications')
        .update({
          status: 'failed',
          error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
        })
        .eq('id', notification.id);

      throw emailError;
    }
  } catch (error) {
    return createErrorResponse(error, corsHeaders);
  }
});
