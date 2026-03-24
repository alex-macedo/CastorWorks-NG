import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmailViaHostinger } from "../_shared/providers/index.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MilestoneNotificationRequest {
  projectId: string;
  milestones: Array<{
    id: string;
    name: string;
    description?: string;
    due_date: string;
    notify_days_before: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { projectId, milestones }: MilestoneNotificationRequest = await req.json();

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name, client_id")
      .eq("id", projectId)
      .single();

    if (projectError) throw projectError;

    // Get project team members
    const { data: teamMembers, error: teamError } = await supabase
      .from("project_team_members")
      .select("user_id, profiles!inner(email, full_name)")
      .eq("project_id", projectId);

    if (teamError) throw teamError;

    // Send email to each team member
    const emailPromises = teamMembers.map(async (member: any) => {
      if (!member.profiles?.email) return null;

      const today = new Date();
      const milestonesList = milestones.map(m => {
        const dueDate = new Date(m.due_date);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <strong>${m.name}</strong>
              ${m.description ? `<br><span style="color: #6b7280; font-size: 14px;">${m.description}</span>` : ''}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              <span style="background: ${daysUntil <= 3 ? '#fee2e2' : '#dbeafe'}; color: ${daysUntil <= 3 ? '#991b1b' : '#1e40af'}; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500;">
                ${daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const hostingerFromEmail = Deno.env.get('HOSTINGER_EMAIL_ACCOUNT')
        ?? Deno.env.get('HOSTINGER_SMTP_USER');
      if (!hostingerFromEmail) {
        throw new Error('Hostinger SMTP not configured');
      }

      return await sendEmailViaHostinger({
        fromEmail: hostingerFromEmail,
        fromName: 'Project Management',
        to: [member.profiles.email],
        subject: `🎯 Upcoming Milestones - ${project.name}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🎯 Upcoming Milestones</h1>
              </div>
              
              <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Hello ${member.profiles.full_name || 'Team Member'},
                </p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  The following milestones for <strong>${project.name}</strong> are coming up soon:
                </p>

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <thead>
                    <tr style="background: #f9fafb;">
                      <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Milestone</th>
                      <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Due Date</th>
                      <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Time Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${milestonesList}
                  </tbody>
                </table>

                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  Please ensure all necessary preparations are in place to meet these milestones on time.
                </p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="font-size: 14px; color: #6b7280; margin: 0;">
                    Best regards,<br>
                    Project Management System
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Milestone notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed,
        message: `Notifications sent to ${successful} team member${successful !== 1 ? 's' : ''}`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending milestone notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
