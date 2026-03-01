/**
 * Create-user Edge Function: creates Auth users via the Admin API.
 * Calls GoTrue on an internal URL (AUTH_INTERNAL_URL) so the service role JWT
 * never goes through Kong, avoiding 403 bad_jwt (token corruption) when Kong
 * alters the Authorization header.
 *
 * Required env: SUPABASE_SERVICE_ROLE_KEY.
 * Optional: AUTH_INTERNAL_URL (e.g. http://auth:9999). If unset, uses SUPABASE_URL (request goes through Kong).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

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
      email_confirm: true,
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

  return jsonResponse({ success: true, message: "Account created. Please sign in." }, 201);
});
