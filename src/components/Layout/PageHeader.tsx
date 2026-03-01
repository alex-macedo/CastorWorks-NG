import * as React from "react";
import { Heading, Lead } from "@/components/ui/typography";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AIIndicator } from "@/components/ui/ai-indicator";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

type HeaderVariant = "architect" | "client" | "default" | "auto";

/**
 * Props for the PageHeader component
 */
export interface PageHeaderProps {
  /** Page title (required) - renders as H1 with responsive sizing */
  title: string;
  /** Optional page description - renders as lead text below title */
  description?: string;
  /** Flag to show AI availability badge beside the title */
  aiEnabled?: boolean;
  /** Optional breadcrumb navigation items */
  breadcrumbs?: Array<{
    /** Breadcrumb label text */
    label: string;
    /** Optional link href - omit for current page */
    href?: string;
  }>;
  /** Optional action buttons or controls - renders on the right side */
  actions?: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
  /** Use the sidebar gradient hero styling */
  withGradient?: boolean;
  /** Header color variant - "auto" detects based on user role (default) */
  variant?: HeaderVariant;
}

/**
 * PageHeader component provides a standardized header for all pages.
 *
 * Features:
 * - Responsive typography hierarchy (H1 with text-3xl md:text-4xl)
 * - Optional breadcrumb navigation
 * - Optional description/lead text
 * - Optional action buttons area
 * - Fully responsive layout (stacks on mobile, horizontal on desktop)
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title={t("tooltips.projects")}
 *   description="Manage all your construction projects"
 *   breadcrumbs={[
 *     { label: "Home", href: "/" },
 *     { label: "Projects" }
 *   ]}
 *   actions={<Button>New Project</Button>}
 * />
 * ```
 */
export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, breadcrumbs, actions, aiEnabled, className, withGradient = true, variant = "auto" }, ref) => {
    return (
      <SidebarHeaderShell ref={ref} className={className} withGradient={withGradient} variant={variant}>
        <div className="space-y-4">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={index}>
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        ) : crumb.href ? (
                          <BreadcrumbLink asChild>
                            <Link to={crumb.href}>{crumb.label}</Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          )}

          {/* Title and Actions */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Heading level={1} className="text-3xl md:text-4xl">
                  {title}
                </Heading>
                {aiEnabled && <AIIndicator showLabel variant="compact" />}
              </div>
              {description && <Lead>{description}</Lead>}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </SidebarHeaderShell>
    );
  }
);

PageHeader.displayName = "PageHeader";
