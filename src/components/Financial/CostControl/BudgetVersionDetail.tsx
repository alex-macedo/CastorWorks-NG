import React, { useMemo, useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit2, CheckCircle } from 'lucide-react';
import { BudgetVersion, useBudgetVersions } from '@/hooks/useBudgetVersions';
import { useBudgetLines, BudgetLine } from '@/hooks/useBudgetLines';
import { costCodeMetadata, COST_CODES } from '@/utils/categoryToCostCodeMap';
import { formatDate } from '@/utils/formatters';
import { useDateFormat } from '@/hooks/useDateFormat';

interface BudgetVersionDetailProps {
  version: BudgetVersion;
  onBack: () => void;
  onEdit: () => void;
  onPromote: () => void;
  phases: Array<{ id: string; phase_name: string }>;
  isLoading?: boolean;
  isPromoting?: boolean;
}

/**
 * Detailed view of a budget version showing the phase × cost code matrix
 * Displays budget lines, totals, and status
 */
export function BudgetVersionDetail({
  version,
  onBack,
  onEdit,
  onPromote,
  phases,
  isLoading = false,
  isPromoting = false,
}: BudgetVersionDetailProps) {
  const { t } = useLocalization();
  const { dateFormat } = useDateFormat();
  const { lines } = useBudgetLines(version.id);

  // Build matrix from budget lines
  const matrixData = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};

    lines.forEach((line) => {
      if (!matrix[line.phase_id]) {
        matrix[line.phase_id] = {};
      }
      matrix[line.phase_id][line.cost_code_id] = line.amount;
    });

    return matrix;
  }, [lines]);

  const getAmount = (phaseId: string, costCodeId: string): number => {
    return matrixData[phaseId]?.[costCodeId] ?? 0;
  };

  // Calculate totals
  const costCodeTotals = Object.values(COST_CODES).reduce(
    (acc, code) => {
      const total = phases.reduce((sum, phase) => sum + getAmount(phase.id, code), 0);
      return { ...acc, [code]: total };
    },
    {} as Record<string, number>
  );

  const phaseTotals = phases.reduce(
    (acc, phase) => {
      const total = Object.values(COST_CODES).reduce(
        (sum, code) => sum + getAmount(phase.id, code),
        0
      );
      return { ...acc, [phase.id]: total };
    },
    {} as Record<string, number>
  );

  const grandTotal = Object.values(costCodeTotals).reduce((sum, val) => sum + val, 0);

  const getStatusBadge = () => {
    switch (version.status) {
      case 'baseline':
        return <Badge className="bg-green-100 text-green-800">{t('budget:costControl.status.baseline', 'Baseline')}</Badge>;
      case 'draft':
        return <Badge className="bg-blue-100 text-blue-800">{t('budget:costControl.status.draft', 'Draft')}</Badge>;
      case 'superseded':
        return <Badge className="bg-gray-100 text-gray-800">{t('budget:costControl.status.superseded', 'Superseded')}</Badge>;
      default:
        return <Badge>{version.status}</Badge>;
    }
  };

  const costCodeOrder = [COST_CODES.LAB, COST_CODES.MAT, COST_CODES.EQT, COST_CODES.SUB, COST_CODES.FEE, COST_CODES.OVH];

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{version.name}</h2>
            <p className="text-sm text-slate-600">{version.description || '-'}</p>
          </div>
        </div>

        <div className="space-y-2 text-right">
          {getStatusBadge()}
          <p className="text-xs text-slate-600">
            {t('budget:costControl.effectiveDate', 'Effective Date')}: {formatDate(version.effective_date)}
          </p>
        </div>
      </div>

      {/* Version Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('common.details', 'Details')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-600">{t('budget:costControl.statusLabel', 'Status')}</p>
              <p className="mt-1">{getStatusBadge()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">{t('budget:costControl.effectiveDate', 'Effective Date')}</p>
              <p className="mt-1 text-sm">{formatDate(version.effective_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">{t('budget:costControl.grandTotal', 'Total Budget')}</p>
              <p className="mt-1 text-lg font-semibold">
                {grandTotal.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">{t('common.created', 'Created')}</p>
              <p className="mt-1 text-sm">{formatDate(version.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('budget:costControl.matrixEditor', 'Budget Matrix')}</CardTitle>
          <CardDescription>
            {t('budget:costControl.phaseCostCodeMatrix', 'Phase × Cost Code allocation')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="min-w-[150px] font-semibold">
                    {t('budget:costControl.phases', 'Phases')}
                  </TableHead>
                  {costCodeOrder.map((code) => (
                    <TableHead key={code} className="min-w-[100px] text-center">
                      <div className="text-xs font-semibold">{costCodeMetadata[code].name}</div>
                      <div className="text-xs text-slate-500">{code}</div>
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[100px] text-center font-semibold">
                    {t('budget:costControl.rowTotal', 'Total')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={costCodeOrder.length + 2} className="text-center text-slate-600">
                      {t('budget:costControl.noPhasesAvailable', 'No phases available for this project')}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {phases.map((phase) => (
                      <TableRow key={phase.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{phase.phase_name}</TableCell>
                        {costCodeOrder.map((code) => (
                          <TableCell key={`${phase.id}-${code}`} className="text-right text-sm">
                            {getAmount(phase.id, code) > 0
                              ? getAmount(phase.id, code).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : '-'}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-medium">
                          {(phaseTotals[phase.id] || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="border-t-2 bg-slate-100 font-semibold">
                      <TableCell>{t('budget:costControl.columnTotal', 'Cost Code Total')}</TableCell>
                      {costCodeOrder.map((code) => (
                        <TableCell key={`total-${code}`} className="text-center text-slate-700">
                          {(costCodeTotals[code] || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                      ))}
                      <TableCell className="text-right text-slate-700">
                        {grandTotal.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        {version.status === 'draft' && (
          <>
            <Button
              onClick={onEdit}
              disabled={isLoading}
              variant="outline"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              {t('common.edit', 'Edit')}
            </Button>
            <Button
              onClick={onPromote}
              disabled={isLoading || isPromoting}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isPromoting
                ? t('common.promoting', 'Promoting...')
                : t('budget:costControl.promote', 'Promote to Baseline')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
