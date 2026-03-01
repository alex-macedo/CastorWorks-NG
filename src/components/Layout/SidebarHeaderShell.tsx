import { forwardRef } from "react";
import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/hooks/useUserRoles";

const INTERNAL_ROLES: string[] = [
  "admin",
  "project_manager",
  "site_supervisor",
  "admin_office",
  "accountant",
  "viewer",
];

type HeaderVariant = "architect" | "client" | "default" | "auto";

function getHeaderColors(variant: "architect" | "client" | "default"): string {
  switch (variant) {
    case "architect":
      return "bg-gradient-to-br from-emerald-600 via-emerald-600/95 to-teal-500 text-white";
    case "client":
      return "bg-gradient-to-br from-primary via-primary/95 to-primary-light text-white";
    case "default":
    default:
      return "bg-gradient-to-br from-neutral-900 via-neutral-900/95 to-black text-white";
  }
}

function getDecorativeClasses(variant: "architect" | "client" | "default"): {
  blob: string;
  blobBottom: string;
  icon: string;
} {
  switch (variant) {
    case "architect":
      return {
        blob: "bg-white/10",
        blobBottom: "bg-white/25",
        icon: "text-white/10",
      };
    case "client":
      return {
        blob: "bg-white/10",
        blobBottom: "bg-white/25",
        icon: "text-white/10",
      };
    case "default":
    default:
      return {
        blob: "bg-white/10",
        blobBottom: "bg-white/25",
        icon: "text-white/10",
      };
  }
}

export interface SidebarHeaderShellProps {
  children: ReactNode;
  className?: string;
  withGradient?: boolean;
  variant?: HeaderVariant;
}

function SidebarHeaderShellInner(
  props: SidebarHeaderShellProps,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const { children, className, withGradient = true, variant = "auto" } = props;
  const { data: roles = [] } = useUserRoles();
  const roleList = roles.map((r) => r.role);

  const isArchitect =
    roleList.includes("architect") && !roleList.some((r) => INTERNAL_ROLES.includes(r));
  const isClientOnly =
    roleList.includes("client") &&
    !roleList.some((r) => [...INTERNAL_ROLES, "architect"].includes(r));

  const effectiveVariant: "architect" | "client" | "default" =
    variant === "auto"
      ? isArchitect
        ? "architect"
        : isClientOnly
          ? "client"
          : "default"
      : variant === "architect" || variant === "client"
        ? variant
        : "default";

  if (!withGradient) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const colors = getHeaderColors(effectiveVariant);
  const decor = getDecorativeClasses(effectiveVariant);
  const isLightVariant = effectiveVariant !== "default";

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full flex-1 min-w-0 overflow-hidden rounded-2xl p-8 shadow-lg mb-8 transition-all duration-500 animate-in fade-in slide-in-from-top-4",
        colors,
        "[&_.text-muted-foreground]:text-white/80 [&_.text-muted-foreground]:font-medium [&_.text-foreground]:text-white [&_h1]:!text-2xl [&_h1]:!font-bold [&_h1]:tracking-tight [&_p]:!text-base [&_p]:!font-medium",
        className
      )}
    >
      <div className="relative z-10">{children}</div>

      <div className={cn("absolute -right-12 -top-12 h-64 w-64 rounded-full blur-3xl", decor.blob)} />
      <div className={cn("absolute right-12 bottom-0 h-32 w-32 rounded-full blur-2xl", decor.blobBottom)} />
      {/* Decorative icon removed as requested */}
    </div>
  );
}

const SidebarHeaderShell = forwardRef<HTMLDivElement, SidebarHeaderShellProps>(SidebarHeaderShellInner);
SidebarHeaderShell.displayName = "SidebarHeaderShell";

export { SidebarHeaderShell };
