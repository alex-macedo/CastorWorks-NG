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
 *   tenant_id?: string       // Optional: assign user to a workspace
 *   tenant_role?: string     // Required if tenant_id provided: role within the workspace
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
    const { data, error } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error) {
      console.error("Error checking admin role:", error);
      return false;
    }

    return data !== null;
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
    const _supabaseAnon = createClient(supabaseUrl, ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the user JWT by calling Auth directly (bypasses Kong key-auth which rejects user JWTs)
    const token = authHeader.replace("Bearer ", "");
    const authInternalUrl = Deno.env.get("GOTRUE_URL") ?? "http://auth:9999";
    const userRes = await fetch(`${authInternalUrl}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) {
      console.error("Auth error:", userRes.status, await userRes.text());
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userData = await userRes.json();
    const user = { id: userData.id };

    // Check if user has admin role using the PostgreSQL function
    const isAdmin = await verifyAdminRole(user.id, supabaseAdmin);
    if (!isAdmin) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    // Parse request body
    const body = await req.json();
    // Note: send_invite is kept for potential future use (e.g., sending welcome emails via SMTP)
    // but email_confirm is always true so admin-created users can log in immediately
    const { email, password, display_name, roles, tenant_id, tenant_role } = body;

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

    // Create user via Supabase Admin SDK
    console.log(`Creating user: ${email}`);

    const rolesToAssign = roles && roles.length > 0 ? roles : ["viewer"];
    const displayName = display_name || email.split("@")[0];

    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Always confirm email for admin-created users (they're trusted)
      user_metadata: {
        display_name: displayName,
      },
    });

    let userId: string;

    if (createError) {
      // User may already exist - try to assign roles to existing user
      const errMsg = (createError.message || "").toLowerCase();
      const isExistingUser =
        errMsg.includes("already") ||
        errMsg.includes("registered") ||
        errMsg.includes("exists") ||
        errMsg.includes("duplicate");

      if (isExistingUser) {
        const { data: existingUserId, error: lookupError } = await supabaseAdmin.rpc(
          "get_auth_user_id_by_email",
          { p_email: email }
        );

        if (lookupError || !existingUserId) {
          console.error("Lookup existing user failed:", lookupError);
          return jsonResponse(
            {
              error:
                "A user with this email already exists, but we could not look them up. Please try again or contact support.",
            },
            400
          );
        }

        userId = existingUserId as string;
        console.log(`User ${email} already exists (${userId}), assigning roles`);
      } else {
        console.error("Auth API error:", createError);
        return jsonResponse(
          { error: createError.message || "Failed to create user in Auth" },
          400
        );
      }
    } else {
      userId = newUserData!.user.id;
      console.log(`User created in Auth: ${userId}`);
    }

    // Upsert user profile (create or update)
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          user_id: userId,
          display_name: displayName,
        },
        { onConflict: "user_id", ignoreDuplicates: false }
      );

    if (profileError) {
      console.error("Error upserting user profile:", profileError);
      // Don't fail completely
    }

    // Assign roles (insert, ignore conflicts for existing role assignments)
    const roleInserts = rolesToAssign.map((role: string) => ({
      user_id: userId,
      role,
    }));

    const { error: rolesInsertError } = await supabaseAdmin
      .from("user_roles")
      .upsert(roleInserts, {
        onConflict: "user_id,role",
        ignoreDuplicates: true,
      });

    if (rolesInsertError) {
      console.error("Error assigning roles:", rolesInsertError);
      // Don't fail completely
    }

    // Assign user to workspace if tenant_id provided
    let tenantAssigned = false;
    if (tenant_id && tenant_role) {
      const { error: tenantUserError } = await supabaseAdmin
        .from("tenant_users")
        .upsert(
          {
            tenant_id,
            user_id: userId,
            role: tenant_role,
            is_owner: false,
            invited_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,user_id", ignoreDuplicates: false }
        );

      if (tenantUserError) {
        console.error("Error assigning user to workspace:", tenantUserError);
        // Don't fail completely - user is created, just not assigned to workspace
      } else {
        tenantAssigned = true;
        console.log(`User ${email} assigned to workspace ${tenant_id} with role ${tenant_role}`);
      }
    }

    const isNewUser = !createError;
    console.log(
      `User ${email} ${isNewUser ? "created" : "roles updated"} with roles: ${rolesToAssign.join(", ")}${tenantAssigned ? ` and assigned to workspace` : ""}`
    );

    return jsonResponse(
      {
        success: true,
        message: isNewUser
          ? "User created successfully"
          : "User already exists. Roles have been assigned.",
        user: {
          id: userId,
          email,
          display_name: displayName,
          roles: rolesToAssign,
          tenant_id: tenantAssigned ? tenant_id : undefined,
          tenant_role: tenantAssigned ? tenant_role : undefined,
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
