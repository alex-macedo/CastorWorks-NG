import { cn } from '@/lib/utils';
import { ProgressiveImage } from './progressive-image';

interface ImageSource {
  src: string;
  width?: number;
  media?: string;
}

interface ResponsiveImageProps {
  src: string;
  sources?: ImageSource[];
  placeholderSrc?: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  lazy?: boolean;
  sizes?: string;
  priority?: boolean;
}

/**
 * Responsive image component with multiple sources and progressive loading
 * Supports art direction and different resolutions
 */
export function ResponsiveImage({
  src,
  sources = [],
  placeholderSrc,
  alt,
  className,
  aspectRatio,
  lazy = true,
  sizes,
  priority = false,
}: ResponsiveImageProps) {
  // If priority is set, disable lazy loading
  const shouldLazy = priority ? false : lazy;

  // If we have multiple sources, use picture element
  if (sources.length > 0) {
    return (
      <picture className={cn('block', className)}>
        {sources.map((source, index) => (
          <source
            key={index}
            srcSet={source.src}
            media={source.media}
            width={source.width}
          />
        ))}
        <ProgressiveImage
          src={src}
          placeholderSrc={placeholderSrc}
          alt={alt}
          aspectRatio={aspectRatio}
          lazy={shouldLazy}
          sizes={sizes}
        />
      </picture>
    );
  }

  return (
    <ProgressiveImage
      src={src}
      placeholderSrc={placeholderSrc}
      alt={alt}
      className={className}
      aspectRatio={aspectRatio}
      lazy={shouldLazy}
      sizes={sizes}
    />
  );
}
