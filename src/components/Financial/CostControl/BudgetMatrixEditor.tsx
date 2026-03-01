import React, { useState, useEffect } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COST_CODES, costCodeMetadata } from '@/utils/categoryToCostCodeMap';

export interface MatrixData {
  [phaseId: string]: {
    [costCodeId: string]: number;
  };
}

interface BudgetMatrixEditorProps {
  phases: Array<{ id: string; phase_name: string }>;
  onSave: (data: MatrixData) => void;
  initialData?: MatrixData;
  isLoading?: boolean;
  isDisabled?: boolean;
}

/**
 * Interactive budget matrix editor for phase × cost code allocation
 * Allows users to input budget amounts for each phase/cost code combination
 */
export function BudgetMatrixEditor({
  phases,
  onSave,
  initialData = {},
  isLoading = false,
  isDisabled = false,
}: BudgetMatrixEditorProps) {
  const { t } = useLocalization();
  const [matrixData, setMatrixData] = useState<MatrixData>(initialData);

  useEffect(() => {
    setMatrixData(initialData);
  }, [initialData]);

  // Initialize matrix with zeros if not present
  const getAmount = (phaseId: string, costCodeId: string): number => {
    return matrixData[phaseId]?.[costCodeId] ?? 0;
  };

  const setAmount = (phaseId: string, costCodeId: string, value: number) => {
    setMatrixData((prev) => ({
      ...prev,
      [phaseId]: {
        ...prev[phaseId],
        [costCodeId]: value,
      },
    }));
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

  const hasData = grandTotal > 0;

  const handleClear = () => {
    setMatrixData({});
  };

  const handleSave = () => {
    if (!hasData) {
      return; // Validation: at least one amount required
    }
    onSave(matrixData);
  };

  const costCodeOrder = [COST_CODES.LAB, COST_CODES.MAT, COST_CODES.EQT, COST_CODES.SUB, COST_CODES.FEE, COST_CODES.OVH];

  return (
    <div className="space-y-4">
      {!hasData && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-sm text-amber-800">
            {t('budget:costControl.matrixEditor.requiresData', 'At least one budget amount is required')}
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="min-w-[150px] font-semibold">
                {t('budget:costControl.phases', 'Phases')}
              </TableHead>
              {costCodeOrder.map((code) => (
                <TableHead key={code} className="min-w-[120px] text-center">
                  <div className="font-semibold">{costCodeMetadata[code].name}</div>
                  <div className="text-xs text-slate-500">{code}</div>
                </TableHead>
              ))}
              <TableHead className="min-w-[120px] text-center font-semibold">
                {t('budget:costControl.rowTotal', 'Total')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {phases.map((phase) => (
              <TableRow key={phase.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">{phase.phase_name}</TableCell>
                {costCodeOrder.map((code) => (
                  <TableCell key={`${phase.id}-${code}`} className="p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={getAmount(phase.id, code) || ''}
                      onChange={(e) => setAmount(phase.id, code, parseFloat(e.target.value) || 0)}
                      disabled={isDisabled || isLoading}
                      className="h-10 text-right"
                      placeholder={t("inputPlaceholders.amount")}
                    />
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
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={isDisabled || isLoading || !hasData}
        >
          {t('budget:costControl.clearAll', 'Clear All')}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setMatrixData(initialData)}
            disabled={isDisabled || isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isDisabled || isLoading || !hasData}
            className={cn(
              'bg-blue-600 hover:bg-blue-700',
              !hasData && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>
        </div>
      </div>

      <div className="space-y-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
        <p className="font-medium">{t('budget:costControl.summary', 'Budget Summary')}:</p>
        <ul className="space-y-1 text-xs">
          <li>• {t('budget:costControl.grandTotal', 'Total Budget')}:
            <span className="ml-2 font-semibold">
              {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </li>
          <li>• {t('budget:costControl.phasesCount', 'Phases')}: {phases.length}</li>
          <li>• {t('budget:costControl.costCodesCount', 'Cost Codes')}: {costCodeOrder.length}</li>
        </ul>
      </div>
    </div>
  );
}
