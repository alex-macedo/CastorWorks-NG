import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CloudSun, Wind, Droplets, Eye, Sun, Gauge, ThermometerSun, Cloud, CloudRain, CloudSnow, RefreshCw, AlertCircle } from 'lucide-react';
import { useWeather } from '@/hooks/useWeather';
import { useLocalization } from '@/contexts/LocalizationContext';
import React, { useState } from 'react';
import { WeatherImpactCard } from '@/components/Weather/WeatherImpactCard';
import { Container } from '@/components/Layout';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

// Helper function to get localized day names
const getLocalizedDay = (t: any, dayKey: string): string => {
  const dayMap: { [key: string]: string } = {
    "today": "weather.days.today",
    "tomorrow": "weather.days.tomorrow",
    "wednesday": "weather.days.wednesday",
    "thursday": "weather.days.thursday",
    "friday": "weather.days.friday",
    "saturday": "weather.days.saturday",
    "sunday": "weather.days.sunday"
  };
  return t(dayMap[dayKey.toLowerCase()] || dayKey);
};

// Helper function to get localized condition names
const getLocalizedCondition = (t: any, condition: string): string => {
  if (!condition) return condition;

  // Remove "conditions." prefix if present (from API responses)
  const conditionKey = condition.toLowerCase().trim().replace(/^conditions\./, '');

  // Map common weather API conditions to our translation keys
  // Handle compound conditions like "patchy rain nearby" by extracting key words
  const conditionMap: Record<string, string> = {
    // Exact matches first
    'sunny': 'sunny',
    'clear': 'clear',
    'partly cloudy': 'partly cloudy',
    'partly_cloudy': 'partly cloudy',
    'cloudy': 'cloudy',
    'overcast': 'overcast',
    'rain': 'rain',
    'light rain': 'light rain',
    'moderate rain': 'rain',
    'heavy rain': 'heavy rain',
    'drizzle': 'drizzle',
    'thunderstorm': 'thunderstorm',
    'storm': 'storm',
    'snow': 'snow',
    'light snow': 'light snow',
    'heavy snow': 'heavy snow',
    'mist': 'mist',
    'fog': 'fog',
    'haze': 'haze',
    'windy': 'windy',
    'tornado': 'tornado',
    'hail': 'hail',
    // Compound conditions - extract key weather type
    'patchy rain': 'light rain',
    'patchy rain nearby': 'light rain',
    'patchy light rain': 'light rain',
    'moderate or heavy rain': 'heavy rain',
    'light rain shower': 'light rain',
    'moderate rain at times': 'rain',
    'heavy rain at times': 'heavy rain',
    'patchy light drizzle': 'drizzle',
    'light drizzle': 'drizzle',
    'patchy snow': 'light snow',
    'patchy snow nearby': 'light snow',
    'light snow showers': 'light snow',
    'moderate snow': 'snow',
    'blizzard': 'heavy snow',
    'patchy sleet': 'snow',
    'light sleet': 'snow',
    'moderate sleet': 'snow',
    'heavy sleet': 'snow',
    'thundery outbreaks': 'thunderstorm',
    'patchy freezing drizzle': 'drizzle',
    'freezing drizzle': 'drizzle',
    'heavy freezing drizzle': 'drizzle',
    'light freezing rain': 'rain',
    'moderate freezing rain': 'rain',
    'heavy freezing rain': 'rain'
  };

  // First try exact match
  let translationKey = conditionMap[conditionKey];

  // If no exact match, try to find key weather terms
  if (!translationKey) {
    // Look for key weather words in the condition
    const weatherKeywords = [
      'rain', 'snow', 'drizzle', 'thunderstorm', 'storm', 'hail',
      'mist', 'fog', 'haze', 'cloudy', 'sunny', 'clear', 'windy'
    ];

    for (const keyword of weatherKeywords) {
      if (conditionKey.includes(keyword)) {
        // Map compound keywords to base forms
        const keywordMappings: Record<string, string> = {
          'rain': 'rain',
          'snow': 'snow',
          'drizzle': 'drizzle',
          'thunderstorm': 'thunderstorm',
          'storm': 'storm',
          'hail': 'hail',
          'mist': 'mist',
          'fog': 'fog',
          'haze': 'haze',
          'cloudy': 'cloudy',
          'sunny': 'sunny',
          'clear': 'clear',
          'windy': 'windy'
        };

        const baseKeyword = keywordMappings[keyword];
        if (baseKeyword) {
          // Check for intensity modifiers
          if (conditionKey.includes('light') || conditionKey.includes('patchy')) {
            translationKey = `light ${baseKeyword}`;
          } else if (conditionKey.includes('heavy') || conditionKey.includes('moderate')) {
            translationKey = baseKeyword === 'rain' ? 'rain' : `heavy ${baseKeyword}`;
          } else {
            translationKey = baseKeyword;
          }
          break;
        }
      }
    }
  }

  // Try to translate if we found a key
  if (translationKey) {
    const translated = t(`weather.conditions.${translationKey}`);
    if (translated && translated !== `weather.conditions.${translationKey}`) {
      return translated;
    }
  }

  // Return original condition if no translation found
  return condition;
};

// Mock weather data - used as fallback
const mockWeatherData = {
  current: {
    temp: 43,
    feelsLike: 39,
    high: 45,
    low: 32,
    condition: "partly cloudy",
    icon: "partly-cloudy",
    wind: { speed: 12, direction: "NW" },
    humidity: 65,
    visibility: 10,
    uvIndex: 2,
    pressure: 30.12,
    dewPoint: 32
  },
  location: "Downtown Site, Akron, Ohio",
  hourly: [
    { time: "Now", temp: 43, icon: "partly-cloudy", precipitation: 0 },
    { time: "2PM", temp: 44, icon: "partly-cloudy", precipitation: 0 },
    { time: "3PM", temp: 45, icon: "partly-cloudy", precipitation: 5 },
    { time: "4PM", temp: 44, icon: "cloudy", precipitation: 10 },
    { time: "5PM", temp: 42, icon: "cloudy", precipitation: 15 },
    { time: "6PM", temp: 40, icon: "cloudy", precipitation: 10 },
    { time: "7PM", temp: 38, icon: "partly-cloudy", precipitation: 5 },
    { time: "8PM", temp: 36, icon: "clear", precipitation: 0 },
  ],
  daily: [
    { day: "today", high: 45, low: 32, condition: "partly cloudy", icon: "partly-cloudy", precipitation: 15 },
    { day: "tomorrow", high: 48, low: 35, condition: "sunny", icon: "sunny", precipitation: 0 },
    { day: "wednesday", high: 52, low: 38, condition: "sunny", icon: "sunny", precipitation: 0 },
    { day: "thursday", high: 49, low: 36, condition: "cloudy", icon: "cloudy", precipitation: 20 },
    { day: "friday", high: 46, low: 34, condition: "rain", icon: "rainy", precipitation: 60 },
    { day: "saturday", high: 44, low: 32, condition: "partly cloudy", icon: "partly-cloudy", precipitation: 10 },
    { day: "sunday", high: 50, low: 37, condition: "sunny", icon: "sunny", precipitation: 5 },
  ]
};

const getWeatherIcon = (iconType: string, size: number = 24) => {
  const className = `h-${size} w-${size}`;
  switch (iconType) {
    case 'sunny':
      return <Sun className={className} />;
    case 'partly-cloudy':
      return <CloudSun className={className} />;
    case 'cloudy':
      return <Cloud className={className} />;
    case 'rainy':
      return <CloudRain className={className} />;
    case 'snowy':
      return <CloudSnow className={className} />;
    default:
      return <CloudSun className={className} />;
  }
};

// Helper to convert time string to configured timezone
const convertToTimeZone = (timeStr: string, targetTimeZone: string): string => {
  // If the time is already in 12-hour format (e.g., "4PM"), parse it
  const match = timeStr.match(/^(\d{1,2})(AM|PM)$/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const period = match[2].toUpperCase();

    // Convert to 24-hour format
    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }

    // Create a date object for today with the parsed hour
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);

    // Format to target timezone
    try {
      const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        hour12: true,
        timeZone: targetTimeZone,
      };
      return new Intl.DateTimeFormat('en-US', options).format(date).replace(/\s/g, '');
    } catch (error) {
      console.error('Error converting timezone:', error);
      return timeStr; // Return original if conversion fails
    }
  }

  // If format is unexpected, return as-is
  return timeStr;
};

export default function Weather() {
  const { t } = useLocalization();
  const { timeZone, weatherLocation, temperatureUnit } = useLocalization();
  const { weatherData, loading, error, retry } = useWeather(weatherLocation, temperatureUnit);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState(weatherLocation);

  // Use real data only
  const displayData = weatherData;

  if (loading && !weatherData) {
    return (
      <Container size="default">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Container>
    );
  }

  return (
    <Container size="default">
      <div className="space-y-6">
      {/* Header */}
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('weather.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{displayData.location}</p>
          </div>
          <Button onClick={retry} variant="default" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('weather.refresh')}
          </Button>
        </div>
      </SidebarHeaderShell>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error} {weatherData && '- Showing cached data'}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Weather and 7-Day Forecast - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Weather - Large Hero Section */}
        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-background border-blue-200/20">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-blue-500">
                  {getWeatherIcon(displayData.current.icon, 20)}
                </div>
                <div>
                  <div className="text-5xl font-bold leading-tight">{displayData.current.temp}°{temperatureUnit}</div>
                  <p className="text-base text-muted-foreground mt-1">{getLocalizedCondition(t, displayData.current.condition)}</p>
                  <p className="text-1xl text-muted-foreground">{t('weather.feelsLike')} {displayData.current.feelsLike}°{temperatureUnit}</p>
                </div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-1xl text-muted-foreground">{t('weather.high')}</p>
                  <p className="text-5xl font-semibold">{displayData.current.high}°{temperatureUnit}</p>
                </div>
                <div>
                  <p className="text-1xl text-muted-foreground">{t('weather.low')}</p>
                  <p className="text-5xl font-semibold">{displayData.current.low}°{temperatureUnit}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7-Day Forecast */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">{t('weather.sevenDayForecast')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {displayData.daily.map((day, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <p className="font-medium text-2xl w-20 shrink-0">{getLocalizedDay(t, day.day)}</p>
                      <div className="text-muted-foreground shrink-0">
                      {getWeatherIcon(day.icon, 5)}
                    </div>
                    <p className="text-2xl text-muted-foreground truncate">{getLocalizedCondition(t, day.condition)}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    {day.precipitation > 0 && (
                      <div className="flex items-center gap-1 text-blue-500">
                        <Droplets className="h-3 w-3" />
                        <span className="text-2xl">{day.precipitation}%</span>
                      </div>
                    )}
                    <div className="flex gap-4 min-w-[70px] justify-end">
                      <span className="font-semibold text-2xl">{day.high}°</span>
                      <span className="text-muted-foreground text-2xl">{day.low}°</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Impact Analysis */}
      {weatherData?.operationalImpact && weatherData?.dailyWorkSuitability && weatherData?.activityRecommendations && (
        <WeatherImpactCard
          operationalImpact={weatherData.operationalImpact}
          dailyWorkSuitability={weatherData.dailyWorkSuitability}
          activityRecommendations={weatherData.activityRecommendations}
        />
      )}

      {/* Hourly Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>{t('weather.hourlyForecast')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {displayData.hourly.map((hour, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 min-w-[80px] p-3 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <p className="text-sm font-medium">{convertToTimeZone(hour.time, timeZone)}</p>
                <div className="text-muted-foreground">
                  {getWeatherIcon(hour.icon, 8)}
                </div>
                <p className="text-lg font-semibold">{hour.temp}°</p>
                {hour.precipitation > 0 && (
                  <p className="text-xs text-blue-500">{hour.precipitation}%</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weather Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Wind className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('weather.wind')}</p>
                <p className="text-2xl font-semibold">{displayData.current.wind.speed} mph</p>
                <p className="text-xs text-muted-foreground">{displayData.current.wind.direction}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Droplets className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('weather.humidity')}</p>
                <p className="text-2xl font-semibold">{displayData.current.humidity}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('weather.visibility')}</p>
                <p className="text-2xl font-semibold">{displayData.current.visibility} mi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Sun className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('weather.uvIndex')}</p>
                <p className="text-2xl font-semibold">{displayData.current.uvIndex}</p>
                <p className="text-xs text-muted-foreground">{t('weather.low')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Gauge className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('weather.pressure')}</p>
                <p className="text-2xl font-semibold">{displayData.current.pressure}</p>
                <p className="text-xs text-muted-foreground">{t('weather.pressureUnit')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ThermometerSun className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('weather.dewPoint')}</p>
                <p className="text-2xl font-semibold">{displayData.current.dewPoint}°{temperatureUnit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </Container>
  );
}
