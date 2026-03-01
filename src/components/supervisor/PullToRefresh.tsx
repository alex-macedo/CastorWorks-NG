import { ReactNode, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useLocalization } from "@/contexts/LocalizationContext";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, disabled }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredHaptic = useRef(false);

  const PULL_THRESHOLD = 80; // Distance needed to trigger refresh
  const MAX_PULL = 120; // Maximum pull distance

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || window.scrollY;
    if (scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;

    if (distance > 0) {
      // Prevent native pull-to-refresh on mobile browsers when possible
      if (e.cancelable) {
        e.preventDefault();
      }
      
      // Apply resistance curve - gets harder to pull as you go further
      const resistanceFactor = Math.min(distance / 200, 1);
      const adjustedDistance = Math.min(distance * resistanceFactor, MAX_PULL);
      setPullDistance(adjustedDistance);

      // Trigger haptic feedback when threshold is reached
      if (adjustedDistance >= PULL_THRESHOLD && !hasTriggeredHaptic.current) {
        haptics.medium();
        hasTriggeredHaptic.current = true;
      }
    }
  }, [isPulling, disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);
    hasTriggeredHaptic.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);

      try {
        await onRefresh();
        // Success haptic feedback when refresh completes
        haptics.success();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, isRefreshing, disabled, onRefresh]);

  const pullProgress = Math.min((pullDistance / PULL_THRESHOLD) * 100, 100);
  const iconRotation = (pullDistance / PULL_THRESHOLD) * 360;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-y-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex flex-col items-center justify-center transition-opacity",
          "pointer-events-none z-50",
          pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: 0,
          height: `${Math.max(pullDistance, isRefreshing ? PULL_THRESHOLD : 0)}px`,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full",
            "bg-primary text-primary-foreground shadow-lg",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing 
              ? undefined 
              : `rotate(${iconRotation}deg) scale(${Math.min(pullProgress / 100, 1)})`,
            transition: isPulling ? "none" : "all 0.3s ease-out",
          }}
        >
          <RefreshCw className="h-6 w-6" />
        </div>
        
        {!isRefreshing && pullDistance > 0 && (
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            {pullDistance >= PULL_THRESHOLD ? t('supervisor.pullToRefresh.releaseToRefresh') : t('supervisor.pullToRefresh.pullToRefresh')}
          </p>
        )}
      </div>

      {/* Content */}
      <div
        className="w-full"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
