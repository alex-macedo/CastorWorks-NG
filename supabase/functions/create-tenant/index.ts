/**
 * Create-tenant Edge Function: creates a tenant and tenant_users row for onboarding.
 * Uses direct DB connection (SUPABASE_DB_URL) so we bypass PostgREST/RLS and avoid
 * PGRST301 JWT issues when the service role JWT is not accepted by PostgREST.
 *
 * Required env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_DB_URL.
 */

import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest } from "../_shared/authorization.ts";

function parseDbUrl(url: string): {
  hostname: string;
  port: number;
  user: string;
  password: string;
  database: string;
} {
  const u = new URL(url.replace(/^postgresql:\/\//, "postgres://"));
  return {
    hostname: u.hostname,
    port: u.port ? parseInt(u.port, 10) : 5432,
    user: u.username || "postgres",
    password: u.password || "",
    database: u.pathname?.replace(/^\//, "") || "postgres",
  };
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: object,
  status: number,
  headers?: Record<string, string>
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...headers },
  });
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "workspace";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let user: { id: string };
  try {
    const auth = await authenticateRequest(req);
    user = auth.user;
  } catch {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { name?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug =
    typeof body.slug === "string"
      ? body.slug.trim() || slugify(name)
      : slugify(name);

  if (!name) {
    return jsonResponse({ error: "name is required" }, 400);
  }

  const dbUrl = Deno.env.get("SUPABASE_DB_URL")?.trim();
  if (!dbUrl) {
    console.error("[create-tenant] SUPABASE_DB_URL not set");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const finalSlug = slug || slugify(name);
  const config = parseDbUrl(dbUrl);
  const pool = new Pool(
    {
      hostname: config.hostname,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      tls: { enabled: false, enforce: false, caCertificates: [] },
    },
    1
  );

  try {
    const conn = await pool.connect();
    try {
      const tenantRes = await conn.queryObject<{ id: string }>({
        text: "INSERT INTO public.tenants (name, slug) VALUES ($1, $2) RETURNING id",
        args: [name, finalSlug],
      });
      const tenantId = tenantRes.rows?.[0]?.id;
      if (!tenantId) {
        return jsonResponse({ error: "Failed to create workspace" }, 500);
      }

      await conn.queryObject({
        text: "INSERT INTO public.tenant_users (tenant_id, user_id, role, is_owner) VALUES ($1, $2, $3, $4)",
        args: [tenantId, user.id, "admin", true],
      });

      return jsonResponse({ id: tenantId }, 201);
    } finally {
      conn.release();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isUniqueViolation = msg.includes("23505") || msg.includes("unique");
    console.error("[create-tenant] DB error:", err);
    return jsonResponse(
      {
        error: isUniqueViolation ? "Slug already in use" : "Failed to create workspace",
      },
      400
    );
  } finally {
    await pool.end();
  }
});
