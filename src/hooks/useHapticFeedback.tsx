import { useCallback } from "react";

export type HapticPattern = "light" | "medium" | "heavy" | "success" | "error";

/**
 * Hook for providing haptic feedback on mobile devices
 * Uses the Vibration API when available
 */
export function useHapticFeedback() {
  const vibrate = useCallback((pattern: HapticPattern = "light") => {
    if (!("vibrate" in navigator)) return;

    const patterns = {
      light: 15,           // Quick tap feedback
      medium: 30,          // Button press
      heavy: 50,           // Important action
      success: [20, 50, 20], // Double pulse
      error: [30, 100, 30, 100, 30], // Triple pulse
    };

    navigator.vibrate(patterns[pattern]);
  }, []);

  return { vibrate };
}
