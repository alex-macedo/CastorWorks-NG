import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface OnboardingCompleteEmailData {
  userEmail: string;
  userName?: string;
}

export async function sendOnboardingCompleteEmail(data: OnboardingCompleteEmailData) {
  const { userEmail, userName } = data;

  try {
    // Get company settings for branding
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('name, email, phone')
      .single();

    const companyName = companySettings?.name || 'CastorWorks';
    const appUrl = Deno.env.get('APP_URL') || 'https://studio.castorworks.cloud';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to ${companyName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Welcome to ${companyName}!</h1>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #22c55e; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #15803d; margin-top: 0;">🎉 Your account is ready</h2>
            <p>Hello${userName ? ` ${userName}` : ''},</p>
            <p>Great news! Your account onboarding is now complete. An administrator has reviewed and approved your access to the ${companyName} platform.</p>
            <p>You can now sign in and start using all the features available to your account.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Sign In Now
            </a>
          </div>

          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin-top: 0;">Need help?</h3>
            <p style="margin: 0; color: #4b5563;">
              If you have any questions, reach out to your administrator at
              ${companySettings?.email ? `<a href="mailto:${companySettings.email}" style="color: #2563eb;">${companySettings.email}</a>` : 'your company administrator'}.
            </p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
            <p style="font-size: 14px; color: #6b7280;">
              This is an automated message from ${companyName}. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: `${companyName} <onboarding@resend.dev>`,
      to: [userEmail],
      subject: `Welcome to ${companyName} – your account is ready`,
      html: emailHtml,
    });

    // Log the email notification
    await supabase.from('email_notifications').insert({
      recipient_email: userEmail,
      email_type: 'user_onboarding_complete',
      subject: `Welcome to ${companyName} – your account is ready`,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return { success: true, emailId: emailResponse.data?.id };
  } catch (error) {
    console.error('Error sending onboarding complete email:', error);

    // Log failed notification
    await supabase.from('email_notifications').insert({
      recipient_email: userEmail,
      email_type: 'user_onboarding_complete',
      subject: 'Welcome - Onboarding Complete',
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
