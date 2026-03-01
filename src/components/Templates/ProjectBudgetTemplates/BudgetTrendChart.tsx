import { useMemo } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatCurrency } from '@/utils/formatters';
import type { PhaseTotal } from '@/utils/budgetCalculations';

interface BudgetTrendChartProps {
  phaseTotals: PhaseTotal[];
}

export function BudgetTrendChart({ phaseTotals }: BudgetTrendChartProps) {
  const { t, currency } = useLocalization();

  const chartData = useMemo(() => {
    if (!phaseTotals || phaseTotals.length === 0) return [];

    return phaseTotals.map((phase, index) => ({
      name: phase.phase_name || `Phase ${index + 1}`,
      total: phase.grandTotal || 0,
      labor: phase.totalLabor || 0,
      materials: phase.totalMaterials || 0,
      other: (phase.totalLS || 0) + (phase.totalBDI || 0),
    }));
  }, [phaseTotals]);

  const formatTooltipValue = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatCurrency(numValue, currency);
  };

  const chartConfig = {
    total: { 
      label: t("budgets:summary.finalTotal"), 
      color: "#3b82f6" 
    },
    labor: { 
      label: t("budgets:summary.labor"), 
      color: "#8884d8" 
    },
    materials: { 
      label: t("budgets:summary.materials"), 
      color: "#ef4444" 
    },
    other: { 
      label: t("budgets:dashboard.otherCosts"), 
      color: "#f59e0b" 
    },
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            fontSize={10}
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toString();
            }}
          />
          <ChartTooltip 
            cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
            content={<ChartTooltipContent formatter={(value) => formatTooltipValue(Number(value))} />} 
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="var(--color-total)"
            strokeWidth={3}
            dot={{ fill: 'var(--color-total)', r: 5 }}
            activeDot={{ r: 7 }}
          />
          <Line
            type="monotone"
            dataKey="labor"
            stroke="var(--color-labor)"
            strokeWidth={2}
            dot={{ fill: 'var(--color-labor)', r: 4 }}
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="materials"
            stroke="var(--color-materials)"
            strokeWidth={2}
            dot={{ fill: 'var(--color-materials)', r: 4 }}
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="other"
            stroke="var(--color-other)"
            strokeWidth={2}
            dot={{ fill: 'var(--color-other)', r: 4 }}
            strokeDasharray="3 3"
          />
          <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ bottom: -10, paddingBottom: '0px' }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
