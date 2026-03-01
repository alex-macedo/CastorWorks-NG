import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Wrench, Package, Receipt, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { useLocalization } from '@/contexts/LocalizationContext';

const formatCurrencySimple = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface CategoryData {
  spent: number;
  budget: number;
}

interface BudgetOverviewSectionProps {
  totalBudget: number;
  totalSpent: number;
  categories: {
    labor: CategoryData;
    materials: CategoryData;
    taxes: CategoryData;
    other: CategoryData;
  };
  className?: string;
}

export function BudgetOverviewSection({ totalBudget, totalSpent, categories, className }: BudgetOverviewSectionProps) {
  const { t } = useLocalization();
  const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  const getColor = (percent: number) => {
    if (percent < 70) return 'bg-success';
    if (percent < 90) return 'bg-warning';
    return 'bg-destructive';
  };

  const categoryConfig = [
    { key: 'labor', label: t('overallStatus.labor'), icon: Wrench, color: 'text-blue-600' },
    { key: 'materials', label: t('overallStatus.materials'), icon: Package, color: 'text-green-600' },
    { key: 'taxes', label: t('overallStatus.taxesAndFees'), icon: Receipt, color: 'text-orange-600' },
    { key: 'other', label: t('overallStatus.other'), icon: DollarSign, color: 'text-blue-600' }
  ];

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>{t('overallStatus.budgetOverview')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold break-words">{formatCurrencySimple(totalSpent)}</p>
              <p className="text-sm text-muted-foreground">
                of {formatCurrencySimple(totalBudget)} ({percentage.toFixed(1)}%)
              </p>
            </div>
          </div>
          <Progress value={Math.min(percentage, 100)} className={getColor(percentage)} />
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryConfig.map(({ key, label, icon: Icon, color }) => {
            const category = categories[key as keyof typeof categories];
            const catPercentage = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
            
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrencySimple(category.spent)}</span>
                    <span>{catPercentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(catPercentage, 100)} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
