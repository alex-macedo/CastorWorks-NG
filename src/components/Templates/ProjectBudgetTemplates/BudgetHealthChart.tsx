import { useMemo } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatCurrency } from '@/utils/formatters';
import type { GrandTotal } from '@/utils/budgetCalculations';

interface BudgetHealthChartProps {
  grandTotals: GrandTotal;
  budgetLimit?: number;
}

export function BudgetHealthChart({ grandTotals, budgetLimit }: BudgetHealthChartProps) {
  const { t, currency } = useLocalization();

  const { spent, remaining, percentage, status } = useMemo(() => {
    const currentTotal = grandTotals.grandTotal || 0;
    
    // If no budget limit is provided, show allocation breakdown
    if (!budgetLimit || budgetLimit === 0) {
      const directCost = grandTotals.totalDirectCost || 0;
      const overhead = (grandTotals.totalLS || 0) + (grandTotals.totalBDI || 0);
      
      return {
        spent: directCost,
        remaining: overhead,
        percentage: currentTotal > 0 ? (directCost / currentTotal) * 100 : 0,
        status: 'allocation' as const,
      };
    }

    // With budget limit, show budget consumption
    const spent = currentTotal;
    const remaining = Math.max(0, budgetLimit - currentTotal);
    const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;
    
    const status = percentage > 100 ? 'over' : percentage > 90 ? 'warning' : 'healthy';

    return { spent, remaining, percentage, status };
  }, [grandTotals, budgetLimit]);

  const chartData = useMemo(() => {
    if (status === 'allocation') {
      return [
        { 
          name: t("budgets:summary.directCost"), 
          value: spent, 
          color: '#3b82f6' 
        },
        { 
          name: t("budgets:dashboard.overhead"), 
          value: remaining, 
          color: '#f59e0b' 
        },
      ];
    }

    return [
      { 
        name: t("budgets:dashboard.spent"), 
        value: spent, 
        color: status === 'over' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981' 
      },
      { 
        name: t("budgets:dashboard.remaining"), 
        value: remaining, 
        color: '#e5e7eb' 
      },
    ];
  }, [spent, remaining, status, t]);

  const chartConfig = {
    spent: { label: t("budgets:dashboard.spent"), color: chartData[0].color },
    remaining: { label: t("budgets:dashboard.remaining"), color: chartData[1].color },
  };

  const formatTooltipValue = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatCurrency(numValue, currency);
  };

  if (spent === 0 && remaining === 0) {
    return null;
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <ChartTooltip 
            content={<ChartTooltipContent formatter={(value) => formatTooltipValue(Number(value))} />} 
          />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground text-3xl font-bold"
          >
            {percentage.toFixed(1)}%
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-xs"
          >
            {status === 'allocation' ? t("budgets:dashboard.directCostRatio") : t("budgets:dashboard.budgetUsed")}
          </text>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
