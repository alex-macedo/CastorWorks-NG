import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { authenticateRequest } from "../_shared/authorization.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  clientEmail: string;
  clientName: string;
  projectName: string;
  permissions: {
    can_view_documents: boolean;
    can_view_financials: boolean;
    can_download_reports: boolean;
  };
  isUpdate: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    await authenticateRequest(req);

    const {
      clientEmail,
      clientName,
      projectName,
      permissions,
      isUpdate,
    }: NotificationRequest = await req.json();

    console.log("Sending client access notification:", {
      clientEmail,
      projectName,
      isUpdate,
    });

    // Build permissions list
    const permissionsList: string[] = [];
    if (permissions.can_view_documents) permissionsList.push("View documents");
    if (permissions.can_view_financials) permissionsList.push("View financials");
    if (permissions.can_download_reports) permissionsList.push("Download reports");

    const permissionsHtml = permissionsList.length > 0
      ? `<ul style="margin: 16px 0; padding-left: 24px;">
          ${permissionsList.map(p => `<li style="margin: 8px 0;">${p}</li>`).join("")}
        </ul>`
      : `<p style="color: #666;">No specific permissions granted yet.</p>`;

    const subject = isUpdate
      ? `Project Access Updated: ${projectName}`
      : `New Project Access Granted: ${projectName}`;

    const action = isUpdate ? "updated" : "granted";

    const emailResponse = await resend.emails.send({
      from: "EngProApp <onboarding@resend.dev>",
      to: [clientEmail],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; border-bottom: 3px solid #3b82f6;">
                        <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 600;">
                          ${isUpdate ? "Access Updated" : "Welcome!"}
                        </h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                          Hi ${clientName},
                        </p>
                        
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                          Your access to the project <strong style="color: #1f2937;">${projectName}</strong> has been ${action}.
                        </p>
                        
                        <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                          <h2 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                            Your Permissions
                          </h2>
                          ${permissionsHtml}
                        </div>
                        
                        <p style="margin: 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                          You can now access the client portal to view project details, track progress, and access documents.
                        </p>
                        
                        <div style="text-align: center; margin: 32px 0;">
                          <a href="${Deno.env.get("SITE_URL") || "http://localhost:8080"}/portal" 
                             style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Access Client Portal
                          </a>
                        </div>
                        
                        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          If you have any questions about your access, please contact your project manager.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                        <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                          This is an automated notification from EngProApp. Please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    return createErrorResponse(error, corsHeaders);
  }
};

serve(handler);
