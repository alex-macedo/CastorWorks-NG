import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmailViaHostinger } from './providers/index.ts';

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface RegistrationEmailData {
  userEmail: string;
  userName?: string;
}

export async function sendRegistrationEmail(data: RegistrationEmailData) {
  const { userEmail, userName } = data;

  try {
    // Get company settings for email configuration
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('name, email, phone, address')
      .single();

    const companyName = companySettings?.name || 'CastorWorks';
    const senderEmail = companySettings?.email || 'suporte@castorworks.cloud';
    const hostingerFromEmail = Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
      ?? Deno.env.get('HOSTINGER_SMTP_USER');
    if (!hostingerFromEmail) {
      throw new Error('Hostinger SMTP not configured');
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to ${companyName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Welcome to ${companyName}</h1>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Account Registration Successful</h2>
            <p>Hello${userName ? ` ${userName}` : ''},</p>
            <p>Thank you for registering with ${companyName}!</p>
            <p>Your account has been created successfully, but requires administrator approval before you can access the platform.</p>
          </div>

          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin-top: 0;">Next Steps</h3>
            <p style="margin: 0; color: #92400e;">Please contact your ${companyName} administrator to enable your account access. They will assign the appropriate role and permissions to your account.</p>
          </div>

          <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #065f46; margin-top: 0;">Administrator Contact Information</h3>
            <p style="margin: 5px 0; color: #065f46;">
              <strong>Email:</strong> ${senderEmail}<br>
              ${companySettings?.phone ? `<strong>Phone:</strong> ${companySettings.phone}<br>` : ''}
              ${companySettings?.address ? `<strong>Address:</strong> ${companySettings.address}` : ''}
            </p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
            <p style="font-size: 14px; color: #6b7280;">
              This is an automated message. Please do not reply to this email.
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              If you did not register for this account, please disregard this message.
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await sendEmailViaHostinger({
      fromEmail: hostingerFromEmail,
      fromName: companyName,
      html: emailHtml,
      replyTo: senderEmail,
      subject: `Welcome to ${companyName} - Account Registration`,
      to: [userEmail],
    });

    // Log the email notification
    await supabase.from('email_notifications').insert({
      recipient_email: userEmail,
      email_type: 'user_registration',
      subject: `Welcome to ${companyName} - Account Registration`,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return { success: true, emailId: emailResponse.messageId };
  } catch (error) {
    console.error('Error sending registration email:', error);

    // Log failed notification
    await supabase.from('email_notifications').insert({
      recipient_email: userEmail,
      email_type: 'user_registration',
      subject: 'Welcome - Account Registration',
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
