import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Loader2, Package } from 'lucide-react';

interface AddInventoryItemModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddInventoryItemModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: AddInventoryItemModalProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    sku: '',
    current_stock: '',
    min_stock_level: '',
    unit: '',
    location_in_site: '',
    cost_per_unit: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate QR code content if not provided
      const qrCodeContent = formData.sku 
        ? `CW-${formData.sku}` 
        : `CW-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { error } = await supabase.from('project_inventory').insert({
        project_id: projectId,
        item_name: formData.item_name,
        sku: formData.sku || null,
        current_stock: parseFloat(formData.current_stock) || 0,
        min_stock_level: parseFloat(formData.min_stock_level) || 0,
        unit: formData.unit,
        qr_code_content: qrCodeContent,
        location_in_site: formData.location_in_site || null,
        cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null,
      });

      if (error) throw error;

      toast({
        title: t('common:success') || 'Success',
        description: t('logistics:itemAdded') || 'Inventory item added successfully',
      });

      // Reset form
      setFormData({
        item_name: '',
        sku: '',
        current_stock: '',
        min_stock_level: '',
        unit: '',
        location_in_site: '',
        cost_per_unit: '',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error adding inventory item:', err);
      toast({
        title: t('common:error') || 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <DialogTitle>{t('logistics:addItem') || 'Add Inventory Item'}</DialogTitle>
          </div>
          <DialogDescription>
            {t('logistics:addItemDescription') || 'Add a new material or item to project inventory'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="item_name">
                {t('logistics:itemName') || 'Item Name'} *
              </Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => handleChange('item_name', e.target.value)}
                placeholder={t('logistics:placeholders.itemName') || 'e.g., Portland Cement'}
                required
              />
            </div>

            <div>
              <Label htmlFor="sku">
                {t('logistics:sku') || 'SKU/Code'}
              </Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                placeholder={t('logistics:placeholders.sku') || 'e.g., MAT-001'}
              />
            </div>

            <div>
              <Label htmlFor="unit">
                {t('logistics:unit') || 'Unit'} *
              </Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                placeholder={t('logistics:placeholders.unit') || 'e.g., bags, kg, units'}
                required
              />
            </div>

            <div>
              <Label htmlFor="current_stock">
                {t('logistics:currentStock') || 'Current Stock'} *
              </Label>
              <Input
                id="current_stock"
                type="number"
                step="0.01"
                value={formData.current_stock}
                onChange={(e) => handleChange('current_stock', e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="min_stock_level">
                {t('logistics:minStockLevel') || 'Min Stock Level'} *
              </Label>
              <Input
                id="min_stock_level"
                type="number"
                step="0.01"
                value={formData.min_stock_level}
                onChange={(e) => handleChange('min_stock_level', e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="location_in_site">
                {t('logistics:location') || 'Location in Site'}
              </Label>
              <Input
                id="location_in_site"
                value={formData.location_in_site}
                onChange={(e) => handleChange('location_in_site', e.target.value)}
                placeholder={t('logistics:placeholders.location') || 'e.g., Storage A'}
              />
            </div>

            <div>
              <Label htmlFor="cost_per_unit">
                {t('logistics:costPerUnit') || 'Cost per Unit'}
              </Label>
              <Input
                id="cost_per_unit"
                type="number"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => handleChange('cost_per_unit', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common:cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('logistics:addItem') || 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
