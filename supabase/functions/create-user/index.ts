/**
 * Create-user Edge Function: creates Auth users via the Admin API.
 * Calls GoTrue on an internal URL (AUTH_INTERNAL_URL) so the service role JWT
 * never goes through Kong, avoiding 403 bad_jwt (token corruption) when Kong
 * alters the Authorization header.
 *
 * Required env: SUPABASE_SERVICE_ROLE_KEY.
 * Optional: AUTH_INTERNAL_URL (e.g. http://auth:9999). If unset, uses SUPABASE_URL (request goes through Kong).
 *
 * Request body:
 * {
 *   email: string (required)
 *   password: string (required - used for initial creation)
 *   display_name?: string
 *   roles?: string[] (e.g. ["viewer", "project_manager"])
 *   send_invite?: boolean (if true, sets email_confirm: false to send verification email)
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: object, status: number, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...headers },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!serviceRoleKey) {
    console.error("create-user: SUPABASE_SERVICE_ROLE_KEY not set");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  let body: {
    email?: string;
    password?: string;
    display_name?: string;
    roles?: string[];
    send_invite?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
  const roles = Array.isArray(body.roles) ? body.roles.filter((r) => typeof r === "string") : [];
  const sendInvite = body.send_invite === true;

  if (!email || !password) {
    return jsonResponse({ error: "email and password are required" }, 400);
  }

  // Prefer internal Auth URL so the JWT is not sent through Kong (avoids corruption).
  const authBase = Deno.env.get("AUTH_INTERNAL_URL")?.trim() || Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") || "";
  const adminUsersUrl = `${authBase}/auth/v1/admin/users`;

  const res = await fetch(adminUsersUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: !sendInvite, // If send_invite, set to false so Supabase sends verification email
    }),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 200) };
  }

  if (!res.ok) {
    const msg = typeof data === "object" && data !== null && "msg" in data ? (data as { msg?: string }).msg : text.slice(0, 200);
    console.error("create-user: Auth admin/users failed", res.status, msg);
    return jsonResponse(
      { error: "Failed to create user", details: msg },
      res.status >= 400 && res.status < 500 ? res.status : 502
    );
  }

  // Get the created user ID
  const createdUser = data as { id?: string };
  const userId = createdUser.id;

  if (!userId) {
    console.error("create-user: No user ID returned from Auth");
    return jsonResponse({ error: "Failed to retrieve created user ID" }, 500);
  }

  // Create user profile
  const { error: profileError } = await supabaseAdmin.from("user_profiles").insert({
    id: userId,
    email,
    display_name: displayName || null,
  });

  if (profileError) {
    console.error("create-user: Failed to create user profile", profileError);
    // Continue anyway - the auth user was created
  }

  // Assign roles if provided
  if (roles.length > 0) {
    const roleRecords = roles.map((role) => ({
      user_id: userId,
      role,
    }));

    const { error: rolesError } = await supabaseAdmin.from("user_roles").insert(roleRecords);

    if (rolesError) {
      console.error("create-user: Failed to assign roles", rolesError);
      // Continue anyway - the user was created
    }
  }

  const message = sendInvite
    ? "User created successfully. Invitation email sent."
    : "User created successfully.";

  return jsonResponse({ success: true, message, userId }, 201);
});
