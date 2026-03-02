/**
 * Create a new user with roles via Supabase Admin SDK
 * 
 * Request body:
 * {
 *   email: string
 *   password: string
 *   display_name?: string
 *   roles?: string[]
 *   send_invite?: boolean
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function verifyAdminRole(userId: string, client: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await client.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (error) {
      console.error("Error checking admin role:", error);
      return false;
    }

    return Boolean(data);
  } catch (err) {
    console.error("Exception checking admin role:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    // Create Supabase admin client
    const supabaseUrl = SUPABASE_URL;
    const serviceRoleKey = SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Also create an anon client for authentication
    const supabaseAnon = createClient(supabaseUrl, ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the user making the request is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Check if user has admin role using the PostgreSQL function
    const isAdmin = await verifyAdminRole(user.id, supabaseAdmin);
    if (!isAdmin) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    // Parse request body
    const body = await req.json();
    const { email, password, display_name, roles, send_invite } = body;

    // Validate inputs
    if (!email || !password) {
      return jsonResponse({ error: "Email and password are required" }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "Invalid email format" }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ error: "Password must be at least 6 characters" }, 400);
    }

     // Check if user already exists by attempting to look up their email
     // Note: We'll let the Auth API handle the duplicate email check
     // as it's more efficient than listing all users

    // Create user via Supabase Admin SDK
    console.log(`Creating user: ${email}`);
    
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: !send_invite, // If sending invite, user needs to verify email
      user_metadata: {
        display_name: display_name || email.split("@")[0],
      },
    });

    if (createError) {
      console.error("Auth API error:", createError);
      return jsonResponse(
        { error: createError.message || "Failed to create user in Auth" },
        500
      );
    }

    const userId = newUserData.user.id;
    console.log(`User created in Auth: ${userId}`);

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        user_id: userId,
        display_name: display_name || email.split("@")[0],
      });

    if (profileError) {
      console.error("Error creating user profile:", profileError);
      // Don't fail completely if profile creation fails
    }

    // Assign roles (default to viewer if none specified)
    const rolesToAssign = roles && roles.length > 0 ? roles : ["viewer"];
    const roleInserts = rolesToAssign.map((role: string) => ({
      user_id: userId,
      role,
    }));

    const { error: rolesInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert(roleInserts);

    if (rolesInsertError) {
      console.error("Error assigning roles:", rolesInsertError);
      // Don't fail completely if roles assignment fails
    }

    console.log(`User ${email} created successfully with roles: ${rolesToAssign.join(", ")}`);

    return jsonResponse(
      {
        success: true,
        message: "User created successfully",
        user: {
          id: userId,
          email,
          display_name: display_name || email.split("@")[0],
          roles: rolesToAssign,
        },
      },
      201
    );
  } catch (error) {
    console.error("Error in create-user:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: errorMessage }, 500);
  }
});
