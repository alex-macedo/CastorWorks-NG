import * as React from "react";
import { cn } from "@/lib/utils";

export type FieldHintProps = React.HTMLAttributes<HTMLParagraphElement>;

const FieldHint = React.forwardRef<HTMLParagraphElement, FieldHintProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-[0.8rem] text-muted-foreground", className)}
        {...props}
      />
    );
  }
);

FieldHint.displayName = "FieldHint";

export { FieldHint };