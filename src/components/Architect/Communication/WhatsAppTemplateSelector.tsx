import { useLocalization } from '@/contexts/LocalizationContext'
import { MessageTemplateType, MESSAGE_TEMPLATES } from '@/hooks/useArchitectWhatsApp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, FileText, Calendar, DollarSign, Megaphone, Image } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhatsAppTemplateSelectorProps {
  selectedTemplate: MessageTemplateType | null
  onSelectTemplate: (template: MessageTemplateType) => void
  disabled?: boolean
}

const TEMPLATE_ICONS: Record<MessageTemplateType, React.ElementType> = {
  project_update: FileText,
  milestone_reached: Check,
  payment_reminder: DollarSign,
  meeting_scheduled: Calendar,
  diary_shared: Image,
}

const TEMPLATE_COLORS: Record<MessageTemplateType, string> = {
  project_update: 'bg-blue-50 border-blue-200 text-blue-700',
  milestone_reached: 'bg-green-50 border-green-200 text-green-700',
  payment_reminder: 'bg-orange-50 border-orange-200 text-orange-700',
  meeting_scheduled: 'bg-purple-50 border-purple-200 text-purple-700',
  diary_shared: 'bg-pink-50 border-pink-200 text-pink-700',
}

export const WhatsAppTemplateSelector = ({
  selectedTemplate,
  onSelectTemplate,
  disabled = false
}: WhatsAppTemplateSelectorProps) => {
  const { t } = useLocalization()

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('architect.whatsapp.templates.selectTemplate')}
      </p>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(MESSAGE_TEMPLATES) as MessageTemplateType[]).map((templateType) => {
          const template = MESSAGE_TEMPLATES[templateType]
          const Icon = TEMPLATE_ICONS[templateType]
          const isSelected = selectedTemplate === templateType

          return (
            <Card
              key={templateType}
              data-testid={`whatsapp-template-${templateType}`}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                isSelected ? 'ring-2 ring-primary' : '',
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              )}
              onClick={() => !disabled && onSelectTemplate(templateType)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className={cn(
                    'p-2 rounded-lg',
                    TEMPLATE_COLORS[templateType]
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {t(template.title)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {t(template.description)}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
