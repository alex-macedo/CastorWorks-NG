import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAppSettings } from "@/hooks/useAppSettings";

interface NotificationPreferences {
  alerts_enabled: boolean;
  sound_enabled: boolean;
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { alerts_enabled: true, sound_enabled: true };

      const { data } = await (supabase as any)
        .from("user_preferences")
        .select("alerts_enabled, sound_enabled")
        .eq("user_id", user.id)
        .single();

      return data || { alerts_enabled: true, sound_enabled: true };
    },
  });
}

export async function updateNotificationPreferences(
  alertsEnabled: boolean,
  soundEnabled: boolean
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await (supabase as any)
    .from("user_preferences")
    .upsert({
      user_id: user.id,
      alerts_enabled: alertsEnabled,
      sound_enabled: soundEnabled,
    });

  if (error) throw error;
}

interface CriticalNotification {
  type: "issue" | "inspection" | "delivery";
  title: string;
  message: string;
  severity: "critical" | "high";
}

async function fetchCriticalNotifications(): Promise<CriticalNotification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const notifications: CriticalNotification[] = [];

  // Get critical/high severity issues
  const issues = await (supabase as any)
    .from("site_issues")
    .select("id, title, severity, status")
    .in("severity", ["critical", "high"])
    .in("status", ["open", "in_progress"]);

  if (issues?.data) {
    issues.data.forEach((issue: any) => {
      notifications.push({
        type: "issue",
        title: "Critical Site Issue",
        message: issue.title,
        severity: issue.severity,
      });
    });
  }

  // Get overdue quality inspections (due date < now)
  const inspections = await (supabase as any)
    .from("quality_inspections")
    .select("id, inspection_type, due_date")
    .eq("status", "pending")
    .lt("due_date", new Date().toISOString());

  if (inspections?.data) {
    inspections.data.forEach((inspection: any) => {
      notifications.push({
        type: "inspection",
        title: "Overdue Inspection",
        message: `${inspection.inspection_type} inspection is overdue`,
        severity: "high",
      });
    });
  }

  return notifications;
}

export function useCriticalNotificationAlerts() {
  const { data: preferences } = useNotificationPreferences();
  const { settings } = useAppSettings();
  const previousCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const checkFrequencySeconds = Math.max(
    5,
    settings?.notification_check_frequency_seconds ?? 15
  );

  const { data: criticalNotifications } = useQuery<CriticalNotification[]>({
    queryKey: ["critical-notifications"],
    queryFn: fetchCriticalNotifications,
    refetchInterval: checkFrequencySeconds * 1000,
  });

  const sendPushNotification = useCallback(async (notification: CriticalNotification) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any).functions.invoke('send-push-notification', {
        body: {
          user_ids: [user.id],
          title: notification.title,
          body: notification.message,
          url: '/supervisor/hub',
          tag: notification.type,
          requireInteraction: notification.severity === 'critical',
        },
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }, []);

  const playAlertSound = useCallback(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
      // Using a data URL for a simple beep sound
      audioRef.current.src =
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWm98OScTgwOUKbj8LVjHAY4kNjxy3ksiDT";
      audioRef.current.volume = 0.5;
    }

    // Play the sound
    audioRef.current.play().catch((error) => {
      console.error("Error playing alert sound:", error);
    });
  }, []);

  useEffect(() => {
    if (!criticalNotifications || !preferences?.alerts_enabled) return;

    const currentCount = criticalNotifications.length;

    // New critical notification detected
    if (currentCount > previousCountRef.current && previousCountRef.current > 0) {
      const newNotifications = criticalNotifications.slice(
        previousCountRef.current,
        currentCount
      );

      newNotifications.forEach((notification) => {
        // Show visual toast
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.severity === "critical" ? "destructive" : "default",
          duration: 10000,
        });

        // Request browser notification permission and show
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(notification.title, {
            body: notification.message,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: `notification-${Date.now()}`,
          });
        } else if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }

        // Send push notification via edge function
        sendPushNotification(notification);
      });

      // Play sound alert
      if (preferences.sound_enabled) {
        playAlertSound();
      }
    }

    previousCountRef.current = currentCount;
  }, [criticalNotifications, preferences, sendPushNotification, playAlertSound]);

  return {
    criticalNotifications: criticalNotifications || [],
    criticalCount: criticalNotifications?.length || 0,
  };
}
