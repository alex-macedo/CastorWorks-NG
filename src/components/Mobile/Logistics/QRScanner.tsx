import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess?: (decodedText: string) => void;
  projectId?: string;
}

export function QRScanner({ onScanSuccess, projectId }: QRScannerProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItem, setScannedItem] = useState<any>(null);

  async function onScanSuccessInternal(decodedText: string) {
    if (isProcessing) return;
    setIsProcessing(true);
    
    console.log(`[QR Scanner] Scanned content: ${decodedText}`);

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
          title: t('logistics:itemNotFound') || 'Item Not Found',
          description: t('logistics:qrCodeNotRecognized') || 'This QR code is not registered in our inventory.',
          variant: 'destructive'
        });
        setIsProcessing(false);
        return;
      }

      setScannedItem(item);
      if (onScanSuccess) onScanSuccess(decodedText);

    } catch (err: any) {
      console.error('[QR Scanner] Error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
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
          notes: 'Updated via mobile QR scanner'
        });

      if (transError) throw transError;

      toast({
        title: t('logistics:stockUpdated') || 'Stock Updated',
        description: `${scannedItem.item_name}: ${newStock} ${scannedItem.unit}`,
      });

      // Reset
      setScannedItem(null);

    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {!scannedItem ? (
        <Card className="overflow-hidden border-2 border-dashed">
          <CardContent className="p-0">
            <div id="qr-reader" className="w-full"></div>
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t('logistics:alignQrInFrame') || 'Align QR Code within the frame to scan'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-in fade-in zoom-in duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">{scannedItem.item_name}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setScannedItem(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-6">
               <div>
                 <p className="text-xs text-muted-foreground uppercase">{t('logistics:currentStock') || 'Current Stock'}</p>
                 <p className="text-3xl font-bold">{scannedItem.current_stock} <span className="text-sm font-normal text-muted-foreground">{scannedItem.unit}</span></p>
               </div>
               <Badge variant={scannedItem.current_stock <= scannedItem.min_stock_level ? 'destructive' : 'secondary'}>
                 Min: {scannedItem.min_stock_level}
               </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Button 
                variant="outline" 
                className="h-16 flex flex-col gap-1 border-red-200 hover:bg-red-50 text-red-700"
                onClick={() => handleUpdateStock(-1)}
                disabled={isProcessing}
               >
                 <span className="text-xl">-1</span>
                 <span className="text-[10px] uppercase">{t('logistics:removeFromStock') || 'Remove'}</span>
               </Button>
               <Button 
                variant="outline" 
                className="h-16 flex flex-col gap-1 border-green-200 hover:bg-green-50 text-green-700"
                onClick={() => handleUpdateStock(1)}
                disabled={isProcessing}
               >
                 <span className="text-xl">+1</span>
                 <span className="text-[10px] uppercase">{t('logistics:addToStock') || 'Add'}</span>
               </Button>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Button 
                className="w-full" 
                onClick={() => handleUpdateStock(10)}
                disabled={isProcessing}
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('logistics:bulkAdd') || 'Bulk Add (+10)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
