import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as _createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest, createServiceRoleClient } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationPayload {
  user_ids?: string[];
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const { user } = await authenticateRequest(req);
    
    // Create service role client for database operations
    const supabaseClient = createServiceRoleClient();
    
    // Verify user has permission to send notifications (admin or site_supervisor)
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (roleError) {
      throw new Error('Failed to verify user permissions');
    }
    
    const allowedRoles = ['admin', 'site_supervisor'];
    const hasPermission = userRoles?.some(r => allowedRoles.includes(r.role));
    
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Admin or Site Supervisor role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: PushNotificationPayload = await req.json();
    const { user_ids, title, body, url, icon, badge, tag, requireInteraction, actions } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get push subscriptions for the specified users or all users if not specified
    let query = supabaseClient
      .from('push_subscriptions')
      .select('*');

    if (user_ids && user_ids.length > 0) {
      query = query.in('user_id', user_ids);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // VAPID keys - These should be stored as secrets
    // Generate your own VAPID keys using: npx web-push generate-vapid-keys
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@engpro.com';

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured');
    }

    // Send push notifications using web-push
    const webpush = await import('https://esm.sh/web-push@3.6.6');
    
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const notificationPayload = JSON.stringify({
      title,
      body,
      url: url || '/supervisor/hub',
      icon: icon || '/favicon.ico',
      badge: badge || '/favicon.ico',
      tag: tag || 'notification',
      requireInteraction: requireInteraction || false,
      actions: actions || [],
    });

    let successCount = 0;
    let failCount = 0;

    // Send to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        successCount++;
      } catch (error: any) {
        console.error('Failed to send push notification:', error);
        failCount++;

        // If subscription is invalid (410 Gone), remove it from database
        if (error?.statusCode === 410) {
          await supabaseClient
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return new Response(
      JSON.stringify({
        message: 'Push notifications sent',
        sent: successCount,
        failed: failCount,
        total: subscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending push notifications:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
