/**
 * weather-forecast - Get weather data for project location
 *
 * Handles:
 * - Fetching weather forecast
 * - Caching weather data
 * - Location-based queries
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { authenticateRequest } from '../_shared/authorization.ts'
import { createErrorResponse } from '../_shared/errorHandler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user, error: authError } = await authenticateRequest(req)
    if (authError || !user) {
      return createErrorResponse('Unauthorized', 401, corsHeaders)
    }

    const { latitude, longitude, project_id } = await req.json()

    console.log('[weather-forecast] Fetching weather:', {
      latitude,
      longitude,
      project_id,
    })

    // TODO: Integrate with weather API (OpenWeatherMap, WeatherAPI, etc.)
    // For now, return mock data
    const mockWeather = {
      temperature: 24,
      humidity: 65,
      condition: 'Partly Cloudy',
      wind_speed: 12,
      forecast: [
        { day: 'Today', high: 26, low: 18, condition: 'Sunny' },
        { day: 'Tomorrow', high: 25, low: 17, condition: 'Cloudy' },
        { day: 'Next Day', high: 22, low: 15, condition: 'Rainy' },
      ],
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: mockWeather,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('[weather-forecast] Error:', error)
    return createErrorResponse(error.message, 500, corsHeaders)
  }
})
