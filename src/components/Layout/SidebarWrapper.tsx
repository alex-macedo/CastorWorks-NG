import { SidebarProvider } from "@/components/ui/sidebar";
import { useSidebarWidth } from "@/hooks/useSidebarWidth";
import { ReactNode } from "react";

interface SidebarWrapperProps {
  children: ReactNode;
}

export function SidebarWrapper({ children }: SidebarWrapperProps) {
  const { sidebarWidth, updateSidebarWidth } = useSidebarWidth();

  return (
    <SidebarProvider width={sidebarWidth} onWidthChange={updateSidebarWidth}>
      {children}
    </SidebarProvider>
  );
}
