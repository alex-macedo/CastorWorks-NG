import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, AlertTriangle, XCircle, Package } from 'lucide-react';
import { useLocalization } from "@/contexts/LocalizationContext";

interface DeliveryChecklistItemProps {
  item: {
    item_id: string;
    description: string;
    ordered_quantity: number;
    received_quantity: number;
    matches_order: boolean;
    is_damaged: boolean;
    damaged_quantity?: number;
    notes?: string;
  };
  unit: string;
  onUpdate: (updates: any) => void;
}

export function DeliveryChecklistItem({
  item,
  unit,
  onUpdate,
}: DeliveryChecklistItemProps) {
  const { t } = useLocalization();

  const getStatus = () => {
    if (item.is_damaged) return 'damaged';
    if (item.received_quantity < item.ordered_quantity) return 'partial';
    if (item.matches_order) return 'complete';
    return 'issue';
  };

  const status = getStatus();

  return (
    <Card className={`transition-all border-l-4 ${
      status === 'complete' ? 'border-l-green-500 bg-green-50/30' : 
      status === 'partial' ? 'border-l-amber-500 bg-amber-50/30' : 
      status === 'damaged' ? 'border-l-red-500 bg-red-50/30' : 
      'border-l-muted'
    }`}>
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {status === 'complete' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {status === 'partial' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
            {status === 'damaged' && <XCircle className="h-5 w-5 text-red-600" />}
            {status === 'issue' && <Package className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-bold truncate">
              {item.description}
            </CardTitle>
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
              {t('procurement.deliveryChecklist.ordered', { count: item.ordered_quantity, unit })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-4 pb-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-muted-foreground">{t('procurement.deliveryChecklist.received')}</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={item.received_quantity}
              onChange={(e) => onUpdate({ received_quantity: parseFloat(e.target.value) || 0 })}
              className="h-10 text-base font-bold tabular-nums"
            />
          </div>
          <div className="flex flex-col justify-end gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`matches-${item.item_id}`}
                checked={item.matches_order}
                onCheckedChange={(checked) => onUpdate({ matches_order: !!checked })}
              />
              <Label htmlFor={`matches-${item.item_id}`} className="font-medium cursor-pointer">{t('procurement.deliveryChecklist.matchesSpecs')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`damaged-${item.item_id}`}
                checked={item.is_damaged}
                onCheckedChange={(checked) => onUpdate({ is_damaged: !!checked })}
              />
              <Label htmlFor={`damaged-${item.item_id}`} className="font-medium cursor-pointer text-red-600">{t('procurement.deliveryChecklist.damaged')}</Label>
            </div>
          </div>
        </div>

        {item.is_damaged && (
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-bold uppercase text-red-600">{t('procurement.deliveryChecklist.damagedQuantity')}</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={item.damaged_quantity || 0}
              onChange={(e) => onUpdate({ damaged_quantity: parseFloat(e.target.value) || 0 })}
              className="h-10 border-red-200 focus:ring-red-100"
            />
          </div>
        )}

        {(!item.matches_order || item.is_damaged) && (
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-bold uppercase text-muted-foreground">{t('procurement.deliveryChecklist.issueDescription')}</Label>
            <Textarea
              placeholder={t("procurement.describeIssue")}
              value={item.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              className="min-h-[80px]"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
