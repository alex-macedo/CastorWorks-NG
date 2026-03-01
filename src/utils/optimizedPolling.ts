/**
 * Optimized Polling Utilities for Sprint 6
 *
 * Provides smart polling strategies with:
 * - Adaptive intervals based on activity
 * - Exponential backoff on errors
 * - Battery-aware polling
 * - Automatic pause when tab is hidden
 */

interface PollingOptions {
  interval: number;
  maxInterval?: number;
  minInterval?: number;
  backoffMultiplier?: number;
  pauseWhenHidden?: boolean;
  reducedBatteryInterval?: number;
}

interface PollingController {
  start: () => void;
  stop: () => void;
  restart: () => void;
  setInterval: (interval: number) => void;
  isActive: () => boolean;
}

/**
 * Creates an adaptive polling controller that adjusts intervals
 * based on user activity and device state
 */
export function createAdaptivePoller(
  callback: () => void | Promise<void>,
  options: PollingOptions
): PollingController {
  let intervalId: NodeJS.Timeout | null = null;
  let currentInterval = options.interval;
  let isRunning = false;
  let consecutiveErrors = 0;
  let isTabHidden = document.hidden;
  let isLowBattery = false;

  const {
    maxInterval = options.interval * 4,
    minInterval = options.interval,
    backoffMultiplier = 1.5,
    pauseWhenHidden = true,
    reducedBatteryInterval = options.interval * 2,
  } = options;

  // Monitor tab visibility
  const handleVisibilityChange = () => {
    isTabHidden = document.hidden;

    if (pauseWhenHidden && isRunning) {
      if (isTabHidden) {
        stop();
      } else {
        start();
      }
    }
  };

  // Monitor battery status
  const handleBatteryChange = (battery: any) => {
    isLowBattery = battery.charging === false && battery.level < 0.2;

    if (isRunning && isLowBattery) {
      // Slow down polling when battery is low
      adjustInterval(reducedBatteryInterval);
    } else if (isRunning && !isLowBattery) {
      // Resume normal interval
      adjustInterval(options.interval);
    }
  };

  // Initialize battery monitoring
  if ('getBattery' in navigator) {
    (navigator as any).getBattery().then((battery: any) => {
      battery.addEventListener('levelchange', () => handleBatteryChange(battery));
      battery.addEventListener('chargingchange', () => handleBatteryChange(battery));
      handleBatteryChange(battery);
    });
  }

  // Add visibility change listener
  document.addEventListener('visibilitychange', handleVisibilityChange);

  async function tick() {
    try {
      await callback();
      consecutiveErrors = 0;

      // Reset to normal interval on success
      if (currentInterval > minInterval) {
        adjustInterval(Math.max(minInterval, currentInterval / backoffMultiplier));
      }
    } catch (error) {
      console.error('[Polling] Error during tick:', error);
      consecutiveErrors++;

      // Apply exponential backoff
      const newInterval = Math.min(
        maxInterval,
        currentInterval * Math.pow(backoffMultiplier, consecutiveErrors)
      );
      adjustInterval(newInterval);
    }
  }

  function adjustInterval(newInterval: number) {
    if (newInterval === currentInterval) return;

    currentInterval = newInterval;

    if (isRunning) {
      stop();
      start();
    }
  }

  function start() {
    if (isRunning) return;
    if (pauseWhenHidden && isTabHidden) return;

    isRunning = true;
    tick(); // Execute immediately
    intervalId = setInterval(tick, currentInterval);
  }

  function stop() {
    if (!isRunning) return;

    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function restart() {
    stop();
    consecutiveErrors = 0;
    currentInterval = options.interval;
    start();
  }

  function setInterval(interval: number) {
    currentInterval = interval;
    if (isRunning) {
      restart();
    }
  }

  function isActive() {
    return isRunning;
  }

  function cleanup() {
    stop();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  // Auto-cleanup on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }

  return {
    start,
    stop,
    restart,
    setInterval,
    isActive,
  };
}

/**
 * Optimized intervals for common polling scenarios
 */
export const POLLING_INTERVALS = {
  // Offline sync - reduced from 5s to 30s
  OFFLINE_SYNC: 30000,

  // Offline status - reduced from 5s to 60s
  OFFLINE_STATUS: 60000,

  // Service health checks - keep at 30s
  SERVICE_HEALTH: 30000,

  // Critical alerts - keep at 30s for supervisor
  CRITICAL_ALERTS: 30000,

  // Notifications - reduced from 15s to 30s
  NOTIFICATIONS: 30000,

  // Expired quotes - keep at 5min
  EXPIRED_QUOTES: 300000,

  // Weather updates - 10 minutes
  WEATHER: 600000,
} as const;

/**
 * Helper to create a smart poller for React hooks
 */
export function useSmartPolling(
  callback: () => void | Promise<void>,
  interval: number,
  options?: Partial<PollingOptions>
) {
  const poller = createAdaptivePoller(callback, {
    interval,
    pauseWhenHidden: true,
    ...options,
  });

  return poller;
}
