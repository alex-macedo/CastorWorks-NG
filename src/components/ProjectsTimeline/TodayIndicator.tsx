import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'

interface TodayIndicatorProps {
  left: number
  className?: string
}

export function TodayIndicator({ left, className }: TodayIndicatorProps) {
  const { t } = useLocalization()

  return (
    <div className={cn('pointer-events-none absolute inset-y-0 z-10', className)} style={{ left }}>
      <div className='absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-emerald-500/90' />
      <div className='absolute left-1/2 top-1 z-30 -translate-x-1/2'>
        <div className='rounded-full border border-emerald-200/60 bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-md'>
          {t('timeline.today.indicator')}
        </div>
      </div>
    </div>
  )
}
