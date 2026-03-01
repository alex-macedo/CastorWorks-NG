import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useSendReportWhatsApp } from './hooks/useSendReportWhatsApp';

interface ReportWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob;
  filename: string;
  projectId?: string;
  defaultPhone?: string;
}

export function ReportWhatsAppDialog({
  open,
  onOpenChange,
  pdfBlob,
  filename,
  projectId,
  defaultPhone = '',
}: ReportWhatsAppDialogProps) {
  const { t } = useLocalization();
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [message, setMessage] = useState('');
  const sendWhatsApp = useSendReportWhatsApp();

  const handleSend = async () => {
    if (!phoneNumber || !message.trim()) {
      return;
    }

    try {
      await sendWhatsApp.mutateAsync({
        phoneNumber,
        message: message.trim(),
        pdfBlob,
        filename,
        projectId,
      });

      // Reset form
      setPhoneNumber(defaultPhone);
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleClose = () => {
    setPhoneNumber(defaultPhone);
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t('reportViewer.whatsappDialog.title', { defaultValue: 'Send Report via WhatsApp' })}
          </DialogTitle>
          <DialogDescription>
            {t('reportViewer.whatsappDialog.description', { defaultValue: 'Send this report to a recipient via WhatsApp with a download link.' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone">
              {t('reportViewer.whatsappDialog.phoneNumber', { defaultValue: 'Phone Number' })}
            </Label>
            <Input
              id="whatsapp-phone"
              type="tel"
              placeholder="+5511999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t('reportViewer.whatsappDialog.phoneHint', { defaultValue: 'Include country code (e.g., +55 for Brazil)' })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-message">
              {t('reportViewer.whatsappDialog.message', { defaultValue: 'Message' })}
            </Label>
            <Textarea
              id="whatsapp-message"
              placeholder={t('reportViewer.whatsappDialog.messagePlaceholder', { defaultValue: 'Enter your message...' })}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="text-muted-foreground">
              {t('reportViewer.whatsappDialog.fileInfo', { defaultValue: 'File' })}: <strong>{filename}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('reportViewer.whatsappDialog.linkExpiry', { defaultValue: 'The download link will expire in 1 hour.' })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sendWhatsApp.isPending}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleSend} disabled={sendWhatsApp.isPending || !phoneNumber || !message.trim()}>
            {sendWhatsApp.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('reportViewer.whatsappDialog.sending', { defaultValue: 'Sending...' })}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t('reportViewer.whatsappDialog.send', { defaultValue: 'Send WhatsApp' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
