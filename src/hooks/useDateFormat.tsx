import { format, parseISO, isValid } from "date-fns";
import { useAppSettings } from "./useAppSettings";
import { useUserPreferences } from "./useUserPreferences";
import { useLocalization } from "@/contexts/LocalizationContext";

/**
 * Hook to format dates according to user's date format preference
 *
 * This hook provides various date formatting functions that automatically
 * use the user's preferred date format from System Preferences.
 *
 * @example
 * ```tsx
 * const { formatDate, formatShortDate, formatLongDate } = useDateFormat();
 *
 * // Formats as "12/25/2024" or "25/12/2024" depending on user preference
 * formatDate(new Date());
 *
 * // Formats as "Dec 25" or "25 Dec" depending on user preference
 * formatShortDate(new Date());
 * ```
 */
export const useDateFormat = () => {
  const { preferences } = useUserPreferences();
  const { settings } = useAppSettings();
  const { dateFormat: systemDateFormat } = useLocalization();

  // Use system locale for formatting
  const getLocale = () => {
    // Priority: user preference language -> app setting language -> browser language -> fallback
    return preferences?.language ||
           settings?.system_language ||
           navigator.language ||
           'en-US';
  };

  /**
   * Get the user's preferred date format pattern
   * Falls back to locale-based format if no preference is set
   */
  const getDateFormatPattern = (): string => {
    // Priority: useLocalization dateFormat -> app settings -> locale default
    // CRITICAL: systemDateFormat comes from LocalizationContext which loads from Supabase
    if (systemDateFormat) {
      return systemDateFormat;
    }
    if (settings?.system_date_format) {
      return settings.system_date_format;
    }
    // Default format if no preference found
    // NOTE: This should rarely happen - system_date_format defaults to 'MM/DD/YYYY' in DB
    return 'MM/DD/YYYY';
  };

  /**
   * Map system date format to date-fns format string
   */
  const mapToDateFnsFormat = (dateFormat: string): string => {
    const formatMap: Record<string, string> = {
      'DD/MM/YYYY': 'dd/MM/yyyy',
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'MMM DD, YYYY': 'MMM dd, yyyy',
      'DD.MM.YYYY': 'dd.MM.yyyy',
      'YYYY/MM/DD': 'yyyy/MM/dd',

      // Common variations
      'DD/MM/yyyy': 'dd/MM/yyyy',
      'MM/DD/yyyy': 'MM/dd/yyyy',
      'yyyy-MM-dd': 'yyyy-MM-dd',
      'MMM dd, yyyy': 'MMM dd, yyyy',

      // Lowercase variations
      'dd/mm/yyyy': 'dd/MM/yyyy',
      'mm/dd/yyyy': 'MM/dd/yyyy',
      'yyyy/mm/dd': 'yyyy/MM/dd',
      'dd.mm.yyyy': 'dd.MM.yyyy',
    };
    return formatMap[dateFormat] || '';
  };

  /**
   * Format a date using the user's preferred date format
   * @param date - Date object, string, or null/undefined
   * @returns Formatted date string or '--' if invalid
   */
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '--';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';

    const dateFormat = getDateFormatPattern();

    if (dateFormat) {
      // Use user's preferred date format
      const dateFnsFormat = mapToDateFnsFormat(dateFormat);
      if (dateFnsFormat) {
        return format(dateObj, dateFnsFormat);
      }
    }

    // Fallback to locale-based formatting
    try {
      return new Intl.DateTimeFormat(getLocale(), {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateObj);
    } catch (_error) {
      return format(dateObj, 'MM/dd/yyyy');
    }
  };

  /**
   * Format a date in short format (month abbreviation + day)
   * @param date - Date object, string, or null/undefined
   * @returns Formatted date string or '--' if invalid
   */
  const formatShortDate = (date: Date | string | null | undefined): string => {
    if (!date) return '--';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';

    try {
      return new Intl.DateTimeFormat(getLocale(), {
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch (error) {
      return format(dateObj, 'MMM d');
    }
  };

  /**
   * Format a date in long format (full month name + day + year)
   * @param date - Date object, string, or null/undefined
   * @returns Formatted date string or '--' if invalid
   */
  const formatLongDate = (date: Date | string | null | undefined): string => {
    if (!date) return '--';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';

    try {
      return new Intl.DateTimeFormat(getLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(dateObj);
    } catch (error) {
      return format(dateObj, 'MMMM d, yyyy');
    }
  };

  /**
   * Format month and year
   * @param date - Date object, string, or null/undefined
   * @returns Formatted string or '--' if invalid
   * @example formatMonthYear(new Date()) // "Dec 2024"
   */
  const formatMonthYear = (date: Date | string | null | undefined): string => {
    if (!date) return '--';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';

    try {
      return new Intl.DateTimeFormat(getLocale(), {
        year: 'numeric',
        month: 'short'
      }).format(dateObj);
    } catch (error) {
      return format(dateObj, 'MMM yyyy');
    }
  };

  /**
   * Format full month name and year
   * @param date - Date object, string, or null/undefined
   * @returns Formatted string or '--' if invalid
   * @example formatMonth(new Date()) // "December 2024"
   */
  const formatMonth = (date: Date | string | null | undefined): string => {
    if (!date) return '--';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';

    try {
      return new Intl.DateTimeFormat(getLocale(), {
        year: 'numeric',
        month: 'long'
      }).format(dateObj);
    } catch (error) {
      return format(dateObj, 'MMMM yyyy');
    }
  };

  /**
   * Format month abbreviation only
   * @param date - Date object, string, or null/undefined
   * @returns Formatted string or '--' if invalid
   * @example formatShortMonth(new Date()) // "Dec"
   */
  const formatShortMonth = (date: Date | string | null | undefined): string => {
    if (!date) return '--';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';

    try {
      return new Intl.DateTimeFormat(getLocale(), {
        month: 'short'
      }).format(dateObj);
    } catch (error) {
      return format(dateObj, 'MMM');
    }
  };

  /**
   * Format date with time (HH:mm)
   * @param date - Date object, string, or null/undefined
   * @returns Formatted string or '--' if invalid
   * @example formatDateTime(new Date()) // "12/25/2024 15:30" or "25/12/2024 15:30"
   */
  const formatDateTime = (date: Date | string | null | undefined): string => {
    if (!date) return '--';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';

    const dateFormat = getDateFormatPattern();

    if (dateFormat) {
      const dateFnsFormat = mapToDateFnsFormat(dateFormat);
      if (dateFnsFormat) {
        return format(dateObj, `${dateFnsFormat} HH:mm`);
      }
    }

    try {
      // Use the user's explicit date format preference
      const dateFormat = preferences?.date_format || settings?.system_date_format || 'DD/MM/YYYY';
      
      // Map the date format preference to date-fns format string with time
      let formatString: string;
      switch (dateFormat) {
        case 'MM/DD/YYYY':
          formatString = 'MM/dd/yyyy HH:mm';
          break;
        case 'DD/MM/YYYY':
          formatString = 'dd/MM/yyyy HH:mm';
          break;
        case 'YYYY-MM-DD':
          formatString = 'yyyy-MM-dd HH:mm';
          break;
        default:
          formatString = 'dd/MM/yyyy HH:mm'; // Default to DD/MM/YYYY
      }
      
      return format(dateObj, formatString);
    } catch (_error) {
      return format(dateObj, 'MM/dd/yyyy HH:mm');
    }
  };

  /**
   * Format short date with time
   * @param date - Date object, string, or null/undefined
   * @returns Formatted string or '--' if invalid
   * @example formatShortDateTime(new Date()) // "Dec 25, 2024 15:30"
   */
  const formatShortDateTime = (date: Date | string | null | undefined): string => {
    if (!date) return '--';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';

    try {
      return new Intl.DateTimeFormat(getLocale(), {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch (error) {
      return format(dateObj, 'MMM d, yyyy HH:mm');
    }
  };

  /**
   * Format time only (HH:mm)
   * @param date - Date object, string, or null/undefined
   * @returns Formatted time string or '--' if invalid
   */
  const formatTime = (date: Date | string | null | undefined): string => {
    if (!date) return '--';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';
    return format(dateObj, 'HH:mm');
  };

  /**
   * Return structured date parts to avoid fragile string parsing in components.
   * @param date - Date object or ISO/string
   * @returns { monthLabel: string, dayLabel: string, weekday?: string }
   */
  const getDateParts = (date: Date | string | null | undefined) => {
    if (!date) return { monthLabel: '--', dayLabel: '--' };
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return { monthLabel: '--', dayLabel: '--' };

    try {
      // Month label should be locale-aware short month (e.g., 'Dec' or localized equivalent)
      const monthLabel = new Intl.DateTimeFormat(getLocale(), {
        month: 'short'
      }).format(dateObj);

      // Day label: numeric day without leading zeros
      const dayLabel = format(dateObj, 'd');

      const weekday = new Intl.DateTimeFormat(getLocale(), {
        weekday: 'long'
      }).format(dateObj);

      return { monthLabel, dayLabel, weekday };
    } catch (error) {
      // Fallback
      const monthLabel = format(dateObj, 'MMM');
      const dayLabel = format(dateObj, 'd');
      const weekday = format(dateObj, 'EEEE');
      return { monthLabel, dayLabel, weekday };
    }
  };

  return {
    formatDate,
    formatShortDate,
    formatLongDate,
    formatMonthYear,
    formatMonth,
    formatShortMonth,
    formatDateTime,
    formatShortDateTime,
    formatTime,
    getDateParts,
    // Also expose dateFormat for components that need it
    dateFormat: systemDateFormat || settings?.system_date_format || '',
  };
};
