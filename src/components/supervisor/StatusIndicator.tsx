import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusType = 'on_track' | 'delayed' | 'completed' | 'in_progress' | 'open' | 'resolved' | 'closed' | 'passed' | 'failed' | 'conditional';

interface StatusIndicatorProps {
  status: StatusType;
  variant?: 'dot' | 'badge';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; color: string; bgColor: string }> = {
  on_track: { label: 'ON TRACK', color: 'text-green-700', bgColor: 'bg-green-100' },
  delayed: { label: 'DELAYED', color: 'text-red-700', bgColor: 'bg-red-100' },
  completed: { label: 'COMPLETED', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  in_progress: { label: 'IN PROGRESS', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  open: { label: 'OPEN', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  resolved: { label: 'RESOLVED', color: 'text-green-700', bgColor: 'bg-green-100' },
  closed: { label: 'CLOSED', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  passed: { label: 'PASSED', color: 'text-green-700', bgColor: 'bg-green-100' },
  failed: { label: 'FAILED', color: 'text-red-700', bgColor: 'bg-red-100' },
  conditional: { label: 'CONDITIONAL', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
};

const dotColors: Record<StatusType, string> = {
  on_track: 'bg-green-500',
  delayed: 'bg-red-500',
  completed: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  open: 'bg-orange-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
  passed: 'bg-green-500',
  failed: 'bg-red-500',
  conditional: 'bg-yellow-500',
};

export function StatusIndicator({ status, variant = 'badge', size = 'md', className }: StatusIndicatorProps) {
  const config = statusConfig[status];
  const dotColor = dotColors[status];

  if (variant === 'dot') {
    const dotSizes = {
      sm: 'h-2 w-2',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
    };

    return (
      <div
        className={cn(
          'rounded-full',
          dotColor,
          dotSizes[size],
          className
        )}
        aria-label={config.label}
      />
    );
  }

  const badgeSizes = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-semibold uppercase tracking-wide',
        config.color,
        config.bgColor,
        'border-current',
        badgeSizes[size],
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
