import { useState, useEffect } from 'react';
import { resolveStorageUrl } from '@/utils/storage';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { cn } from '@/lib/utils';

interface AvatarResolvedProps {
  src?: string | null;
  alt: string;
  fallback?: string;
  className?: string;
  fallbackClassName?: string;
}

export function AvatarResolved({
  src,
  alt,
  fallback,
  className,
  fallbackClassName,
}: AvatarResolvedProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const safeAlt = typeof alt === 'string' ? alt : '';

  useEffect(() => {
    let isMounted = true;
    if (src) {
      resolveStorageUrl(src).then(url => {
        if (isMounted) setResolvedSrc(url);
      });
    } else {
      setResolvedSrc(null);
    }
    return () => { isMounted = false; };
  }, [src]);

  return (
    <Avatar className={cn(className)}>
      <AvatarImage src={resolvedSrc || undefined} alt={safeAlt} />
      <AvatarFallback className={fallbackClassName}>
        {fallback || safeAlt.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
