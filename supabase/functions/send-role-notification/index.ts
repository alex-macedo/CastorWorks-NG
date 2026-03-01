import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createErrorResponse } from "../_shared/errorHandler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoleNotificationRequest {
  userId: string;
  role: string;
  action: 'assigned' | 'removed';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify the request is authenticated and from an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      throw new Error('Unauthorized');
    }

    // Check if requesting user is admin
    const { data: adminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      throw new Error('Only admins can trigger role notifications');
    }

    const { userId, role, action }: RoleNotificationRequest = await req.json();

    // Get target user's email
    const { data: { user: targetUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !targetUser || !targetUser.email) {
      throw new Error('User not found or no email available');
    }

    // Get company settings for sender info
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('company_name')
      .single();

    const companyName = companySettings?.company_name || 'Your Company';
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    // Generate email content based on action
    const roleNames: Record<string, string> = {
      admin: 'Administrator',
      project_manager: 'Project Manager',
      viewer: 'Viewer',
      site_supervisor: 'Site Supervisor',
      admin_office: 'Admin Office',
      client: 'Client',
      accountant: 'Accountant',
    };

    const roleName = roleNames[role] || role;
    
    let subject: string;
    let htmlContent: string;

    if (action === 'assigned') {
      subject = `Welcome! You've been assigned the ${roleName} role`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .role-badge { display: inline-block; background: #f3f4f6; color: #1f2937; padding: 8px 16px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .permissions { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
              .permissions h3 { margin-top: 0; color: #667eea; }
              .permissions ul { margin: 10px 0; padding-left: 20px; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 New Role Assigned</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You have been assigned a new role in ${companyName}:</p>
                <div style="text-align: center;">
                  <span class="role-badge">${roleName}</span>
                </div>
                <div class="permissions">
                  <h3>Your New Permissions:</h3>
                  ${getRolePermissionsHtml(role)}
                </div>
                <p>You can now access the features and sections associated with this role. Log in to your account to explore your new capabilities.</p>
                <p>If you have any questions about your new role or permissions, please contact your administrator.</p>
                <p>Best regards,<br><strong>${companyName} Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      subject = `Role Update: ${roleName} role has been removed`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .role-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .notice { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Role Update Notification</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>This is to inform you that the following role has been removed from your account in ${companyName}:</p>
                <div style="text-align: center;">
                  <span class="role-badge">${roleName}</span>
                </div>
                <div class="notice">
                  <strong>⚠️ Note:</strong> You will no longer have access to the features and sections associated with this role.
                </div>
                <p>If you believe this change was made in error or if you have any questions, please contact your administrator.</p>
                <p>Best regards,<br><strong>${companyName} Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    // Send email via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} <onboarding@resend.dev>`,
        to: [targetUser.email],
        subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailResult = await emailResponse.json();

    // Log the notification
    await supabaseAdmin.from('email_notifications').insert({
      recipient_email: targetUser.email,
      subject,
      body: htmlContent,
      notification_type: `role_${action}`,
      status: 'sent',
    });

    console.log(`Role ${action} notification sent to ${targetUser.email} for role ${role}`);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return createErrorResponse(error, corsHeaders);
  }
});

function getRolePermissionsHtml(role: string): string {
  const permissions: Record<string, string[]> = {
    admin: [
      'Full system access and configuration',
      'Manage users and roles',
      'View and edit all projects',
      'Access financial data and reports',
      'Configure system settings',
    ],
    project_manager: [
      'Create and manage projects',
      'Assign tasks and manage team members',
      'Track project progress and budgets',
      'Generate project reports',
      'Approve project expenses',
    ],
    viewer: [
      'View project information',
      'Access project documents',
      'View reports and dashboards',
      'Limited editing capabilities',
    ],
    site_supervisor: [
      'Manage on-site activities',
      'Update construction progress',
      'Upload site photos and documents',
      'Manage site personnel',
    ],
    admin_office: [
      'Administrative tasks',
      'Document management',
      'Support project managers',
      'Handle office operations',
    ],
    client: [
      'View assigned projects',
      'Access project updates and reports',
      'Approve quotes and budgets',
      'Communication with project team',
    ],
    accountant: [
      'Access financial records',
      'Manage invoices and payments',
      'Generate financial reports',
      'Track project budgets',
    ],
  };

  const rolePermissions = permissions[role] || ['Access to assigned features'];
  
  return `
    <ul>
      ${rolePermissions.map(perm => `<li>${perm}</li>`).join('')}
    </ul>
  `;
}
