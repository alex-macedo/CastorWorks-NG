import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart } from 'recharts';
import { Bar } from 'recharts/es6/cartesian/Bar';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';

interface AbcData {
  name: string;
  cost: number;
}

interface AbcCurveChartProps {
  data: AbcData[];
}

export function AbcCurveChart({ data }: AbcCurveChartProps) {
  const { t, language } = useLocalization();

  const formatCurrencySimple = useCallback((value: number) => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }, [language]);

  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const sortedData = [...data].sort((a, b) => b.cost - a.cost);
    const totalCost = sortedData.reduce((acc, item) => acc + item.cost, 0);

    const result: typeof sortedData & { cumulativePercentage: number }[] = [];
    let cumulativeCost = 0;
    for (const item of sortedData) {
      cumulativeCost += item.cost;
      result.push({
        ...item,
        cumulativePercentage: (cumulativeCost / totalCost) * 100,
      });
    }
    return result;
  }, [data]);

  const chartConfig = useMemo(() => ({}), []);
  const xAxisTick = useMemo(() => ({ fontSize: 12 }), []);
  const percentFormatter = useCallback((value: number) => `${value.toFixed(0)}%`, []);
  const tooltipFormatter = useCallback((value: number | string, name: string) => {
    return name === 'cumulativePercentage' 
      ? `${Number(value).toFixed(2)}%` 
      : formatCurrencySimple(Number(value));
  }, [formatCurrencySimple]);
  const tooltipContent = useMemo(() => (
    <ChartTooltipContent formatter={tooltipFormatter} />
  ), [tooltipFormatter]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{t('dashboard.abcCurve.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('dashboard.abcCurve.description')}</p>
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
          <CardTitle>{t('dashboard.abcCurve.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('dashboard.abcCurve.description')}</p>
        </div>
        <Badge variant="outline">{t('dashboard.abcCurve.items', { count: data.length })}</Badge>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tickFormatter={formatCurrencySimple} />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tickFormatter={(value) => `${value.toFixed(0)}%`} />
            <Tooltip content={<ChartTooltipContent formatter={(value, name) => name === 'cumulativePercentage' ? `${Number(value).toFixed(2)}%` : formatCurrencySimple(Number(value))} />} />
            <Legend />
            <Bar yAxisId="left" dataKey="cost" fill="#8884d8" name={t('dashboard.abcCurve.cost')} />
            <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" stroke="#82ca9d" name={t('dashboard.abcCurve.cumulativePercentage')} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
