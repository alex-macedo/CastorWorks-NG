import React from 'react';
import { Button } from '@/components/ui/button';
import { QRScanner } from '@/components/Mobile/Logistics/QRScanner';
import { ChevronLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Container } from '@/components/Layout';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MobileScanner() {
  const navigate = useNavigate();
  const { t } = useLocalization();

  return (
    <Container size="sm" className="pb-20">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/mobile/logistics')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">{t('logistics:qrScanner') || 'Material Scanner'}</h1>
        </div>

        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-xs font-bold uppercase">{t('logistics:howToUse') || 'How to use'}</AlertTitle>
          <AlertDescription className="text-xs">
            {t('logistics:scannerInstruction') || 'Scan a material QR code to see details and update stock levels on-site.'}
          </AlertDescription>
        </Alert>

        <QRScanner />

        <div className="pt-10 text-center">
           <p className="text-xs text-muted-foreground">
             {t('logistics:scannerHardwareNote') || 'Ensure camera permissions are enabled in your browser.'}
           </p>
        </div>
      </div>
    </Container>
  );
}
