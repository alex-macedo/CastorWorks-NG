import { useMemo } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatCurrency } from '@/utils/formatters';
import type { PhaseTotal } from '@/utils/budgetCalculations';

interface BudgetSCurveChartProps {
  phaseTotals: PhaseTotal[];
}

export function BudgetSCurveChart({ phaseTotals }: BudgetSCurveChartProps) {
  const { t, currency } = useLocalization();

  const chartData = useMemo(() => {
    if (!phaseTotals || phaseTotals.length === 0) return [];

    const totalBudget = phaseTotals.reduce((sum, phase) => sum + (phase.grandTotal || 0), 0);
    let cumulativeAmount = 0;

    return phaseTotals.map((phase, index) => {
      cumulativeAmount += phase.grandTotal || 0;
      const cumulativePercentage = totalBudget > 0 ? (cumulativeAmount / totalBudget) * 100 : 0;
      
      return {
        name: phase.phase_name || `Phase ${index + 1}`,
        cumulative: cumulativeAmount,
        percentage: cumulativePercentage,
        phaseAmount: phase.grandTotal || 0,
      };
    });
  }, [phaseTotals]);

  const formatTooltipValue = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatCurrency(numValue, currency);
  };

  const chartConfig = {
    cumulative: { 
      label: t("budgets:dashboard.cumulativeBudget"), 
      color: "#3b82f6" 
    },
    percentage: { 
      label: t("budgets:dashboard.cumulativePercent"), 
      color: "#10b981" 
    },
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-cumulative)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--color-cumulative)" stopOpacity={0}/>
            </linearGradient>
          </defs>
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
            yAxisId="left"
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toString();
            }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
            domain={[0, 100]}
          />
          <ChartTooltip 
            cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
            content={
              <ChartTooltipContent 
                formatter={(value, name) => {
                  if (name === 'percentage') return `${Number(value).toFixed(1)}%`;
                  return formatTooltipValue(Number(value));
                }}
              />
            } 
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="cumulative"
            stroke="var(--color-cumulative)"
            strokeWidth={2}
            fill="url(#colorCumulative)"
            dot={{ fill: 'var(--color-cumulative)', r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="percentage"
            stroke="var(--color-percentage)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: 'var(--color-percentage)', r: 3 }}
          />
          <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ bottom: -10, paddingBottom: '0px' }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
