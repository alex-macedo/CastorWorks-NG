import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingUser {
  id: string;
  email: string;
  created_at: string;
  display_name: string | null;
}

function getPool(): Pool {
  const dbUrl = Deno.env.get('SUPABASE_DB_URL');
  if (!dbUrl) throw new Error('SUPABASE_DB_URL is required');
  const url = new URL(dbUrl.replace(/^postgresql:\/\//, 'postgres://'));
  return new Pool(
    {
      database: url.pathname.slice(1) || 'postgres',
      hostname: url.hostname,
      port: parseInt(url.port || '5432', 10),
      user: url.username || 'postgres',
      password: url.password,
      tls: { enabled: false },
    },
    1
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const pool = getPool();

  try {
    // Authenticate request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const authInternalUrl = Deno.env.get('GOTRUE_URL') ?? 'http://auth:9999';

    const userRes = await fetch(`${authInternalUrl}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const callerUser = await userRes.json();

    // Verify caller is admin
    const conn = await pool.connect();
    try {
      const adminCheck = await conn.queryObject<{ role: string }>({
        text: "SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('admin', 'global_admin')",
        args: [callerUser.id],
      });
      if (!adminCheck.rows || adminCheck.rows.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all user_ids that already have a profile
      const profilesRes = await conn.queryObject<{ user_id: string }>({
        text: 'SELECT user_id FROM user_profiles',
        args: [],
      });
      const profileUserIds = new Set(profilesRes.rows.map((r) => r.user_id));

      // Fetch all auth users via admin API
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const authUsersRes = await fetch(
        `${authInternalUrl}/admin/users?per_page=1000&page=1`,
        { headers: { Authorization: `Bearer ${serviceRoleKey}` } }
      );

      if (!authUsersRes.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch auth users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const authUsersData = await authUsersRes.json();
      const allAuthUsers: { id: string; email?: string; created_at: string; user_metadata?: { full_name?: string; name?: string } }[] = authUsersData?.users ?? [];

      // Filter to users without a profile
      const pending: PendingUser[] = allAuthUsers
        .filter((u) => !profileUserIds.has(u.id))
        .map((u) => ({
          id: u.id,
          email: u.email ?? `user-${u.id.slice(0, 8)}`,
          created_at: u.created_at,
          display_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
        }))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      console.log(`Found ${pending.length} pending onboarding users`);

      return new Response(
        JSON.stringify({ users: pending }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error in list-pending-onboarding-users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    await pool.end();
  }
});
