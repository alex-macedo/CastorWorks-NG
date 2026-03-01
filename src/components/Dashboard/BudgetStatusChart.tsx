import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';

interface BudgetStatusChartProps {
  spent: number;
  remaining: number;
  percentage: number;
  className?: string;
}

export function BudgetStatusChart({ spent, remaining, percentage, className }: BudgetStatusChartProps) {
  const { t, language } = useLocalization();

  const formatCurrencySimple = (value: number) => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const data = [
    { name: t('overallStatus.totalSpent'), value: spent, color: 'rgb(var(--chart-1))' },
    { name: t('overallStatus.remainingBudget'), value: remaining, color: 'rgb(var(--chart-3))' }
  ];
  
  const chartConfig = {
    spent: { label: t('overallStatus.totalSpent'), color: 'rgb(var(--chart-1))' },
    remaining: { label: t('overallStatus.remainingBudget'), color: 'rgb(var(--chart-3))' }
  };

  // Show empty state when no budget data is available
  if (spent === 0 && remaining === 0 && percentage === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>{t('overallStatus.budgetStatus')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('overallStatus.allocationVsSpend')}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Charts will show data when available.
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOverBudget = percentage > 100;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>{t('overallStatus.budgetStatus')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('overallStatus.allocationVsSpend')}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={isOverBudget ? "destructive" : "outline"}>
            {isOverBudget ? t('overallStatus.overBudget') : t('overallStatus.onTrack')}
          </Badge>
          <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[300px]"
        >
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip
              content={<ChartTooltipContent 
                formatter={(value) => formatCurrencySimple(Number(value))}
              />}
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-2xl font-bold"
            >
              {percentage.toFixed(1)}%
            </text>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
