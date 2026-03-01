import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LiveRegionProps {
  children: ReactNode;
  /**
   * The politeness setting:
   * - "polite": Announcement waits for a pause in speech (default)
   * - "assertive": Interrupts current speech
   * - "off": No announcement
   */
  politeness?: 'polite' | 'assertive' | 'off';
  /**
   * Whether the entire region should be read when any part changes
   */
  atomic?: boolean;
  /**
   * Whether relevant content should be announced
   */
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
  /**
   * Screen-reader only mode (visually hidden)
   */
  srOnly?: boolean;
}

/**
 * LiveRegion - Component for announcing dynamic content changes to screen readers
 * Use this to notify users of important updates like form calculations, loading states, etc.
 */
export const LiveRegion = ({
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'all',
  className,
  srOnly = false,
}: LiveRegionProps) => {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn(
        srOnly && 'sr-only',
        className
      )}
    >
      {children}
    </div>
  );
};
