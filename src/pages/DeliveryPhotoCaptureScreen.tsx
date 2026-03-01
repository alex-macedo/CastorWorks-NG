/**
 * Story 4-4: Delivery Photo Capture Component
 * Epic 4: Delivery Confirmation & Payment Processing
 *
 * Photo capture screen for delivery documentation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUploadDeliveryPhotos } from '@/hooks/useDeliveryConfirmations';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CameraCapture } from '@/components/Photos/CameraCapture';
import { ArrowLeft, X, Image as ImageIcon, Upload } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';

interface CapturedPhoto {
  file: File;
  preview: string;
  caption: string;
}

export default function DeliveryPhotoCaptureScreen() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLocalization();
  const uploadPhotos = useUploadDeliveryPhotos();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [poNumber, setPoNumber] = useState<string>('');

  const fetchPONumber = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('purchase_orders')
        .select('purchase_order_number')
        .eq('id', poId)
        .single();

      if (data) {
        setPoNumber(data.purchase_order_number);
      }
    } catch (error) {
      console.error('Error fetching PO number:', error);
    }
  }, [poId]);

  useEffect(() => {
    // Load verification data from previous step
    const verificationData = sessionStorage.getItem('deliveryVerification');
    if (!verificationData) {
      toast({
        title: t('procurement.deliveryPhotoCapture.error'),
        description: t('procurement.deliveryPhotoCapture.completeVerificationFirst'),
        variant: 'destructive',
      });
      navigate(`/supervisor/deliveries/${poId}/verify`);
    }

    // Get PO number for photo naming
    fetchPONumber();
  }, [fetchPONumber, navigate, poId, toast, t]);

  const handlePhotoCapture = useCallback((file: File) => {
    console.log('📸 [DeliveryPhotoCaptureScreen] Photo captured:', file.name, file.size);
    
    if (photos.length >= 10) {
      toast({
        title: t('procurement.deliveryPhotoCapture.maximumPhotosReached'),
        description: t('procurement.deliveryPhotoCapture.maximumPhotosDescription'),
        variant: 'destructive',
      });
      return;
    }

    const photo: CapturedPhoto = {
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    };

    setPhotos(prev => [...prev, photo]);
    
    toast({
      title: t('common.success'),
      description: t('supervisor.photoAdded'),
    });
  }, [photos.length, toast, t]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    console.log('📂 [DeliveryPhotoCaptureScreen] Files selected:', files.length);

    if (photos.length + files.length > 10) {
      toast({
        title: t('procurement.deliveryPhotoCapture.tooManyPhotos'),
        description: t('procurement.deliveryPhotoCapture.tooManyPhotosDescription', { remaining: 10 - photos.length }),
        variant: 'destructive',
      });
      return;
    }

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        handlePhotoCapture(file);
      }
    });

    // Reset input
    event.target.value = '';
  }, [handlePhotoCapture, photos.length, toast, t]);

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const updateCaption = (index: number, caption: string) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos[index].caption = caption;
      return newPhotos;
    });
  };

  const handleContinue = async () => {
    if (photos.length === 0) {
      toast({
        title: t('procurement.deliveryPhotoCapture.noPhotos'),
        description: t('procurement.deliveryPhotoCapture.noPhotosDescription'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10); // Show initial progress

      console.log('🚀 [DeliveryPhotoCaptureScreen] Starting upload of', photos.length, 'photos');

      // Upload photos
      const uploadedPhotos = await uploadPhotos.mutateAsync({
        files: photos.map(p => p.file),
        purchaseOrderId: poId!,
      });

      console.log('✅ [DeliveryPhotoCaptureScreen] Upload successful:', uploadedPhotos.length, 'photos');
      setUploadProgress(70);

      // Add captions to uploaded photo data
      const photosWithCaptions = uploadedPhotos.map((photo, index) => ({
        ...photo,
        caption: photos[index].caption || null,
      }));

      // Store photo data for next step
      const verificationData = JSON.parse(sessionStorage.getItem('deliveryVerification') || '{}');
      sessionStorage.setItem('deliveryVerification', JSON.stringify({
        ...verificationData,
        photos: photosWithCaptions,
      }));

      setUploadProgress(100);
      navigate(`/supervisor/deliveries/${poId}/signature`);
    } catch (error: any) {
      console.error('❌ [DeliveryPhotoCaptureScreen] Upload error:', error);
      toast({
        title: t('procurement.deliveryPhotoCapture.uploadFailed'),
        description: error.message || 'Unknown error occurred during upload',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/supervisor/deliveries/${poId}/verify`)}
              disabled={uploading}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{t('procurement.deliveryPhotoCapture.photoDocumentation')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('procurement.deliveryPhotoCapture.photosCount', { count: photos.length })}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t('procurement.deliverySignatureScreen.stepIndicator', { current: 2, total: 3, label: t('procurement.deliveryPhotoCapture.photoDocumentation') })}</span>
              <span className="text-muted-foreground">{t('procurement.deliveryPhotoCapture.stepProgress')}</span>
            </div>
            <Progress value={66} className="h-2" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-4">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('procurement.deliveryPhotoCapture.captureTitle')}</CardTitle>
            <CardDescription>
              {t('procurement.deliveryPhotoCapture.captureDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CameraCapture
                onCapture={handlePhotoCapture}
                disabled={uploading || photos.length >= 10}
              />
              <div className="w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploading || photos.length >= 10}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('procurement.deliveryPhotoCapture.uploadFromGallery')}
                </Button>
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading || photos.length >= 10}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t('procurement.deliveryPhotoCapture.uploadingPhotos')}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Gallery */}
        {photos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                {t('procurement.deliveryPhotoCapture.noPhotosYet')}
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {t('procurement.deliveryPhotoCapture.useCameraOrUpload')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {photos.map((photo, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <img
                        src={photo.preview}
                        alt={t('procurement.delivery.photoAltNumbered', { number: index + 1 })}
                        className="w-full h-full object-cover rounded"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => removePhoto(index)}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Caption */}
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`caption-${index}`} className="text-sm">
                        {t('procurement.deliveryPhotoCapture.captionLabel')}
                      </Label>
                      <Input
                        id={`caption-${index}`}
                        placeholder={t("common.additionalPlaceholders.exampleMaterialView")}
                        value={photo.caption}
                        onChange={(e) => updateCaption(index, e.target.value)}
                        disabled={uploading}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Helpful Tips */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2 text-sm">{t('procurement.deliveryPhotoCapture.photographyTipsTitle')}</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {t('procurement.deliveryPhotoCapture.tip1')}</li>
              <li>• {t('procurement.deliveryPhotoCapture.tip2')}</li>
              <li>• {t('procurement.deliveryPhotoCapture.tip3')}</li>
              <li>• {t('procurement.deliveryPhotoCapture.tip4')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="container mx-auto flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/supervisor/deliveries/${poId}/verify`)}
            disabled={uploading}
            className="flex-1"
          >
            {t('common.back')}
          </Button>
          <Button
            onClick={handleContinue}
            disabled={photos.length === 0 || uploading}
            className="flex-1"
          >
            {uploading ? t('procurement.deliveryPhotoCapture.uploading') : t('procurement.deliveryPhotoCapture.continueToSignature')}
          </Button>
        </div>
      </div>
    </div>
  );
}
