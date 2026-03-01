import React, { useState, useEffect } from 'react';
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
import { Loader2, Truck, Plus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DeliveryItem {
  name: string;
  qty: number;
  unit: string;
}

interface AddDeliveryModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editDelivery?: any | null;
}

export function AddDeliveryModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
  editDelivery,
}: AddDeliveryModalProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<DeliveryItem[]>([{ name: '', qty: 1, unit: '' }]);
  const [formData, setFormData] = useState({
    supplier_id: '',
    status: 'scheduled',
    scheduled_date: '',
    estimated_arrival: '',
    tracking_number: '',
    driver_name: '',
    driver_contact: '',
    vehicle_plate: '',
    notes: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (editDelivery) {
      setFormData({
        supplier_id: editDelivery.supplier_id || '',
        status: editDelivery.status || 'scheduled',
        scheduled_date: editDelivery.scheduled_date || '',
        estimated_arrival: editDelivery.estimated_arrival 
          ? new Date(editDelivery.estimated_arrival).toISOString().slice(0, 16)
          : '',
        tracking_number: editDelivery.tracking_number || '',
        driver_name: editDelivery.driver_name || '',
        driver_contact: editDelivery.driver_contact || '',
        vehicle_plate: editDelivery.vehicle_plate || '',
        notes: editDelivery.notes || '',
      });
      setItems(editDelivery.items?.length > 0 ? editDelivery.items : [{ name: '', qty: 1, unit: '' }]);
    } else {
      // Reset form for new delivery
      setFormData({
        supplier_id: '',
        status: 'scheduled',
        scheduled_date: new Date().toISOString().split('T')[0],
        estimated_arrival: '',
        tracking_number: '',
        driver_name: '',
        driver_contact: '',
        vehicle_plate: '',
        notes: '',
      });
      setItems([{ name: '', qty: 1, unit: '' }]);
    }
  }, [editDelivery, isOpen]);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name').order('name');
    if (data) setSuppliers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const deliveryData = {
        project_id: projectId,
        supplier_id: formData.supplier_id || null,
        status: formData.status,
        scheduled_date: formData.scheduled_date,
        estimated_arrival: formData.estimated_arrival || null,
        tracking_number: formData.tracking_number || null,
        driver_name: formData.driver_name || null,
        driver_contact: formData.driver_contact || null,
        vehicle_plate: formData.vehicle_plate || null,
        items: items.filter(item => item.name.trim() !== ''),
        notes: formData.notes || null,
      };

      let error;
      if (editDelivery) {
        ({ error } = await supabase
          .from('project_deliveries')
          .update(deliveryData)
          .eq('id', editDelivery.id));
      } else {
        ({ error } = await supabase.from('project_deliveries').insert(deliveryData));
      }

      if (error) throw error;

      toast({
        title: t('common:success') || 'Success',
        description: editDelivery 
          ? (t('logistics:deliveryUpdated') || 'Delivery updated successfully')
          : (t('logistics:deliveryAdded') || 'Delivery scheduled successfully'),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving delivery:', err);
      toast({
        title: t('common:error') || 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editDelivery) return;
    
    if (!confirm(t('logistics:confirmDeleteDelivery') || 'Are you sure you want to delete this delivery?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('project_deliveries')
        .delete()
        .eq('id', editDelivery.id);

      if (error) throw error;

      toast({
        title: t('common:success') || 'Success',
        description: t('logistics:deliveryDeleted') || 'Delivery deleted successfully',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast({
        title: t('common:error') || 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setItems([...items, { name: '', qty: 1, unit: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof DeliveryItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <DialogTitle>
              {editDelivery 
                ? (t('logistics:editDelivery') || 'Edit Delivery')
                : (t('logistics:addDelivery') || 'Schedule Delivery')
              }
            </DialogTitle>
          </div>
          <DialogDescription>
            {t('logistics:deliveryDescription') || 'Schedule or update a material delivery'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('logistics:supplier') || 'Supplier'}</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(value) => setFormData({...formData, supplier_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('logistics:selectSupplier') || 'Select supplier...'} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('logistics:status') || 'Status'}</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">{t('logistics:status.scheduled')}</SelectItem>
                  <SelectItem value="in_transit">{t('logistics:status.in_transit')}</SelectItem>
                  <SelectItem value="delivered">{t('logistics:status.delivered')}</SelectItem>
                  <SelectItem value="delayed">{t('logistics:status.delayed')}</SelectItem>
                  <SelectItem value="cancelled">{t('logistics:status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('logistics:scheduledDate') || 'Scheduled Date'} *</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>{t('logistics:estimatedArrival') || 'Estimated Arrival'}</Label>
              <Input
                type="datetime-local"
                value={formData.estimated_arrival}
                onChange={(e) => setFormData({...formData, estimated_arrival: e.target.value})}
              />
            </div>

            <div>
              <Label>{t('logistics:trackingNumber') || 'Tracking Number'}</Label>
              <Input
                value={formData.tracking_number}
                onChange={(e) => setFormData({...formData, tracking_number: e.target.value})}
                placeholder={t('logistics:placeholders.tracking') || 'e.g., TRK-12345'}
              />
            </div>

            <div>
              <Label>{t('logistics:driverContact') || 'Driver Contact'}</Label>
              <Input
                value={formData.driver_contact}
                onChange={(e) => setFormData({...formData, driver_contact: e.target.value})}
                placeholder={t('logistics:placeholders.phone') || '+1 234 567 8900'}
              />
            </div>

            <div>
              <Label>{t('logistics:driverName') || 'Driver Name'}</Label>
              <Input
                value={formData.driver_name}
                onChange={(e) => setFormData({...formData, driver_name: e.target.value})}
                placeholder={t('logistics:placeholders.driverName') || 'Driver name'}
              />
            </div>

            <div>
              <Label>{t('logistics:vehiclePlate') || 'Vehicle Plate'}</Label>
              <Input
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value})}
                placeholder={t('logistics:placeholders.plate') || 'ABC-1234'}
              />
            </div>
          </div>

          <div>
            <Label>{t('logistics:items') || 'Items'}</Label>
            <div className="space-y-2 mt-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    placeholder={t('logistics:placeholders.itemName') || 'Item name'}
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
                    className="w-20"
                  />
                  <Input
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    className="w-24"
                  />
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('logistics:addItem') || 'Add Item'}
              </Button>
            </div>
          </div>

          <div>
            <Label>{t('logistics:notes') || 'Notes'}</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder={t('logistics:placeholders.notes') || 'Additional notes...'}
            />
          </div>

          <DialogFooter className="pt-4 gap-2">
            {editDelivery && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="mr-auto"
              >
                {t('common:delete') || 'Delete'}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common:cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editDelivery 
                ? (t('common:update') || 'Update')
                : (t('logistics:scheduleDelivery') || 'Schedule Delivery')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
