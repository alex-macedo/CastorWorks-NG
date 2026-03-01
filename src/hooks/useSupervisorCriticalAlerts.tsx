import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CriticalAlert {
  type: "issue" | "inspection" | "delivery";
  id: string;
  title: string;
  message: string;
  severity: "critical" | "high";
  url: string;
}

async function fetchSupervisorCriticalAlerts(): Promise<CriticalAlert[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const alerts: CriticalAlert[] = [];

  // Get critical/high severity issues
  const { data: issues } = await (supabase as any)
    .from("site_issues")
    .select("id, title, severity, status, type")
    .in("severity", ["critical", "high"])
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(5);

  if (issues) {
    issues.forEach((issue: any) => {
      alerts.push({
        type: "issue",
        id: issue.id,
        title: issue.severity === "critical" ? "🚨 Critical Site Issue" : "⚠️ High Priority Issue",
        message: issue.title,
        severity: issue.severity,
        url: "/supervisor/issues",
      });
    });
  }

  // Get overdue quality inspections
  const { data: inspections } = await (supabase as any)
    .from("quality_inspections")
    .select("id, inspection_type, due_date")
    .eq("status", "pending")
    .lt("due_date", new Date().toISOString())
    .order("due_date", { ascending: true })
    .limit(5);

  if (inspections) {
    inspections.forEach((inspection: any) => {
      alerts.push({
        type: "inspection",
        id: inspection.id,
        title: "📋 Overdue Inspection",
        message: `${inspection.inspection_type} is overdue`,
        severity: "high",
        url: "/supervisor/inspections",
      });
    });
  }

  // Get pending delivery confirmations
  const { data: deliveries } = await (supabase as any)
    .from("delivery_confirmations")
    .select("id, notes, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(5);

  if (deliveries) {
    deliveries.forEach((delivery: any) => {
      alerts.push({
        type: "delivery",
        id: delivery.id,
        title: "📦 Pending Delivery",
        message: delivery.notes || "Delivery awaiting confirmation",
        severity: "high",
        url: "/supervisor/deliveries",
      });
    });
  }

  return alerts;
}

async function sendPushNotification(alert: CriticalAlert) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).functions.invoke("send-push-notification", {
      body: {
        user_ids: [user.id],
        title: alert.title,
        body: alert.message,
        url: alert.url,
        tag: `${alert.type}-${alert.id}`,
        requireInteraction: alert.severity === "critical",
        badge: "/favicon.ico",
        icon: "/favicon.ico",
      },
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

export function useSupervisorCriticalAlerts() {
  const previousAlertsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: criticalAlerts = [] } = useQuery<CriticalAlert[]>({
    queryKey: ["supervisor-critical-alerts"],
    queryFn: fetchSupervisorCriticalAlerts,
    refetchInterval: 30000, // Check every 30 seconds
  });

  const playAlertSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      // Simple beep sound
      audioRef.current.src =
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWm98OScTgwOUKbj8LVjHAY4kNjxy3ksiDT";
      audioRef.current.volume = 0.7;
    }

    audioRef.current.play().catch((error) => {
      console.error("Error playing alert sound:", error);
    });
  }, []);

  useEffect(() => {
    if (!criticalAlerts.length) return;

    // Check for new alerts
    const currentAlertIds = new Set(criticalAlerts.map((a) => `${a.type}-${a.id}`));
    const newAlerts = criticalAlerts.filter(
      (alert) => !previousAlertsRef.current.has(`${alert.type}-${alert.id}`)
    );

    if (newAlerts.length > 0 && previousAlertsRef.current.size > 0) {
      newAlerts.forEach((alert) => {
        // Show in-app toast notification
        toast.error(alert.title, {
          description: alert.message,
          duration: 10000,
          action: {
            label: "View",
            onClick: () => window.location.href = alert.url,
          },
        });

        // Send push notification
        sendPushNotification(alert);

        // Play alert sound
        playAlertSound();

        // Request browser notification permission if needed
        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification(alert.title, {
              body: alert.message,
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              tag: `${alert.type}-${alert.id}`,
              requireInteraction: alert.severity === "critical",
            });
          } else if (Notification.permission === "default") {
            Notification.requestPermission();
          }
        }
      });
    }

    previousAlertsRef.current = currentAlertIds;
  }, [criticalAlerts, playAlertSound]);

  return {
    criticalAlerts,
    criticalCount: criticalAlerts.length,
  };
}
