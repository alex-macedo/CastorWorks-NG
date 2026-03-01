import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';

interface ClientPortalPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  withGradient?: boolean;
}

export function ClientPortalPageHeader({ 
  title, 
  subtitle, 
  actions, 
  className,
  withGradient = true
}: ClientPortalPageHeaderProps) {
  if (!withGradient) {
    return (
      <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6", className)}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary-light p-6 md:p-8 text-white shadow-lg mb-8 transition-all duration-500 animate-in fade-in slide-in-from-top-4",
      className
    )}>
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-primary-foreground/90 font-medium text-base max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            {actions}
          </div>
        )}
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute right-12 bottom-0 h-32 w-32 rounded-full bg-primary-light/20 blur-2xl" />
      <div className="absolute right-8 top-8 opacity-10">
        <Building2 className="h-40 w-40 rotate-12" />
      </div>
    </div>
  );
}
