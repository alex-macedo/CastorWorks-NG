import { serve } from 'https://deno.land/std@0.180.0/http/server.ts';
import { authenticateRequest, createServiceRoleClient, verifyAdminRole } from '../_shared/authorization.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') || '';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const unauthorizedResponse = (message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: jsonHeaders,
  });

const supabase = createServiceRoleClient();

interface ReminderSettings {
  entity_type: string;
  reminder_days: number[];
  channels: string[];
  enabled: boolean;
}

interface Task {
  id: string;
  title: string;
  due_date: string;
  project_id: string;
  assignee_id: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  due_date: string;
  project_id: string;
  amount: number;
}

serve(async (req: Request) => {
  try {
    const { user } = await authenticateRequest(req);
    await verifyAdminRole(user.id, supabase);

    console.log('Starting check-due-notifications job...');

    const now = new Date();
    const results = {
      tasksProcessed: 0,
      paymentsProcessed: 0,
      notificationsSent: 0,
      errors: [] as string[],
    };

    // Get reminder settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_reminder_settings')
      .select('*');

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    if (!settings || settings.length === 0) {
      console.log('No reminder settings configured');
      return new Response(JSON.stringify({ message: 'No settings configured' }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // Process each setting type (task, payment)
    for (const setting of settings as ReminderSettings[]) {
      if (!setting.enabled) {
        console.log(`Skipping disabled setting: ${setting.entity_type}`);
        continue;
      }

      console.log(`Processing ${setting.entity_type} reminders...`);

      // Process each reminder day
      for (const reminderDay of setting.reminder_days) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + reminderDay);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        console.log(`Checking for ${setting.entity_type} due on ${targetDateStr} (${reminderDay} days from now)`);

        if (setting.entity_type === 'task') {
          await processTaskReminders(targetDateStr, reminderDay, setting.channels, results);
        } else if (setting.entity_type === 'payment') {
          await processPaymentReminders(targetDateStr, reminderDay, setting.channels, results);
        }
      }
    }

    console.log('Check-due-notifications job completed:', results);
    return new Response(JSON.stringify(results), { status: 200, headers: jsonHeaders });
  } catch (err) {
    console.error('Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'unexpected';

    if (message === 'Unauthorized' || message.includes('Administrator')) {
      return unauthorizedResponse(message);
    }

    return new Response(JSON.stringify({ error: 'unexpected', details: String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});

async function processTaskReminders(
  targetDate: string,
  reminderDay: number,
  channels: string[],
  results: any
) {
  // Find tasks due on target date
  const { data: tasks, error } = await supabase
    .from('architect_tasks')
    .select('id, title, due_date, project_id, assignee_id')
    .eq('due_date', targetDate)
    .neq('status', 'completed');

  if (error) {
    console.error('Error fetching tasks:', error);
    results.errors.push(`Task fetch error: ${error.message}`);
    return;
  }

  if (!tasks || tasks.length === 0) {
    console.log(`No tasks due on ${targetDate}`);
    return;
  }

  console.log(`Found ${tasks.length} tasks due on ${targetDate}`);

  for (const task of tasks as Task[]) {
    results.tasksProcessed++;

    // Check for overrides
    const { data: override } = await supabase
      .from('entity_reminder_overrides')
      .select('*')
      .eq('entity_type', 'task')
      .eq('entity_id', task.id)
      .single();

    // Skip if override exists and is disabled
    if (override && !override.enabled) {
      console.log(`Task ${task.id} has reminders disabled`);
      continue;
    }

    // Skip if override exists and this reminder day is not in the list
    if (override && override.reminder_days && !override.reminder_days.includes(reminderDay)) {
      console.log(`Task ${task.id} override skips ${reminderDay} day reminder`);
      continue;
    }

    // Get project team members
    const { data: teamMembers } = await supabase
      .from('project_team_members')
      .select('user_id, users:user_id(id, email, phone)')
      .eq('project_id', task.project_id);

    if (!teamMembers || teamMembers.length === 0) {
      console.log(`No team members for project ${task.project_id}`);
      continue;
    }

    // Send notifications to each team member
    for (const member of teamMembers) {
      const userId = member.user_id;

      // Check if already sent
      const alreadySent = await checkIfNotificationSent('task', task.id, reminderDay, 'bell', userId);
      if (alreadySent) {
        console.log(`Notification already sent to user ${userId} for task ${task.id}`);
        continue;
      }

      // Send in-app notification (bell)
      if (channels.includes('bell')) {
        await sendInAppNotification(task, userId, reminderDay);
        results.notificationsSent++;
      }

      // Send WhatsApp notification
      if (channels.includes('whatsapp') && member.users?.phone) {
        await sendWhatsAppNotification(task, member.users.phone, reminderDay, 'task');
        results.notificationsSent++;
      }

      // Log notification sent
      await logNotificationSent('task', task.id, reminderDay, 'bell', userId, null);
    }
  }
}

async function processPaymentReminders(
  targetDate: string,
  reminderDay: number,
  channels: string[],
  results: any
) {
  // Find invoices due on target date
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, due_date, project_id, amount')
    .eq('due_date', targetDate)
    .neq('status', 'paid');

  if (error) {
    console.error('Error fetching invoices:', error);
    results.errors.push(`Invoice fetch error: ${error.message}`);
    return;
  }

  if (!invoices || invoices.length === 0) {
    console.log(`No invoices due on ${targetDate}`);
    return;
  }

  console.log(`Found ${invoices.length} invoices due on ${targetDate}`);

  for (const invoice of invoices as Invoice[]) {
    results.paymentsProcessed++;

    // Check for overrides
    const { data: override } = await supabase
      .from('entity_reminder_overrides')
      .select('*')
      .eq('entity_type', 'payment')
      .eq('entity_id', invoice.id)
      .single();

    if (override && !override.enabled) {
      console.log(`Invoice ${invoice.id} has reminders disabled`);
      continue;
    }

    if (override && override.reminder_days && !override.reminder_days.includes(reminderDay)) {
      console.log(`Invoice ${invoice.id} override skips ${reminderDay} day reminder`);
      continue;
    }

    // Get project team members
    const { data: teamMembers } = await supabase
      .from('project_team_members')
      .select('user_id, users:user_id(id, email, phone)')
      .eq('project_id', invoice.project_id);

    if (!teamMembers || teamMembers.length === 0) {
      console.log(`No team members for project ${invoice.project_id}`);
      continue;
    }

    // Send notifications to each team member
    for (const member of teamMembers) {
      const userId = member.user_id;

      const alreadySent = await checkIfNotificationSent('payment', invoice.id, reminderDay, 'bell', userId);
      if (alreadySent) {
        console.log(`Notification already sent to user ${userId} for invoice ${invoice.id}`);
        continue;
      }

      // Send in-app notification (bell)
      if (channels.includes('bell')) {
        await sendInAppPaymentNotification(invoice, userId, reminderDay);
        results.notificationsSent++;
      }

      // Send WhatsApp notification
      if (channels.includes('whatsapp') && member.users?.phone) {
        await sendWhatsAppNotification(invoice, member.users.phone, reminderDay, 'payment');
        results.notificationsSent++;
      }

      // Log notification sent
      await logNotificationSent('payment', invoice.id, reminderDay, 'bell', userId, null);
    }
  }
}

async function sendInAppNotification(task: Task, userId: string, reminderDay: number) {
  const notificationType = reminderDay === 0 ? 'task_due' : 'task_due_soon';
  const title = reminderDay === 0 ? 'Task Due Today' : `Task Due in ${reminderDay} Day(s)`;
  const message = reminderDay === 0 
    ? `Task "${task.title}" is due today`
    : `Task "${task.title}" is due in ${reminderDay} day(s)`;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: notificationType,
      title,
      message,
      priority: reminderDay === 0 ? 'high' : 'medium',
      action_url: `/architect/tasks/${task.id}`,
      data: {
        taskId: task.id,
        projectId: task.project_id,
        reminderDay,
      },
    });

  if (error) {
    console.error('Error creating in-app notification:', error);
  } else {
    console.log(`In-app notification sent to user ${userId} for task ${task.id}`);
  }
}

async function sendInAppPaymentNotification(invoice: Invoice, userId: string, reminderDay: number) {
  const notificationType = reminderDay === 0 ? 'payment_due' : 'payment_due_soon';
  const title = reminderDay === 0 ? 'Payment Due Today' : `Payment Due in ${reminderDay} Day(s)`;
  const message = reminderDay === 0 
    ? `Payment for invoice ${invoice.invoice_number} is due today`
    : `Payment for invoice ${invoice.invoice_number} is due in ${reminderDay} day(s)`;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: notificationType,
      title,
      message,
      priority: reminderDay === 0 ? 'high' : 'medium',
      action_url: `/financial/invoices/${invoice.id}`,
      data: {
        invoiceId: invoice.id,
        projectId: invoice.project_id,
        reminderDay,
        amount: invoice.amount,
      },
    });

  if (error) {
    console.error('Error creating in-app payment notification:', error);
  } else {
    console.log(`In-app payment notification sent to user ${userId} for invoice ${invoice.id}`);
  }
}

async function sendWhatsAppNotification(
  entity: Task | Invoice,
  phone: string,
  reminderDay: number,
  type: 'task' | 'payment'
) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.log('Twilio not configured, skipping WhatsApp notification');
    return;
  }

  let message = '';
  if (type === 'task') {
    const task = entity as Task;
    message = reminderDay === 0
      ? `⏰ Task Due Today: "${task.title}"`
      : `📋 Reminder: Task "${task.title}" is due in ${reminderDay} day(s)`;
  } else {
    const invoice = entity as Invoice;
    message = reminderDay === 0
      ? `💰 Payment Due Today: Invoice ${invoice.invoice_number} - $${invoice.amount}`
      : `💳 Reminder: Invoice ${invoice.invoice_number} payment is due in ${reminderDay} day(s) - $${invoice.amount}`;
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    
    const body = new URLSearchParams({
      From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      To: `whatsapp:${formattedPhone}`,
      Body: message,
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

async function checkIfNotificationSent(
  entityType: string,
  entityId: string,
  reminderDay: number,
  channel: string,
  recipientId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('notification_sent_log')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('reminder_day', reminderDay)
    .eq('channel', channel)
    .eq('recipient_id', recipientId)
    .eq('status', 'sent')
    .single();

  return !!data;
}

async function logNotificationSent(
  entityType: string,
  entityId: string,
  reminderDay: number,
  channel: string,
  recipientId: string,
  recipientPhone: string | null
) {
  await supabase
    .from('notification_sent_log')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      notification_type: reminderDay === 0 ? `${entityType}_due` : `${entityType}_due_soon`,
      reminder_day: reminderDay,
      channel,
      recipient_id: recipientId,
      recipient_phone: recipientPhone,
      status: 'sent',
    });
}
