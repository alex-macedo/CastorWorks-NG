import { parseISO, isValid, format } from 'date-fns';

/**
 * Get the user's preferred date format from localStorage cache (set by LocalizationContext from app_settings)
 * Falls back to DD/MM/YYYY for Brazilian market
 */
const getUserDateFormat = (): string => {
  try {
    const settingsJson = localStorage.getItem('localization-settings');
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      if (settings.dateFormat) {
        return settings.dateFormat;
      }
    }
  } catch (error) {
    // ignore
  }
  return 'DD/MM/YYYY';
};

/**
 * Map user date format to date-fns format
 */
const mapToDateFnsFormat = (userFormat: string): string => {
  const formatMap: Record<string, string> = {
    'DD/MM/YYYY': 'dd/MM/yyyy',
    'MM/DD/YYYY': 'MM/dd/yyyy',
    'YYYY-MM-DD': 'yyyy-MM-dd',
    'MMM DD, YYYY': 'MMM dd, yyyy',
  };
  return formatMap[userFormat] || 'dd/MM/yyyy';
};

/**
 * Formats a date using the user's preferred date format from System Preferences
 */
export const formatDateSystem = (date: Date | string | null | undefined): string => {
  if (!date) return '--';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '--';

  try {
    // Get user's preferred date format from settings
    const userFormat = getUserDateFormat();
    const dateFnsFormat = mapToDateFnsFormat(userFormat);
    return format(dateObj, dateFnsFormat);
  } catch (error) {
    console.warn('Failed to format date with user preference, falling back to ISO:', error);
    return dateObj.toISOString().split('T')[0];
  }
};

/**
 * Formats a date and time using the user's preferred date format from System Preferences
 */
export const formatDateTimeSystem = (date: Date | string | null | undefined): string => {
  if (!date) return '--';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '--';

  try {
    // Get user's preferred date format from settings
    const userFormat = getUserDateFormat();
    const dateFnsFormat = mapToDateFnsFormat(userFormat);
    return format(dateObj, `${dateFnsFormat} HH:mm`);
  } catch (error) {
    console.warn('Failed to format datetime with user preference, falling back to ISO:', error);
    return dateObj.toISOString().slice(0, 16).replace('T', ' ');
  }
};

/**
 * Formats a date in a long, readable format using user's preferred date format
 * Example: "January 15, 2024" in English, "15 de janeiro de 2024" in Portuguese
 */
export const formatDateLongSystem = (date: Date | string | null | undefined): string => {
  if (!date) return '--';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '--';

  try {
    // Get user's preferred date format from settings
    const userFormat = getUserDateFormat();
    const dateFnsFormat = mapToDateFnsFormat(userFormat);
    return format(dateObj, dateFnsFormat);
  } catch (error) {
    console.warn('Failed to format long date with user preference, falling back to short format:', error);
    return formatDateSystem(date);
  }
};

/**
 * Formats a month and year using user's preferred date format
 * Example: "January 2024" in English, "janeiro de 2024" in Portuguese
 */
export const formatMonthYearSystem = (date: Date | string | null | undefined): string => {
  if (!date) return '--';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '--';

  try {
    // Get user's preferred date format from settings
    const userFormat = getUserDateFormat();
    const dateFnsFormat = mapToDateFnsFormat(userFormat);
    return format(dateObj, dateFnsFormat);
  } catch (error) {
    console.warn('Failed to format month/year with user preference, falling back to basic format:', error);
    const year = dateObj.getFullYear();
    const month = dateObj.toLocaleString('en', { month: 'long' });
    return `${month} ${year}`;
  }
};