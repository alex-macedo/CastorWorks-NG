import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Printer, Check } from 'lucide-react';

interface QRCodePrintModalProps {
  inventory: any[];
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodePrintModal({
  inventory,
  isOpen,
  onClose,
}: QRCodePrintModalProps) {
  const { t } = useLocalization();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !printRef.current) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('logistics:qrCodes') || 'QR Codes'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .qr-grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 40px; 
              max-width: 800px; 
              margin: 0 auto; 
            }
            .qr-item { 
              border: 2px solid #333; 
              padding: 20px; 
              text-align: center; 
              page-break-inside: avoid;
            }
            .qr-code { 
              width: 200px; 
              height: 200px; 
              margin: 0 auto 15px;
              background: #f0f0f0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: monospace;
              font-size: 12px;
              word-break: break-all;
            }
            .item-name { 
              font-size: 18px; 
              font-weight: bold; 
              margin-bottom: 5px; 
            }
            .item-sku { 
              font-size: 14px; 
              color: #666; 
              margin-bottom: 10px;
            }
            .qr-text {
              font-size: 10px;
              color: #999;
              margin-top: 10px;
            }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-grid">
            ${inventory.map(item => `
              <div class="qr-item">
                <div class="item-name">${item.item_name}</div>
                ${item.sku ? `<div class="item-sku">${item.sku}</div>` : ''}
                <div class="qr-code">
                  ${item.qr_code_content || 'No QR Code'}
                </div>
                <div class="qr-text">${item.qr_code_content}</div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <DialogTitle>{t('logistics:printQRCodes') || 'Print QR Codes'}</DialogTitle>
          </div>
          <DialogDescription>
            {t('logistics:printQRDescription') || `Print QR codes for ${inventory.length} inventory items`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>{t('logistics:printInstructions.itemName') || 'Item name clearly displayed'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>{t('logistics:printInstructions.qrCode') || 'Scannable QR code'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>{t('logistics:printInstructions.sku') || 'SKU reference included'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>{t('logistics:printInstructions.format') || '2 per page, print-ready format'}</span>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>{t('logistics:itemsToPrint') || 'Items to print'}: <strong>{inventory.length}</strong></p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('common:cancel') || 'Cancel'}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('logistics:openPrintDialog') || 'Open Print Dialog'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
