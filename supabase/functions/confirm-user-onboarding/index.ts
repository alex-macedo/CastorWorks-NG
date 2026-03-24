import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { sendOnboardingCompleteEmail } from "../_shared/sendOnboardingCompleteEmail.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AppRole = 'admin' | 'project_manager' | 'site_supervisor' | 'admin_office' | 'viewer' | 'accountant' | 'editor' | 'architect' | 'global_admin' | 'client';

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
    const body = await req.json() as { userId?: string; defaultRole?: AppRole };
    const { userId, defaultRole = 'viewer' } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
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

      // Fetch the auth user to confirm they exist and get their email
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const authUserRes = await fetch(
        `${authInternalUrl}/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${serviceRoleKey}` } }
      );

      if (!authUserRes.ok) {
        return new Response(
          JSON.stringify({ error: 'User not found in auth' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const authUser = await authUserRes.json() as {
        id: string;
        email?: string;
        user_metadata?: { full_name?: string; name?: string };
      };

      const userEmail = authUser.email ?? '';
      const displayName = authUser.user_metadata?.full_name
        ?? authUser.user_metadata?.name
        ?? userEmail.split('@')[0];

      // Idempotently insert user_profiles
      const existingProfile = await conn.queryObject<{ user_id: string }>({
        text: 'SELECT user_id FROM user_profiles WHERE user_id = $1',
        args: [userId],
      });

      if (existingProfile.rows.length === 0) {
        // Get company_id from a company (first available)
        const companyRes = await conn.queryObject<{ id: string }>({
          text: 'SELECT id FROM companies LIMIT 1',
          args: [],
        });
        const companyId = companyRes.rows[0]?.id ?? null;

        await conn.queryObject({
          text: `INSERT INTO user_profiles (user_id, display_name, email, company_id)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id) DO NOTHING`,
          args: [userId, displayName, userEmail, companyId],
        });
        console.log(`Created user_profiles for ${userId}`);
      } else {
        console.log(`user_profiles already exists for ${userId}, skipping insert`);
      }

      // Idempotently insert user_roles
      const existingRoles = await conn.queryObject<{ user_id: string }>({
        text: 'SELECT user_id FROM user_roles WHERE user_id = $1',
        args: [userId],
      });

      if (existingRoles.rows.length === 0) {
        await conn.queryObject({
          text: `INSERT INTO user_roles (user_id, role)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
          args: [userId, defaultRole],
        });
        console.log(`Assigned role '${defaultRole}' to ${userId}`);
      } else {
        console.log(`user_roles already exist for ${userId}, skipping`);
      }

      // Idempotently insert user_preferences
      const existingPrefs = await conn.queryObject<{ user_id: string }>({
        text: 'SELECT user_id FROM user_preferences WHERE user_id = $1',
        args: [userId],
      });

      if (existingPrefs.rows.length === 0) {
        await conn.queryObject({
          text: `INSERT INTO user_preferences (
                   user_id, language, date_format,
                   notification_project_updates, notification_financial_alerts,
                   notification_schedule_changes, notification_material_delivery
                 )
                 VALUES ($1, 'en-US', 'MM/DD/YYYY', true, true, true, true)
                 ON CONFLICT (user_id) DO NOTHING`,
          args: [userId],
        });
        console.log(`Created user_preferences for ${userId}`);
      } else {
        console.log(`user_preferences already exist for ${userId}, skipping`);
      }

      // Send welcome / onboarding-complete email
      await sendOnboardingCompleteEmail({ userEmail, userName: displayName });

      console.log(`Onboarding confirmed for user ${userId} (${userEmail})`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error in confirm-user-onboarding:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    await pool.end();
  }
});
