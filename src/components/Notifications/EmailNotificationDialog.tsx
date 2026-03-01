import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface EmailNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

const EMAIL_TEMPLATES = {
  project_update: {
    subject: "notifications.email.templateProjectUpdate.subject",
    body: "notifications.email.templateProjectUpdate.body"
  },
  budget_alert: {
    subject: "Budget Alert: {{project_name}}",
    body: "Dear {{recipient_name}},\n\nWe wanted to notify you about budget changes for {{project_name}}.\n\n{{custom_message}}\n\nBest regards,\n{{company_name}}"
  },
  milestone_complete: {
    subject: "Milestone Completed: {{project_name}}",
    body: "Dear {{recipient_name}},\n\nGreat news! A milestone has been completed for {{project_name}}.\n\n{{custom_message}}\n\nBest regards,\n{{company_name}}"
  },
  custom: {
    subject: "",
    body: ""
  }
};

export function EmailNotificationDialog({ open, onOpenChange, projectId }: EmailNotificationDialogProps) {
  const { t } = useLocalization();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [template, setTemplate] = useState<keyof typeof EMAIL_TEMPLATES>("project_update");
  const [subject, setSubject] = useState(EMAIL_TEMPLATES.project_update.subject);
  const [body, setBody] = useState(EMAIL_TEMPLATES.project_update.body);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleTemplateChange = (value: keyof typeof EMAIL_TEMPLATES) => {
    setTemplate(value);
    setSubject(EMAIL_TEMPLATES[value].subject);
    setBody(EMAIL_TEMPLATES[value].body);
  };

  const handleSend = async () => {
    if (!recipientEmail || !subject || !body) {
      toast({
        title: t('notifications.email.missingInfo'),
        description: t('notifications.email.missingInfoDescription'),
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          to: recipientEmail,
          subject,
          body,
          projectId,
        }
      });

      if (error) throw error;

      toast({
        title: t('notifications.email.sent'),
        description: t('notifications.email.sentDescription', { email: recipientEmail }),
      });

      // Reset form
      setRecipientEmail("");
      setTemplate("project_update");
      setSubject(EMAIL_TEMPLATES.project_update.subject);
      setBody(EMAIL_TEMPLATES.project_update.body);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t('notifications.email.sendFailed'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('notifications.email.dialogTitle')}
          </SheetTitle>
          <SheetDescription>
            {t('notifications.email.dialogDescription')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('notifications.email.recipientEmailLabel')}</Label>
            <Input
              type="email"
              placeholder={t('notifications.email.recipientEmailPlaceholder')}
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('notifications.email.templateLabel')}</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project_update">{t('notifications.email.templateProjectUpdate')}</SelectItem>
                <SelectItem value="budget_alert">{t('notifications.email.templateBudgetAlert')}</SelectItem>
                <SelectItem value="milestone_complete">{t('notifications.email.templateMilestoneComplete')}</SelectItem>
                <SelectItem value="custom">{t('notifications.email.templateCustom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('notifications.email.subjectLabel')}</Label>
            <Input
              placeholder={t('notifications.email.subjectPlaceholder')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('notifications.email.messageLabel')}</Label>
            <Textarea
              placeholder={t('notifications.email.messagePlaceholder')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              {t('notifications.email.messageHint')}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('notifications.email.cancel')}
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? t('notifications.email.sending') : t('notifications.email.sendEmail')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
