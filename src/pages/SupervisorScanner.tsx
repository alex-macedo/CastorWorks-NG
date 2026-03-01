import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SupervisorQRScanner } from '@/components/supervisor/SupervisorQRScanner';
import { ChevronLeft, Info, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { MobileHeader } from '@/components/supervisor/MobileHeader';
import { MobileBottomNav } from '@/components/supervisor/MobileBottomNav';
import { PullToRefresh } from '@/components/supervisor/PullToRefresh';
import { SyncStatusBar } from '@/components/supervisor/SyncStatusBar';

export default function SupervisorScanner() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { vibrate } = useHapticFeedback();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Add any refresh logic needed for scanner
    setRefreshing(false);
  };

  const handleBack = () => {
    vibrate('light');
    navigate('/supervisor/logistics');
  };

  return (
    <>
      <SyncStatusBar />
      <PullToRefresh onRefresh={handleRefresh} disabled={refreshing}>
        <div className="supervisor-mobile min-h-screen pb-32 bg-background">
          {/* Mobile Header */}
          <MobileHeader
            onRefresh={handleRefresh}
            refreshing={refreshing}
            title={t('supervisor.logistics.qrScanner') || 'Material Scanner'}
          />

          <div className="p-4 space-y-6">
            {/* Page Title */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="p-2 bg-primary/10 rounded-lg">
                <QrCode className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t('supervisor.logistics.qrScanner') || 'Material Scanner'}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('supervisor.logistics.scanToUpdateStock') || 'Scan QR code to update inventory'}
                </p>
              </div>
            </div>

            {/* Instructions */}
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="text-xs font-bold uppercase">
                {t('supervisor.logistics.howToUse') || 'How to use'}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {t('supervisor.logistics.scannerInstruction') || 'Scan a material QR code to see details and update stock levels on-site.'}
              </AlertDescription>
            </Alert>

            {/* QR Scanner Component */}
            <SupervisorQRScanner />

            {/* Additional Info */}
            <div className="pt-6 text-center space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-semibold mb-2">
                  {t('supervisor.logistics.scannerTips') || 'Scanner Tips'}
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1 text-left">
                  <li>• {t('supervisor.logistics.tip1') || 'Ensure good lighting for best results'}</li>
                  <li>• {t('supervisor.logistics.tip2') || 'Hold device steady while scanning'}</li>
                  <li>• {t('supervisor.logistics.tip3') || 'Make sure QR code is clean and undamaged'}</li>
                </ul>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {t('supervisor.logistics.scannerHardwareNote') || 'Ensure camera permissions are enabled in your browser.'}
              </p>
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
}
