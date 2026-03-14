import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { authenticateRequest } from "../_shared/authorization.ts";
import { sendEmailViaHostinger } from "../_shared/providers/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const distributeFormSchema = z.object({
  formId: z.string().uuid(),
  channel: z.enum(['email', 'qr']),
  recipients: z.array(z.string().email()).optional(),
  message: z.string().optional(),
  batchSize: z.number().min(1).max(100).optional().default(50),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user } = await authenticateRequest(req);
    const requestData = await req.json();
    const validated = distributeFormSchema.parse(requestData);
    const { formId, channel, recipients, message, batchSize } = validated;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch form
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*, project:projects(id, name)')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return new Response(
        JSON.stringify({ success: false, error: 'Form not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to form
    const { data: hasAccess } = await supabase.rpc('has_form_access', {
      p_user_id: user.id,
      p_form_id: formId,
      p_min_level: 'editor',
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure form is published
    if (form.status !== 'published') {
      return new Response(
        JSON.stringify({ success: false, error: 'Form must be published before distribution' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formUrl = `${SUPABASE_URL.replace('/rest/v1', '')}/form/${form.share_token}`;

    // Handle QR code generation
    if (channel === 'qr') {
      // Generate QR code using external API
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(formUrl)}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          channel: 'qr',
          qrCodeUrl: qrApiUrl,
          formUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle email distribution
    if (channel === 'email') {
      if (!recipients || recipients.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Recipients required for email distribution' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const hostingerFromEmail = Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
        ?? Deno.env.get('HOSTINGER_SMTP_USER');
      if (!hostingerFromEmail) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const projectName = (form.project as any)?.name || 'Project';
      const customMessage = message || 'You have been invited to complete a form.';

      // Generate email content
      const emailHtml = generateFormInviteEmail(
        form.title,
        form.description || '',
        projectName,
        customMessage,
        formUrl
      );

      const results = [];
      let sentCount = 0;
      let failedCount = 0;

      // Send emails in batches
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        for (const recipient of batch) {
          try {
            await sendEmailViaHostinger({
              fromEmail: hostingerFromEmail,
              fromName: 'CastorWorks Forms',
              html: emailHtml,
              subject: `Form Invitation: ${form.title}`,
              to: [recipient],
            });
            sentCount++;
            results.push({ recipient, status: 'sent' });
          } catch (error) {
            failedCount++;
            results.push({
              recipient,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Small delay between batches to avoid rate limits
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Log distribution activity
      await supabase.from('activity_logs').insert({
        project_id: form.project_id,
        activity_type: 'form_distributed',
        title: `Form "${form.title}" distributed`,
        description: `Sent to ${sentCount} recipients via email`,
      });

      return new Response(
        JSON.stringify({
          success: true,
          channel: 'email',
          sentCount,
          failedCount,
          totalRecipients: recipients.length,
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid channel' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error distributing form:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFormInviteEmail(
  formTitle: string,
  formDescription: string,
  projectName: string,
  customMessage: string,
  formUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .project-badge {
          display: inline-block;
          background-color: #dbeafe;
          color: #1e40af;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 20px;
        }
        .form-title {
          font-size: 24px;
          font-weight: 600;
          color: #18181b;
          margin: 0 0 12px 0;
        }
        .form-description {
          color: #71717a;
          margin: 0 0 30px 0;
        }
        .message {
          background-color: #f9fafb;
          border-left: 4px solid #3b82f6;
          padding: 16px 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .footer {
          background-color: #fafafa;
          padding: 24px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 4px 0;
          color: #71717a;
          font-size: 14px;
        }
        .link {
          color: #3b82f6;
          text-decoration: none;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Form Invitation</h1>
        </div>
        
        <div class="content">
          <div class="project-badge">🏗️ ${projectName}</div>
          
          <h2 class="form-title">${formTitle}</h2>
          
          ${formDescription ? `<p class="form-description">${formDescription}</p>` : ''}
          
          <div class="message">
            <p style="margin: 0;">${customMessage}</p>
          </div>
          
          <p>Click the button below to complete the form:</p>
          
          <center>
            <a href="${formUrl}" class="cta-button">
              Open Form →
            </a>
          </center>
          
          <p style="margin-top: 30px; font-size: 14px; color: #71717a;">
            Or copy this link:<br>
            <a href="${formUrl}" class="link">${formUrl}</a>
          </p>
        </div>
        
        <div class="footer">
          <p>Powered by CastorWorks</p>
          <p style="font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
