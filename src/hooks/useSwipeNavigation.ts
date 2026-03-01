import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { haptics } from "@/lib/haptics";

interface SwipeNavigationConfig {
  routes: string[];
  minSwipeDistance?: number;
  enabled?: boolean;
}

/**
 * Hook to enable swipe navigation between routes
 * Swipe right = previous route, Swipe left = next route
 */
export function useSwipeNavigation({
  routes,
  minSwipeDistance = 50,
  enabled = true,
}: SwipeNavigationConfig) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      const currentIndex = routes.indexOf(location.pathname);
      if (currentIndex === -1) return;

      let nextIndex: number;
      if (direction === "left") {
        // Swipe left = next route
        nextIndex = currentIndex + 1;
      } else {
        // Swipe right = previous route
        nextIndex = currentIndex - 1;
      }

      // Wrap around or stay within bounds
      if (nextIndex >= 0 && nextIndex < routes.length) {
        haptics.selection();
        navigate(routes[nextIndex]);
      }
    },
    [routes, location.pathname, navigate]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX.current || !touchStartY.current) return;

      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;

      const deltaX = touchCurrentX - touchStartX.current;
      const deltaY = touchCurrentY - touchStartY.current;

      // Only consider horizontal swipes (more horizontal than vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwiping.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping.current) return;

      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchEndX - touchStartX.current;

      // Check if swipe distance meets minimum threshold
      if (Math.abs(deltaX) >= minSwipeDistance) {
        if (deltaX > 0) {
          // Swipe right
          handleSwipe("right");
        } else {
          // Swipe left
          handleSwipe("left");
        }
      }

      // Reset
      touchStartX.current = 0;
      touchStartY.current = 0;
      isSwiping.current = false;
    };

    // Attach to document for global swipe detection
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, minSwipeDistance, handleSwipe]);
}
