import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const authInternalUrl = Deno.env.get('GOTRUE_URL') ?? 'http://auth:9999';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Resolve caller identity
    const callerUserRes = await fetch(`${authInternalUrl}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!callerUserRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const callerUser = await callerUserRes.json();

    // Parse body
    const body = await req.json() as { userId?: string };
    const { userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conn = await pool.connect();
    try {
      // Verify caller is admin
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

      // Safety: only allow deletion if the user does NOT yet have a profile
      // (i.e. still truly "pending").  Admins can force-delete with forceDelete flag.
      const body2 = body as { userId?: string; forceDelete?: boolean };
      if (!body2.forceDelete) {
        const profileCheck = await conn.queryObject<{ user_id: string }>({
          text: 'SELECT user_id FROM user_profiles WHERE user_id = $1',
          args: [userId],
        });
        if (profileCheck.rows.length > 0) {
          return new Response(
            JSON.stringify({ error: 'User already has a profile and cannot be deleted from this panel. Use the full user management section.' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } finally {
      conn.release();
    }

    // Delete the user via the GoTrue admin API
    const deleteRes = await fetch(`${authInternalUrl}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      console.error('GoTrue delete failed:', deleteRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${errText}` }),
        { status: deleteRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Pending user ${userId} deleted by admin ${callerUser.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in delete-pending-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    await pool.end();
  }
});
