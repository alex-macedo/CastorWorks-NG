import type { DateFormat } from '@/contexts/LocalizationContext';

// Utility function to detect browser's preferred date format
export const detectBrowserDateFormat = (): DateFormat => {
  try {
    // Create a test date
    const testDate = new Date(2024, 0, 15); // January 15, 2024

    // Use Intl.DateTimeFormat to get the localized date string
    const formatter = new Intl.DateTimeFormat(navigator.language || 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const formatted = formatter.format(testDate);

    // Analyze the format pattern
    // Common patterns:
    // DD/MM/YYYY -> "15/01/2024"
    // MM/DD/YYYY -> "01/15/2024"
    // YYYY-MM-DD -> "2024-01-15"
    // MMM DD, YYYY -> would be "Jan 15, 2024" (but we use 2-digit for detection)

    if (formatted.startsWith('15/')) {
      return 'DD/MM/YYYY';
    } else if (formatted.startsWith('01/')) {
      return 'MM/DD/YYYY';
    } else if (formatted.startsWith('2024-')) {
      return 'YYYY-MM-DD';
    } else {
      // Fallback to MM/DD/YYYY for unrecognized patterns
      return 'MM/DD/YYYY';
    }
  } catch (error) {
    // Fallback to MM/DD/YYYY if detection fails
    console.warn('Failed to detect browser date format, using default:', error);
    return 'MM/DD/YYYY';
  }
};