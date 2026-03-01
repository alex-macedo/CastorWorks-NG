import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceRoleClient } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code) {
      throw new Error('Missing authorization code');
    }

    // Decode state to get project info using atob (Web API)
    let projectId: string | null = null;
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        projectId = stateData.projectId || null;
      } catch {
        console.log('Invalid state parameter');
      }
    }

    // Get integration settings
    const supabaseClient = createServiceRoleClient();
    
    const { data: integrationSettings } = await supabaseClient
      .from('integration_settings')
      .select('configuration')
      .eq('integration_type', 'google_calendar')
      .single();

    const config = integrationSettings?.configuration || {};
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || config.client_id;
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || config.client_secret;
    const redirectUri = Deno.env.get('GOOGLE_CALENDAR_REDIRECT_URI') || config.redirect_uri;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth not configured');
    }

    // Exchange code for tokens
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenParams = new URLSearchParams();
    tokenParams.set('code', code);
    tokenParams.set('client_id', clientId);
    tokenParams.set('client_secret', clientSecret);
    tokenParams.set('redirect_uri', redirectUri);
    tokenParams.set('grant_type', 'authorization_code');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to exchange code for tokens: ${errorText}`);
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Get user info to get email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userInfoResponse.json();
    const userEmail = userInfo.email;

    // Calculate expires_at
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Store tokens - we need the user_id from the session
    // Since this is called from browser redirect, we'll return the tokens to be stored by the client
    // In production, you'd use a secure session or JWT to identify the user
    
    console.log('Successfully exchanged OAuth code for tokens');

    // Return success with tokens (in production, you'd store these server-side)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Google Calendar connected successfully',
        email: userEmail,
        expiresAt: expiresAt,
        projectId: projectId,
        // For demo purposes - in production, store tokens server-side
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expires_at: expiresAt
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          // Redirect to success page
          'Location': '/settings/integrations?google_calendar=connected'
        },
        status: 302
      }
    );
  } catch (error) {
    console.error('Error in google-calendar-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Redirect to error page
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Location': `/settings/integrations?google_calendar=error&message=${encodeURIComponent(errorMessage)}`
        },
        status: 302
      }
    );
  }
});
