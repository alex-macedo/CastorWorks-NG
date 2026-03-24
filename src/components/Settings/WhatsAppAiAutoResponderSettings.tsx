/**
 * WA-8.1: Admin UI for WhatsApp AI Auto-Responder
 * Toggles ai_auto_responder_enabled in integration_settings.configuration
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
import { MessageSquare } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useIntegrationSettings } from '@/hooks/useIntegrationSettings'
import { useToast } from '@/hooks/use-toast'

export function WhatsAppAiAutoResponderSettings() {
  const { t } = useLocalization()
  const { toast } = useToast()
  const { data, isLoading, updateConfig } = useIntegrationSettings('whatsapp')

  const aiEnabled =
    (data?.configuration as Record<string, unknown> | undefined)?.ai_auto_responder_enabled === true

  const handleToggle = async (checked: boolean) => {
    try {
      await updateConfig('ai_auto_responder_enabled', checked)
      toast({
        title: t('admin:whatsapp.aiAutoResponder.enabled'),
        description: checked
          ? t('settings:integrations.whatsapp.aiAutoResponderEnabled')
          : t('settings:integrations.whatsapp.aiAutoResponderDisabled'),
      })
    } catch (err) {
      toast({
        title: t('admin:error'),
        description: err instanceof Error ? err.message : t('settings.integrations.whatsapp.updateFailed'),
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('admin:whatsapp.aiAutoResponder.enabled')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-12 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle>{t('admin:whatsapp.aiAutoResponder.enabled')}</CardTitle>
        </div>
        <CardDescription>{t('admin:whatsapp.aiAutoResponder.description')}</CardDescription>
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
          />
        </div>
      </CardContent>
    </Card>
  )
}
