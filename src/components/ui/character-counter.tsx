import * as React from "react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CharacterCounterProps extends TextareaProps {
  maxLength: number;
  showCounter?: boolean;
}

const CharacterCounter = React.forwardRef<HTMLTextAreaElement, CharacterCounterProps>(
  ({ className, maxLength, showCounter = true, value, onChange, ...props }, ref) => {
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
      const currentValue = value?.toString() || '';
      setCount(currentValue.length);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (newValue.length <= maxLength) {
        setCount(newValue.length);
        onChange?.(e);
      }
    };

    const isNearLimit = count >= maxLength * 0.9;
    const isAtLimit = count >= maxLength;

    return (
      <div className="relative">
        <Textarea
          ref={ref}
          className={className}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          {...props}
        />
        {showCounter && (
          <div className="absolute bottom-2 right-2 text-xs">
            <span
              className={cn(
                "font-medium",
                isAtLimit
                  ? "text-destructive"
                  : isNearLimit
                  ? "text-warning"
                  : "text-muted-foreground"
              )}
            >
              {count}/{maxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);

CharacterCounter.displayName = "CharacterCounter";

export { CharacterCounter };