import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format } from 'https://esm.sh/date-fns@3.0.0';
import { sendEmailViaHostinger } from '../_shared/providers/index.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendProposalEmailRequest {
  proposalId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const hostingerFromEmail = Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
      ?? Deno.env.get('HOSTINGER_SMTP_USER');
    if (!hostingerFromEmail) {
      throw new Error('Hostinger SMTP not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request
    const requestData: SendProposalEmailRequest = await req.json();
    const { proposalId } = requestData;

    // Fetch proposal with estimate and client data
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select(`
        *,
        estimates (
          *,
          clients (name, email)
        )
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      throw new Error(`Failed to fetch proposal: ${proposalError?.message || 'Not found'}`);
    }

    // Generate or use existing public token
    let publicToken = proposal.public_token;
    if (!publicToken) {
      // Generate secure token using the database function
      const { data: tokenData } = await supabaseClient.rpc('generate_proposal_public_token');
      publicToken = tokenData;

      // Set expiration (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Update proposal with token
      await supabaseClient
        .from('proposals')
        .update({
          public_token: publicToken,
          expires_at: expiresAt.toISOString(),
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', proposalId);
    }

    // Build public URL
    const publicUrl = `${APP_URL}/proposal/${publicToken}`;

    // Get company info (TODO: fetch from user profile)
    const companyName = 'Your Company';

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal from ${companyName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 3px solid #3B82F6;
    }
    .header h1 {
      margin: 0;
      color: #1F2937;
      font-size: 28px;
    }
    .content {
      padding: 30px 0;
    }
    .project-details {
      background: #F3F4F6;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .project-details h3 {
      margin-top: 0;
      color: #1F2937;
    }
    .project-details p {
      margin: 8px 0;
      color: #4B5563;
    }
    .cta-button {
      display: inline-block;
      background: #3B82F6;
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .cta-button:hover {
      background: #2563EB;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      color: #6B7280;
      font-size: 14px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>You've Received a Proposal</h1>
  </div>

  <div class="content">
    <p>Dear ${proposal.estimates.clients?.name || 'Valued Client'},</p>

    <p>Thank you for the opportunity to work on your project. We're excited to present our proposal for your review.</p>

    <div class="project-details">
      <h3>Project Details</h3>
      <p><strong>Project:</strong> ${proposal.estimates.name}</p>
      <p><strong>Total Investment:</strong> $${proposal.estimates.total?.toFixed(2) || '0.00'}</p>
      <p><strong>Valid Until:</strong> ${format(new Date(proposal.expires_at || Date.now() + 30*24*60*60*1000), 'MMMM d, yyyy')}</p>
    </div>

    <p>Click the button below to view the full proposal, including detailed scope of work, timeline, and terms:</p>

    <center>
      <a href="${publicUrl}" class="cta-button">
        View Proposal
      </a>
    </center>

    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
      This link is unique to you and will remain active until ${format(new Date(proposal.expires_at || Date.now() + 30*24*60*60*1000), 'MMMM d, yyyy')}.
      You can review the proposal and provide your decision directly through the link.
    </p>

    <p>If you have any questions, please don't hesitate to reach out.</p>

    <p>Best regards,<br>
    <strong>${companyName}</strong></p>
  </div>

  <div class="footer">
    <p>This is an automated message from ${companyName}</p>
  </div>
</body>
</html>
    `;

    const emailData = await sendEmailViaHostinger({
      fromEmail: hostingerFromEmail,
      fromName: companyName,
      html: emailHtml,
      subject: `Proposal from ${companyName} - ${proposal.estimates.name}`,
      to: [proposal.estimates.clients?.email || ''],
    });

    return new Response(
      JSON.stringify({
        success: true,
        publicUrl,
        emailId: emailData.messageId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending proposal email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
