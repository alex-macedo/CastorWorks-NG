import { cn } from '@/lib/utils'

interface TemplateCenterHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export function TemplateCenterHeader({
  title,
  subtitle,
  className,
}: TemplateCenterHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <h1 className="text-2xl font-bold text-foreground mb-1">{title}</h1>
      <div className="w-20 h-1 bg-primary rounded-full mb-3" />
      {subtitle && (
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}

export default TemplateCenterHeader
