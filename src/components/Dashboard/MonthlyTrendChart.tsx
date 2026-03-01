import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';

interface MonthlyData {
  month: string;
  total: number;
  labor: number;
  materials: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyData[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const { t, language } = useLocalization();

  const formatCurrencySimple = (value: number) => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const chartConfig = {
    total: { label: t('overallStatus.progress'), color: 'rgb(var(--primary))' },
    labor: { label: t('overallStatus.labor'), color: 'rgb(var(--chart-1))' },
    materials: { label: t('overallStatus.materials'), color: 'rgb(var(--chart-2))' }
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{t('overallStatus.monthlySpendingTrend')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('overallStatus.trackVelocity')}</p>
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

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>{t('overallStatus.monthlySpendingTrend')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('overallStatus.trackVelocity')}</p>
        </div>
        <Badge variant="outline">{t('overallStatus.months', { count: data.length })}</Badge>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[300px]"
        >
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: 'rgb(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'rgb(var(--muted-foreground))' }}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              content={<ChartTooltipContent 
                formatter={formatCurrencySimple}
              />}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="rgb(var(--primary))" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="labor" 
              stroke="rgb(var(--chart-1))" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="materials" 
              stroke="rgb(var(--chart-2))" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
