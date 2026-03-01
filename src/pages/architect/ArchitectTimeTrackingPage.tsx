import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { useUserRoles } from '@/hooks/useUserRoles';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeEntryList } from '@/components/Architect/TimeTracking/TimeEntryList';
import { WeeklyTimesheetView } from '@/components/Architect/TimeTracking/WeeklyTimesheetView';
import { TimeReportCard } from '@/components/Architect/TimeTracking/TimeReportCard';
import { Clock, List, CalendarDays } from 'lucide-react';

export default function ArchitectTimeTrackingPage() {
  useRouteTranslations();
  const { t } = useLocalization();
  const { data: roles } = useUserRoles();
  const [activeTab, setActiveTab] = useState('entries');

  return (
    <div className="flex-1 space-y-6 animate-in fade-in duration-500">
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-6 w-6" />
              {t('architect.timeTracking.pageTitle')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('architect.timeTracking.pageDescription')}
            </p>
          </div>
          
          <TimeReportCard variant="header" />
        </div>
      </SidebarHeaderShell>

      {/* Tabbed Content */}

      {/* Tabbed Content */}
      <div className="px-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill" className="space-y-4">
          <TabsList className="bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="entries" className="rounded-lg gap-1.5 data-[state=active]:shadow-sm">
              <List className="h-4 w-4" />
              {t('architect.timeTracking.entriesTab')}
            </TabsTrigger>
            <TabsTrigger value="timesheet" className="rounded-lg gap-1.5 data-[state=active]:shadow-sm">
              <CalendarDays className="h-4 w-4" />
              {t('architect.timeTracking.timesheetTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="mt-0">
            <TimeEntryList />
          </TabsContent>

          <TabsContent value="timesheet" className="mt-0">
            <WeeklyTimesheetView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
