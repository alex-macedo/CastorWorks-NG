import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { toast } from "@/lib/toast-helpers";
import { MobileHeader } from "@/components/supervisor/MobileHeader";
import { MobileBottomNav } from "@/components/supervisor/MobileBottomNav";
import { PullToRefresh } from "@/components/supervisor/PullToRefresh";
import { SyncStatusBar } from "@/components/supervisor/SyncStatusBar";
import { OfflineQueueIndicator } from "@/components/supervisor/OfflineQueueIndicator";
import { EmptyState } from "@/components/supervisor/EmptyState";
import { offlineStorage } from "@/lib/offlineStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/DateInput";
import { Clock, Users, Briefcase, Plus, Trash2, Sparkles, TrendingUp, CalendarRange, Activity, ArrowRight, Hammer, Wrench, Droplets, Zap, Paintbrush } from "lucide-react";
import { startOfWeek, endOfWeek, format as formatWithPattern } from "date-fns";
import { useFormAutoSave } from "@/hooks/useFormAutoSave";
import { useDateFormat } from '@/hooks/useDateFormat';
import { useSupervisorProject } from "@/contexts/SupervisorProjectContext";

interface CrewEntry {
  id: string;
  crewName: string;
  hours: number;
  activity: string;
}

interface TimeLog {
  id: string;
  crew_name: string;
  hours_worked: number;
  activity: string;
  log_date: string;
}

const ACTIVITY_OPTIONS = [
  { value: "Foundation Work", labelKey: "common.activityTypes.foundationWork", icon: Hammer },
  { value: "Masonry", labelKey: "common.activityTypes.masonry", icon: Wrench },
  { value: "Concrete Pouring", labelKey: "common.activityTypes.concretePouringSawCutting", icon: Droplets },
  { value: "Steel Installation", labelKey: "common.activityTypes.steelInstallation", icon: Activity },
  { value: "Electrical", labelKey: "common.activityTypes.electrical", icon: Zap },
  { value: "Plumbing", labelKey: "common.activityTypes.plumbing", icon: Droplets },
  { value: "Roofing", labelKey: "common.activityTypes.roofing", icon: Sparkles },
  { value: "Finishing", labelKey: "common.activityTypes.finishing", icon: Paintbrush },
  { value: "Cleanup", labelKey: "common.activityTypes.cleanup", icon: Sparkles },
  { value: "Other", labelKey: "common.activityTypes.other", icon: Activity }
];

export default function SupervisorTimeLogs() {
  const { t } = useLocalization();
  useRouteTranslations();
  const { selectedProject } = useSupervisorProject();
  const [loading, setLoading] = useState(false);
  const [logDate, setLogDate] = useState<string>(formatWithPattern(new Date(), "yyyy-MM-dd"));
  const [crewEntries, setCrewEntries] = useState<CrewEntry[]>([
    { id: crypto.randomUUID(), crewName: "", hours: 8, activity: "" }
  ]);
  const [weeklyLogs, setWeeklyLogs] = useState<TimeLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { formatTime, formatLongDate, formatShortDate } = useDateFormat();

  // Auto-save form data
  const { clearFormData } = useFormAutoSave({
    formKey: 'supervisor-time-logs',
    formData: {
      logDate,
      crewEntries,
    },
    onRestore: (data) => {
      setLogDate(data.logDate || formatWithPattern(new Date(), "yyyy-MM-dd"));
      setCrewEntries(data.crewEntries || [{ id: crypto.randomUUID(), crewName: "", hours: 8, activity: "" }]);
    },
  });

  // Weekly summary calculations
  const currentDate = logDate ? new Date(logDate) : new Date();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekRangeLabel = `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;
  const totalHours = weeklyLogs.reduce((sum, log) => sum + log.hours_worked, 0);
  const activeCrew = new Set(weeklyLogs.map(log => log.crew_name)).size;
  const activityCounts = weeklyLogs.reduce((acc, log) => {
    acc[log.activity] = (acc[log.activity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topActivity = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  const averageHours = weeklyLogs.length > 0 ? Math.round(totalHours / weeklyLogs.length) : 0;
  const recentCrewNames = Array.from(new Set(weeklyLogs.map(log => log.crew_name))).slice(0, 6);
  const recentActivities = Array.from(new Set(weeklyLogs.map(log => log.activity))).slice(0, 8);

  const fetchWeeklyLogs = useCallback(async () => {
    if (!selectedProject) return;

    try {
      const { data, error } = await supabase
        .from("time_logs")
        .select("*")
        .eq("project_id", selectedProject)
        .gte("log_date", formatWithPattern(weekStart, "yyyy-MM-dd"))
        .lte("log_date", formatWithPattern(weekEnd, "yyyy-MM-dd"))
        .order("log_date", { ascending: false });

      if (error) throw error;
      setWeeklyLogs(data || []);
    } catch (error) {
      console.error("Error fetching weekly logs:", error);
    }
  }, [selectedProject, weekStart, weekEnd]);

  useEffect(() => {
    if (selectedProject) {
      fetchWeeklyLogs();
    }
  }, [selectedProject, fetchWeeklyLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWeeklyLogs();
    setRefreshing(false);
    toast.success(t("supervisor.refreshed"));
  };

  const addCrewEntry = () => {
    setCrewEntries([...crewEntries, { id: crypto.randomUUID(), crewName: "", hours: 8, activity: "" }]);
  };

  const removeCrewEntry = (id: string) => {
    if (crewEntries.length > 1) {
      setCrewEntries(crewEntries.filter(entry => entry.id !== id));
    }
  };

  const updateCrewEntry = (id: string, field: keyof CrewEntry, value: string | number) => {
    setCrewEntries(crewEntries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const applyCrewShortcut = (crewName: string) => {
    const targetEntry = crewEntries.find(entry => !entry.crewName.trim()) || crewEntries[0];
    if (!targetEntry) return;
    updateCrewEntry(targetEntry.id, "crewName", crewName);
  };

  const handleSubmit = async () => {
    if (!selectedProject) {
      toast.error(t("supervisor.selectProjectRequired"));
      return;
    }

    const validEntries = crewEntries.filter(entry => entry.crewName && entry.hours > 0 && entry.activity);

    if (validEntries.length === 0) {
      toast.error(t("supervisor.fillRequiredFields"));
      return;
    }

    setSubmitting(true);

    try {
      const entries = validEntries.map(entry => ({
        project_id: selectedProject,
        crew_name: entry.crewName,
        hours_worked: entry.hours,
        activity: entry.activity,
        log_date: logDate,
      }));

      if (navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const entriesWithUser = entries.map(entry => ({
          ...entry,
          logged_by: user.id
        }));

        const { error } = await supabase.from("time_logs").insert(entriesWithUser);

      if (error) throw error;

      toast.success(t("supervisor.activityLogSaved"));
      setLastSaved(new Date());
    } else {
      await offlineStorage.addToQueue('time_log', entries);
      
      toast.success(t("supervisor.savedOffline"));
    }

      setCrewEntries([{ id: crypto.randomUUID(), crewName: "", hours: 8, activity: "" }]);
      clearFormData(); // Clear saved form data after successful submission
      await fetchWeeklyLogs();
    } catch (error) {
      console.error("Error saving time logs:", error);
      toast.error(t("supervisor.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const setQuickHours = (id: string, hours: number) => {
    updateCrewEntry(id, "hours", hours);
  };

  return (
    <>
      <SyncStatusBar />
      <PullToRefresh onRefresh={handleRefresh} disabled={refreshing}>
        <div className="supervisor-mobile min-h-screen pb-32 bg-background">
          <MobileHeader
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />

        {loading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <div className="p-4 space-y-5">
            <OfflineQueueIndicator />
            {lastSaved && (
              <div className="rounded-xl border border-success/40 bg-success/10 text-success-foreground px-4 py-3 text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("supervisor.activityLogSaved")}
                  <span className="text-xs text-success-foreground/80 ml-auto">
                  {lastSaved ? formatTime(lastSaved) : ''}
                </span>
              </div>
            )}
            
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary via-primary/90 to-primary-dark text-primary-foreground shadow-lg">
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_50%)]" />
              <div className="relative p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground/90">
                      <CalendarRange className="h-4 w-4" />
                      {t("supervisor.thisWeek")}
                    </p>
                    <h2 className="text-2xl font-bold tracking-tight">
                      {weekRangeLabel}
                    </h2>
                    <p className="text-sm text-primary-foreground/80">
                      {t("supervisor.weeklyHours")} • {activeCrew} {t("supervisor.crewMember")}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setLogDate(formatWithPattern(new Date(), "yyyy-MM-dd"))}
                    className="bg-white/20 border-white/30 text-primary-foreground hover:bg-white/30"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {t("supervisor.today")}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/20 bg-white/10 p-3 shadow-sm space-y-1">
                    <p className="text-[10px] text-primary-foreground/80 leading-tight">{t("supervisor.weeklyHours")}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{totalHours}h</span>
                      <TrendingUp className="h-3 w-3" />
                    </div>
                    <p className="text-[10px] text-primary-foreground/70 leading-tight">{t("supervisor.thisWeek")}</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/10 p-3 shadow-sm space-y-1">
                    <p className="text-[10px] text-primary-foreground/80 leading-tight">{t("supervisor.activeCrew")}</p>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="text-2xl font-bold">{activeCrew}</span>
                    </div>
                    <p className="text-[10px] text-primary-foreground/70 leading-tight">{t("supervisor.thisWeek")}</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/10 p-3 shadow-sm space-y-1">
                    <p className="text-[10px] text-primary-foreground/80 leading-tight">{t("supervisor.topActivity")}</p>
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span className="text-sm font-semibold truncate">{topActivity}</span>
                    </div>
                    <p className="text-[10px] text-primary-foreground/70 leading-tight">{t("supervisor.thisWeek")}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    <Activity className="h-4 w-4" />
                    {averageHours}h {t("supervisor.avgEntry")}
                  </span>
                  <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    <Sparkles className="h-4 w-4" />
                    {recentActivities.length > 0
                      ? t("supervisor.activitiesLogged", { count: recentActivities.length })
                      : t("supervisor.loggingStartsNow")}
                  </span>
                </div>
              </div>
            </div>

            <Card className="border-2 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{t("supervisor.quickTimeEntry")}</CardTitle>
                    <p className="text-sm text-muted-foreground">{t("supervisor.date")}: {formatLongDate(logDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setLogDate(formatWithPattern(new Date(), "yyyy-MM-dd"))} className="h-9">
                      <CalendarRange className="h-4 w-4 mr-2" />
                      {t("supervisor.thisWeek")}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={addCrewEntry}>
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="logDate" className="text-base">{t("supervisor.date")}</Label>
                    <DateInput
                      value={logDate}
                      onChange={setLogDate}
                      placeholder={t('common.selectDate')}
                      className="mt-2 h-11"
                    />
                  </div>
                  {recentCrewNames.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {t("supervisor.quickCrewPicks")}
                      </Label>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {recentCrewNames.map((name) => (
                          <Button
                            key={name}
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => applyCrewShortcut(name)}
                            className="h-9 rounded-full"
                          >
                            {name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {crewEntries.map((entry, index) => (
                  <div key={entry.id} className="space-y-3 p-4 border rounded-xl bg-muted/40 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary/60" />
                    <div className="flex justify-between items-center pt-1">
                      <Label className="text-base font-semibold">
                        {t("supervisor.crewMember")} {index + 1}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">#{entry.id.slice(0, 4)}</span>
                        {crewEntries.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCrewEntry(entry.id)}
                            className="h-9 w-9"
                          >
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`crew-${entry.id}`} className="text-sm">{t("supervisor.crewMember")}</Label>
                      <Input
                        id={`crew-${entry.id}`}
                        placeholder={t("supervisor.enterCrewName")}
                        value={entry.crewName}
                        onChange={(e) => updateCrewEntry(entry.id, "crewName", e.target.value)}
                        className="h-12 text-base mt-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">{t("supervisor.hours")}</Label>
                      <div className="flex gap-2 mt-1">
                        {[4, 8, 12].map((preset) => (
                          <Button
                            key={preset}
                            type="button"
                            variant={entry.hours === preset ? "default" : "outline"}
                            onClick={() => setQuickHours(entry.id, preset)}
                            className="h-11 flex-1"
                          >
                            {preset}h
                          </Button>
                        ))}
                        <Input
                          type="number"
                          value={entry.hours}
                          onChange={(e) => updateCrewEntry(entry.id, "hours", parseFloat(e.target.value) || 0)}
                          className="h-11 w-24 text-base text-center"
                          min="0"
                          step="0.5"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">{t("supervisor.activity")}</Label>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                         {ACTIVITY_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
                           <Button
                             key={value}
                             type="button"
                             variant={entry.activity === value ? "default" : "outline"}
                             onClick={() => updateCrewEntry(entry.id, "activity", value)}
                             className="h-11 px-3 rounded-full flex items-center gap-2 whitespace-nowrap"
                           >
                             <Icon className="h-4 w-4" />
                             {t(labelKey)}
                           </Button>
                         ))}
                      </div>
                      {recentActivities.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Activity className="h-3.5 w-3.5" />
                          <span>{t("supervisor.recentlyLogged")}</span>
                          {recentActivities.map((activity) => (
                            <Button
                              key={activity}
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => updateCrewEntry(entry.id, "activity", activity)}
                              className="h-8 px-3 rounded-full"
                            >
                              {activity}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCrewEntry}
                    className="h-12"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {t("supervisor.addAnotherEntry")}
                  </Button>

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="h-12 text-base"
                  >
                    {submitting ? t("supervisor.saving") : t("supervisor.saveTimeLogs")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{t("supervisor.thisWeekEntries")}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarRange className="h-4 w-4" />
                    {weekRangeLabel}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {weeklyLogs.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title={t("supervisor.noTimeLogsThisWeek")}
                    description={t("supervisor.noTimeLogsDescription")}
                    iconClassName="text-primary"
                    className="border-none"
                  />
                ) : (
                  <div className="space-y-3">
                    {weeklyLogs.map((log) => (
                      <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-sm transition-shadow bg-card/70">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                          {log.hours_worked}h
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{log.crew_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{log.activity}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatLongDate(log.log_date)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">{t("supervisor.totalHours")}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-primary">{totalHours}h</p>
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </PullToRefresh>

      <MobileBottomNav />
    </>
  );
}
