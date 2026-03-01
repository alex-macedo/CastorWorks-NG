import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RotateCcw, Download } from 'lucide-react';
import { TimePeriod } from '@/utils/dateFilters';
import { Database } from '@/integrations/supabase/types';
import { useLocalization } from '@/contexts/LocalizationContext';

type Project = Database['public']['Tables']['projects']['Row'];

interface DashboardFiltersProps {
  period: TimePeriod;
  projectId?: string;
  projects?: Project[];
  onPeriodChange: (period: TimePeriod) => void;
  onProjectChange: (projectId?: string) => void;
  onReset: () => void;
  onExport: () => void;
}

export function DashboardFilters({
  period,
  projectId,
  projects = [],
  onPeriodChange,
  onProjectChange,
  onReset,
  onExport
}: DashboardFiltersProps) {
  const { t } = useLocalization();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/80 backdrop-blur shadow-lg p-3 border border-white/70">
      <Select value={period} onValueChange={(value) => onPeriodChange(value as TimePeriod)}>
        <SelectTrigger className="w-[180px] bg-white text-slate-900 shadow-sm border-slate-200">
          <SelectValue placeholder={t('dashboard.filters.thisMonth')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">{t('dashboard.filters.thisMonth')}</SelectItem>
          <SelectItem value="quarter">{t('dashboard.filters.lastThreeMonths')}</SelectItem>
          <SelectItem value="year">{t('dashboard.filters.lastYear')}</SelectItem>
          <SelectItem value="all">{t('dashboard.filters.allTime')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={projectId || 'all'} onValueChange={(value) => onProjectChange(value === 'all' ? undefined : value)}>
        <SelectTrigger className="w-[200px] bg-white text-slate-900 shadow-sm border-slate-200">
          <SelectValue placeholder={t('dashboard.filters.allProjects')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('dashboard.filters.allProjects')}</SelectItem>
          {projects.map(project => (
            <SelectItem key={project.id} value={project.id}>
              {project.name || t('dashboard.filters.unnamedProject')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="secondary" size="sm" className="shadow-sm" onClick={onReset}>
        <RotateCcw className="mr-2 h-4 w-4" />
        {t('dashboard.filters.reset')}
      </Button>

      <Button size="sm" className="" onClick={onExport}>
        <Download className="mr-2 h-4 w-4" />
        {t('dashboard.filters.export')}
      </Button>
    </div>
  );
}
