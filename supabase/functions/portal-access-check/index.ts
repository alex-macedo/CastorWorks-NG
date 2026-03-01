import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ enabled: false, reason: "missing_token" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ enabled: false, reason: "invalid_user" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    // Check roles for admin or project_manager; fallback to basic profile presence
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      // If roles table is blocked, allow access based on authenticated session
      return new Response(JSON.stringify({ enabled: true, reason: "session_only" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const roleNames = (roles ?? []).map((r: any) => r.role);
    const isAdmin = roleNames.includes("admin");
    const isPM = roleNames.includes("project_manager");

    // Enabled if admin/PM or at least authenticated (temporary policy bypass)
    const enabled = isAdmin || isPM || !!user.id;
    return new Response(JSON.stringify({ enabled, reason: enabled ? "ok" : "role_missing" }), { status: enabled ? 200 : 403, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ enabled: false, error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
