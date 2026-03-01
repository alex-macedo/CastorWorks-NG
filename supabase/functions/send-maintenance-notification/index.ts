import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import React from "https://esm.sh/react@18.3.1";
import { renderAsync } from "https://esm.sh/@react-email/components@0.0.22";
import { MaintenanceAlertEmail } from "./_templates/maintenance-alert.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MaintenanceNotificationRequest {
  type: "scheduled" | "activated";
  title?: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  estimatedTime?: string;
  contactEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting maintenance notification process");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header found");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User authenticated:", user.email);

    // Verify admin role
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError || !roles?.some(r => r.role === "admin")) {
      console.error("User is not admin:", rolesError);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const requestData: MaintenanceNotificationRequest = await req.json();
    console.log("Request data:", requestData);

    // Get all user emails from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("email")
      .not("email", "is", null);

    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
      throw new Error("Failed to fetch user emails");
    }

    const userEmails = profiles
      .map(p => p.email)
      .filter((email): email is string => email !== null);

    console.log(`Found ${userEmails.length} users to notify`);

    if (userEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Render the email template
    const html = await renderAsync(
      React.createElement(MaintenanceAlertEmail, {
        type: requestData.type,
        title: requestData.title,
        description: requestData.description,
        scheduledStart: requestData.scheduledStart,
        scheduledEnd: requestData.scheduledEnd,
        estimatedTime: requestData.estimatedTime,
        contactEmail: requestData.contactEmail,
      })
    );

    console.log("Email template rendered successfully");

    // Send email to all users
    const subject = requestData.type === "scheduled"
      ? `Scheduled Maintenance: ${requestData.title}`
      : "System Maintenance Notice";

    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: "System Notifications <onboarding@resend.dev>",
      to: userEmails,
      subject,
      html,
    });

    if (emailError) {
      console.error("Error sending emails:", emailError);
      throw emailError;
    }

    console.log("Emails sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification sent to ${userEmails.length} users`,
        emailId: emailResponse?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-maintenance-notification function:", error);
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
