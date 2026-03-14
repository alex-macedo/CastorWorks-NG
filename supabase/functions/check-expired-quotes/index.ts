import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmailViaHostinger } from '../_shared/providers/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpiredQuote {
  expired_quote_id: string
  purchase_request_id: string
  supplier_id: string
  request_number: string
  project_manager_email: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Call the database function to mark expired quotes
    const { data: expiredQuotes, error: functionError } = await supabaseClient
      .rpc('check_and_mark_expired_quote_requests')

    if (functionError) {
      console.error('Error calling check_and_mark_expired_quote_requests:', functionError)
      throw functionError
    }

    console.log(`Found ${expiredQuotes?.length || 0} expired quotes`)

    // Group expired quotes by project manager
    const quotesByManager = new Map<string, ExpiredQuote[]>()

    for (const quote of (expiredQuotes as ExpiredQuote[]) || []) {
      if (!quotesByManager.has(quote.project_manager_email)) {
        quotesByManager.set(quote.project_manager_email, [])
      }
      quotesByManager.get(quote.project_manager_email)!.push(quote)
    }

    // Send notification to each project manager
    const notificationResults = []
    for (const [managerEmail, quotes] of quotesByManager.entries()) {
      try {
        const result = await sendExpirationNotification(managerEmail, quotes, supabaseClient)
        notificationResults.push(result)
      } catch (error) {
        console.error(`Failed to send notification to ${managerEmail}:`, error)
        notificationResults.push({
          success: false,
          email: managerEmail,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiredQuotesCount: expiredQuotes?.length || 0,
        notificationsSent: notificationResults.filter(r => r.success).length,
        notificationsFailed: notificationResults.filter(r => !r.success).length,
        details: notificationResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in check-expired-quotes:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function sendExpirationNotification(
  managerEmail: string,
  quotes: ExpiredQuote[],
  supabaseClient: any
): Promise<{ success: boolean; email: string; error?: string }> {
  try {
    const hostingerFromEmail = Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
      ?? Deno.env.get('HOSTINGER_SMTP_USER')
    if (!hostingerFromEmail) {
      console.warn('Hostinger SMTP not configured, skipping email notification')
      return { success: false, email: managerEmail, error: 'Hostinger SMTP not configured' }
    }

    const BASE_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || ''

    // Get manager details
    const { data: manager } = await supabaseClient
      .from('users')
      .select('id, full_name, email')
      .eq('email', managerEmail)
      .single()

    if (!manager) {
      return { success: false, email: managerEmail, error: 'Manager not found' }
    }

    // Build quote list HTML
    const quoteListHtml = quotes.map(q => `
      <li style="margin: 10px 0; padding: 10px; background: #fff; border-radius: 4px; border-left: 3px solid #f59e0b;">
        <strong>${q.request_number}</strong>
      </li>
    `).join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .quote-list { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
          ul { list-style: none; padding: 0; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">⏰ Quote Request Deadlines Expired</h1>
          </div>
          <div class="content">
            <p>Hi ${manager.full_name || manager.email.split('@')[0]},</p>
            <p>The following quote requests have passed their response deadlines and have been marked as <strong>expired</strong>:</p>

            <div class="quote-list">
              <h3 style="margin-top: 0; color: #f59e0b;">Expired Quote Requests (${quotes.length})</h3>
              <ul>
                ${quoteListHtml}
              </ul>
            </div>

            <p><strong>Recommended Actions:</strong></p>
            <ul style="list-style: disc; padding-left: 20px;">
              <li>Contact suppliers to follow up on unresponsive quotes</li>
              <li>Consider resending quote requests with extended deadlines</li>
              <li>Select alternative suppliers if needed</li>
              <li>Update your procurement timeline accordingly</li>
            </ul>

            <a href="${BASE_URL}/procurement" class="button">View Procurement Dashboard</a>

            <div class="footer">
              <p>Best regards,<br/>EngPro Team</p>
              <p style="font-size: 12px; color: #9ca3af;">This is an automated notification from your procurement system.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    await sendEmailViaHostinger({
      fromEmail: hostingerFromEmail,
      fromName: 'CastorWorks',
      html: emailHtml,
      subject: `⏰ ${quotes.length} Quote Request${quotes.length > 1 ? 's' : ''} Expired`,
      to: [managerEmail],
    })

    // Log notifications in database
    const notificationInserts = quotes.map(quote => ({
      quote_request_id: quote.expired_quote_id,
      project_manager_id: manager.id,
      notification_type: 'expiration',
      notification_method: 'email',
      status: 'sent',
      metadata: {
        request_number: quote.request_number,
        sent_at: new Date().toISOString()
      }
    }))

    await supabaseClient
      .from('quote_expiration_notifications')
      .insert(notificationInserts)

    console.log(`Sent expiration notification to ${managerEmail} for ${quotes.length} quotes`)

    return { success: true, email: managerEmail }
  } catch (error) {
    console.error('Error sending expiration notification:', error)
    return {
      success: false,
      email: managerEmail,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
