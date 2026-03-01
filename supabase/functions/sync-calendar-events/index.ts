import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, createServiceRoleClient, verifyProjectAdminAccess } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, accessToken } = await req.json();

    if (!projectId) {
      throw new Error('projectId is required');
    }

    const { user } = await authenticateRequest(req);

    const supabaseClient = createServiceRoleClient();

    await verifyProjectAdminAccess(user.id, projectId, supabaseClient);

    console.log(`Syncing calendar events for project ${projectId}`);

    // Check if Google Calendar integration is enabled
    const { data: integrationSettings } = await supabaseClient
      .from('integration_settings')
      .select('*')
      .eq('integration_type', 'google_calendar')
      .single();

    if (!integrationSettings?.is_enabled) {
      throw new Error('Google Calendar integration is not enabled');
    }

    // Fetch project details
    const { data: project } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    // Fetch all activities for the project
    const { data: activities } = await supabaseClient
      .from('project_activities')
      .select('*')
      .eq('project_id', projectId)
      .not('start_date', 'is', null)
      .not('end_date', 'is', null);

    if (!activities || activities.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No activities with dates to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let syncedCount = 0;

    // Sync each activity to Google Calendar
    for (const activity of activities) {
      // Check if event already exists
      const { data: existingEvent } = await supabaseClient
        .from('calendar_events')
        .select('*')
        .eq('activity_id', activity.id)
        .eq('calendar_provider', 'google')
        .single();

      const eventData = {
        summary: `${project.name} - ${activity.name}`,
        description: `Activity: ${activity.name}\nProject: ${project.name}`,
        start: {
          date: activity.start_date,
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          date: activity.end_date,
          timeZone: 'America/Sao_Paulo',
        },
      };

      try {
        if (existingEvent?.external_event_id) {
          // Update existing event
          const updateResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEvent.external_event_id}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(eventData),
            }
          );

          if (updateResponse.ok) {
            await supabaseClient
              .from('calendar_events')
              .update({ synced_at: new Date().toISOString() })
              .eq('id', existingEvent.id);
            syncedCount++;
          }
        } else {
          // Create new event
          const createResponse = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(eventData),
            }
          );

          if (createResponse.ok) {
            const createdEvent = await createResponse.json();

            await supabaseClient
              .from('calendar_events')
              .insert({
                project_id: projectId,
                activity_id: activity.id,
                external_event_id: createdEvent.id,
                calendar_provider: 'google',
                event_title: eventData.summary,
                event_description: eventData.description,
                start_date: new Date(activity.start_date).toISOString(),
                end_date: new Date(activity.end_date).toISOString(),
                synced_at: new Date().toISOString(),
              });
            syncedCount++;
          }
        }
      } catch (eventError) {
        console.error(`Error syncing activity ${activity.id}:`, eventError);
        // Continue with other activities
      }
    }

    console.log(`Synced ${syncedCount} calendar events`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        total: activities.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-calendar-events:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status =
      errorMessage === 'Unauthorized'
        ? 401
        : errorMessage.includes('Access denied') || errorMessage.includes('Administrative access')
        ? 403
        : 500;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
