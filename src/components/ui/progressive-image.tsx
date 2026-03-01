import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholderSrc?: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function ProgressiveImage({
  src,
  placeholderSrc,
  alt,
  className,
  aspectRatio,
  lazy = true,
  onLoad,
  onError,
  ...props
}: ProgressiveImageProps) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(placeholderSrc);
  const [imageLoading, setImageLoading] = useState(true);
  const [isInView, setIsInView] = useState(!lazy);
  const imageRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01,
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Load full image when in view
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setImageLoading(false);
      onLoad?.();
    };

    img.onerror = () => {
      setImageLoading(false);
      onError?.();
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, isInView, onLoad, onError]);

  return (
    <div
      className={cn('relative overflow-hidden bg-muted', className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Blur-up placeholder */}
      {imageLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Actual image */}
      <img
        ref={imageRef}
        src={imageSrc || placeholderSrc}
        alt={alt}
        className={cn(
          'h-full w-full object-cover transition-all duration-500',
          imageLoading ? 'scale-110 blur-lg opacity-70' : 'scale-100 blur-0 opacity-100'
        )}
        loading={lazy ? 'lazy' : 'eager'}
        {...props}
      />
    </div>
  );
}
