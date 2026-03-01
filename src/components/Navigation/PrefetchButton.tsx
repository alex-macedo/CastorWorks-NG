import { Button, type ButtonProps } from '@/components/ui/button';
import { usePrefetch } from '@/hooks/usePrefetch';

interface PrefetchButtonProps extends ButtonProps {
  prefetchPath: string;
}

export function PrefetchButton({ prefetchPath, onMouseEnter, ...props }: PrefetchButtonProps) {
  const { prefetch } = usePrefetch();

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    prefetch(prefetchPath);
    onMouseEnter?.(e);
  };

  return <Button onMouseEnter={handleMouseEnter} {...props} />;
}
