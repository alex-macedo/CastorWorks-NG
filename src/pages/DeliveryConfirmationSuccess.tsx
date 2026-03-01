/**
 * Story 4-7: Delivery Confirmation Success Screen
 * Epic 4: Delivery Confirmation & Payment Processing
 *
 * Success screen shown after delivery confirmation is submitted
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft, Eye } from 'lucide-react';

import { useLocalization } from "@/contexts/LocalizationContext";
export default function DeliveryConfirmationSuccess() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { t } = useLocalization();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate('/supervisor/deliveries');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        {/* Success Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('procurement.deliveryConfirmationSuccess.title')}</CardTitle>
            <CardDescription>
              {t('procurement.deliveryConfirmationSuccess.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* What Happens Next */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">{t('procurement.deliveryConfirmationSuccess.whatHappensNext')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t("ui.projectManagerNotified")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t("ui.purchaseOrderStatusUpdated")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t("ui.paymentTransactionScheduled")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t("ui.photosSignatureSaved")}</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={() => navigate('/supervisor/deliveries')}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('procurement.deliveryConfirmationSuccess.backToDeliveries')}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/purchase-orders/${poId}`)}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                {t('procurement.deliveryConfirmationSuccess.viewPurchaseOrder')}
              </Button>
            </div>

            {/* Auto-redirect Notice */}
            <p className="text-xs text-center text-muted-foreground">
              {t('procurement.deliveryConfirmationSuccess.redirectingNotice', { seconds: 5 })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
