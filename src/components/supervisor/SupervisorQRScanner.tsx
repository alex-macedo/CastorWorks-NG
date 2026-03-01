import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertTriangle, X, Package, TrendingDown } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

interface SupervisorQRScannerProps {
  onScanSuccess?: (decodedText: string) => void;
  projectId?: string;
}

export function SupervisorQRScanner({ onScanSuccess, projectId }: SupervisorQRScannerProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItem, setScannedItem] = useState<any>(null);

  async function onScanSuccessInternal(decodedText: string) {
    if (isProcessing) return;
    setIsProcessing(true);
    vibrate('success');
    
    console.log(`[Supervisor QR Scanner] Scanned content: ${decodedText}`);

    try {
      // 1. Find item by QR code content
      const { data: item, error } = await supabase
        .from('project_inventory')
        .select('*')
        .eq('qr_code_content', decodedText)
        .maybeSingle();

      if (error) throw error;

      if (!item) {
        toast({
          title: t('supervisor.logistics.itemNotFound') || 'Item Not Found',
          description: t('supervisor.logistics.qrCodeNotRecognized') || 'This QR code is not registered in our inventory.',
          variant: 'destructive'
        });
        vibrate('error');
        setIsProcessing(false);
        return;
      }

      setScannedItem(item);
      if (onScanSuccess) onScanSuccess(decodedText);

    } catch (err: any) {
      console.error('[Supervisor QR Scanner] Error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      vibrate('error');
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "supervisor-qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    html5QrcodeScanner.render(onScanSuccessInternal, onScanFailure);

    return () => {
      html5QrcodeScanner.clear().catch((error) => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScanFailure(error: any) {
    // Silently ignore failures, as they happen continuously while scanning
  }

  const handleUpdateStock = async (adjustment: number) => {
    if (!scannedItem) return;
    setIsProcessing(true);
    vibrate('light');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Update Inventory
      const newStock = Number(scannedItem.current_stock) + adjustment;
      const { error: updateError } = await supabase
        .from('project_inventory')
        .update({ current_stock: newStock })
        .eq('id', scannedItem.id);

      if (updateError) throw updateError;

      // 2. Log Transaction
      const { error: transError } = await supabase
        .from('project_inventory_transactions')
        .insert({
          inventory_id: scannedItem.id,
          project_id: scannedItem.project_id,
          transaction_type: adjustment > 0 ? 'in' : 'out',
          quantity: Math.abs(adjustment),
          performed_by: user?.id,
          notes: 'Updated via supervisor QR scanner'
        });

      if (transError) throw transError;

      toast({
        title: t('supervisor.logistics.stockUpdated') || 'Stock Updated',
        description: `${scannedItem.item_name}: ${newStock} ${scannedItem.unit}`,
      });
      vibrate('success');

      // Reset
      setScannedItem(null);

    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      vibrate('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {!scannedItem ? (
        <Card className="overflow-hidden border-2 border-dashed border-muted-foreground/20">
          <CardContent className="p-0">
            <div id="supervisor-qr-reader" className="w-full"></div>
            <div className="p-4 text-center bg-muted/30">
              <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('supervisor.logistics.alignQrInFrame') || 'Align QR Code within the frame to scan'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-in fade-in zoom-in duration-300 border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-bold">{scannedItem.item_name}</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setScannedItem(null);
                vibrate('light');
              }}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
               <div>
                 <p className="text-xs text-muted-foreground uppercase font-medium">{t('supervisor.logistics.currentStock') || 'Current Stock'}</p>
                 <p className="text-3xl font-bold text-foreground">{scannedItem.current_stock} <span className="text-sm font-normal text-muted-foreground">{scannedItem.unit}</span></p>
               </div>
               <Badge 
                 variant={scannedItem.current_stock <= scannedItem.min_stock_level ? 'destructive' : 'secondary'}
                 className="px-3 py-1"
               >
                 <div className="flex items-center gap-1">
                   {scannedItem.current_stock <= scannedItem.min_stock_level && <TrendingDown className="h-3 w-3" />}
                   Min: {scannedItem.min_stock_level}
                 </div>
               </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <Button 
                variant="outline" 
                className={cn(
                  "h-16 flex flex-col gap-1 transition-all active:scale-95",
                  "border-red-200 hover:bg-red-50 text-red-700 hover:text-red-800"
                )}
                onClick={() => handleUpdateStock(-1)}
                disabled={isProcessing}
               >
                 <span className="text-xl font-bold">-1</span>
                 <span className="text-[10px] uppercase font-medium">{t('supervisor.logistics.remove') || 'Remove'}</span>
               </Button>
               <Button 
                variant="outline" 
                className={cn(
                  "h-16 flex flex-col gap-1 transition-all active:scale-95",
                  "border-green-200 hover:bg-green-50 text-green-700 hover:text-green-800"
                )}
                onClick={() => handleUpdateStock(1)}
                disabled={isProcessing}
               >
                 <span className="text-xl font-bold">+1</span>
                 <span className="text-[10px] uppercase font-medium">{t('supervisor.logistics.add') || 'Add'}</span>
               </Button>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                className="w-full h-12 transition-all active:scale-95" 
                onClick={() => handleUpdateStock(10)}
                disabled={isProcessing}
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('supervisor.logistics.bulkAdd') || 'Bulk Add (+10)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
