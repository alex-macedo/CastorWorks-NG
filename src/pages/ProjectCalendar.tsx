/**
 * Project Calendar Management Page
 *
 * Full calendar management interface for configuring project working days
 * and holidays. Allows project managers to:
 * - Enable/disable calendar feature
 * - View and manage non-working days
 * - Import holidays from templates
 * - Configure working days pattern
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from "@/contexts/LocalizationContext";
import {
  Calendar as CalendarIcon,
  Plus,
  Download,
  ArrowLeft,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  List,
  Calendar,
  Table,
  Upload,
  Search,
  Filter,
  FileText,
} from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader, Container } from '@/components/Layout';
import {
  useProjectCalendarSettings,
  useProjectCalendarEntries,
  useProjectCalendar,
} from '@/hooks/useProjectCalendar';
import { useUserRoles } from '@/hooks/useUserRoles';
import { cn } from '@/lib/utils';

const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6]; // Sunday=0 to Saturday=6

export default function ProjectCalendar() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { data: roles } = useUserRoles();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'working' | 'holiday'>('all');
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');
  const [importPreview, setImportPreview] = useState<Array<{date: string, reason: string}> | null>(null);
  const [importing, setImporting] = useState(false);

  // Fetch calendar data
  const { data: settings, isLoading: settingsLoading } = useProjectCalendarSettings(projectId!);
  const { data: entries, isLoading: entriesLoading } = useProjectCalendarEntries(projectId!, {
    startDate: format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd'),
  });

  // Date formatting
  const { formatLongDate } = useDateFormat();

  // Calendar mutations
  const { toggleCalendarEnabled, addNonWorkingDay, removeNonWorkingDay } = useProjectCalendar(projectId!);

  if (!projectId) {
    return <div>{t("ui.projectIdRequired")}</div>;
  }

  const isLoading = settingsLoading || entriesLoading;

  // Get calendar days based on view mode
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const weekStart = startOfWeek(currentMonth, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 0 });

  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Padding days from previous month to start week on Sunday (month view only)
  const startDayOfWeek = getDay(monthStart);
  const paddingDays = Array(startDayOfWeek).fill(null);

  const displayDays = viewMode === 'week' ? weekDays : monthDays;

  const handlePrevPeriod = () => {
    if (viewMode === 'month') setCurrentMonth(subMonths(currentMonth, 1));
    else setCurrentMonth(subWeeks(currentMonth, 1));
  };

  const handleNextPeriod = () => {
    if (viewMode === 'month') setCurrentMonth(addMonths(currentMonth, 1));
    else setCurrentMonth(addWeeks(currentMonth, 1));
  };

  const periodLabel =
    viewMode === 'month'
      ? format(currentMonth, 'MMMM yyyy')
      : viewMode === 'week'
        ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
        : format(currentMonth, 'MMMM yyyy');

  // Create calendar entry map for quick lookup
  const entryMap = new Map(entries?.map(e => [e.calendar_date, e]) || []);

  // Parse working days pattern
  const workingDays = settings?.calendar_default_working_days?.split(',').map(d => d.trim().toLowerCase()) || [];

  function isDayInWorkingPattern(date: Date): boolean {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[getDay(date)];
    return workingDays.includes(dayName);
  }

  function getDayStatus(date: Date): 'working' | 'non-working' | 'weekend' | 'holiday' {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = entryMap.get(dateStr);

    if (entry) {
      return entry.is_working_day ? 'working' : 'holiday';
    }

    return isDayInWorkingPattern(date) ? 'working' : 'weekend';
  }

  function handleDayClick(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = entryMap.get(dateStr);

    if (entry && !entry.is_working_day) {
      // Remove existing holiday
      if (confirm(`Remove holiday: ${entry.reason}?`)) {
        removeNonWorkingDay.mutate(dateStr);
      }
    } else {
      // Add new holiday
      setSelectedDate(dateStr);
      setHolidayReason('');
      setShowAddDialog(true);
    }
  }

  function handleAddHoliday() {
    if (!selectedDate || !holidayReason.trim()) {
      return;
    }

    addNonWorkingDay.mutate(
      { date: selectedDate, reason: holidayReason },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setSelectedDate('');
          setHolidayReason('');
        },
      }
    );
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        let data: Array<{date: string, reason: string}> = [];

        if (importFormat === 'csv') {
          // Parse CSV
          const lines = content.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

          const dateIndex = headers.indexOf('date');
          const reasonIndex = headers.indexOf('reason');

          if (dateIndex === -1 || reasonIndex === -1) {
            alert('CSV must have "date" and "reason" columns');
            return;
          }

          data = lines.slice(1).map(line => {
            const cols = line.split(',');
            return {
              date: cols[dateIndex]?.trim() || '',
              reason: cols[reasonIndex]?.trim() || ''
            };
          }).filter(item => item.date && item.reason);
        } else {
          // Parse JSON
          data = JSON.parse(content);
          if (!Array.isArray(data)) {
            alert('JSON must be an array of objects with date and reason properties');
            return;
          }
          data = data.map(item => ({
            date: item.date || '',
            reason: item.reason || ''
          })).filter(item => item.date && item.reason);
        }

        setImportPreview(data);
      } catch (error) {
        alert('Error parsing file: ' + error);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  }

  function handleBulkImport() {
    if (!importPreview || importPreview.length === 0) return;

    setImporting(true);

    // Import holidays one by one
    const promises = importPreview.map(item =>
      addNonWorkingDay.mutateAsync(item)
    );

    Promise.all(promises)
      .then(() => {
        setShowBulkImportDialog(false);
        setImportPreview(null);
        setImporting(false);
      })
      .catch(() => {
        alert('Some holidays failed to import. Please check for duplicates.');
        setImporting(false);
      });
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t("projectDetail.projectCalendar")}
        variant="default"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="glass-style-dark"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="h-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('projectCalendar:backToProject')}
            </Button>
            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'month' ? 'glass-style-white' : 'glass-style-dark'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="h-8 px-3"
              >
                <Calendar className="h-4 w-4 mr-1" />
                {t('projectCalendar:month')}
              </Button>
              <Button
                variant={viewMode === 'week' ? 'glass-style-white' : 'glass-style-dark'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="h-8 px-3"
              >
                <Table className="h-4 w-4 mr-1" />
                {t('projectCalendar:week')}
              </Button>
              <Button
                variant={viewMode === 'list' ? 'glass-style-white' : 'glass-style-dark'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-3"
              >
                <List className="h-4 w-4 mr-1" />
                {t('projectCalendar:list')}
              </Button>
            </div>
          </div>
        }
        description={t('projectCalendar:description')}
      />

      <Container>
        <div className="grid gap-6 lg:grid-cols-[1fr,350px]">
          {/* Calendar View */}
          <div className="space-y-4">
            {/* Calendar Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="glass-style-dark"
                      size="icon"
                      onClick={handlePrevPeriod}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-2xl font-semibold">
                      {periodLabel}
                    </h2>
                    <Button
                      variant="glass-style-dark"
                      size="icon"
                      onClick={handleNextPeriod}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="glass-style-dark"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    {t('projectCalendar:today')}
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {viewMode === 'list' ? (
                  /* List View */
                  <div className="space-y-1 max-h-[480px] overflow-y-auto">
                    {monthDays.map(date => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const entry = entryMap.get(dateStr);
                      const status = getDayStatus(date);
                      const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                      return (
                        <button
                          key={dateStr}
                          onClick={() => settings?.calendar_enabled && handleDayClick(date)}
                          disabled={!settings?.calendar_enabled || isLoading}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-md text-sm text-left transition-colors',
                            'border border-transparent hover:border-primary',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            isToday && 'ring-2 ring-primary',
                            status === 'working' && 'bg-green-50 hover:bg-green-100 dark:bg-green-950/20',
                            status === 'weekend' && 'bg-muted text-muted-foreground',
                            status === 'holiday' && 'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-300',
                          )}
                        >
                          <span className="font-mono text-muted-foreground w-20 shrink-0">
                            {format(date, 'EEE, MMM d')}
                          </span>
                          <span className="font-medium">{t(`projectCalendar:dayNames.${['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][getDay(date)]}`)}</span>
                          {entry && !entry.is_working_day && (
                            <span className="text-xs text-red-600 dark:text-red-400 truncate">{entry.reason}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {DAY_ORDER.map(i => (
                        <div key={i} className="text-center text-sm font-medium text-muted-foreground p-2">
                          {t(`projectCalendar:dayNamesShort.${i}`)}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid (Month or Week) */}
                    <div className="grid grid-cols-7 gap-2">
                      {viewMode === 'month' && paddingDays.map((_, idx) => (
                        <div key={`pad-${idx}`} className="aspect-square p-2" />
                      ))}
                      {displayDays.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const entry = entryMap.get(dateStr);
                        const status = getDayStatus(date);
                        const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                        return (
                          <button
                            key={dateStr}
                            onClick={() => settings?.calendar_enabled && handleDayClick(date)}
                            disabled={!settings?.calendar_enabled || isLoading}
                            className={cn(
                              'aspect-square p-2 rounded-md text-sm transition-colors',
                              'border border-transparent hover:border-primary',
                              'disabled:opacity-50 disabled:cursor-not-allowed',
                              isToday && 'ring-2 ring-primary',
                              status === 'working' && 'bg-green-50 hover:bg-green-100 dark:bg-green-950/20',
                              status === 'weekend' && 'bg-muted text-muted-foreground',
                              status === 'holiday' && 'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-300',
                            )}
                          >
                            <div className="flex flex-col items-center justify-center h-full">
                              <span className="font-medium">{format(date, 'd')}</span>
                              {entry && !entry.is_working_day && (
                                <span className="text-xs mt-1 line-clamp-1">{entry.reason}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-50 dark:bg-green-950/20 border" />
                    <span className="text-sm">{t('projectCalendar:workingDay')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-muted border" />
                    <span className="text-sm">{t('projectCalendar:weekend')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-50 dark:bg-red-950/20 border" />
                    <span className="text-sm">{t('projectCalendar:holiday')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Controls */}
          <div className="space-y-4">
            {/* Enable/Disable Calendar */}
            <Card>
              <CardHeader>
                <CardTitle>{t('projectCalendar:calendarSettings')}</CardTitle>
                <CardDescription>
                  {t('projectCalendar:configureWorkingDaysAndHolidays')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('projectCalendar:enableCalendar')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('projectCalendar:enableCalendarDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={settings?.calendar_enabled || false}
                    onCheckedChange={(checked) => toggleCalendarEnabled.mutate(checked)}
                    disabled={isLoading}
                  />
                </div>

                {settings?.calendar_enabled && (
                  <>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {t('projectCalendar:clickToMarkHoliday')}
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>{t('projectCalendar:workingDaysLabel')}</Label>
                      <div className="flex flex-wrap gap-1">
                        {settings.calendar_default_working_days.split(',').map(day => {
                          const dayKey = day.trim().toLowerCase();
                          return (
                            <Badge key={dayKey} variant="secondary">
                              {t(`projectCalendar:dayNames.${dayKey}`)}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {settings?.calendar_enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('projectCalendar:quickActionsTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="glass-style-dark"
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                      setShowAddDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('projectCalendar:addHoliday')}
                  </Button>

                   <Button
                     variant="glass-style-dark"
                     className="w-full justify-start"
                     onClick={() => setShowBulkImportDialog(true)}
                   >
                     <Upload className="h-4 w-4 mr-2" />
                     {t('projectCalendar:importHolidays')}
                   </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Container>

      {/* Add Holiday Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('projectCalendar:addHoliday')}</DialogTitle>
            <DialogDescription>
               Mark {selectedDate && formatLongDate(new Date(selectedDate))} as a non-working day
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('projectCalendar:reasonLabel')}</Label>
              <Textarea
                placeholder={t('projectCalendar:reasonPlaceholder')}
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={addNonWorkingDay.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="glass-style-dark"
              onClick={handleAddHoliday}
              disabled={!holidayReason.trim() || addNonWorkingDay.isPending}
            >
              {addNonWorkingDay.isPending ? t('projectCalendar:adding') : t('projectCalendar:addHoliday')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('projectCalendar:importHolidays')}</DialogTitle>
            <DialogDescription>
              {t('projectCalendar:importHolidaysDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('projectCalendar:importFormat')}</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportFormat('csv')}
                  className={importFormat === 'csv' ? 'bg-primary text-primary-foreground' : ''}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportFormat('json')}
                  className={importFormat === 'json' ? 'bg-primary text-primary-foreground' : ''}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  JSON
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('projectCalendar:uploadFile')}</Label>
              <Input
                type="file"
                accept={importFormat === 'csv' ? '.csv' : '.json'}
                onChange={handleFileUpload}
              />
            </div>

            {importPreview && (
              <div className="space-y-2">
                <Label>{t('projectCalendar:preview')} ({importPreview.length} holidays)</Label>
                <div className="max-h-48 overflow-y-auto border rounded p-2 text-sm">
                  {importPreview.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1">
                      <span>{item.date}</span>
                      <span>{item.reason}</span>
                    </div>
                  ))}
                  {importPreview.length > 10 && (
                    <div className="text-muted-foreground pt-2">
                      ... and {importPreview.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkImportDialog(false)}
              disabled={importing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="glass-style-dark"
              onClick={handleBulkImport}
              disabled={!importPreview || importing}
            >
              {importing ? t('projectCalendar:importing') : `${t('projectCalendar:importHolidays')} (${importPreview?.length || 0})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
