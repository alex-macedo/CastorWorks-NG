/**
 * Haptic feedback utilities for mobile devices
 * Uses the Vibration API for tactile responses
 */

export const haptics = {
  /**
   * Light tap feedback (10ms)
   * Used for button presses and minor interactions
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium feedback (25ms)
   * Used for selections and confirmations
   */
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  },

  /**
   * Heavy feedback (50ms)
   * Used for important actions and alerts
   */
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },

  /**
   * Success pattern (short-pause-short)
   * Used for successful completions
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  /**
   * Warning pattern (long vibration)
   * Used for warnings and errors
   */
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50, 30, 50]);
    }
  },

  /**
   * Error pattern (intense pattern)
   * Used for critical errors
   */
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  },

  /**
   * Selection feedback (very light)
   * Used for list item selections and swipes
   */
  selection: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  },

  /**
   * Check if haptics are supported
   */
  isSupported: () => {
    return 'vibrate' in navigator;
  },
};
