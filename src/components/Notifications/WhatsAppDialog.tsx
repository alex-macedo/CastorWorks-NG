import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

const WHATSAPP_TEMPLATES = {
  project_update: "Hi {{name}}, quick update on {{project}}: {{message}}",
  budget_alert: "Hi {{name}}, budget alert for {{project}}: {{message}}",
  milestone: "Hi {{name}}, milestone reached on {{project}}: {{message}}",
  custom: ""
};

export function WhatsAppDialog({ open, onOpenChange, projectId }: WhatsAppDialogProps) {
  const { t } = useLocalization();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [template, setTemplate] = useState<keyof typeof WHATSAPP_TEMPLATES>("project_update");
  const [message, setMessage] = useState(WHATSAPP_TEMPLATES.project_update);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleTemplateChange = (value: keyof typeof WHATSAPP_TEMPLATES) => {
    setTemplate(value);
    setMessage(WHATSAPP_TEMPLATES[value]);
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Add country code if not present (assuming Brazil +55)
    return cleaned.startsWith('55') ? `+${cleaned}` : `+55${cleaned}`;
  };

  const handleSend = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: t('notifications.whatsApp.missingInfo'),
        description: t('notifications.whatsApp.missingInfoDescription'),
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          to: formattedPhone,
          message,
          projectId,
        }
      });

      if (error) throw error;

      toast({
        title: t('notifications.whatsApp.sent'),
        description: t('notifications.whatsApp.sentDescription', { phone: formattedPhone }),
      });

      // Reset form
      setPhoneNumber("");
      setTemplate("project_update");
      setMessage(WHATSAPP_TEMPLATES.project_update);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t('notifications.whatsApp.sendFailed'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t('notifications.whatsApp.dialogTitle')}
          </SheetTitle>
          <SheetDescription>
            {t('notifications.whatsApp.dialogDescription')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('notifications.whatsApp.phoneNumberLabel')}</Label>
            <Input
              type="tel"
              placeholder={t('notifications.whatsApp.phoneNumberPlaceholder')}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('notifications.whatsApp.phoneNumberHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('notifications.whatsApp.templateLabel')}</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project_update">{t('notifications.whatsApp.templateProjectUpdate')}</SelectItem>
                <SelectItem value="budget_alert">{t('notifications.whatsApp.templateBudgetAlert')}</SelectItem>
                <SelectItem value="milestone">{t('notifications.whatsApp.templateMilestone')}</SelectItem>
                <SelectItem value="custom">{t('notifications.whatsApp.templateCustom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('notifications.whatsApp.messageLabel')}</Label>
            <Textarea
              placeholder={t('notifications.whatsApp.messagePlaceholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {t('notifications.whatsApp.messageHint', { count: message.length })}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('notifications.whatsApp.cancel')}
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? t('notifications.whatsApp.sending') : t('notifications.whatsApp.sendMessage')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
