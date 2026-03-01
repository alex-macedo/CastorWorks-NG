import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';

export interface LineItem {
  id: string;
  category: string;
  subcategory?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  notes?: string;
}

interface Props {
  lineItems: LineItem[];
  onChange: (items: LineItem[]) => void;
  markupPercentage: number;
  onMarkupChange: (value: number) => void;
  taxRate: number;
  onTaxRateChange: (value: number) => void;
}

const UNITS = ['sf', 'lf', 'ea', 'hr', 'day', 'cy', 'ton', 'gal', 'box', 'roll'];

export const EstimateLineItemTable = ({
  lineItems,
  onChange,
  markupPercentage,
  onMarkupChange,
  taxRate,
  onTaxRateChange,
}: Props) => {
  const { t } = useLocalization();

  const CATEGORIES = [
    { value: 'demolition', label: t('estimates.lineItems.categories.demolition'), color: 'bg-red-100 text-red-800' },
    { value: 'materials', label: t('estimates.lineItems.categories.materials'), color: 'bg-blue-100 text-blue-800' },
    { value: 'labor', label: t('estimates.lineItems.categories.labor'), color: 'bg-green-100 text-green-800' },
    { value: 'equipment', label: t('estimates.lineItems.categories.equipment'), color: 'bg-blue-100 text-blue-800' },
    { value: 'permits', label: t('estimates.lineItems.categories.permits'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'disposal', label: t('estimates.lineItems.categories.disposal'), color: 'bg-orange-100 text-orange-800' },
    { value: 'contingency', label: t('estimates.lineItems.categories.contingency'), color: 'bg-gray-100 text-gray-800' },
  ];
  const updateLineItem = (id: string, field: string, value: any) => {
    const updated = lineItems.map((item) => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        // Recalculate total if quantity or unitPrice changed
        if (field === 'quantity' || field === 'unitPrice') {
          newItem.total = newItem.quantity * newItem.unitPrice;
        }
        return newItem;
      }
      return item;
    });
    onChange(updated);
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: uuidv4(),
      category: 'materials',
      description: t('estimates.lineItems.newItem'),
      quantity: 1,
      unit: 'ea',
      unitPrice: 0,
      total: 0,
    };
    onChange([...lineItems, newItem]);
  };

  const deleteLineItem = (id: string) => {
    onChange(lineItems.filter((item) => item.id !== id));
  };

  const calculations = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const markupAmount = subtotal * (markupPercentage / 100);
    const subtotalWithMarkup = subtotal + markupAmount;
    const taxAmount = subtotalWithMarkup * (taxRate / 100);
    const grandTotal = subtotalWithMarkup + taxAmount;

    return { subtotal, markupAmount, subtotalWithMarkup, taxAmount, grandTotal };
  }, [lineItems, markupPercentage, taxRate]);

  // Group items by category
  const categoryGroups = useMemo(() => {
    const groups: Record<string, LineItem[]> = {};
    lineItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [lineItems]);

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Line Items Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-32">{t('estimates.lineItems.columns.category')}</TableHead>
              <TableHead className="min-w-[250px]">{t('estimates.lineItems.columns.description')}</TableHead>
              <TableHead className="w-24">{t('estimates.lineItems.columns.quantity')}</TableHead>
              <TableHead className="w-24">{t('estimates.lineItems.columns.unit')}</TableHead>
              <TableHead className="w-32">{t('estimates.lineItems.columns.unitPrice')}</TableHead>
              <TableHead className="w-32 text-right">{t('estimates.lineItems.columns.total')}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {t('estimates.lineItems.noItems') || `No line items yet. Click "${t('estimates.lineItems.addItem')}" to get started.`}
                </TableCell>
              </TableRow>
            ) : (
              lineItems.map((item, index) => (
                <TableRow key={item.id} className="group">
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.category}
                      onValueChange={(val) => updateLineItem(item.id, 'category', val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <Badge variant="outline" className={cat.color}>
                              {cat.label}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      className="h-9"
                      placeholder={t('estimates.lineItems.columns.description')}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      className="h-9"
                      min="0"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.unit}
                      onValueChange={(val) => updateLineItem(item.id, 'unit', val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      className="h-9"
                      min="0"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${item.total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLineItem(item.id)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Line Item Button */}
      <Button onClick={addLineItem} variant="outline" className="w-full" size="lg">
        <Plus className="h-4 w-4 mr-2" />
        {t('estimates.lineItems.addItem')}
      </Button>

      {/* Category Summary */}
      {Object.keys(categoryGroups).length > 0 && (
        <div className="bg-muted/30 p-4 rounded-lg border">
          <h4 className="font-semibold text-sm mb-3">{t('estimates.lineItems.summaryByCategory') || 'Summary by Category'}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(categoryGroups).map(([category, items]) => {
              const categoryTotal = items.reduce((sum, item) => sum + item.total, 0);
              const categoryInfo = CATEGORIES.find((c) => c.value === category);
              return (
                <div key={category} className="bg-background p-3 rounded border">
                  <Badge variant="outline" className={getCategoryColor(category)}>
                    {categoryInfo?.label || category}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{items.length} items</p>
                  <p className="font-semibold mt-1">${categoryTotal.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calculations Summary */}
      <div className="bg-muted p-6 rounded-lg space-y-4 border-2">
        <h3 className="font-semibold text-lg mb-4">{t('estimates.lineItems.estimateSummary') || 'Estimate Summary'}</h3>

        <div className="flex justify-between items-center pb-3 border-b">
          <span className="text-muted-foreground">{t('estimates.lineItems.subtotal')}:</span>
          <span className="font-medium text-lg">${calculations.subtotal.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{t('estimates.lineItems.markup')}:</span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={markupPercentage}
                onChange={(e) => onMarkupChange(parseFloat(e.target.value) || 0)}
                className="w-20 h-9"
                min="0"
                max="100"
                step="0.5"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <span className="font-medium text-lg">+${calculations.markupAmount.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{t('estimates.lineItems.tax')}:</span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={taxRate}
                onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
                className="w-20 h-9"
                min="0"
                max="100"
                step="0.25"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <span className="font-medium text-lg">+${calculations.taxAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-xl font-bold">{t('estimates.lineItems.total')}:</span>
          <span className="text-3xl font-bold text-primary">
            ${calculations.grandTotal.toFixed(2)}
          </span>
        </div>

        {lineItems.length > 0 && (
          <div className="text-xs text-muted-foreground text-right pt-2">
            {lineItems.length} {lineItems.length === 1 ? t('estimates.lineItems.lineItemCount') : `${t('estimates.lineItems.lineItemCount')}s`}
          </div>
        )}
      </div>
    </div>
  );
};
