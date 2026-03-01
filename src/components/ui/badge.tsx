import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm backdrop-blur transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        info: "border-transparent bg-info text-info-foreground hover:bg-info/80",
        active: "border-transparent bg-[rgb(var(--status-active))] text-[rgb(var(--status-active-foreground))] hover:bg-[rgb(var(--status-active))]/80",
        paused: "border-transparent bg-[rgb(var(--status-paused))] text-[rgb(var(--status-paused-foreground))] hover:bg-[rgb(var(--status-paused))]/80",
        delayed: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        completed: "border-transparent bg-[rgb(var(--status-completed))] text-[rgb(var(--status-completed-foreground))] hover:bg-[rgb(var(--status-completed))]/80",
        "on-hold": "border-transparent bg-[rgb(var(--status-on-hold))] text-[rgb(var(--status-on-hold-foreground))] hover:bg-[rgb(var(--status-on-hold))]/80",
        "glass-style-white": "bg-white/10 text-white border-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-sm font-medium uppercase tracking-widest",
        "glass-style-dark": "bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-sm font-medium uppercase tracking-widest",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
