import { useState } from 'react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Sparkles, Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAIDraftMessage } from '@/hooks/useArchitectWhatsApp'
import { MessageTemplateType } from '@/hooks/useArchitectWhatsApp'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AIDraftMessageProps {
  projectId?: string
  clientId?: string
  templateType: MessageTemplateType | null
  onMessageGenerated: (message: string) => void
  disabled?: boolean
}

export const AIDraftMessage = ({
  projectId,
  clientId,
  templateType,
  onMessageGenerated,
  disabled = false
}: AIDraftMessageProps) => {
  const { t } = useLocalization()
  const [isGenerating, setIsGenerating] = useState(false)
  const { mutate: generateDraft } = useAIDraftMessage()
  const { toast } = useToast()

  const handleGenerateDraft = () => {
    if (!templateType) {
      toast({
        title: t('architect.whatsapp.ai.noTemplateError'),
        description: t('architect.whatsapp.ai.noTemplateErrorDesc'),
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)
    
    generateDraft(
      {
        projectId,
        clientId,
        templateType,
      },
      {
        onSuccess: (data) => {
          onMessageGenerated(data.message)
          setIsGenerating(false)
        },
        onError: () => {
          setIsGenerating(false)
        }
      }
    )
  }

  if (!templateType) {
    return null
  }

  return (
    <Button
      onClick={handleGenerateDraft}
      disabled={disabled || isGenerating}
      variant="outline"
      size="sm"
      className="gap-2 text-purple-700 border-purple-200 hover:bg-purple-50"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('architect.whatsapp.ai.generating')}
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3" />
          {t('architect.whatsapp.ai.generateButton')}
        </>
      )}
    </Button>
  )
}
