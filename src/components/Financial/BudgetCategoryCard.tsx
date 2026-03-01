import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/utils/formatters";
import { useLocalization } from "@/contexts/LocalizationContext";
import type { CategoryBudget } from "@/hooks/useBudgetAnalysis";

interface BudgetCategoryCardProps {
  category: CategoryBudget;
}

export function BudgetCategoryCard({ category }: BudgetCategoryCardProps) {
  const { currency, t } = useLocalization();

  const translate = (key: string, fallback: string) => {
    const result = t(key);
    return result === key ? fallback : result;
  };

  const rawCategory = category.category?.toLowerCase().trim() || '';
  const sanitizedCategory = rawCategory.startsWith('categories.')
    ? rawCategory.replace(/^categories\./, '')
    : rawCategory;
  const normalizedKey = sanitizedCategory.replace(/[^a-z0-9]/g, '');
  const translationKey = normalizedKey ? `budget:categories.${normalizedKey}` : '';
  const translatedCategory = translationKey ? t(translationKey) : '';
  const displayCategory = translatedCategory.startsWith('budget:categories.') || translatedCategory === ''
    ? category.category
    : translatedCategory;

  const getStatusColor = () => {
    if (category.status === 'danger') return 'text-destructive';
    if (category.status === 'warning') return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = () => {
    if (category.status === 'danger') return 'bg-destructive';
    if (category.status === 'warning') return 'bg-warning';
    return 'bg-success';
  };

  return (
    <Card className="border shadow-sm bg-card">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{displayCategory}</h3>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {category.percentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="relative">
            <Progress value={Math.min(category.percentage, 100)} className="h-2" />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${Math.min(category.percentage, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {formatCurrency(category.actual, currency)} / {formatCurrency(category.budgeted, currency)}
            </span>
            <span className={`font-medium ${category.remaining >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(Math.abs(category.remaining), currency)}{' '}
              {category.remaining >= 0
                ? t('budget:overviewSection.left', { defaultValue: 'left' })
                : t('budget:overviewSection.over', { defaultValue: 'over' })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
