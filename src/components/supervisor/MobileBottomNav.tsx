import { useNavigate, useLocation } from "react-router-dom";
import { Home, Truck, AlertCircle, ClipboardCheck, Camera } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { cn } from "@/lib/utils";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocalization();
  const { vibrate } = useHapticFeedback();

  const handleNavClick = (path: string, isPrimary: boolean = false) => {
    vibrate(isPrimary ? "medium" : "light");
    navigate(path);
  };

  const navItems = [
    { icon: Home, label: t("supervisor.hub"), path: "/supervisor/hub" },
    { icon: Truck, label: t("supervisor.deliveries"), path: "/supervisor/deliveries" },
    { icon: AlertCircle, label: t("supervisor.issues"), path: "/supervisor/issues" },
    { icon: ClipboardCheck, label: t("supervisor.inspect"), path: "/supervisor/inspections" },
    { icon: Camera, label: t("supervisor.photoGallery"), path: "/supervisor/photos" },
  ] as const;

  // Extract routes for swipe navigation
  const supervisorRoutes = navItems.map(item => item.path);

  // Enable swipe navigation between supervisor sections
  useSwipeNavigation({
    routes: supervisorRoutes,
    minSwipeDistance: 75,
    enabled: true,
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[200] w-full border-t border-white/10 bg-black/95 px-2 py-3 pb-8 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.45)] safe-area-inset-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-1 py-1 transition-all active:scale-95",
                isActive ? "text-amber-400" : "text-slate-500"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
