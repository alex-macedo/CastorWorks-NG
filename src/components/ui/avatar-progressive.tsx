import { cn } from '@/lib/utils';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

interface AvatarProgressiveProps {
  src?: string | null;
  placeholderSrc?: string;
  alt: string;
  fallback: string;
  className?: string;
}

/**
 * Avatar component with progressive image loading
 * Extends the existing Avatar component with blur-up effect
 */
export function AvatarProgressive({
  src,
  placeholderSrc,
  alt,
  fallback,
  className,
}: AvatarProgressiveProps) {
  const { imgSrc, isLoading } = useProgressiveImage({
    src: src || '',
    placeholderSrc,
    enabled: !!src,
  });

  return (
    <Avatar className={cn(className)}>
      {src && (
        <AvatarImage
          src={imgSrc}
          alt={alt}
          className={cn(
            'transition-all duration-500',
            isLoading ? 'scale-110 blur-sm opacity-70' : 'scale-100 blur-0 opacity-100'
          )}
        />
      )}
      <AvatarFallback className={cn(isLoading && 'animate-pulse')}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}
