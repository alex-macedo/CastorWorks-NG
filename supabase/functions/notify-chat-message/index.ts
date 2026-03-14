import { serve } from 'https://deno.land/std@0.180.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { sendEmailViaHostinger } from '../_shared/providers/index.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') || '';
const HOSTINGER_FROM_EMAIL = Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
  || Deno.env.get('HOSTINGER_SMTP_USER')
  || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message_id, conversation_id, sender_id, text } = await req.json();

    console.log(`Processing chat message notification: ${message_id}`);

    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, project_id, projects(id, name)')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      console.error('Error fetching conversation:', convError);
      return new Response(JSON.stringify({ error: 'Conversation not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get sender details
    const { data: sender, error: senderError } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, email, phone')
      .eq('user_id', sender_id)
      .single();

    if (senderError) {
      console.error('Error fetching sender:', senderError);
    }

    const senderName = sender?.display_name || 'Unknown User';
    const projectName = conversation.projects?.name || 'Unknown Project';

    // Get recipients from conversation participants (covers Team Chat + client portal)
    // This notifies whoever is actually in the conversation, not just "client" or "team"
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .neq('user_id', sender_id)
      .not('user_id', 'is', null);

    let recipients: any[] = [];

    if (participants && participants.length > 0) {
      // Fetch contact info for each participant from user_profiles
      const userIds = participants.map((p: any) => p.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, email, phone, display_name')
        .in('user_id', userIds);

      recipients = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        recipientEmail: p.email,
        recipientPhone: p.phone,
        recipientName: p.display_name || 'User',
      }));
    }

    // Fallback: if no conversation participants with accounts (e.g. client portal, external client),
    // notify project client when team member sent the message
    if (recipients.length === 0) {
      const { data: project } = await supabase
        .from('projects')
        .select('client_id, clients(id, email, phone, name)')
        .eq('id', conversation.project_id)
        .single();

      if (project?.clients) {
        recipients = [{
          user_id: null,
          recipientEmail: project.clients.email,
          recipientPhone: project.clients.phone,
          recipientName: project.clients.name || 'Client',
        }];
      }
    }

    if (recipients.length === 0) {
      console.log('No recipients found for notification');
      return new Response(JSON.stringify({ message: 'No recipients' }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Sending notifications to ${recipients.length} recipient(s)`);

    // Send notifications to each recipient
    for (const recipient of recipients) {
      const recipientId = recipient.user_id;
      const recipientEmail = recipient.recipientEmail;
      const recipientPhone = recipient.recipientPhone;
      const recipientName = recipient.recipientName || 'User';

      // Send in-app notification (bell) - only for authenticated users
      if (recipientId) {
        await sendInAppNotification(
          recipientId,
          senderName,
          projectName,
          text,
          conversation_id
        );
      }

      // Send WhatsApp notification
      if (recipientPhone) {
        await sendWhatsAppNotification(
          recipientPhone,
          senderName,
          projectName,
          text
        );
      }

      // Send email notification
      if (recipientEmail) {
        await sendEmailNotification(
          recipientEmail,
          recipientName,
          senderName,
          projectName,
          text,
          conversation_id
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipientsNotified: recipients.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing chat notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendInAppNotification(
  userId: string,
  senderName: string,
  projectName: string,
  messageText: string,
  conversationId: string
) {
  const truncatedText = messageText.length > 100 
    ? messageText.substring(0, 100) + '...' 
    : messageText;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'chat_message',
      title: `New message from ${senderName}`,
      message: `${projectName}: ${truncatedText}`,
      priority: 'medium',
      action_url: `/chat?conversation=${conversationId}`,
      data: {
        conversationId,
        senderName,
        projectName,
      },
    });

  if (error) {
    console.error('Error creating in-app notification:', error);
  } else {
    console.log(`In-app notification sent to user ${userId}`);
  }
}

async function sendWhatsAppNotification(
  phone: string,
  senderName: string,
  projectName: string,
  messageText: string
) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.log('Twilio not configured, skipping WhatsApp notification');
    return;
  }

  const truncatedText = messageText.length > 100 
    ? messageText.substring(0, 100) + '...' 
    : messageText;

  const whatsappMessage = `💬 New message from ${senderName}\n\nProject: ${projectName}\n\n"${truncatedText}"`;

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    
    const body = new URLSearchParams({
      From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      To: `whatsapp:${formattedPhone}`,
      Body: whatsappMessage,
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('WhatsApp send error:', errorData);
    } else {
      console.log(`WhatsApp sent to ${phone}`);
    }
  } catch (err) {
    console.error('WhatsApp send exception:', err);
  }
}

async function sendEmailNotification(
  email: string,
  recipientName: string,
  senderName: string,
  projectName: string,
  messageText: string,
  conversationId: string
) {
  if (!HOSTINGER_FROM_EMAIL) {
    console.log('Hostinger SMTP not configured, skipping email notification');
    return;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .message { background-color: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 15px 0; }
          .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>💬 New Message from ${senderName}</h2>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            <p>You have received a new message in project <strong>${projectName}</strong>:</p>
            <div class="message">
              ${messageText}
            </div>
            <a href="${SUPABASE_URL}/client-portal/communication?conversation=${conversationId}" class="button">
              View Conversation
            </a>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await sendEmailViaHostinger({
      fromEmail: HOSTINGER_FROM_EMAIL,
      fromName: 'CastorWorks',
      html: emailHtml,
      subject: `New message from ${senderName} - ${projectName}`,
      to: [email],
    });
    console.log(`Email sent to ${email}`);
  } catch (err) {
    console.error('Email send exception:', err);
  }
}
