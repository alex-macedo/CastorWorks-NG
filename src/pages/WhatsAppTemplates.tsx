import { useEffect } from 'react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { TemplateCenterHeader } from '@/components/Templates/TemplateCenterHeader'
import { WhatsAppTemplateSelector } from '@/components/Architect/Communication/WhatsAppTemplateSelector'
import { MESSAGE_TEMPLATES, resolveTemplateMessage } from '@/hooks/useArchitectWhatsApp'
import type { MessageTemplateType } from '@/hooks/useArchitectWhatsApp'
import { useToast } from '@/hooks/use-toast'

const WhatsAppTemplates = () => {
  const { t, loadTranslationsForRoute } = useLocalization()
  const { toast } = useToast()

  useEffect(() => {
    loadTranslationsForRoute('/whatsapp-templates')
  }, [loadTranslationsForRoute])

  const handleSelectTemplate = (templateType: MessageTemplateType) => {
    const message = resolveTemplateMessage(templateType)
    navigator.clipboard.writeText(message).then(() => {
      toast({
        title: t('common.success'),
        description: t('architect.whatsapp.messages.templateCopied', 'Template copied to clipboard'),
      })
    }).catch(() => {
      toast({
        title: t(MESSAGE_TEMPLATES[templateType].title),
        description: message.substring(0, 120) + '…',
      })
    })
  }

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('navigation.whatsAppTemplates')}
            </h1>
            <p className="text-sm text-sidebar-primary-foreground/80 mt-2">
              {t('architect.whatsapp.templates.selectTemplate')}
            </p>
          </div>
        </div>
      </SidebarHeaderShell>

      <div className="px-4 md:px-8">
        <TemplateCenterHeader
          title={t('templates:centerTitle', 'Central de Templates')}
          subtitle={t('architect.whatsapp.templates.selectTemplate')}
        />
      </div>

      <div className="px-4 md:px-8">
        <WhatsAppTemplateSelector
          selectedTemplate={null}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>
    </div>
  )
}

export default WhatsAppTemplates
