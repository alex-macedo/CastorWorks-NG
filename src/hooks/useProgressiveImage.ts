import { useState, useEffect } from 'react';

interface UseProgressiveImageOptions {
  src: string;
  placeholderSrc?: string;
  enabled?: boolean;
}

export function useProgressiveImage({
  src,
  placeholderSrc,
  enabled = true,
}: UseProgressiveImageOptions) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(placeholderSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setImgSrc(src);
       
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImgSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
      setError(new Error(`Failed to load image: ${src}`));
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, placeholderSrc, enabled]);

  return { imgSrc, isLoading, error };
}
