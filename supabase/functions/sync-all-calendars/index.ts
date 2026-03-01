import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceRoleClient } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleEventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
  shared?: number;
}

// Refresh Google OAuth token (reserved for future use)
async function _refreshGoogleToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  return data.access_token;
}

// Get access token for user/project
async function getAccessToken(supabaseClient: any, userId: string, _projectId?: string): Promise<{ token: string; email: string } | null> {
  const { data: tokenData, error } = await supabaseClient
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !tokenData) {
    return null;
  }

  // Check if token is expired and refresh if needed
  if (tokenData.expires_at && new Date(tokenData.expires_at) <= new Date()) {
    // Token expired - would need refresh (simplified here)
    return null;
  }

  return {
    token: tokenData.access_token,
    email: tokenData.email || ''
  };
}

// Transform CastorWorks event to Google Calendar event format
function toGoogleEvent(event: {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  attendees?: string[];
  location?: string;
  isAllDay?: boolean;
}) {
  const googleEvent: any = {
    summary: event.title,
    description: event.description,
  };

  if (event.isAllDay) {
    // All-day events use date format (not datetime)
    const startDate = event.startDate.split('T')[0];
    const endDate = event.endDate.split('T')[0];
    // Google Calendar all-day events end date is exclusive, so add 1 day
    const nextDay = new Date(endDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    googleEvent.start = { date: startDate };
    googleEvent.end = { date: nextDay.toISOString().split('T')[0] };
  } else {
    googleEvent.start = { 
      dateTime: event.startDate, 
      timeZone: 'America/Sao_Paulo' 
    };
    googleEvent.end = { 
      dateTime: event.endDate, 
      timeZone: 'America/Sao_Paulo' 
    };
  }

  if (event.location) {
    googleEvent.location = event.location;
  }

  if (event.attendees && event.attendees.length > 0) {
    googleEvent.attendees = event.attendees.map(email => ({ email }));
  }

  return googleEvent;
}

// Share calendar with specific email using Google Calendar ACL
async function shareCalendarWithUser(
  accessToken: string,
  calendarId: string,
  email: string,
  role: string = 'reader' // reader, writer, freeBusyReader
): Promise<boolean> {
  try {
    const aclUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/acl`;
    
    const response = await fetch(aclUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: role,
        scope: {
          type: 'user',
          value: email
        }
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error sharing calendar:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      projectId, 
      userId,
      eventTypes = ['activities', 'meetings', 'tasks'],
      shareWith = [] // Array of emails to share with
    } = await req.json();

    if (!projectId || !userId) {
      throw new Error('projectId and userId are required');
    }

    const supabaseClient = createServiceRoleClient();

    // Get access token
    const authInfo = await getAccessToken(supabaseClient, userId, projectId);
    if (!authInfo) {
      throw new Error('Google Calendar not connected for this user');
    }

    const { token: accessToken, email: userEmail } = authInfo;

    console.log(`Syncing calendar events for project ${projectId}, user ${userId}`);

    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };

    // 1. Sync project activities
    if (eventTypes.includes('activities')) {
      const { data: activities } = await supabaseClient
        .from('project_activities')
        .select('*')
        .eq('project_id', projectId)
        .not('start_date', 'is', null)
        .not('end_date', 'is', null);

      if (activities) {
        for (const activity of activities) {
          try {
            // Check if event already exists
            const { data: existingEvent } = await supabaseClient
              .from('calendar_events')
              .select('*')
              .eq('activity_id', activity.id)
              .eq('calendar_provider', 'google')
              .maybeSingle();

            const googleEvent = toGoogleEvent({
              title: activity.name,
              description: `Activity: ${activity.name}\nStatus: ${activity.status || 'pending'}`,
              startDate: activity.start_date,
              endDate: activity.end_date,
              isAllDay: true
            });

            if (existingEvent?.external_event_id) {
              // Update
              await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEvent.external_event_id}`,
                {
                  method: 'PUT',
                  headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify(googleEvent)
                }
              );
            } else {
              // Create
              const createResponse = await fetch(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify(googleEvent)
                }
              );

              if (createResponse.ok) {
                const createdEvent = await createResponse.json();
                await supabaseClient.from('calendar_events').insert({
                  project_id: projectId,
                  activity_id: activity.id,
                  external_event_id: createdEvent.id,
                  calendar_provider: 'google',
                  event_title: activity.name,
                  start_date: activity.start_date,
                  end_date: activity.end_date,
                  synced_at: new Date().toISOString()
                });
              }
            }
            result.synced++;
          } catch (err) {
            result.errors.push(`Activity ${activity.id}: ${err}`);
          }
        }
      }
    }

    // 2. Sync architect meetings
    if (eventTypes.includes('meetings')) {
      const { data: meetings } = await supabaseClient
        .from('architect_meetings')
        .select('*')
        .eq('project_id', projectId)
        .not('meeting_date', 'is', null);

      if (meetings) {
        for (const meeting of meetings) {
          try {
            const startDateTime = new Date(meeting.meeting_date);
            const endDateTime = new Date(meeting.meeting_date);
            endDateTime.setHours(endDateTime.getHours() + (meeting.duration_minutes || 60) / 60);

            const { data: existingEvent } = await supabaseClient
              .from('calendar_events')
              .select('*')
              .eq('external_event_id', `meeting_${meeting.id}`)
              .eq('calendar_provider', 'google')
              .maybeSingle();

            const googleEvent = toGoogleEvent({
              title: meeting.title || 'Architect Meeting',
              description: meeting.notes || '',
              startDate: startDateTime.toISOString(),
              endDate: endDateTime.toISOString(),
              isAllDay: false
            });

            if (existingEvent?.external_event_id) {
              await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEvent.external_event_id}`,
                {
                  method: 'PUT',
                  headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify(googleEvent)
                }
              );
            } else {
              const createResponse = await fetch(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify(googleEvent)
                }
              );

              if (createResponse.ok) {
                const createdEvent = await createResponse.json();
                await supabaseClient.from('calendar_events').insert({
                  project_id: projectId,
                  external_event_id: createdEvent.id,
                  calendar_provider: 'google',
                  event_title: meeting.title,
                  start_date: startDateTime.toISOString(),
                  end_date: endDateTime.toISOString(),
                  synced_at: new Date().toISOString()
                });
              }
            }
            result.synced++;
          } catch (err) {
            result.errors.push(`Meeting ${meeting.id}: ${err}`);
          }
        }
      }
    }

    // 3. Share calendar with specified emails (permission-based access)
    if (shareWith && shareWith.length > 0) {
      result.shared = 0;
      for (const email of shareWith) {
        const shared = await shareCalendarWithUser(accessToken, 'primary', email, 'reader');
        if (shared) {
          result.shared++;
        }
      }
      
      // Store shared users in project
      if (result.shared > 0) {
        await supabaseClient
          .from('projects')
          .update({ 
            google_calendar_email: userEmail,
            google_calendar_id: 'primary'
          })
          .eq('id', projectId);
      }
    }

    console.log(`Synced ${result.synced} events, shared with ${result.shared || 0} users`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-all-calendars:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
