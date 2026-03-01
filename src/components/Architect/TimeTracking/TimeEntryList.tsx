import React, { useState, useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTimeEntries, useDeleteTimeEntry, type TimeEntry } from '@/hooks/useTimeTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TimeEntryForm } from './TimeEntryForm';
import {
  Clock,
  Pencil,
  Trash2,
  Plus,
  Briefcase,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TimeEntryListProps {
  projectId?: string;
}

interface GroupedEntries {
  date: string;
  entries: TimeEntry[];
  totalMinutes: number;
}

export function TimeEntryList({ projectId }: TimeEntryListProps) {
  const { t } = useLocalization();
  const { formatShortDate } = useDateFormat();
  const { data: timeEntries = [] } = useTimeEntries(projectId);
  const deleteEntry = useDeleteTimeEntry();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const groupedEntries = useMemo((): GroupedEntries[] => {
    const groups = new Map<string, TimeEntry[]>();
    timeEntries.forEach(entry => {
      const dateKey = new Date(entry.start_time).toISOString().split('T')[0];
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(entry);
    });
    return Array.from(groups.entries())
      .map(([date, entries]) => ({
        date,
        entries: entries.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()),
        totalMinutes: entries.reduce((sum, e) => sum + e.duration_minutes, 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [timeEntries]);

  const isExpanded = (date: string) => {
    if (expandedDates.size === 0) return groupedEntries.findIndex(g => g.date === date) < 3;
    return expandedDates.has(date);
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (prev.size === 0) groupedEntries.slice(0, 3).forEach(g => next.add(g.date));
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const handleEdit = (entry: TimeEntry) => { setEditingEntry(entry); setIsFormOpen(true); };
  const handleNew = () => { setEditingEntry(null); setIsFormOpen(true); };
  const handleDelete = async (id: string) => { if (!window.confirm(t('architect.timeTracking.confirmDelete'))) return; await deleteEntry.mutateAsync(id); };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatTimeOnly = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (groupedEntries.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed border-2 py-16 flex flex-col items-center justify-center text-center space-y-4 bg-transparent rounded-3xl">
          <div className="p-4 rounded-full bg-muted"><Clock className="h-8 w-8 text-muted-foreground" /></div>
          <div className="space-y-1">
            <h3 className="font-semibold">{t('architect.timeTracking.noEntries')}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">{t('architect.timeTracking.noEntriesDescription')}</p>
          </div>
          <Button onClick={handleNew} className="rounded-full"><Plus className="h-4 w-4 mr-2" />{t('architect.timeTracking.logTime')}</Button>
        </Card>
        <TimeEntryForm open={isFormOpen} onOpenChange={setIsFormOpen} entry={editingEntry} defaultProjectId={projectId} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-tight">{t('architect.timeTracking.recentEntries')}</h3>
        <Button onClick={handleNew} size="sm" className="rounded-full"><Plus className="h-4 w-4 mr-1" />{t('architect.timeTracking.logTime')}</Button>
      </div>

      {groupedEntries.map(group => (
        <Card key={group.date} className="border-none shadow-sm rounded-2xl overflow-hidden">
          <button onClick={() => toggleDate(group.date)} className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {isExpanded(group.date) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              <span className="font-bold text-sm">{formatShortDate(group.date)}</span>
              <Badge variant="secondary" className="text-xs font-mono">{group.entries.length} {group.entries.length === 1 ? t('architect.timeTracking.entry') : t('architect.timeTracking.entries')}</Badge>
            </div>
            <span className="font-mono font-bold text-sm text-primary">{formatDuration(group.totalMinutes)}</span>
          </button>

          {isExpanded(group.date) && (
            <CardContent className="p-0 divide-y divide-border/50">
              {group.entries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors group">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.projects?.name && (<span className="flex items-center gap-1 text-xs font-bold text-primary uppercase tracking-tight"><Briefcase className="h-3 w-3" />{entry.projects.name}</span>)}
                      {entry.architect_tasks?.title && (<span className="text-xs text-muted-foreground">/ {entry.architect_tasks.title}</span>)}
                    </div>
                    {entry.description && (<p className="text-sm text-muted-foreground truncate">{entry.description}</p>)}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTimeOnly(entry.start_time)}{entry.end_time && ` - ${formatTimeOnly(entry.end_time)}`}</span>
                      {entry.billable && (<Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5"><DollarSign className="h-2.5 w-2.5 mr-0.5" />{t('architect.timeTracking.billable')}</Badge>)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <span className="font-mono font-bold text-sm whitespace-nowrap">{formatDuration(entry.duration_minutes)}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(entry)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}

      <TimeEntryForm open={isFormOpen} onOpenChange={setIsFormOpen} entry={editingEntry} defaultProjectId={projectId} />
    </div>
  );
}
