import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSendWhatsAppMessage } from '@/hooks/useArchitectWhatsApp'
import { useState } from 'react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface WhatsAppQuickActionProps {
  phoneNumber: string
  projectName?: string
  projectId?: string
  variant?: 'icon' | 'button'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  label?: string
}

export const WhatsAppQuickAction = ({
  phoneNumber,
  projectName,
  projectId,
  variant = 'button',
  size = 'default',
  className,
  label
}: WhatsAppQuickActionProps) => {
  const { t } = useLocalization()
  const [isOpening, setIsOpening] = useState(false)
  const { toast } = useToast()

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click propagation
    try {
      setIsOpening(true)
      
      // Generate WhatsApp link for opening WhatsApp directly
      const cleanedPhone = phoneNumber.replace(/\D/g, '')
      let message = ''
      
      if (projectName) {
        message = t('architect.whatsapp.quickAction.defaultMessage', { projectName })
      }
      
      const baseUrl = `https://wa.me/${cleanedPhone}`
      const url = message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl
      
      // Open WhatsApp in new tab
      window.open(url, '_blank')
      
      setTimeout(() => setIsOpening(false), 500)
    } catch (error) {
      console.error('Error opening WhatsApp:', error)
      toast({
        title: t('architect.whatsapp.messages.openError'),
        description: t('architect.whatsapp.messages.openErrorDesc'),
        variant: 'destructive'
      })
      setIsOpening(false)
    }
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleWhatsAppClick}
        disabled={isOpening}
        className={className}
        title={t('architect.whatsapp.quickAction.title')}
      >
        <MessageCircle className="h-4 w-4 text-green-600" />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleWhatsAppClick}
      disabled={isOpening}
      className={cn(
        "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 hover:border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
        className
      )}
    >
      <MessageCircle className="mr-2 h-4 w-4" />
      {isOpening ? t('architect.whatsapp.quickAction.opening') : (label || t('architect.whatsapp.quickAction.sendMessage'))}
    </Button>
  )
}
