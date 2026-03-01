/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Story 4-5: Digital Signature Pad Integration
 * Epic 4: Delivery Confirmation & Payment Processing
 *
 * Final step: Digital signature capture and delivery confirmation submission
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useSubmitDeliveryConfirmation } from '@/hooks/useDeliveryConfirmations';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DigitalSignatureCapture } from '@/components/Settings/DigitalSignatureCapture';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLocalization } from "@/contexts/LocalizationContext";

interface VerificationData {
  poId: string;
  items: Array<{
    item_id: string;
    description: string;
    ordered_quantity: number;
    received_quantity: number;
    matches_order: boolean;
    is_damaged: boolean;
    damaged_quantity?: number;
    notes?: string;
  }>;
  general_notes?: string;
  photos: Array<{
    photo_url: string;
    photo_storage_path: string;
    caption?: string;
    file_size_bytes?: number;
    mime_type?: string;
  }>;
}

import { logError } from '@/lib/logger-migration';

export default function DeliverySignatureScreen() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { toast } = useToast();
  const submitDelivery = useSubmitDeliveryConfirmation();

  const [signatureData, setSignatureData] = useState<string>('');
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    // Load verification data from previous steps
    const storedData = sessionStorage.getItem('deliveryVerification');
    if (!storedData) {
      toast({
        title: t('common.errorTitle'),
        description: t('procurement.deliverySignatureScreen.completeStepsFirst'),
        variant: 'destructive',
      });
      navigate(`/supervisor/deliveries/${poId}/verify`);
      return;
    }

    const data = JSON.parse(storedData);
    if (!data.photos || data.photos.length === 0) {
      toast({
        title: t('common.errorTitle'),
        description: t('procurement.deliverySignatureScreen.capturePhotoFirst'),
        variant: 'destructive',
      });
      navigate(`/supervisor/deliveries/${poId}/photos`);
      return;
    }

    setVerificationData(data);

    // Get GPS location (optional)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied:', error);
          // Continue without location
        }
      );
    }
  }, [navigate, poId, toast, t]);

  const handleSignatureSave = (signature: string) => {
    setSignatureData(signature);
  };

  const handleSubmit = async () => {
    if (!signatureData) {
      toast({
        title: 'Signature required',
        description: 'Please sign to confirm delivery',
        variant: 'destructive',
      });
      return;
    }

    if (!verificationData) {
      toast({
        title: 'Error',
        description: 'Verification data not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      // Prepare delivery items data
      const deliveryItems = verificationData.items.map(item => ({
        item_description: item.description,
        ordered_quantity: item.ordered_quantity,
        received_quantity: item.received_quantity,
        damaged_quantity: item.damaged_quantity || 0,
        notes: item.notes || undefined,
      }));

      // Determine if there are any issues
      const hasIssues = verificationData.items.some(
        item => !item.matches_order || item.is_damaged
      );

      // Build checklist
      const checklist = {
        items_verified: true,
        all_items_match: verificationData.items.every(item => item.matches_order),
        any_damaged: verificationData.items.some(item => item.is_damaged),
        photos_captured: verificationData.photos.length,
        items: verificationData.items.map(item => ({
          description: item.description,
          ordered: item.ordered_quantity,
          received: item.received_quantity,
          matches: item.matches_order,
          damaged: item.is_damaged,
        })),
      };

      // Submit delivery confirmation
      await submitDelivery.mutateAsync({
        purchase_order_id: poId!,
        confirmed_by_user_id: user.id,
        delivery_date: format(new Date(), 'yyyy-MM-dd'),
        delivery_items: deliveryItems,
        photos: verificationData.photos,
        signature_data_url: signatureData,
        checklist: checklist as Record<string, boolean | string>,
        has_issues: hasIssues,
        issues_description: hasIssues
          ? verificationData.items
              .filter(item => !item.matches_order || item.is_damaged)
              .map(item => item.notes)
              .filter(Boolean)
              .join('; ')
          : undefined,
        notes: verificationData.general_notes,
        gps_latitude: location?.latitude,
        gps_longitude: location?.longitude,
      });

      // Clear session storage
      sessionStorage.removeItem('deliveryVerification');

      // Navigate to success screen
      navigate(`/supervisor/deliveries/${poId}/success`);
    } catch (error: any) {
      logError('Submission error', error);
      toast({
        title: t('procurement.deliverySignatureScreen.submissionFailed'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!verificationData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/supervisor/deliveries/${poId}/photos`)}
              disabled={submitting}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{t("admin:confirmDelivery")}</h1>
              <p className="text-sm text-muted-foreground">
                {t('procurement.deliverySignatureScreen.signToComplete')}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t('procurement.deliverySignatureScreen.stepIndicator', { current: 3, total: 3, label: t('procurement.deliverySignatureScreen.signature') })}</span>
              <span className="text-muted-foreground">100%</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-4">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("procurement.deliverySummary") }</CardTitle>
            <CardDescription>
              {t('procurement.deliverySignatureScreen.reviewBeforeSigning')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t('procurement.deliverySignatureScreen.itemsVerified')}</p>
                <p className="font-medium">{verificationData.items.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('procurement.deliverySignatureScreen.photosCaptured')}</p>
                <p className="font-medium">{verificationData.photos.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('procurement.deliverySignatureScreen.itemsMatched')}</p>
                <p className="font-medium">
                  {verificationData.items.filter(i => i.matches_order).length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('procurement.deliverySignatureScreen.issuesFound')}</p>
                <p className="font-medium">
                  {verificationData.items.filter(i => !i.matches_order || i.is_damaged).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature Pad */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("procurement.digitalSignature.title")}</CardTitle>
            <CardDescription>
              {t('procurement.deliverySignatureScreen.signHereReceipt')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DigitalSignatureCapture onSave={handleSignatureSave} hideHeader={true} />
          </CardContent>
        </Card>

        {/* Location Info */}
        {location && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-900">
                  {t('procurement.deliverySignatureScreen.locationRecorded', { lat: location.latitude.toFixed(6), lng: location.longitude.toFixed(6) })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legal Notice */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">
              {t('procurement.deliverySignatureScreen.legalNotice')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="container mx-auto space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={!signatureData || submitting}
            className="w-full min-h-[44px]"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('procurement.deliverySignatureScreen.submitting')}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('procurement.deliverySignatureScreen.completeConfirmation')}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/supervisor/deliveries/${poId}/photos`)}
            disabled={submitting}
            className="w-full"
          >
            {t('procurement.deliverySignatureScreen.backToPhotos')}
          </Button>
        </div>
      </div>
    </div>
  );
}
