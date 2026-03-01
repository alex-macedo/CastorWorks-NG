import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatCurrency } from '@/utils/formatters';
import { TimePeriod } from '@/utils/dateFilters';
import {
  PhaseCostCodeSummaryRow,
  PhaseCostDrilldownPayload,
  PhaseCostSummaryRow,
  useProjectPhaseCostCodeSummary,
  useProjectPhaseCostDrilldown,
  useProjectPhaseCostSummary,
} from '@/hooks/useProjectCostControl';

interface PhaseCostControlProps {
  projectId: string;
  period?: TimePeriod;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}%`;
}

function statusVariantFromPercent(percentUsed: number): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (!Number.isFinite(percentUsed)) return 'secondary';
  if (percentUsed > 90) return 'destructive';
  if (percentUsed > 75) return 'warning';
  return 'success';
}

function money(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function DrilldownTable({
  title,
  rows,
  renderRow,
  emptyLabel,
}: {
  title: string;
  rows: any[];
  renderRow: (row: any) => React.ReactNode;
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <Badge variant="outline">{rows.length}</Badge>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell className="text-sm text-muted-foreground">{emptyLabel}</TableCell>
              </TableRow>
            ) : (
              rows.map(renderRow)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function PhaseCostControl({ projectId, period = 'all' }: PhaseCostControlProps) {
  const { t, currency } = useLocalization();
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<{ phase: PhaseCostSummaryRow; code: PhaseCostCodeSummaryRow } | null>(null);

  const translate = (key: string, fallback: string) => {
    const result = t(key);
    return result === key ? fallback : result;
  };

  const translateCategory = (value: string | null | undefined) => {
    if (!value) return value ?? '';
    const raw = value.toLowerCase().trim();
    const sanitized = raw.startsWith('categories.') ? raw.replace(/^categories\./, '') : raw;
    const normalized = sanitized.replace(/[^a-z0-9]/g, '');
    if (!normalized) return value;
    const key = `budget:categories.${normalized}`;
    const translated = t(key);
    return translated === key ? value : translated;
  };

  const { data: phaseRows = [], isLoading } = useProjectPhaseCostSummary(projectId, period);

  const allExpanded = useMemo(() => {
    if (phaseRows.length === 0) return false;
    return phaseRows.every((row) => !!expandedPhases[row.phase_id]);
  }, [expandedPhases, phaseRows]);

  const toggleAll = () => {
    if (phaseRows.length === 0) return;
    if (allExpanded) {
      setExpandedPhases({});
      return;
    }

    setExpandedPhases(
      Object.fromEntries(phaseRows.map((row) => [row.phase_id, true] as const))
    );
  };

  const openDrilldown = (phase: PhaseCostSummaryRow, code: PhaseCostCodeSummaryRow) => {
    setSelected({ phase, code });
  };

  const selectedPhaseId = selected?.phase.phase_id;
  const selectedCostCodeId = selected?.code.cost_code_id;

  const { data: drilldown, isLoading: drilldownLoading } = useProjectPhaseCostDrilldown(
    projectId,
    selectedPhaseId,
    selectedCostCodeId,
    period
  );

  const totals = useMemo(() => {
    return phaseRows.reduce(
      (acc, row) => {
        acc.budget += money(row.budget_amount);
        acc.committed += money(row.committed_amount);
        acc.actual += money(row.actual_amount);
        acc.forecast += money(row.forecast_eac);
        return acc;
      },
      { budget: 0, committed: 0, actual: 0, forecast: 0 }
    );
  }, [phaseRows]);

  const safeCurrency = (currency as any) || 'BRL';

  return (
    <>
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{translate('projectDetail.costControl', 'Cost Control')}</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={toggleAll}
              disabled={isLoading || phaseRows.length === 0}
            >
              {allExpanded
                ? translate('common.collapseAll', 'Collapse All')
                : translate('common.expandAll', 'Expand All')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {translate('projectDetail.costControlDescription', 'Phase-first budget vs committed vs actual with drill-down.')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{translate('budget:overviewSection.totalBudget', 'Total Budget')}</div>
              <div className="text-base font-semibold">{formatCurrency(totals.budget, safeCurrency)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{translate('financial.committed', 'Committed')}</div>
              <div className="text-base font-semibold">{formatCurrency(totals.committed, safeCurrency)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{translate('budget:overviewSection.totalSpent', 'Actual')}</div>
              <div className="text-base font-semibold">{formatCurrency(totals.actual, safeCurrency)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{translate('financial.forecastEac', 'Forecast (EAC)')}</div>
              <div className="text-base font-semibold">{formatCurrency(totals.forecast, safeCurrency)}</div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[320px]">{translate('projects:phase', 'Phase')}</TableHead>
                  <TableHead className="text-right">{translate('budget:budgeted', 'Budget')}</TableHead>
                  <TableHead className="text-right">{translate('financial.committed', 'Committed')}</TableHead>
                  <TableHead className="text-right">{translate('budget:actual', 'Actual')}</TableHead>
                  <TableHead className="text-right">{translate('financial.forecast', 'Forecast')}</TableHead>
                  <TableHead className="text-right">{translate('financial.variance', 'Variance')}</TableHead>
                  <TableHead className="text-right">{translate('budget:percentUsed', '% Used')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">
                      {translate('common.loading', 'Loading...')}
                    </TableCell>
                  </TableRow>
                ) : phaseRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">
                      {translate('common.noData', 'No data available')}
                    </TableCell>
                  </TableRow>
                ) : (
                  phaseRows.map((phase) => (
                    <PhaseRow
                      key={phase.phase_id}
                      projectId={projectId}
                      period={period}
                      phase={phase}
                      expanded={!!expandedPhases[phase.phase_id]}
                      onToggle={() =>
                        setExpandedPhases((prev) => ({ ...prev, [phase.phase_id]: !prev[phase.phase_id] }))
                      }
                      currency={safeCurrency}
                      translate={translate}
                      translateCategory={translateCategory}
                      onOpenDrilldown={openDrilldown}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => (!open ? setSelected(null) : null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selected
                ? `${selected.phase.phase_name} • ${selected.code.code} ${selected.code.name}`
                : translate('financial.details', 'Details')}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {selected && (
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">{translate('budget:budgeted', 'Budget')}</div>
                  <div className="text-sm font-semibold">{formatCurrency(selected.code.budget_amount, safeCurrency)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">{translate('financial.committed', 'Committed')}</div>
                  <div className="text-sm font-semibold">{formatCurrency(selected.code.committed_amount, safeCurrency)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">{translate('budget:actual', 'Actual')}</div>
                  <div className="text-sm font-semibold">{formatCurrency(selected.code.actual_amount, safeCurrency)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">{translate('financial.variance', 'Variance')}</div>
                  <div className="text-sm font-semibold">{formatCurrency(selected.code.variance, safeCurrency)}</div>
                </div>
              </div>
            )}

            {drilldownLoading ? (
              <div className="text-sm text-muted-foreground">{translate('common.loading', 'Loading...')}</div>
            ) : (
              <div className="space-y-6">
                <Drilldown
                  currency={safeCurrency}
                  translate={translate}
                  translateCategory={translateCategory}
                  drilldown={drilldown}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                {translate('common.close', 'Close')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PhaseRow({
  projectId,
  period,
  phase,
  expanded,
  onToggle,
  currency,
  translate,
  translateCategory,
  onOpenDrilldown,
}: {
  projectId: string;
  period: TimePeriod;
  phase: PhaseCostSummaryRow;
  expanded: boolean;
  onToggle: () => void;
  currency: any;
  translate: (key: string, fallback: string) => string;
  translateCategory: (value: string | null | undefined) => string;
  onOpenDrilldown: (phase: PhaseCostSummaryRow, code: PhaseCostCodeSummaryRow) => void;
}) {
  const { data: codes = [], isLoading } = useProjectPhaseCostCodeSummary(projectId, phase.phase_id, 1, period);

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          <button className="flex items-center gap-2" onClick={onToggle} type="button">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>{phase.phase_name}</span>
          </button>
        </TableCell>
        <TableCell className="text-right">{formatCurrency(phase.budget_amount, currency)}</TableCell>
        <TableCell className="text-right">{formatCurrency(phase.committed_amount, currency)}</TableCell>
        <TableCell className="text-right">{formatCurrency(phase.actual_amount, currency)}</TableCell>
        <TableCell className="text-right">{formatCurrency(phase.forecast_eac, currency)}</TableCell>
        <TableCell className="text-right">{formatCurrency(phase.variance, currency)}</TableCell>
        <TableCell className="text-right">
          <Badge variant={statusVariantFromPercent(phase.percent_used)}>{formatPercent(phase.percent_used)}</Badge>
        </TableCell>
      </TableRow>

      {expanded && (
        <>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-sm text-muted-foreground">
                {translate('common.loading', 'Loading...')}
              </TableCell>
            </TableRow>
          ) : (
            (codes as any[]).map((code) => (
              <TableRow key={`${phase.phase_id}-${code.cost_code_id}`}>
                <TableCell className="pl-10">
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => onOpenDrilldown(phase, code)}
                  >
                    <span className="font-mono text-xs text-muted-foreground mr-2">{code.code}</span>
                    <span className="font-medium">{translateCategory(code.name)}</span>
                  </button>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(code.budget_amount, currency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(code.committed_amount, currency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(code.actual_amount, currency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(code.forecast_eac, currency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(code.variance, currency)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={statusVariantFromPercent(code.percent_used)}>{formatPercent(code.percent_used)}</Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </>
      )}
    </>
  );
}

function Drilldown({
  currency,
  translate,
  translateCategory,
  drilldown,
}: {
  currency: any;
  translate: (key: string, fallback: string) => string;
  translateCategory: (value: string | null | undefined) => string;
  drilldown: PhaseCostDrilldownPayload | null | undefined;
}) {
  const payload: PhaseCostDrilldownPayload = drilldown ?? { budget_lines: [], commitments: [], actuals: [] };

  return (
    <>
      <DrilldownTable
        title={translate('budget:lines', 'Budget lines')}
        rows={payload.budget_lines}
        emptyLabel={translate('budget:noLines', 'No budget lines')}
        renderRow={(row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{row.description || translate('common.noData', 'No data')}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.quantity != null && row.unit ? `${row.quantity} ${row.unit}` : translate('budget:lumpSum', 'Lump sum')}
                  </div>
                </div>
                <div className="text-sm font-semibold whitespace-nowrap">{formatCurrency(row.amount, currency)}</div>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      <DrilldownTable
        title={translate('financial.commitments', 'Commitments')}
        rows={payload.commitments}
        emptyLabel={translate('financial.noCommitments', 'No commitments')}
        renderRow={(row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{row.vendor_name || translate('common.uncategorized', 'Uncategorized')}</div>
                  <div className="text-xs text-muted-foreground truncate">{row.description || '-'}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.status} • {row.committed_date}
                  </div>
                </div>
                <div className="text-sm font-semibold whitespace-nowrap">{formatCurrency(row.committed_amount, currency)}</div>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      <DrilldownTable
        title={translate('budget:actuals', 'Actuals')}
        rows={payload.actuals}
        emptyLabel={translate('budget:noActuals', 'No actual expenses')}
        renderRow={(row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {row.description || translateCategory(row.category)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.date} {row.recipient_payer ? `• ${row.recipient_payer}` : ''}
                  </div>
                </div>
                <div className="text-sm font-semibold whitespace-nowrap">{formatCurrency(row.amount, currency)}</div>
              </div>
            </TableCell>
          </TableRow>
        )}
      />
    </>
  );
}
