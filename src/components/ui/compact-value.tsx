import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CompactValueProps {
  compactValue: string | number;
  fullValue: string | number;
  className?: string;
  children?: ReactNode;
}

/**
 * Component that displays a compact value with a tooltip showing the full value
 */
export function CompactValue({ compactValue, fullValue, className, children }: CompactValueProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className={className}>
            {children || compactValue}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{fullValue}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
