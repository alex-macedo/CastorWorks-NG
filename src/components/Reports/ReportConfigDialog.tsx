import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useProjects } from '@/hooks/useProjects';

import { useLocalization } from "@/contexts/LocalizationContext";
export interface ReportConfig {
  projectId: string;
  dateRange?: { from: Date; to: Date };
  includeCharts?: boolean;
  includeMaterials?: boolean;
  includeLabor?: boolean;
  groupBy?: 'category' | 'phase' | 'month';
}

interface ReportConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (config: ReportConfig) => void;
  reportType: string;
  title: string;
}

export function ReportConfigDialog({
  open,
  onClose,
  onGenerate,
  reportType,
  title
}: ReportConfigDialogProps) {
  const { t } = useLocalization();
  const { projects } = useProjects();
  const [config, setConfig] = useState<ReportConfig>({
    projectId: '',
    includeCharts: true,
    includeMaterials: true,
    includeLabor: true,
    groupBy: 'category'
  });
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const handleGenerate = () => {
    const fromDate = dateFrom ? new Date(dateFrom) : undefined;
    const toDate = dateTo ? new Date(dateTo) : undefined;
    const finalConfig = {
      ...config,
      dateRange: fromDate && toDate ? { from: fromDate, to: toDate } : undefined
    };
    onGenerate(finalConfig);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{t("reports.config.configureReportDescription")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>{t("reports.config.projectLabel")}</Label>
            <Select value={config.projectId} onValueChange={(value) => setConfig({ ...config, projectId: value })}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.additionalPlaceholders.selectProject")} />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {['expense', 'timeline'].includes(reportType) && (
            <DateRangeFilter
              startDate={dateFrom}
              endDate={dateTo}
              onStartDateChange={setDateFrom}
              onEndDateChange={setDateTo}
              startLabel={t("reports.config.dateRangeLabel")}
              endLabel={t("reports.config.toLabel")}
            />
          )}

          <div className="space-y-3">
            <Label>{t("reports.config.optionsLabel")}</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="charts"
                  checked={config.includeCharts}
                  onCheckedChange={(checked) => setConfig({ ...config, includeCharts: checked as boolean })}
                />
                <label htmlFor="charts" className="text-sm cursor-pointer">
                  {t("reports.config.includeChartsLabel")}
                </label>
              </div>

              {['materials', 'quote-materials'].includes(reportType) && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="materials"
                    checked={config.includeMaterials}
                    onCheckedChange={(checked) => setConfig({ ...config, includeMaterials: checked as boolean })}
                  />
                  <label htmlFor="materials" className="text-sm cursor-pointer">
                    {t("reports.config.includeMaterialsLabel")}
                  </label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="labor"
                  checked={config.includeLabor}
                  onCheckedChange={(checked) => setConfig({ ...config, includeLabor: checked as boolean })}
                />
                <label htmlFor="labor" className="text-sm cursor-pointer">
                  {t("reports.config.includeLaborLabel")}
                </label>
              </div>
            </div>
          </div>

          {['budget', 'expense'].includes(reportType) && (
            <div className="space-y-2">
              <Label>{t("reports.config.groupByLabel")}</Label>
              <Select value={config.groupBy} onValueChange={(value: any) => setConfig({ ...config, groupBy: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">{t("reports.config.categoryOption")}</SelectItem>
                  <SelectItem value="phase">{t("reports.config.phaseOption")}</SelectItem>
                  <SelectItem value="month">{t("reports.config.monthOption")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t("common.buttons.cancelButton")}</Button>
          <Button onClick={handleGenerate} disabled={!config.projectId}>
            {t("reports.config.generatePdfButton")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
