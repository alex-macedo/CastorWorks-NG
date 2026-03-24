import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserWithRoles {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const pool = getPool();

  try {

    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user JWT by calling Auth directly (bypasses Kong key-auth which rejects user JWTs)
    const token = authHeader.replace('Bearer ', '');
    const authInternalUrl = Deno.env.get('GOTRUE_URL') ?? 'http://auth:9999';
    const userRes = await fetch(`${authInternalUrl}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) {
      console.error('Auth error:', userRes.status, await userRes.text());
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user = await userRes.json();

    // Query user_roles and user_profiles via direct DB (bypasses Kong/PostgREST auth issues)
    const conn = await pool.connect();
    let allUserRolesRows: { user_id: string; role: string }[] = [];
    let userProfilesRows: { user_id: string; display_name: string; avatar_url: string | null }[] = [];
    try {
      const adminRoles = await conn.queryObject<{ role: string }>({
        text: "SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'",
        args: [user.id],
      });
      const isAdmin = adminRoles.rows && adminRoles.rows.length > 0;
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const allUserRolesRes = await conn.queryObject<{ user_id: string; role: string }>({
        text: "SELECT user_id, role FROM user_roles",
        args: [],
      });
      const userProfilesRes = await conn.queryObject<{ user_id: string; display_name: string; avatar_url: string | null }>({
        text: "SELECT user_id, display_name, avatar_url FROM user_profiles",
        args: [],
      });
      allUserRolesRows = allUserRolesRes.rows || [];
      userProfilesRows = userProfilesRes.rows || [];
    } finally {
      conn.release();
    }

    // Group roles by user_id
    const rolesByUser: Record<string, string[]> = {};
    const userIds = new Set<string>();
    allUserRolesRows.forEach((item) => {
      if (!rolesByUser[item.user_id]) rolesByUser[item.user_id] = [];
      rolesByUser[item.user_id].push(item.role);
      userIds.add(item.user_id);
    });
    userProfilesRows.forEach((profile) => userIds.add(profile.user_id));

    const profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {};
    userProfilesRows.forEach((profile) => {
      profileMap[profile.user_id] = {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      };
    });

    // Fetch auth user details via direct Auth admin API (bypasses Kong key-auth)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authUsersRes = await fetch(
      `${authInternalUrl}/admin/users?per_page=1000&page=1`,
      { headers: { Authorization: `Bearer ${serviceRoleKey}` } }
    );

    if (!authUsersRes.ok) {
      console.error('Error fetching auth users:', authUsersRes.status, await authUsersRes.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUsersData = await authUsersRes.json();
    const authUsers = authUsersData?.users ?? [];

    const authUserMap: Record<string, { email?: string; created_at: string; last_sign_in_at?: string | null }> = {};
    authUsers.forEach((u: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }) => {
      authUserMap[u.id] = {
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      };
    });

    const userIdArray = Array.from(userIds);

    // Build the response with user emails, profiles, and roles
    const usersWithRoles: UserWithRoles[] = [];
    
    for (const userId of userIdArray) {
      const authUser = authUserMap[userId];
      if (authUser) {
        const profile = profileMap[userId];
        usersWithRoles.push({
          id: userId,
          email: authUser.email || `user-${userId.slice(0, 8)}`,
          display_name: profile?.display_name || authUser.email?.split('@')[0] || `User ${userId.slice(0, 8)}`,
          avatar_url: profile?.avatar_url || null,
          roles: rolesByUser[userId] || [],
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at || null,
        });
      }
    }

    usersWithRoles.sort((a, b) => a.email.localeCompare(b.email));

    console.log(`Fetched ${usersWithRoles.length} users with roles and profiles`);

    return new Response(
      JSON.stringify({ users: usersWithRoles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-users-with-roles:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    await pool.end();
  }
});
