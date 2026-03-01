import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { authenticateRequest, verifyAdminRole, createServiceRoleClient } from '../_shared/authorization.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the request
    const { user } = await authenticateRequest(req);
    console.log('Authenticated user:', user.id);
    
    // 2. Verify admin role (only admins should log events)
    await verifyAdminRole(user.id);
    console.log('Admin role verified for user:', user.id);
    
    const body = await req.json();
    const { event_key, payload } = body;
    
    if (!event_key) {
      return new Response(
        JSON.stringify({ error: 'Missing event_key' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('admin_events')
      .insert([{ 
        event_key, 
        payload,
        user_id: user.id // Track who created the event
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Admin event recorded:', event_key);
    return new Response(
      JSON.stringify({ ok: true, event: data }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('record_admin_event error:', err.message);
    const isAuthError = err.message === 'Unauthorized' || 
                       err.message?.includes('Administrator privileges required') ||
                       err.message?.includes('Access denied');
    
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal error' }), 
      { 
        status: isAuthError ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
