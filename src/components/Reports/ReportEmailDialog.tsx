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
import { Mail, Send, Loader2 } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useSendReportEmail } from './hooks/useSendReportEmail';

interface ReportEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob;
  filename: string;
  projectId?: string;
  defaultRecipient?: string;
  defaultSubject?: string;
}

export function ReportEmailDialog({
  open,
  onOpenChange,
  pdfBlob,
  filename,
  projectId,
  defaultRecipient = '',
  defaultSubject = '',
}: ReportEmailDialogProps) {
  const { t } = useLocalization();
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipient);
  const [subject, setSubject] = useState(defaultSubject || `Report: ${filename}`);
  const [message, setMessage] = useState('');
  const sendEmail = useSendReportEmail();

  const handleSend = async () => {
    if (!recipientEmail || !subject.trim()) {
      return;
    }

    try {
      await sendEmail.mutateAsync({
        recipientEmail,
        subject: subject.trim(),
        message: message.trim() || `Please find attached the report: ${filename}`,
        pdfBlob,
        filename,
        projectId,
      });

      // Reset form
      setRecipientEmail(defaultRecipient);
      setSubject(defaultSubject || `Report: ${filename}`);
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleClose = () => {
    setRecipientEmail(defaultRecipient);
    setSubject(defaultSubject || `Report: ${filename}`);
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('reportViewer.emailDialog.title', { defaultValue: 'Send Report via Email' })}
          </DialogTitle>
          <DialogDescription>
            {t('reportViewer.emailDialog.description', { defaultValue: 'Send this report to a recipient via email with a download link.' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-email">
              {t('reportViewer.emailDialog.recipient', { defaultValue: 'Recipient Email' })}
            </Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">
              {t('reportViewer.emailDialog.subject', { defaultValue: 'Subject' })}
            </Label>
            <Input
              id="email-subject"
              placeholder={t('reportViewer.emailDialog.subjectPlaceholder', { defaultValue: 'Report subject' })}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-message">
              {t('reportViewer.emailDialog.message', { defaultValue: 'Message' })}
            </Label>
            <Textarea
              id="email-message"
              placeholder={t('reportViewer.emailDialog.messagePlaceholder', { defaultValue: 'Optional message to include with the report...' })}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="text-muted-foreground">
              {t('reportViewer.emailDialog.fileInfo', { defaultValue: 'File' })}: <strong>{filename}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('reportViewer.emailDialog.linkExpiry', { defaultValue: 'The download link will expire in 1 hour.' })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sendEmail.isPending}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleSend} disabled={sendEmail.isPending || !recipientEmail || !subject.trim()}>
            {sendEmail.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('reportViewer.emailDialog.sending', { defaultValue: 'Sending...' })}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t('reportViewer.emailDialog.send', { defaultValue: 'Send Email' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
