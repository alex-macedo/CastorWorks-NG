import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.35.0';

// Edge function that returns pending quotes scoped to the authenticated user's client(s).
// It accepts no body; it reads the Supabase auth cookie / Authorization header and
// resolves the session user. It then finds clients by email and returns pending quotes
// for projects owned by that client.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase env not found for edge function');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (req: Request) => {
  try {
    // Verify the session from the Authorization header or cookie
    const authHeader = req.headers.get('authorization') || '';

    // Get user from cookie/header using auth admin endpoint
    const token = authHeader.replace('Bearer ', '') || null;

    // If no token, return 401
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing auth token' }), { status: 401 });
    }

    // Use supabase auth to get user associated with token
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
    }

    const user = userData.user;

    // Find clients linked to this user's email
    const userEmail = user.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ quotes: [], clientFound: false }), { status: 200 });
    }

    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .select('id')
      .eq('email', userEmail);

    if (clientsErr) throw clientsErr;

    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ quotes: [], clientFound: false }), { status: 200 });
    }

    const clientIds = clients.map((c: any) => c.id);

    // Projects for those clients
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select('id')
      .in('client_id', clientIds);

    if (projErr) throw projErr;

    const projectIds = (projects || []).map((p: any) => p.id);
    if (projectIds.length === 0) {
      return new Response(JSON.stringify({ quotes: [], clientFound: true }), { status: 200 });
    }

    // Purchase requests
    const { data: purchaseRequests, error: prErr } = await supabase
      .from('project_purchase_requests')
      .select('id')
      .in('project_id', projectIds);

    if (prErr) throw prErr;

    const purchaseRequestIds = (purchaseRequests || []).map((r: any) => r.id);
    if (purchaseRequestIds.length === 0) {
      return new Response(JSON.stringify({ quotes: [], clientFound: true }), { status: 200 });
    }

    // Items
    const { data: items, error: itemsErr } = await supabase
      .from('purchase_request_items')
      .select('id')
      .in('request_id', purchaseRequestIds);

    if (itemsErr) throw itemsErr;

    const itemIds = (items || []).map((i: any) => i.id);
    if (itemIds.length === 0) {
      return new Response(JSON.stringify({ quotes: [], clientFound: true }), { status: 200 });
    }

    // Finally quotes
    const { data: quotes, error: qErr } = await supabase
      .from('quotes')
      .select('*, suppliers(name), purchase_request_items(description, request_id)')
      .in('purchase_request_item_id', itemIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (qErr) throw qErr;

    return new Response(JSON.stringify({ quotes: quotes || [], clientFound: true }), { status: 200 });
  } catch (err: any) {
    console.error('Function error:', err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), { status: 500 });
  }
});
