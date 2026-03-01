import { useLocalization } from '@/contexts/LocalizationContext'

interface UpgradePromptProps {
  module?: string
}

export function UpgradePrompt({ module }: UpgradePromptProps) {
  const { t } = useLocalization()
  const message = module
    ? t('common:licensing.upgradePromptModule', { module }) || t('common:licensing.upgradePrompt')
    : t('common:licensing.upgradePrompt')

  return (
    <div className="rounded-lg border bg-muted/50 p-6 text-center text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  )
}
