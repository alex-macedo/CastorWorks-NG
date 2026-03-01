import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceRoleClient } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createServiceRoleClient();
    
    // Get integration settings for Google Calendar
    const { data: integrationSettings, error: settingsError } = await supabaseClient
      .from('integration_settings')
      .select('configuration')
      .eq('integration_type', 'google_calendar')
      .single();

    if (settingsError || !integrationSettings) {
      throw new Error('Google Calendar integration not configured');
    }

    const config = integrationSettings.configuration || {};
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || config.client_id;
    const redirectUri = Deno.env.get('GOOGLE_CALENDAR_REDIRECT_URI') || config.redirect_uri;

    if (!clientId || !redirectUri) {
      throw new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CALENDAR_REDIRECT_URI environment variables.');
    }

    // Generate state with project info using btoa (Web API)
    const stateObj = JSON.stringify({
      projectId: projectId || null,
      timestamp: Date.now()
    });
    const state = btoa(stateObj);

    // Build OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    oauthUrl.searchParams.set('client_id', clientId);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', scopes.join(' '));
    oauthUrl.searchParams.set('access_type', 'offline');
    oauthUrl.searchParams.set('prompt', 'consent');
    oauthUrl.searchParams.set('state', state);

    console.log('Generated OAuth URL for Google Calendar');

    return new Response(
      JSON.stringify({
        success: true,
        oauthUrl: oauthUrl.toString(),
        state
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-calendar-oauth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: errorMessage.includes('not configured') ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
