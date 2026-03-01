/**
 * Project Calendar Widget
 *
 * Quick access calendar management widget for Project Detail Settings tab
 * Features:
 * - Enable/disable project calendar
 * - Show next non-working days
 * - Quick add holiday action
 * - Link to full calendar management
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { Calendar, Plus, Settings, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectCalendarWidgetProps {
  projectId: string;
  onNavigateToFullCalendar?: () => void;
}

interface NonWorkingDay {
  calendar_date: string;
  reason: string;
}

export function ProjectCalendarWidget({ projectId, onNavigateToFullCalendar }: ProjectCalendarWidgetProps) {
  const { t } = useLocalization();
  const { formatLongDate } = useDateFormat();
  const { toast } = useToast();

  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [defaultWorkingDays, setDefaultWorkingDays] = useState('monday,tuesday,wednesday,thursday,friday');
  const [nonWorkingDays, setNonWorkingDays] = useState<NonWorkingDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHolidayDialog, setShowAddHolidayDialog] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayReason, setNewHolidayReason] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  // Load project calendar settings
  const loadCalendarSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Load project calendar settings
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('calendar_enabled, calendar_default_working_days')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      setCalendarEnabled(project.calendar_enabled || false);
      setDefaultWorkingDays(project.calendar_default_working_days || 'monday,tuesday,wednesday,thursday,friday');

      // Load next 10 non-working days
      if (project.calendar_enabled) {
        const today = new Date().toISOString().split('T')[0];
        const { data: holidays, error: holidaysError } = await supabase
          .from('project_calendar')
          .select('calendar_date, reason')
          .eq('project_id', projectId)
          .eq('is_working_day', false)
          .gte('calendar_date', today)
          .order('calendar_date', { ascending: true })
          .limit(10);

        if (holidaysError) throw holidaysError;
        setNonWorkingDays(holidays || []);
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
      toast({
        title: t('projectDetail.calendarTab.toast.error'),
        description: t('projectDetail.calendarTab.toast.loadError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, t, toast]);

  useEffect(() => {
    loadCalendarSettings();
  }, [loadCalendarSettings]);

  async function toggleCalendarEnabled(enabled: boolean) {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ calendar_enabled: enabled })
        .eq('id', projectId);

      if (error) throw error;

      setCalendarEnabled(enabled);
      toast({
        title: enabled ? t('projectDetail.calendarTab.toast.enabled') : t('projectDetail.calendarTab.toast.disabled'),
        description: enabled
          ? t('projectDetail.calendarTab.toast.enabled')
          : t('projectDetail.calendarTab.toast.disabled'),
      });

      // Reload to fetch non-working days if enabled
      if (enabled) {
        await loadCalendarSettings();
      } else {
        setNonWorkingDays([]);
      }
    } catch (error) {
      console.error('Error toggling calendar:', error);
      toast({
        title: t('projectDetail.calendarTab.toast.error'),
        description: t('projectDetail.calendarTab.toast.saveError'),
        variant: 'destructive',
      });
    }
  }

  async function addHoliday() {
    if (!newHolidayDate || !newHolidayReason) {
      toast({
        title: 'Validation Error',
        description: 'Please provide both date and reason',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAddingHoliday(true);

      const { error } = await supabase
        .from('project_calendar')
        .insert({
          project_id: projectId,
          calendar_date: newHolidayDate,
          is_working_day: false,
          reason: newHolidayReason,
        });

      if (error) throw error;

      toast({
        title: t('projectDetail.calendarTab.toast.holidayAdded'),
        description: `${newHolidayReason} on ${formatLongDate(new Date(newHolidayDate))}`,
      });

      setShowAddHolidayDialog(false);
      setNewHolidayDate('');
      setNewHolidayReason('');
      await loadCalendarSettings();
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast({
        title: t('projectDetail.calendarTab.toast.error'),
        description: t('projectDetail.calendarTab.toast.addError'),
        variant: 'destructive',
      });
    } finally {
      setAddingHoliday(false);
    }
  }

  function formatWorkingDays(days: string): string {
    return days
      .split(',')
      .map(day => day.trim().charAt(0).toUpperCase() + day.trim().slice(1))
      .join(', ');
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("commonUI.loading") }</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Calendar className="h-5 w-5" />
             {t('projectDetail.projectCalendar')}
           </CardTitle>
           <CardDescription>
             {t('projectDetail.projectCalendarDescription')}
           </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
             <Label htmlFor="calendar-enabled">{t('projectDetail.calendarTab.enableLabel')}</Label>
               <p className="text-sm text-muted-foreground">
                 {t('projectDetail.calendarTab.enableDescription')}
               </p>
            </div>
            <Switch
              id="calendar-enabled"
              checked={calendarEnabled}
              onCheckedChange={toggleCalendarEnabled}
            />
          </div>

          {calendarEnabled && (
            <>
              {/* Impact Warning */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
               <AlertDescription>
                 {t('projectDetail.calendarTab.alertMessage')}
               </AlertDescription>
              </Alert>

               {/* Working Days Pattern */}
               <div className="space-y-2">
                  <Label>{t('projectDetail.calendarTab.defaultWorkingDays')}</Label>
                  <div className="flex flex-wrap gap-1">
                    {formatWorkingDays(defaultWorkingDays).split(', ').map((day) => (
                      <Badge key={day} variant="secondary">
                        {t(`projectDetail.days.${day.toLowerCase()}`)}
                      </Badge>
                    ))}
                  </div>
               </div>

              {/* Upcoming Non-Working Days */}
              <div className="space-y-2">
                 <div className="flex items-center justify-between">
                    <Label>{t('projectDetail.calendarTab.upcomingNonWorkingDays')}</Label>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => setShowAddHolidayDialog(true)}
                   >
                     <Plus className="h-4 w-4 mr-1" />
                     {t('projectDetail.calendarTab.addHoliday', 'Add Holiday')}
                   </Button>
                 </div>

                {nonWorkingDays.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {nonWorkingDays.map((day) => (
                      <div
                        key={day.calendar_date}
                        className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50"
                      >
                        <span className="font-medium">
                          {formatLongDate(new Date(day.calendar_date))}
                        </span>
                        <span className="text-muted-foreground">{day.reason}</span>
                      </div>
                    ))}
                  </div>
                 ) : (
                    <p className="text-sm text-muted-foreground">{t('projectDetail.calendarTab.noUpcomingHolidays', 'No upcoming holidays scheduled')}</p>
                 )}
              </div>

               {/* Link to Full Calendar */}
               {onNavigateToFullCalendar && (
                 <Button
                   variant="outline"
                   className="w-full"
                   onClick={onNavigateToFullCalendar}
                 >
                   <Settings className="h-4 w-4 mr-2" />
                   {t('projectDetail.calendarTab.fullCalendarManagement', 'Full Calendar Management')}
                 </Button>
               )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Holiday Dialog */}
      <Dialog open={showAddHolidayDialog} onOpenChange={setShowAddHolidayDialog}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>{t('projectDetail.calendarTab.dialog.title', 'Add Holiday')}</DialogTitle>
             <DialogDescription>
               {t('projectDetail.calendarTab.dialog.description', 'Mark a specific date as a non-working day for this project')}
             </DialogDescription>
           </DialogHeader>

           <div className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="holiday-date">{t('projectDetail.calendarTab.dialog.dateLabel', 'Date')}</Label>
               <DateInput
                 value={newHolidayDate}
                 onChange={setNewHolidayDate}
                 placeholder={t('projectDetail.calendarTab.dialog.datePlaceholder', 'Pick a date')}
                 min={new Date().toISOString().split('T')[0]}
               />
             </div>

             <div className="space-y-2">
                <Label htmlFor="holiday-reason">{t('projectDetail.calendarTab.dialog.reasonLabel', 'Reason')}</Label>
               <Input
                 id="holiday-reason"
                 type="text"
                  placeholder={t('projectDetail.calendarTab.dialog.reasonPlaceholder', 'e.g., National Holiday, Company Shutdown')}
                 value={newHolidayReason}
                 onChange={(e) => setNewHolidayReason(e.target.value)}
               />
             </div>
           </div>

           <DialogFooter>
             <Button
               variant="outline"
               onClick={() => setShowAddHolidayDialog(false)}
               disabled={addingHoliday}
             >
               {t('projectDetail.calendarTab.dialog.cancel', 'Cancel')}
             </Button>
             <Button onClick={addHoliday} disabled={addingHoliday}>
               {addingHoliday ? t('projectDetail.calendarTab.dialog.submitting', 'Adding...') : t('projectDetail.calendarTab.dialog.submit', 'Add Holiday')}
             </Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>
    </>
  );
}
