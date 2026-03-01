import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { MobileHeader } from "@/components/supervisor/MobileHeader";
import { StatsCarousel } from "@/components/supervisor/StatsCarousel";
import { QuickActionGrid } from "@/components/supervisor/QuickActionGrid";
import { MobileBottomNav } from "@/components/supervisor/MobileBottomNav";
import { PullToRefresh } from "@/components/supervisor/PullToRefresh";
import { SupervisorPushNotifications } from "@/components/supervisor/SupervisorPushNotifications";

import { SupervisorOnboarding } from "@/components/supervisor/SupervisorOnboarding";
import { SupervisorAIBriefing } from "@/components/supervisor/SupervisorAIBriefing";
import { useSupervisorCriticalAlerts } from "@/hooks/useSupervisorCriticalAlerts";
import { useSupervisorProject } from "@/contexts/SupervisorProjectContext";
import { SyncStatusBar } from "@/components/supervisor/SyncStatusBar";

interface Stats {
  todayDeliveries: number;
  openIssues: number;
  pendingInspections: number;
}

export default function SupervisorHub() {
  const { toast } = useToast();
  const { t } = useLocalization();
  useRouteTranslations();
  const { selectedProject } = useSupervisorProject();
  const [stats, setStats] = useState<Stats>({ todayDeliveries: 0, openIssues: 0, pendingInspections: 0 });
  const [loading, setLoading] = useState(false); // Start not loading
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Enable critical alerts monitoring
  useSupervisorCriticalAlerts();

  // Handle initial loading state - only show loading when fetching data
  useEffect(() => {
    if (!selectedProject) {
      setLoading(false); // No loading needed if no project selected
    }
  }, [selectedProject]);

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('supervisor-onboarding-completed');
    if (!hasSeenOnboarding) {
      // Wait for initial load to complete before showing onboarding
      const timer = setTimeout(() => {
        if (!loading) {
          setShowOnboarding(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('supervisor-onboarding-completed', 'true');
    setShowOnboarding(false);
    toast({
      title: t("supervisor.onboarding.welcomeComplete"),
      description: t("supervisor.onboarding.welcomeCompleteDesc"),
    });
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('supervisor-onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  const fetchStats = useCallback(async () => {
    setLoading(true); // Start loading
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's deliveries
      const { count: deliveriesCount } = await supabase
        .from("purchase_orders")
        .select("*", { count: "exact", head: true })
        .eq("project_id", selectedProject)
        .eq("expected_delivery_date", today)
        .eq("status", "pending");

      // Fetch open issues
      const { count: issuesCount } = await supabase
        .from("site_issues")
        .select("*", { count: "exact", head: true })
        .eq("project_id", selectedProject)
        .in("status", ["open", "in_progress"]);

      // Fetch pending inspections (inspections without overall_status)
      const { count: inspectionsCount } = await supabase
        .from("quality_inspections")
        .select("*", { count: "exact", head: true })
        .eq("project_id", selectedProject)
        .is("overall_status", null);

      setStats({
        todayDeliveries: deliveriesCount || 0,
        openIssues: issuesCount || 0,
        pendingInspections: inspectionsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false); // Always end loading state
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      fetchStats();
    } else {
      setLoading(false); // Set loading to false when no project selected
    }
  }, [selectedProject, fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchStats();
      toast({
        title: t("supervisor.refreshed"),
        description: t("supervisor.dataUpdated"),
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      {/* Onboarding Walkthrough */}
      {showOnboarding && (
        <SupervisorOnboarding
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      <SyncStatusBar />
      <PullToRefresh onRefresh={handleRefresh} disabled={refreshing}>
        <div className="supervisor-mobile min-h-screen pb-32 bg-background">
          {loading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-[85%]" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              {/* Mobile Header */}
              <MobileHeader
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />

              {/* AI Daily Briefing */}
              <div className="px-4 pt-3">
                <SupervisorAIBriefing />
              </div>

              {/* Stats Carousel */}
              <div className="p-4 pt-3">
                <StatsCarousel stats={stats} />
              </div>

              {/* Quick Actions Grid */}
              <div className="p-4 pt-2">
                <h2 className="text-base font-semibold mb-3">{t("supervisor.quickActions")}</h2>
                <QuickActionGrid />
              </div>

              {/* Push Notifications Setup */}
              <div className="p-4 pb-6 pt-2">
                <SupervisorPushNotifications />
              </div>
            </>
          )}
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
}
