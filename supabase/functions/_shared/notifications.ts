/**
 * Shared notification helpers for sending email and WhatsApp notifications
 * Used by approval/rejection Edge Functions to notify project managers
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ProjectManagerNotificationData {
  project_id: string
  project_name: string
  customer_name: string
  customer_email: string
  project_manager_email: string
  project_manager_name?: string
}

interface ApprovalNotificationData extends ProjectManagerNotificationData {
  supplier_name: string
  quote_number: string
  total_amount: number
  currency: string
  customer_note?: string
}

interface RejectionNotificationData extends ProjectManagerNotificationData {
  quote_count: number
  rejection_reason: string
}

/**
 * Fetch project manager details from database
 */
export async function getProjectManagerDetails(
  projectId: string,
  supabaseClient: SupabaseClient
): Promise<{ email: string; name: string } | null> {
  try {
    const { data: project, error } = await supabaseClient
      .from('projects')
      .select(`
        manager_id,
        users!inner(email, full_name)
      `)
      .eq('id', projectId)
      .single()

    if (error || !project) {
      console.error('Failed to fetch project manager:', error)
      return null
    }

    const manager = (project.users as any)
    return {
      email: manager.email,
      name: manager.full_name || manager.email.split('@')[0]
    }
  } catch (err) {
    console.error('Error getting project manager details:', err)
    return null
  }
}

/**
 * Send approval notification email via Resend
 */
export async function sendApprovalNotification(
  data: ApprovalNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    const BASE_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || ''
    const projectLink = `${BASE_URL}/projects/${data.project_id}`

    // Format currency
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency || 'USD'
    }).format(data.total_amount)

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .details-row { margin: 10px 0; }
          .label { font-weight: bold; color: #6b7280; }
          .value { color: #111827; }
          .note { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ Quote Approved</h1>
          </div>
          <div class="content">
            <p>Hi ${data.project_manager_name || 'there'},</p>
            <p><strong>Good news!</strong> ${data.customer_name} has approved a quote for project "${data.project_name}".</p>

            <div class="details">
              <h3 style="margin-top: 0; color: #10b981;">Approved Quote Details</h3>
              <div class="details-row">
                <span class="label">Supplier:</span>
                <span class="value">${data.supplier_name}</span>
              </div>
              <div class="details-row">
                <span class="label">Quote Number:</span>
                <span class="value">${data.quote_number}</span>
              </div>
              <div class="details-row">
                <span class="label">Total Amount:</span>
                <span class="value">${formattedAmount}</span>
              </div>
              <div class="details-row">
                <span class="label">Customer:</span>
                <span class="value">${data.customer_name} (${data.customer_email})</span>
              </div>
            </div>

            ${data.customer_note ? `
            <div class="note">
              <strong>Customer Note:</strong><br/>
              ${data.customer_note}
            </div>
            ` : ''}

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the approved quote in the system</li>
              <li>Generate and send the purchase order</li>
              <li>Contact the supplier to confirm delivery timeline</li>
            </ul>

            <a href="${projectLink}" class="button">View Project</a>

            <div class="footer">
              <p>Best regards,<br/>EngPro Team</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EngPro <onboarding@resend.dev>',
        to: [data.project_manager_email],
        subject: `Quote Approved - ${data.project_name}`,
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Resend API error: ${errorText}` }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending approval notification:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send rejection notification email via Resend
 */
export async function sendRejectionNotification(
  data: RejectionNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    const BASE_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || ''
    const projectLink = `${BASE_URL}/projects/${data.project_id}`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .details-row { margin: 10px 0; }
          .label { font-weight: bold; color: #6b7280; }
          .value { color: #111827; }
          .reason { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">⚠️ Quotes Rejected</h1>
          </div>
          <div class="content">
            <p>Hi ${data.project_manager_name || 'there'},</p>
            <p>${data.customer_name} has rejected the quotes for project "${data.project_name}".</p>

            <div class="details">
              <h3 style="margin-top: 0; color: #f59e0b;">Rejection Details</h3>
              <div class="details-row">
                <span class="label">Customer:</span>
                <span class="value">${data.customer_name} (${data.customer_email})</span>
              </div>
              <div class="details-row">
                <span class="label">Number of quotes rejected:</span>
                <span class="value">${data.quote_count}</span>
              </div>
            </div>

            <div class="reason">
              <strong>Rejection Reason:</strong><br/>
              "${data.rejection_reason}"
            </div>

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the rejection reason with your customer</li>
              <li>Discuss alternatives or adjustments</li>
              <li>Request new quotes from suppliers if needed</li>
              <li>Update the purchase request based on customer feedback</li>
            </ul>

            <a href="${projectLink}" class="button">View Project</a>

            <div class="footer">
              <p>Best regards,<br/>EngPro Team</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EngPro <onboarding@resend.dev>',
        to: [data.project_manager_email],
        subject: `Quotes Rejected - ${data.project_name}`,
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Resend API error: ${errorText}` }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending rejection notification:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Log email notification in database
 */
export async function logEmailNotification(
  projectId: string,
  recipientEmail: string,
  subject: string,
  body: string,
  notificationType: string,
  status: 'sent' | 'failed',
  errorMessage: string | undefined,
  supabaseClient: SupabaseClient
): Promise<void> {
  try {
    await supabaseClient
      .from('email_notifications')
      .insert({
        project_id: projectId,
        recipient_email: recipientEmail,
        subject,
        body: body.substring(0, 1000), // Truncate if too long
        notification_type: notificationType,
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        error_message: errorMessage,
      })
  } catch (err) {
    // Don't fail the entire operation if logging fails
    console.error('Failed to log email notification:', err)
  }
}
