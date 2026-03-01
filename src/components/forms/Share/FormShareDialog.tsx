import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, Download, Mail, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { useLocalization } from '@/contexts/LocalizationContext';

interface FormShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  shareToken: string;
}

/**
 * FormShareDialog Component
 * 
 * Provides multiple ways to share a form:
 * - Copy link
 * - QR code generation with download
 * - Email & social sharing
 * - Embed code with responsive options
 */
export function FormShareDialog({
  open,
  onOpenChange,
  formId,
  shareToken,
}: FormShareDialogProps) {
  const { toast } = useToast();
  const { t } = useLocalization();
  const [copied, setCopied] = useState(false);
  const [embedWidth, setEmbedWidth] = useState('100%');
  const [embedHeight, setEmbedHeight] = useState('600');
  const qrRef = useRef<HTMLDivElement>(null);
  
  const formUrl = `${window.location.origin}/form/${shareToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    toast({
      title: t('forms:share.linkCopied'),
      description: t('forms:share.linkCopiedDescription'),
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // Create a canvas and draw the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      
      // White background
      ctx!.fillStyle = '#ffffff';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `form-qr-${shareToken.substring(0, 8)}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    
    toast({
      title: t('forms:share.qrDownloaded'),
      description: t('forms:share.qrDownloadedDescription'),
    });
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(t('forms:share.whatsappMessage', { url: formUrl }));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(t('forms:share.emailSubject'));
    const body = encodeURIComponent(t('forms:share.emailBody', { url: formUrl }));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const embedCode = `<iframe src="${formUrl}?embed=true" width="${embedWidth}" height="${embedHeight}" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    toast({
      title: t('forms:share.embedCopied'),
      description: t('forms:share.embedCopiedDescription'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('forms:share.title')}</DialogTitle>
          <DialogDescription>
            {t('forms:share.description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">{t('forms:share.tabs.link')}</TabsTrigger>
            <TabsTrigger value="qr">{t('forms:share.tabs.qrCode')}</TabsTrigger>
            <TabsTrigger value="embed">{t('forms:share.tabs.embed')}</TabsTrigger>
          </TabsList>

          {/* Link Tab */}
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-url">{t('forms:share.formUrl')}</Label>
              <div className="flex gap-2">
                <Input
                  id="form-url"
                  value={formUrl}
                  readOnly
                  className="flex-1 text-sm"
                />
                <Button onClick={handleCopyLink} size="icon" variant="outline">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-2">
              <Label>{t('forms:share.shareVia')}</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleShareWhatsApp}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleShareEmail}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                {t('forms:share.anyoneWithLink')}
              </p>
            </div>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div 
                ref={qrRef}
                className="bg-white p-4 rounded-xl shadow-sm border"
              >
                <QRCodeSVG
                  value={formUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t('forms:share.scanToOpen')}
              </p>
              <Button onClick={handleDownloadQR} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t('forms:share.downloadQr')}
              </Button>
            </div>
          </TabsContent>

          {/* Embed Tab */}
          <TabsContent value="embed" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="embed-width">{t('forms:share.width')}</Label>
                <Select value={embedWidth} onValueChange={setEmbedWidth}>
                  <SelectTrigger id="embed-width">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100%">100%</SelectItem>
                    <SelectItem value="800px">800px</SelectItem>
                    <SelectItem value="600px">600px</SelectItem>
                    <SelectItem value="400px">400px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="embed-height">{t('forms:share.height')}</Label>
                <Select value={embedHeight} onValueChange={setEmbedHeight}>
                  <SelectTrigger id="embed-height">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="800">800px</SelectItem>
                    <SelectItem value="600">600px</SelectItem>
                    <SelectItem value="500">500px</SelectItem>
                    <SelectItem value="400">400px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="embed-code">{t('forms:share.embedCode')}</Label>
              <div className="relative">
                <pre className="p-3 rounded-lg bg-muted text-xs overflow-x-auto max-w-full">
                  <code className="break-all whitespace-pre-wrap">{embedCode}</code>
                </pre>
                <Button
                  onClick={handleCopyEmbed}
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {t('common:copy')}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                {t('forms:share.embedInstructions')}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
