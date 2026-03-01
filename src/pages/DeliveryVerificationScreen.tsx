/**
 * Story 4-3: Delivery Verification Checklist Screen
 * Epic 4: Delivery Confirmation & Payment Processing
 *
 * Screen for supervisors to verify received items against the purchase order
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useLocalization } from "@/contexts/LocalizationContext";
import { ArrowLeft } from 'lucide-react';
import { DeliveryChecklistItem } from '@/components/Procurement/DeliveryChecklistItem';

interface POItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
}

interface PurchaseOrder {
  id: string;
  purchase_order_number: string;
  purchase_request_id?: string;
  suppliers: {
    name: string;
  };
  projects: {
    name: string;
  };
}

const itemSchema = z.object({
  item_id: z.string(),
  description: z.string(),
  ordered_quantity: z.number(),
  received_quantity: z.number(),
  matches_order: z.boolean(),
  is_damaged: z.boolean(),
  damaged_quantity: z.number().optional(),
  notes: z.string().optional(),
});

const formSchema = z.object({
  items: z.array(itemSchema),
  general_notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

import { logError } from '@/lib/logger-migration';

export default function DeliveryVerificationScreen() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLocalization();
  const [loading, setLoading] = useState(true);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [poItems, setPoItems] = useState<POItem[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [],
      general_notes: '',
    },
  });

  const fetchPurchaseOrder = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch PO details with purchase_request_id
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          purchase_order_number,
          purchase_request_id,
          suppliers (name),
          projects (name)
        `)
        .eq('id', poId)
        .single();

      if (poError) throw poError;
      setPurchaseOrder(po);

      // Fetch PO items from purchase_request_items using the request_id from PO
      const { data: items, error: itemsError } = await supabase
        .from('purchase_request_items')
        .select('id, description, quantity, unit')
        .eq('request_id', po.purchase_request_id);

      if (itemsError) throw itemsError;
      setPoItems(items || []);

      // Initialize form with items
      form.reset({
        items: (items || []).map((item: any) => ({
          item_id: item.id,
          description: item.description,
          ordered_quantity: item.quantity,
          received_quantity: item.quantity, // Pre-fill with ordered quantity
          matches_order: true,
          is_damaged: false,
          damaged_quantity: 0,
          notes: '',
        })),
        general_notes: '',
      });
    } catch (error: any) {
      logError('Error fetching PO', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [form, poId, toast]);

  useEffect(() => {
    if (poId) {
      fetchPurchaseOrder();
    }
  }, [fetchPurchaseOrder, poId]);

  const onSubmit = (values: FormValues) => {
    // Store form data in session storage for next step
    sessionStorage.setItem('deliveryVerification', JSON.stringify({
      poId,
      ...values,
    }));
    navigate(`/supervisor/deliveries/${poId}/photos`);
  };

  const watchItems = form.watch('items');

  const calculateProgress = () => {
    if (watchItems.length === 0) return 0;
    const completeItems = watchItems.filter(item => item.matches_order && !item.is_damaged).length;
    return Math.round((completeItems / watchItems.length) * 100);
  };

  const getSummaryText = () => {
    const total = watchItems.length;
    const complete = watchItems.filter(item => item.matches_order && !item.is_damaged).length;
    return t('procurement.deliverySignatureScreen.summaryText', { complete, total });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/supervisor/deliveries')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">
                {purchaseOrder?.purchase_order_number}
              </h1>
              <p className="text-sm text-muted-foreground">
                {purchaseOrder?.suppliers.name}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>{t('procurement.deliverySignatureScreen.stepIndicator', { current: 1, total: 3, label: t('procurement.deliverySignatureScreen.verification') })}</span>
              <span>{t('procurement.deliverySignatureScreen.percentComplete', { percent: calculateProgress() })}</span>
            </div>
            <Progress value={(calculateProgress() / 100) * 33 + 5} className="h-1.5" />
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("procurement.deliverySummary")}</CardTitle>
                <CardDescription>{getSummaryText()}</CardDescription>
              </CardHeader>
            </Card>

            {/* Items Checklist */}
            <div className="space-y-4">
              {watchItems.map((item, index) => (
                <DeliveryChecklistItem
                  key={item.item_id}
                  item={item}
                  unit={poItems[index]?.unit || t('procurement.createPurchaseOrderForm.unitFormat')}
                  onUpdate={(updates) => {
                    const newItems = [...watchItems];
                    newItems[index] = { ...newItems[index], ...updates };
                    form.setValue('items', newItems);
                  }}
                />
              ))}
            </div>

            {/* General Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('procurement.additionalNotes')}</CardTitle>
                <CardDescription>
                  {t('procurement.additionalNotesPlaceholder')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="general_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder={t("procurement.exampleDelivery")}
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
              <div className="container mx-auto flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/supervisor/deliveries')}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="flex-1">
                  {t('common.actions.continueToPhotos')}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
