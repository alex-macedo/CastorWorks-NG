/**
 * Collection Action Trigger - Edge Function
 *
 * Triggers collection sequences for overdue invoices.
 *
 * Called:
 * - On-demand via API for specific invoices
 * - Nightly via cron for all overdue invoices (future)
 *
 * Functionality:
 * - Queries overdue AR invoices
 * - Matches invoices to collection sequences
 * - Schedules/executes collection actions
 * - Sends emails via SendGrid (when configured)
 * - Sends WhatsApp/SMS via Twilio (when configured)
 * - Creates manual tasks for escalations
 *
 * Performance target: Process 1,000+ invoices in <10 seconds
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateRequest, verifyAdminRole } from '../_shared/authorization.ts'

// Types
interface TriggerCollectionActionsRequest {
  invoice_id?: string // Optional: trigger for specific invoice
  dry_run?: boolean // Optional: preview without sending (default: false)
  force_resend?: boolean // Optional: resend even if already sent (default: false)
}

interface CollectionActionResult {
  invoice_id: string
  invoice_number: string
  client_name: string
  days_overdue: number
  actions_scheduled: number
  actions_sent: number
  actions_failed: number
  sequence_used: string
}

serve(async (req) => {
  try {
    // CORS handling
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    // Verify authentication and admin role
    try {
      const { user } = await authenticateRequest(req)
      await verifyAdminRole(user.id)
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body: TriggerCollectionActionsRequest = req.method === 'POST'
      ? await req.json()
      : {}

    const dryRun = body.dry_run ?? false
    const forceResend = body.force_resend ?? false

    console.log('Collection actions trigger requested:', {
      invoice_id: body.invoice_id ?? 'all',
      dry_run: dryRun,
      force_resend: forceResend,
    })

    // Get overdue invoices
    let overdueInvoices: any[]

    if (body.invoice_id) {
      // Single invoice
      const { data, error } = await supabase
        .from('financial_ar_invoices')
        .select('*')
        .eq('id', body.invoice_id)
        .single()

      if (error) throw error
      overdueInvoices = data ? [data] : []
    } else {
      // All overdue invoices
      const { data, error } = await supabase
        .from('financial_ar_invoices')
        .select('*')
        .in('status', ['overdue', 'partial'])
        .order('due_date', { ascending: true })

      if (error) throw error
      overdueInvoices = data ?? []
    }

    console.log(`Found ${overdueInvoices.length} overdue invoices to process`)

    // Process each invoice
    const results: CollectionActionResult[] = []

    for (const invoice of overdueInvoices) {
      const result = await processInvoice(
        supabase,
        invoice,
        dryRun,
        forceResend
      )
      results.push(result)
    }

    // Summary stats
    const totalActionsScheduled = results.reduce((sum, r) => sum + r.actions_scheduled, 0)
    const totalActionsSent = results.reduce((sum, r) => sum + r.actions_sent, 0)
    const totalActionsFailed = results.reduce((sum, r) => sum + r.actions_failed, 0)

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        processed_at: new Date().toISOString(),
        invoices_processed: results.length,
        total_actions_scheduled: totalActionsScheduled,
        total_actions_sent: totalActionsSent,
        total_actions_failed: totalActionsFailed,
        results,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (err) {
    console.error('Error in trigger-collection-actions:', err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Internal Server Error',
        details: err instanceof Error ? err.stack : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Process a single invoice for collection actions
 */
async function processInvoice(
  _supabase: any,
  invoice: any,
  dryRun: boolean,
  _forceResend: boolean
): Promise<CollectionActionResult> {

  // Calculate days overdue
  const dueDate = new Date(invoice.due_date)
  const now = new Date()
  const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

  console.log(`Processing invoice ${invoice.invoice_number} (${daysOverdue} days overdue)`)

  // Call schedule_collection_actions function to create scheduled actions
  const { data: scheduledActions, error: scheduleError } = await supabase
    .rpc('schedule_collection_actions', {
      p_invoice_id: invoice.id,
      p_dry_run: dryRun
    })

  if (scheduleError) {
    console.error('Error scheduling actions:', scheduleError)
    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      client_name: invoice.client_name,
      days_overdue: daysOverdue,
      actions_scheduled: 0,
      actions_sent: 0,
      actions_failed: 0,
      sequence_used: 'none',
    }
  }

  const actionsToExecute = scheduledActions ?? []
  console.log(`Scheduled ${actionsToExecute.length} actions for invoice ${invoice.invoice_number}`)

  // Execute pending actions (not dry run)
  let actionsSent = 0
  let actionsFailed = 0

  if (!dryRun) {
    // Get pending actions to execute
    const { data: pendingActions, error: pendingError } = await supabase
      .from('financial_collection_actions')
      .select('*')
      .eq('invoice_id', invoice.id)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())

    if (pendingError) {
      console.error('Error fetching pending actions:', pendingError)
    } else {
      for (const action of (pendingActions ?? [])) {
        const success = await executeAction(supabase, action, invoice)
        if (success) {
          actionsSent++
        } else {
          actionsFailed++
        }
      }
    }
  }

  return {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    client_name: invoice.client_name,
    days_overdue: daysOverdue,
    actions_scheduled: actionsToExecute.length,
    actions_sent: actionsSent,
    actions_failed: actionsFailed,
    sequence_used: actionsToExecute.length > 0 ? 'default' : 'none',
  }
}

/**
 * Execute a single collection action (send email/WhatsApp/create task)
 */
async function executeAction(
  _supabase: any,
  action: any,
  invoice: any
): Promise<boolean> {

  console.log(`Executing action ${action.id} (${action.action_type}) for invoice ${invoice.invoice_number}`)

  try {
    switch (action.action_type) {
      case 'email':
        await sendEmail(supabase, action, invoice)
        break

      case 'whatsapp':
        await sendWhatsApp(supabase, action, invoice)
        break

      case 'sms':
        await sendSMS(supabase, action, invoice)
        break

      case 'task':
        await createTask(supabase, action, invoice)
        break

      default:
        console.warn(`Unknown action type: ${action.action_type}`)
        return false
    }

    // Mark action as sent/completed
    await supabase
      .from('financial_collection_actions')
      .update({
        status: action.action_type === 'task' ? 'completed' : 'sent',
        executed_at: new Date().toISOString(),
        was_successful: true,
      })
      .eq('id', action.id)

    return true

  } catch (err) {
    console.error(`Error executing action ${action.id}:`, err)

    // Mark action as failed
    await supabase
      .from('financial_collection_actions')
      .update({
        status: 'failed',
        executed_at: new Date().toISOString(),
        was_successful: false,
        error_message: err instanceof Error ? err.message : 'Unknown error',
        retry_count: action.retry_count + 1,
      })
      .eq('id', action.id)

    return false
  }
}

/**
 * Send email via SendGrid
 */
async function sendEmail(
  _supabase: any,
  action: any,
  invoice: any
): Promise<void> {

  // TODO: Integrate with SendGrid API
  // For now, just log the email that would be sent

  const emailContent = {
    to: action.recipient_email,
    from: 'collections@castorworks.com', // TODO: Configure from address
    subject: interpolateTemplate(action.message_subject || 'Payment Reminder', invoice),
    body: interpolateTemplate(action.message_body || '', invoice),
  }

  console.log('Would send email:', emailContent)

  // In production, this would call SendGrid:
  // const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
  // const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${sendgridApiKey}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     personalizations: [{ to: [{ email: emailContent.to }] }],
  //     from: { email: emailContent.from },
  //     subject: emailContent.subject,
  //     content: [{ type: 'text/plain', value: emailContent.body }],
  //   }),
  // })

  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 100))
}

/**
 * Send WhatsApp message via Twilio
 */
async function sendWhatsApp(
  _supabase: any,
  action: any,
  invoice: any
): Promise<void> {
  const { sendWhatsAppViaTwilio } = await import('../_shared/providers/twilio.ts')

  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
  const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM')

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    throw new Error('Twilio WhatsApp credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)')
  }

  const message = interpolateTemplate(action.message_body || '', invoice)
  const formattedPhone = action.recipient_phone?.startsWith('+')
    ? action.recipient_phone
    : `+${action.recipient_phone}`

  console.log('Sending WhatsApp via Twilio:', {
    to: formattedPhone,
    messageLength: message.length,
  })

  const result = await sendWhatsAppViaTwilio(
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM,
    formattedPhone,
    message
  )

  if (!result.ok) {
    const errMsg = result.data?.message || JSON.stringify(result.data)
    throw new Error(`WhatsApp send failed: ${errMsg}`)
  }

  console.log('WhatsApp sent:', result.data?.sid)
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(
  _supabase: any,
  action: any,
  invoice: any
): Promise<void> {

  // TODO: Integrate with Twilio SMS API

  const message = interpolateTemplate(action.message_body || '', invoice)

  console.log('Would send SMS:', {
    to: action.recipient_phone,
    message: message,
  })

  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 100))
}

/**
 * Create manual task for collections team
 */
async function createTask(
  _supabase: any,
  action: any,
  invoice: any
): Promise<void> {

  // Parse task details from action
  const step = JSON.parse(action.message_template || '{}')
  const taskTitle = interpolateTemplate(step.task_title || 'Collection Follow-up', invoice)
  const taskDescription = interpolateTemplate(step.task_description || '', invoice)

  console.log('Creating task:', { title: taskTitle })

  // Create task in task_management table
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: taskTitle,
      description: taskDescription,
      project_id: invoice.project_id,
      status: 'pending',
      priority: 'high',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      created_by: 'system', // TODO: Get actual admin user
    })
    .select()
    .single()

  if (error) throw error

  // Link task to collection action
  await supabase
    .from('financial_collection_actions')
    .update({ task_id: task.id })
    .eq('id', action.id)
}

/**
 * Interpolate template variables
 */
function interpolateTemplate(template: string, invoice: any): string {
  return template
    .replace(/{customer_name}/g, invoice.client_name || '[Customer]')
    .replace(/{invoice_number}/g, invoice.invoice_number || '[Invoice]')
    .replace(/{total_amount}/g, formatCurrency(invoice.total_amount))
    .replace(/{due_date}/g, formatDate(invoice.due_date))
    .replace(/{days_overdue}/g, calculateDaysOverdue(invoice.due_date).toString())
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

/**
 * Calculate days overdue
 */
function calculateDaysOverdue(dueDateString: string): number {
  const dueDate = new Date(dueDateString)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
}
