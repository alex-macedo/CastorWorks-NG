import { forwardRef } from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';
import { usePrefetch } from '@/hooks/usePrefetch';

interface PrefetchLinkProps extends NavLinkProps {
  to: string;
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, onMouseEnter, ...props }, ref) => {
    const { prefetch } = usePrefetch();

    const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
      prefetch(to);
      onMouseEnter?.(e);
    };

    return <NavLink ref={ref} to={to} onMouseEnter={handleMouseEnter} {...props} />;
  }
);

PrefetchLink.displayName = 'PrefetchLink';
