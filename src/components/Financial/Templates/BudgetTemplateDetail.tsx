import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Copy, Trash2 } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatDate } from '@/utils/reportFormatters';
import { formatCurrency } from '@/utils/formatters';
import type { BudgetTemplateWithItems } from '@/hooks/useBudgetTemplates';

interface BudgetTemplateDetailProps {
  template: BudgetTemplateWithItems;
  isLoading?: boolean;
  onBack?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onApply?: () => void;
  readOnly?: boolean;
  showApplyButton?: boolean;
}

export function BudgetTemplateDetail({
  template,
  isLoading = false,
  onBack,
  onEdit,
  onDuplicate,
  onDelete,
  onApply,
  readOnly = false,
  showApplyButton = true,
}: BudgetTemplateDetailProps) {
  const { t, currency, dateFormat } = useLocalization();

  const items = template.items || [];
  const totalBudget = items.reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0);

  const getBudgetTypeLabel = (type: string) => {
    return type === 'simple'
      ? t('templates.type.simple', 'Simple')
      : t('templates.type.costControl', 'Cost Control');
  };

  const getBudgetTypeVariant = (type: string) => {
    return type === 'simple' ? 'secondary' : 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back', 'Back')}
              </Button>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-2">{template.name}</h1>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <Badge variant={getBudgetTypeVariant(template.budget_type)}>
              {getBudgetTypeLabel(template.budget_type)}
            </Badge>
            {template.is_public && (
              <Badge variant="outline">{t('templates.public', 'Public')}</Badge>
            )}
          </div>

          {template.description && (
            <p className="text-muted-foreground max-w-2xl">{template.description}</p>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2 flex-shrink-0">
            {/* Edit Button (first) */}
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              {t('common.edit', 'Edit')}
            </Button>
            {/* Copy/Duplicate Button (second) */}
            <Button variant="outline" size="sm" onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              {t('templates.duplicate', 'Duplicate')}
            </Button>
            {/* Delete Button (third) */}
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete', 'Delete')}
            </Button>
          </div>
        )}

        {showApplyButton && (
          <Button size="sm" onClick={onApply}>
            {t('templates.apply', 'Apply Template')}
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">{t('templates.totalBudget', 'Total Budget')}</p>
            <p className="text-2xl font-bold">{formatCurrency(totalBudget, currency)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">{t('templates.itemCount', 'Items')}</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">{t('templates.createdDate', 'Created')}</p>
             <p className="text-2xl font-bold">
               {template.created_at && formatDate(new Date(template.created_at), dateFormat)}
             </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Items */}
      <Card>
        <CardHeader>
          <CardTitle>{t('templates.items', 'Budget Items')}</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('templates.noItems', 'No items in this template')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold">{t('templates.category', 'Category')}</th>
                    <th className="text-left py-2 px-2 font-semibold">{t('common.description', 'Description')}</th>
                    <th className="text-right py-2 px-2 font-semibold">{t('templates.amount', 'Amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id || index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{item.category}</td>
                      <td className="py-3 px-2 text-muted-foreground">{item.description || '—'}</td>
                      <td className="py-3 px-2 text-right font-semibold">
                        {formatCurrency(Number(item.budgeted_amount || 0), currency)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-muted/50">
                    <td colSpan={2} className="py-3 px-2 text-right">
                      {t('templates.total', 'Total')}:
                    </td>
                    <td className="py-3 px-2 text-right">
                      {formatCurrency(totalBudget, currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phases (if cost control) */}
      {template.phases && template.phases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('templates.phases', 'Phases')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {template.phases.map((phase, index) => (
                <div key={phase.id || index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{phase.phase_name}</span>
                  <Badge variant="outline">{t('common.order', 'Order')}: {phase.sort_order}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Codes (if cost control) */}
      {template.cost_codes && template.cost_codes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('templates.costCodes', 'Cost Codes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold">{t('templates.code', 'Code')}</th>
                    <th className="text-left py-2 px-2 font-semibold">{t('templates.name', 'Name')}</th>
                  </tr>
                </thead>
                <tbody>
                  {template.cost_codes.map((cc, index) => (
                    <tr key={cc.id || index} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-medium font-mono">{cc.code}</td>
                      <td className="py-2 px-2">{cc.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
