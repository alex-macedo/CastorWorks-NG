import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user has admin role
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = userRoles?.some((r: { role: string }) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all user_roles to get user IDs and roles
    const { data: allUserRoles, error: allRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    if (allRolesError) {
      console.error('Error fetching all user roles:', allRolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group roles by user_id
    const rolesByUser: Record<string, string[]> = {};
    const userIds = new Set<string>();

    allUserRoles?.forEach((item: { user_id: string; role: string }) => {
      if (!rolesByUser[item.user_id]) {
        rolesByUser[item.user_id] = [];
      }
      rolesByUser[item.user_id].push(item.role);
      userIds.add(item.user_id);
    });

    // Fetch user details from auth.users using admin client
    const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();

    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user profiles for display names and avatars
    const { data: userProfiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, display_name, avatar_url');

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      // Don't fail completely if profiles can't be fetched
    }

    // Create a map of user_id to profile data
    const profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {};
    userProfiles?.forEach((profile: { user_id: string; display_name: string; avatar_url: string | null }) => {
      profileMap[profile.user_id] = {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      };
    });

    // Build the response with user emails, profiles, and roles
    const usersWithRoles: UserWithRoles[] = [];
    
    for (const userId of Array.from(userIds)) {
      const authUser = authUsers.users.find((u: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }) => u.id === userId);
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
  }
});
