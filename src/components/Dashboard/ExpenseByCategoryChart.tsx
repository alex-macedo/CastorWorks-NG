import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';


interface CategoryData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface ExpenseByCategoryChartProps {
  data: CategoryData[];
  className?: string;
}

// Fallback color palette
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

export function ExpenseByCategoryChart({ data, className }: ExpenseByCategoryChartProps) {
  const { t, language } = useLocalization();

  const formatCurrencySimple = (value: number) => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Debug: Log the data to see if colors are present
  console.log('ExpenseByCategoryChart data:', data);
  console.log('Data with colors:', data.map((d, i) => ({ 
    name: d.name, 
    value: d.value, 
    originalColor: d.color,
    fallbackColor: COLORS[i % COLORS.length]
  })));

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{t('dashboard.expenseByCategory.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('dashboard.expenseByCategory.description')}</p>
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
    <Card className={className}>
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>{t('dashboard.expenseByCategory.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('dashboard.expenseByCategory.description')}</p>
        </div>
        <Badge variant="outline">{t('dashboard.expenseByCategory.categories', { count: data.length })}</Badge>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="42%"
                labelLine={false}
                outerRadius={110}
                dataKey="value"
              >
                {data.map((entry, index) => {
                  const color = entry.color || COLORS[index % COLORS.length];
                  console.log(`Cell ${index}: ${entry.name} - color: ${color}`);
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={color}
                    />
                  );
                })}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrencySimple(Number(value))}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  backgroundColor: 'rgb(var(--popover))',
                  color: 'rgb(var(--popover-foreground))'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={80}
                wrapperStyle={{ 
                  paddingTop: '10px',
                  fontSize: '12px',
                  maxWidth: '100%'
                }}
                iconType="circle"
                layout="horizontal"
                align="center"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
