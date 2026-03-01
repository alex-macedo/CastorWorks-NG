import * as React from "react";
import { cn } from "@/lib/utils";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 1, children, ...props }, ref) => {
    const styles = {
      1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
      2: "scroll-m-20 text-3xl font-semibold tracking-tight",
      3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      4: "scroll-m-20 text-xl font-semibold tracking-tight",
      5: "scroll-m-20 text-lg font-semibold tracking-tight",
      6: "scroll-m-20 text-base font-semibold tracking-tight",
    };

    switch (level) {
      case 1:
        return <h1 ref={ref as any} className={cn(styles[1], className)} {...props}>{children}</h1>;
      case 2:
        return <h2 ref={ref as any} className={cn(styles[2], className)} {...props}>{children}</h2>;
      case 3:
        return <h3 ref={ref as any} className={cn(styles[3], className)} {...props}>{children}</h3>;
      case 4:
        return <h4 ref={ref as any} className={cn(styles[4], className)} {...props}>{children}</h4>;
      case 5:
        return <h5 ref={ref as any} className={cn(styles[5], className)} {...props}>{children}</h5>;
      case 6:
        return <h6 ref={ref as any} className={cn(styles[6], className)} {...props}>{children}</h6>;
      default:
        return <h1 ref={ref as any} className={cn(styles[1], className)} {...props}>{children}</h1>;
    }
  }
);
Heading.displayName = "Heading";

export const Lead = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p ref={ref} className={cn("text-xl text-muted-foreground", className)} {...props} />
    );
  }
);
Lead.displayName = "Lead";

export const Body = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p ref={ref} className={cn("leading-7 [&:not(:first-child)]:mt-6", className)} {...props} />
    );
  }
);
Body.displayName = "Body";

export const BodyLarge = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p ref={ref} className={cn("text-lg text-muted-foreground", className)} {...props} />
    );
  }
);
BodyLarge.displayName = "BodyLarge";

export const Small = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    return (
      <small ref={ref} className={cn("text-sm font-medium leading-none", className)} {...props} />
    );
  }
);
Small.displayName = "Small";

export const Muted = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
    );
  }
);
Muted.displayName = "Muted";

export const InlineCode = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    return (
      <code
        ref={ref}
        className={cn(
          "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
          className
        )}
        {...props}
      />
    );
  }
);
InlineCode.displayName = "InlineCode";