import { ActivityCalendar } from "@/components/ActivityCalendar/ActivityCalendar";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { useLocalization } from "@/contexts/LocalizationContext";

export default function ProjectActivityCalendarPage() {
  const { t } = useLocalization();
  const handleActivityClick = (activity: any) => {
    console.log("Activity clicked:", activity);
    // Future: Open activity detail dialog or navigate to edit page
  };

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("projectActivityCalendar.title", { defaultValue: "Activity Calendar" })}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t("projectActivityCalendar.subtitle", { defaultValue: "Track and manage your construction activities" })}</p>
          </div>
        </div>
      </SidebarHeaderShell>
      <ActivityCalendar onActivityClick={handleActivityClick} />
    </div>
  );
}
