import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Activity thresholds for construction work (temperatures in Celsius)
interface ActivityThreshold {
  minTemp?: number;
  maxTemp?: number;
  maxPrecip?: number;
  maxWind?: number;
  minHumidity?: number;
  maxHumidity?: number;
}

const ACTIVITY_THRESHOLDS: Record<string, ActivityThreshold> = {
  concrete_pouring: { minTemp: 5, maxTemp: 30, maxPrecip: 0, maxWind: 40, minHumidity: 40, maxHumidity: 70 },
  painting_exterior: { minTemp: 10, maxTemp: 35, maxPrecip: 0, maxWind: 48, minHumidity: 40, maxHumidity: 85 },
  roofing: { minTemp: 0, maxTemp: 40, maxPrecip: 10, maxWind: 64 },
  excavation: { maxPrecip: 30, maxWind: 80 },
  welding: { maxPrecip: 0, maxWind: 32 },
};

// Analyze weather for construction activity safety
const analyzeActivitySafety = (temp: number, humidity: number, windKph: number, precipChance: number) => {
  const results: Record<string, { safe: boolean; reason: string }> = {};

  for (const [activity, thresholds] of Object.entries(ACTIVITY_THRESHOLDS)) {
    let safe = true;
    const reasons: string[] = [];

    if (thresholds.minTemp !== undefined && temp < thresholds.minTemp) {
      safe = false;
      reasons.push(`Temperature too low (${temp}°C < ${thresholds.minTemp}°C)`);
    }
    if (thresholds.maxTemp !== undefined && temp > thresholds.maxTemp) {
      safe = false;
      reasons.push(`Temperature too high (${temp}°C > ${thresholds.maxTemp}°C)`);
    }
    if (thresholds.maxPrecip !== undefined && precipChance > thresholds.maxPrecip) {
      safe = false;
      reasons.push(`Precipitation risk too high (${precipChance}% > ${thresholds.maxPrecip}%)`);
    }
    if (thresholds.maxWind !== undefined && windKph > thresholds.maxWind) {
      safe = false;
      reasons.push(`Wind too strong (${windKph} km/h > ${thresholds.maxWind} km/h)`);
    }
    if (thresholds.minHumidity !== undefined && humidity < thresholds.minHumidity) {
      safe = false;
      reasons.push(`Humidity too low (${humidity}% < ${thresholds.minHumidity}%)`);
    }
    if (thresholds.maxHumidity !== undefined && humidity > thresholds.maxHumidity) {
      safe = false;
      reasons.push(`Humidity too high (${humidity}% > ${thresholds.maxHumidity}%)`);
    }

    results[activity] = { safe, reason: reasons.length > 0 ? reasons.join('; ') : 'All conditions within safe limits' };
  }

  return results;
};

// Calculate overall work suitability score (0-100)
const calculateWorkScore = (temp: number, humidity: number, windKph: number, precipChance: number) => {
  let score = 100;

  // Temperature penalties (ideal: 15-25°C)
  if (temp < 5 || temp > 35) score -= 40;
  else if (temp < 10 || temp > 30) score -= 20;
  else if (temp < 15 || temp > 25) score -= 5;

  // Precipitation penalty
  if (precipChance > 50) score -= 30;
  else if (precipChance > 20) score -= 15;
  else if (precipChance > 0) score -= 5;

  // Wind penalty (km/h)
  if (windKph > 60) score -= 30;
  else if (windKph > 40) score -= 15;
  else if (windKph > 25) score -= 5;

  // Humidity penalty
  if (humidity > 90 || humidity < 30) score -= 15;
  else if (humidity > 80 || humidity < 40) score -= 5;

  return Math.max(0, score);
};

// Determine alert level and generate recommendations
const generateOperationalImpact = (activityResults: Record<string, { safe: boolean; reason: string }>, score: number) => {
  const unsafeActivities = Object.entries(activityResults)
    .filter(([_, result]) => !result.safe)
    .map(([activity]) => activity.replace('_', ' '));

  const safeActivities = Object.entries(activityResults)
    .filter(([_, result]) => result.safe)
    .map(([activity]) => activity.replace('_', ' '));

  let overallRisk: 'low' | 'medium' | 'high' | 'critical';
  let alertLevel: 'normal' | 'warning' | 'critical';

  if (score >= 80) { overallRisk = 'low'; alertLevel = 'normal'; }
  else if (score >= 60) { overallRisk = 'medium'; alertLevel = 'warning'; }
  else if (score >= 40) { overallRisk = 'high'; alertLevel = 'warning'; }
  else { overallRisk = 'critical'; alertLevel = 'critical'; }

  const recommendations: string[] = [];
  if (unsafeActivities.length > 0) {
    recommendations.push(`Delay ${unsafeActivities.slice(0, 2).join(' and ')}`);
  }
  if (safeActivities.length > 0) {
    recommendations.push(`Safe for ${safeActivities.slice(0, 2).join(' and ')}`);
  }
  if (score < 60) {
    recommendations.push('Consider indoor work alternatives');
  }

  return { overallRisk, alertLevel, recommendations, affectedActivities: unsafeActivities, workSuitabilityScore: score };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location = 'Akron, Ohio', temperatureUnit = 'C' } = await req.json();
    const apiKey = Deno.env.get('WEATHER_API_KEY');

    if (!apiKey) {
      throw new Error('Weather API key not configured');
    }

    console.log(`Fetching weather for location: ${location} with unit: ${temperatureUnit}`);

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${location}&days=7&aqi=yes&alerts=no`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('WeatherAPI error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to fetch weather data');
    }

    const data = await response.json();
    console.log('Weather data fetched successfully');

    // Determine which temperature fields to use based on unit preference
    const isFahrenheit = temperatureUnit === 'F';
    const tempField = isFahrenheit ? 'temp_f' : 'temp_c';
    const feelsLikeField = isFahrenheit ? 'feelslike_f' : 'feelslike_c';
    const maxTempField = isFahrenheit ? 'maxtemp_f' : 'maxtemp_c';
    const minTempField = isFahrenheit ? 'mintemp_f' : 'mintemp_c';
    const dewPointField = isFahrenheit ? 'dewpoint_f' : 'dewpoint_c';

    // Debug: Log the actual temperature values from API
    console.log('DEBUG - API Response temps:', {
      temp_c: data.current.temp_c,
      temp_f: data.current.temp_f,
      requestedUnit: temperatureUnit,
      fieldToUse: tempField,
      valueToUse: data.current[tempField]
    });

    // Transform API response to our UI structure
    const transformedData = {
      current: {
        temp: Math.round(data.current[tempField]),
        feelsLike: Math.round(data.current[feelsLikeField]),
        high: Math.round(data.forecast.forecastday[0].day[maxTempField]),
        low: Math.round(data.forecast.forecastday[0].day[minTempField]),
        condition: data.current.condition.text,
        icon: data.current.condition.text.toLowerCase().replace(/ /g, '-'),
        wind: {
          speed: Math.round(data.current.wind_mph),
          direction: data.current.wind_dir
        },
        humidity: data.current.humidity,
        visibility: Math.round(data.current.vis_miles),
        uvIndex: data.current.uv,
        pressure: data.current.pressure_in,
        dewPoint: Math.round(data.current[dewPointField])
      },
      location: `${data.location.name}, ${data.location.region}`,
      hourly: data.forecast.forecastday.slice(0, 2).flatMap((day: any) => 
        day.hour.map((hour: any) => ({
          time: new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric' }),
          temp: Math.round(hour[tempField]),
          icon: hour.condition.text.toLowerCase().replace(/ /g, '-'),
          precipitation: hour.chance_of_rain
        }))
      ).slice(0, 24),
      daily: data.forecast.forecastday.map((day: any) => ({
        day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        date: day.date,
        high: Math.round(day.day[maxTempField]),
        low: Math.round(day.day[minTempField]),
        condition: day.day.condition.text,
        icon: day.day.condition.text.toLowerCase().replace(/ /g, '-'),
        precipitation: day.day.daily_chance_of_rain
      })),
      lastUpdated: new Date().toISOString()
    };

    // Add operational impact analysis
    const currentTemp = data.current.temp_c;
    const currentHumidity = data.current.humidity;
    const currentWindKph = data.current.wind_kph;
    const currentPrecipChance = data.forecast.forecastday[0]?.day?.daily_chance_of_rain || 0;

    const activityRecommendations = analyzeActivitySafety(currentTemp, currentHumidity, currentWindKph, currentPrecipChance);
    const currentWorkScore = calculateWorkScore(currentTemp, currentHumidity, currentWindKph, currentPrecipChance);
    const operationalImpact = generateOperationalImpact(activityRecommendations, currentWorkScore);

    // Analyze each day for work suitability
    const dailyWorkSuitability = data.forecast.forecastday.map((day: any) => {
      const avgTemp = (day.day.maxtemp_c + day.day.mintemp_c) / 2;
      const avgHumidity = day.day.avghumidity;
      const maxWind = day.day.maxwind_kph;
      const precipChance = day.day.daily_chance_of_rain;

      const dayActivities = analyzeActivitySafety(avgTemp, avgHumidity, maxWind, precipChance);
      const dayScore = calculateWorkScore(avgTemp, avgHumidity, maxWind, precipChance);

      const bestFor = Object.entries(dayActivities)
        .filter(([_, result]) => result.safe)
        .map(([activity]) => activity.replace('_', ' '));

      const avoid = Object.entries(dayActivities)
        .filter(([_, result]) => !result.safe)
        .map(([activity]) => activity.replace('_', ' '));

      const alerts: string[] = [];
      if (precipChance > 50) alerts.push('High precipitation risk');
      if (maxWind > 50) alerts.push('Strong winds expected');
      if (avgTemp < 5) alerts.push('Frost risk');
      if (avgTemp > 32) alerts.push('Extreme heat');

      return {
        date: day.date,
        score: dayScore,
        bestFor,
        avoid,
        alerts,
      };
    });

    const enrichedData = {
      ...transformedData,
      operationalImpact,
      dailyWorkSuitability,
      activityRecommendations,
    };

    console.log('Weather data enriched with operational impact analysis');

    return new Response(
      JSON.stringify(enrichedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders);
  }
});
