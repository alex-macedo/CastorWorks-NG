import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Cloud, Sun, CloudRain, CloudDrizzle, CloudSnow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWeather } from '@/hooks/useWeather';
import { useLocalization } from '@/contexts/LocalizationContext';
import { cn } from '@/lib/utils';

const getWeatherIcon = (condition: string, size: 'sm' | 'lg' = 'lg') => {
  const conditionLower = condition.toLowerCase();
  const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
    return <Sun className={`${sizeClass} text-yellow-500 dark:text-yellow-300`} />;
  } else if (conditionLower.includes('rain')) {
    return <CloudRain className={`${sizeClass} text-blue-500 dark:text-blue-300`} />;
  } else if (conditionLower.includes('drizzle')) {
    return <CloudDrizzle className={`${sizeClass} text-sky-500 dark:text-sky-300`} />;
  } else if (conditionLower.includes('snow')) {
    return <CloudSnow className={`${sizeClass} text-slate-400 dark:text-slate-200`} />;
  } else if (conditionLower.includes('cloud')) {
    return <Cloud className={`${sizeClass} text-muted-foreground`} />;
  }
  return <Cloud className={`${sizeClass} text-muted-foreground`} />;
};

const getHourlyIcon = (condition: string) => {
  const conditionLower = condition.toLowerCase();

  if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
    return <Sun className="h-6 w-6 text-yellow-500 dark:text-yellow-300" />;
  } else if (conditionLower.includes('rain')) {
    return <CloudRain className="h-6 w-6 text-blue-500 dark:text-blue-300" />;
  } else if (conditionLower.includes('drizzle')) {
    return <CloudDrizzle className="h-6 w-6 text-sky-500 dark:text-sky-300" />;
  } else if (conditionLower.includes('snow')) {
    return <CloudSnow className="h-6 w-6 text-slate-400 dark:text-slate-200" />;
  }
  return <Cloud className="h-6 w-6 text-muted-foreground" />;
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

interface SiteWeatherWidgetProps {
  className?: string;
  compact?: boolean;
}

// Helper function to translate weather conditions
const translateWeatherCondition = (condition: string, t: any): string => {
  if (!condition) return condition;

  const conditionLower = condition.toLowerCase().trim();

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
  let translationKey = conditionMap[conditionLower];

  // If no exact match, try to find key weather terms
  if (!translationKey) {
    // Look for key weather words in the condition
    const weatherKeywords = [
      'rain', 'snow', 'drizzle', 'thunderstorm', 'storm', 'hail',
      'mist', 'fog', 'haze', 'cloudy', 'sunny', 'clear', 'windy'
    ];

    for (const keyword of weatherKeywords) {
      if (conditionLower.includes(keyword)) {
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
          if (conditionLower.includes('light') || conditionLower.includes('patchy')) {
            translationKey = `light ${baseKeyword}`;
          } else if (conditionLower.includes('heavy') || conditionLower.includes('moderate')) {
            translationKey = `heavy ${baseKeyword}`;
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
    try {
      return t(`weather.conditions.${translationKey}`);
    } catch (error) {
      // Fall back to original condition if translation fails
      console.warn('Weather condition translation not found:', translationKey);
    }
  }

  // Return original condition if no translation found
  return condition;
};

export const SiteWeatherWidget = ({ className, compact = false }: SiteWeatherWidgetProps) => {
  const navigate = useNavigate();
  const { t, timeZone, weatherLocation, temperatureUnit } = useLocalization();
  const { weatherData, loading, error } = useWeather(weatherLocation, temperatureUnit);

  if (loading && !weatherData) {
    return (
      <Card className={cn('h-full', className)}>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && !weatherData) {
    return (
      <Card className={cn('h-full', className)}>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">{t("messages.unableToLoadWeatherData")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData) return null;

  // Check for alerts or warnings
  const hasWarning = weatherData.current.condition.toLowerCase().includes('storm') ||
                     weatherData.current.condition.toLowerCase().includes('warning');

  // Extract city name from location (e.g., "New York, USA" -> "New York")
  const cityName = weatherData.location?.split(',')[0]?.trim() || weatherLocation.split(',')[0]?.trim();

  // Compact mode - simplified view for statistics row
  if (compact) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => navigate('/weather')}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            navigate('/weather');
          }
        }}
      >
        <div className="flex items-center gap-2">
          {getWeatherIcon(weatherData.current.condition, 'sm')}
          <span className="text-2xl font-bold">
            {weatherData.current.temp}°{temperatureUnit}
          </span>
        </div>
         <div className="text-center">
           <p className="text-xs font-medium text-muted-foreground">{cityName}</p>
           <p className="text-xs text-muted-foreground">{translateWeatherCondition(weatherData.current.condition, t)}</p>
         </div>
      </div>
    );
  }

  // Full mode - original detailed view
  return (
    <Card
      className={cn('h-full transition-shadow hover:shadow-md', className)}
      onClick={() => navigate('/weather')}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate('/weather');
        }
      }}
    >
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('dashboard.siteWeather')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold">{cityName}</p>
             {!hasWarning && (
               <p className="text-sm text-muted-foreground">
                 {translateWeatherCondition(weatherData.current.condition, t)}
               </p>
             )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">
              {weatherData.current.temp}°{temperatureUnit}
            </span>
            <div className="rounded-md bg-muted/40 p-2 text-muted-foreground">
              {getWeatherIcon(weatherData.current.condition, 'sm')}
            </div>
          </div>
        </div>

        {hasWarning && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
            {translateWeatherCondition(weatherData.current.condition, t)}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {weatherData.hourly.slice(0, 4).map((hour, index) => (
            <div
              key={index}
              className="rounded-md border bg-muted/30 px-3 py-2 text-center"
            >
              <div className="text-xs font-medium text-muted-foreground">
                {convertToTimeZone(hour.time, timeZone)}
              </div>
              <div className="flex items-center justify-center py-1 text-muted-foreground">
                {getHourlyIcon(hour.icon || weatherData.current.condition)}
              </div>
              <div className="text-sm font-semibold">{hour.temp}°</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
