import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    high: number;
    low: number;
    condition: string;
    icon: string;
    wind: { speed: number; direction: string };
    humidity: number;
    visibility: number;
    uvIndex: number;
    pressure: number;
    dewPoint: number;
  };
  location: string;
  hourly: Array<{
    time: string;
    temp: number;
    icon: string;
    precipitation: number;
  }>;
  daily: Array<{
    day: string;
    date: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
    precipitation: number;
  }>;
  lastUpdated: string;
  // Operational impact analysis (optional for backward compatibility)
  operationalImpact?: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    alertLevel: 'normal' | 'warning' | 'critical';
    recommendations: string[];
    affectedActivities: string[];
    workSuitabilityScore: number;
  };
  dailyWorkSuitability?: Array<{
    date: string;
    score: number;
    bestFor: string[];
    avoid: string[];
    alerts: string[];
  }>;
  activityRecommendations?: Record<string, { safe: boolean; reason: string }>;
}

interface CachedWeather {
  location: string;
  data: WeatherData;
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY = 'weather_cache';

// Convert Fahrenheit to Celsius
const fahrenheitToCelsius = (fahrenheit: number): number => {
  return Math.round((fahrenheit - 32) * 5 / 9);
};

// Convert all temperature values in weather data from F to C
const convertWeatherDataToCelsius = (data: WeatherData): WeatherData => {
  return {
    ...data,
    current: {
      ...data.current,
      temp: fahrenheitToCelsius(data.current.temp),
      feelsLike: fahrenheitToCelsius(data.current.feelsLike),
      high: fahrenheitToCelsius(data.current.high),
      low: fahrenheitToCelsius(data.current.low),
      dewPoint: fahrenheitToCelsius(data.current.dewPoint),
    },
    hourly: data.hourly.map(hour => ({
      ...hour,
      temp: fahrenheitToCelsius(hour.temp),
    })),
    daily: data.daily.map(day => ({
      ...day,
      high: fahrenheitToCelsius(day.high),
      low: fahrenheitToCelsius(day.low),
    })),
  };
};

export const useWeather = (initialLocation: string = 'Akron, Ohio', temperatureUnit: 'C' | 'F' = 'C') => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState(initialLocation);

  const fetchWeather = useCallback(async (loc: string, forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first - include temperature unit in cache key
      const cacheKey = `${CACHE_KEY}_${temperatureUnit}`;
      
      if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cachedData: CachedWeather = JSON.parse(cached);
          if (cachedData.location === loc && Date.now() < cachedData.expiresAt) {
            console.log('Using cached weather data for unit:', temperatureUnit);
            setWeatherData(cachedData.data);
            setLoading(false);
            return;
          }
        }
      }

      console.log('Fetching fresh weather data for:', loc, 'with unit:', temperatureUnit);
      const { data, error: functionError } = await supabase.functions.invoke('fetch-weather', {
        body: { location: loc, temperatureUnit }
      });

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      console.log('Received weather data with temp:', data.current?.temp, '°' + temperatureUnit);

      // The fetch-weather function returns temperatures already in the requested unit.
      // Use the returned data directly to avoid double-conversion.
      const processedData = data;

      console.log('Processed weather data with temp:', processedData.current?.temp, '°' + temperatureUnit);

      // Cache the response
      const cacheData: CachedWeather = {
        location: loc,
        data: processedData,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      setWeatherData(processedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching weather:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      
      // Try to use cached data even if expired
      const cacheKey = `${CACHE_KEY}_${temperatureUnit}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cachedData: CachedWeather = JSON.parse(cached);
        if (cachedData.location === loc) {
          console.log('Using expired cached data due to error');
          setWeatherData(cachedData.data);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [temperatureUnit]);

  useEffect(() => {
    // Clear ALL weather caches when temperature unit changes to force fresh fetch
    const cacheKey = `${CACHE_KEY}_${temperatureUnit}`;
    const otherUnit = temperatureUnit === 'C' ? 'F' : 'C';
    const otherCacheKey = `${CACHE_KEY}_${otherUnit}`;
    
    // Remove cache for both temperature units to ensure fresh data
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(otherCacheKey);
    // Also remove the old cache key format if it exists
    localStorage.removeItem(CACHE_KEY);
    
    // Force refresh when temperature unit changes
    fetchWeather(location, true);
    
    // Auto-refresh every 30 minutes
    const interval = setInterval(() => {
      fetchWeather(location, false);
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [fetchWeather, location, temperatureUnit]);

  const changeLocation = (newLocation: string) => {
    setLocation(newLocation);
  };

  const retry = () => {
    fetchWeather(location, true);
  };

  return {
    weatherData,
    loading,
    error,
    location,
    changeLocation,
    retry
  };
};
