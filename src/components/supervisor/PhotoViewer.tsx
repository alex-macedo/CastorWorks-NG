import { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoViewerProps {
  photos: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function PhotoViewer({ photos, initialIndex, isOpen, onClose }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
     
    setScale(1);
     
    setPosition({ x: 0, y: 0 });
  }, [initialIndex, isOpen]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const navigatePrevious = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev > 0) {
        resetZoom();
        return prev - 1;
      }
      return prev;
    });
  }, [resetZoom]);

  const navigateNext = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < photos.length - 1) {
        resetZoom();
        return prev + 1;
      }
      return prev;
    });
  }, [photos.length, resetZoom]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") navigatePrevious();
      if (e.key === "ArrowRight") navigateNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, navigatePrevious, navigateNext, onClose]);

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.5, 4));
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.5, 1);
    setScale(newScale);
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale === 1) {
      // Single touch - start drag detection for swipe
      setStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      (e.currentTarget as any).initialPinchDistance = distance;
      (e.currentTarget as any).initialScale = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const initialDistance = (e.currentTarget as any).initialPinchDistance;
      const initialScale = (e.currentTarget as any).initialScale || 1;
      
      if (initialDistance) {
        const newScale = Math.min(Math.max((distance / initialDistance) * initialScale, 1), 4);
        setScale(newScale);
      }
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan when zoomed
      e.preventDefault();
      const deltaX = e.touches[0].clientX - startPos.x;
      const deltaY = e.touches[0].clientY - startPos.y;
      setPosition({ x: deltaX, y: deltaY });
      setStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (scale === 1 && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - startPos.x;
      
      // Swipe threshold
      if (Math.abs(deltaX) > 100) {
        if (deltaX > 0 && currentIndex > 0) {
          navigatePrevious();
        } else if (deltaX < 0 && currentIndex < photos.length - 1) {
          navigateNext();
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2);
    } else {
      resetZoom();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="text-white text-sm font-medium">
          {currentIndex + 1} / {photos.length}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <img
          ref={imageRef}
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          className={cn(
            "max-w-full max-h-full object-contain select-none transition-transform duration-200",
            scale > 1 ? "cursor-move" : "cursor-zoom-in"
          )}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            touchAction: scale > 1 ? "none" : "auto"
          }}
          draggable={false}
        />
      </div>

      {/* Navigation Controls */}
      {photos.length > 1 && scale === 1 && (
        <>
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={navigatePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}
          {currentIndex < photos.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}
        </>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="text-white hover:bg-white/20 h-10 w-10"
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <div className="text-white text-sm font-medium min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 4}
          className="text-white hover:bg-white/20 h-10 w-10"
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
      </div>

      {/* Swipe Hint */}
      {photos.length > 1 && scale === 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center">
          Swipe or use arrows to navigate
        </div>
      )}
    </div>
  );
}
