import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { TimePeriod, filterByDateRange, getDateRangeForPeriod } from '@/utils/dateFilters';

export interface PhaseCostSummaryRow {
  phase_id: string;
  phase_name: string;
  budget_amount: number;
  committed_amount: number;
  actual_amount: number;
  forecast_eac: number;
  variance: number;
  percent_used: number;
}

export interface PhaseCostCodeSummaryRow {
  cost_code_id: string;
  code: string;
  name: string;
  level: number;
  budget_amount: number;
  committed_amount: number;
  actual_amount: number;
  forecast_eac: number;
  variance: number;
  percent_used: number;
}

export interface PhaseCostDrilldownPayload {
  budget_lines: Array<{
    id: string;
    description: string | null;
    quantity: number | null;
    unit: string | null;
    unit_cost: number | null;
    amount: number;
    created_at: string;
  }>;
  commitments: Array<{
    id: string;
    vendor_name: string | null;
    description: string | null;
    committed_amount: number;
    status: string;
    committed_date: string;
    source_type: string | null;
    source_id: string | null;
    created_at: string;
  }>;
  actuals: Array<{
    id: string;
    date: string;
    amount: number;
    currency: string | null;
    category: string;
    description: string | null;
    payment_method: string | null;
    recipient_payer: string | null;
    reference: string | null;
    created_at: string;
  }>;
}

type RpcDateRange = { from: string | null; to: string | null };

function toRpcDateRange(period: TimePeriod): RpcDateRange {
  if (period === 'all') return { from: null, to: null };
  const range = getDateRangeForPeriod(period);
  return {
    from: range?.start?.toISOString().slice(0, 10) ?? null,
    to: range?.end?.toISOString().slice(0, 10) ?? null,
  };
}

export function useProjectPhaseCostSummary(projectId?: string, period: TimePeriod = 'all') {
  const dateRange = useMemo(() => toRpcDateRange(period), [period]);

  return useQuery({
    queryKey: ['cost_control', 'phase_summary', projectId, period],
    queryFn: async () => {
      if (!projectId) return [] as PhaseCostSummaryRow[];
      const { data, error } = await supabase.rpc('get_project_phase_summary', {
        _project_id: projectId,
        _from_date: dateRange.from,
        _to_date: dateRange.to,
      });
      if (error) throw error;
      return (data ?? []) as PhaseCostSummaryRow[];
    },
    enabled: !!projectId,
  });
}

export function useProjectPhaseCostCodeSummary(
  projectId: string | undefined,
  phaseId: string | undefined,
  costCodeLevel: number = 1,
  period: TimePeriod = 'all'
) {
  const dateRange = useMemo(() => toRpcDateRange(period), [period]);

  return useQuery({
    queryKey: ['cost_control', 'phase_cost_summary', projectId, phaseId, costCodeLevel, period],
    queryFn: async () => {
      if (!projectId || !phaseId) return [] as PhaseCostCodeSummaryRow[];
      const { data, error } = await supabase.rpc('get_project_phase_cost_summary', {
        _project_id: projectId,
        _phase_id: phaseId,
        _cost_code_level: costCodeLevel,
        _from_date: dateRange.from,
        _to_date: dateRange.to,
      });
      if (error) throw error;
      return (data ?? []) as PhaseCostCodeSummaryRow[];
    },
    enabled: !!projectId && !!phaseId,
  });
}

export function useProjectPhaseCostDrilldown(
  projectId: string | undefined,
  phaseId: string | undefined,
  costCodeId: string | undefined,
  period: TimePeriod = 'all'
) {
  const dateRange = useMemo(() => toRpcDateRange(period), [period]);

  return useQuery({
    queryKey: ['cost_control', 'phase_cost_drilldown', projectId, phaseId, costCodeId, period],
    queryFn: async () => {
      if (!projectId || !phaseId || !costCodeId) return null as PhaseCostDrilldownPayload | null;
      const { data, error } = await supabase.rpc('get_project_phase_cost_drilldown', {
        _project_id: projectId,
        _phase_id: phaseId,
        _cost_code_id: costCodeId,
        _from_date: dateRange.from,
        _to_date: dateRange.to,
      });
      if (error) throw error;
      return data as unknown as PhaseCostDrilldownPayload;
    },
    enabled: !!projectId && !!phaseId && !!costCodeId,
  });
}

export function filterUncodedActualsByDateRange<T extends { date: string }>(
  actuals: T[],
  period: TimePeriod
) {
  const range = getDateRangeForPeriod(period);
  if (!range) return actuals;
  return filterByDateRange(actuals, range);
}

