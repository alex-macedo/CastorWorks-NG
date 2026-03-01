import { cn } from '@/lib/utils';

interface QuestionWrapperProps {
  title: string;
  description?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * QuestionWrapper - Common wrapper for all form question types
 * 
 * Provides consistent layout with title, description, required indicator,
 * and error message display.
 */
export function QuestionWrapper({
  title,
  description,
  required,
  error,
  children,
  className,
  htmlFor,
}: QuestionWrapperProps & { htmlFor?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-1.5 mb-2">
        <label 
          htmlFor={htmlFor}
          className="text-base font-semibold leading-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground/90 block"
        >
          {title}
          {required && <span className="text-destructive ml-1" title="Required">*</span>}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-prose">{description}</p>
        )}
      </div>
      
      {children}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
