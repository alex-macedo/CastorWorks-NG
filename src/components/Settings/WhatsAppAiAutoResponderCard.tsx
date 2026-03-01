/**
 * WA-8.1: WhatsApp AI Auto-Responder settings card.
 * Toggle for CastorMind AI to automatically answer incoming WhatsApp queries.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, Bot } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useWhatsAppIntegrationSettings } from '@/hooks/useWhatsAppIntegrationSettings'
import { useToast } from '@/hooks/use-toast'

export function WhatsAppAiAutoResponderCard() {
  const { t } = useLocalization()
  const { toast } = useToast()
  const {
    settings,
    isLoading,
    setAiAutoResponderEnabled,
    isUpdating,
  } = useWhatsAppIntegrationSettings()

  const aiEnabled = settings?.configuration?.ai_auto_responder_enabled === true

  const handleToggle = async (checked: boolean) => {
    try {
      await setAiAutoResponderEnabled(checked)
      toast({
        title: t('settings:integrations.whatsapp.saved'),
        description: checked
          ? t('settings:integrations.whatsapp.aiAutoResponderEnabled')
          : t('settings:integrations.whatsapp.aiAutoResponderDisabled'),
      })
    } catch (err) {
      toast({
        title: t('common:errorTitle'),
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              {t('admin:whatsapp.aiAutoResponder.enabled')}
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>{t('admin:whatsapp.aiAutoResponder.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="ai-auto-responder" className="text-base">
              {t('admin:whatsapp.aiAutoResponder.enabled')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('admin:whatsapp.aiAutoResponder.requiresContacts')}
            </p>
          </div>
          <Switch
            id="ai-auto-responder"
            checked={aiEnabled}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
          />
        </div>
      </CardContent>
    </Card>
  )
}
