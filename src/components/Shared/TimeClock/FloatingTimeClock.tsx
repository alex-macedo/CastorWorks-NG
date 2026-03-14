
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { TimeClockModal } from "./TimeClockModal";
import { useTimer } from "@/hooks/useTimeTracking";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalization } from "@/contexts/LocalizationContext";
 
interface FloatingTimeClockProps {
  variant?: "floating" | "topbar";
}

export const FloatingTimeClock = ({
  variant = "floating",
}: FloatingTimeClockProps) => {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  const { isRunning } = useTimer();

  // Only render the shortcut button when NOT running.
  if (isRunning) return null;

  const trigger =
    variant === "topbar" ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Clock className="h-4 w-4" />
        <span className="hidden sm:inline">{t("navigation.myTimesheet")}</span>
      </Button>
    ) : (
      <div className="fixed bottom-20 right-6 z-[100] flex flex-col items-end gap-2 md:right-auto md:left-[calc(var(--sidebar-width)-4.25rem)]">
        <AnimatePresence mode="wait">
          <motion.div
            key="idle-state"
            initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
          >
            <Button
              onClick={() => setOpen(true)}
              size="icon"
              className="h-14 w-14 rounded-full shadow-2xl transition-all duration-300 bg-primary hover:bg-primary/90"
            >
              <Clock className="h-7 w-7" />
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>
    );

  return (
    <>
      {trigger}
      <TimeClockModal open={open} onOpenChange={setOpen} />
    </>
  );
};
