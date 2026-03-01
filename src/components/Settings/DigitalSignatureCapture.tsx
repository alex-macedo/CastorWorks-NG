import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eraser, Save } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface DigitalSignatureCaptureProps {
  onSave: (signatureData: string) => void;
  existingSignature?: string;
  hideHeader?: boolean;
}

export function DigitalSignatureCapture({ onSave, existingSignature, hideHeader = false }: DigitalSignatureCaptureProps) {
  const { t } = useLocalization();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!existingSignature);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  // Use a ref to track drawing state for native listeners
  const drawingRef = useRef(false);

  const initContext = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const getCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX || (e as React.MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY || (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleStart = useCallback((e: MouseEvent | TouchEvent) => {
    if (!context) return;
    
    const { x, y } = getCoordinates(e);
    drawingRef.current = true;
    setIsDrawing(true);
    context.beginPath();
    context.moveTo(x, y);
  }, [context]);

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawingRef.current || !context) return;

    // Prevent scrolling - this works because we attach natively with passive: false
    if (e.cancelable) e.preventDefault();

    const { x, y } = getCoordinates(e);
    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  }, [context]);

  const handleEnd = useCallback(() => {
    if (drawingRef.current) {
      drawingRef.current = false;
      setIsDrawing(false);
      if (context) context.closePath();
    }
  }, [context]);

  // Initialize canvas and listeners
  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node) {
      const ctx = node.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        initContext(ctx);
        setContext(ctx);
      }
      
      // Attach native listeners with passive: false to allow preventDefault
      node.addEventListener('touchstart', handleStart as any, { passive: false });
      node.addEventListener('touchmove', handleMove as any, { passive: false });
      node.addEventListener('touchend', handleEnd as any, { passive: false });
      
      // Cleanup will be handled by the fact that these are attached to the node
      // but we need a way to remove them if node changes. 
      // Simplified: we'll use useEffect for cleanup.
      
      canvasRef.current = node as HTMLCanvasElement;
    }
  }, [handleStart, handleMove, handleEnd]);

  // Handle global cleanup and mouse events for better desktop experience
  useEffect(() => {
    const canvas = canvasRef.current;
    
    const onMouseUp = () => handleEnd();
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      if (canvas) {
        canvas.removeEventListener('touchstart', handleStart as any);
        canvas.removeEventListener('touchmove', handleMove as any);
        canvas.removeEventListener('touchend', handleEnd as any);
      }
    };
  }, [handleStart, handleMove, handleEnd]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <Card className="overflow-hidden border-none shadow-none bg-transparent w-full">
      {!hideHeader && (
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg font-bold">{t("procurement.digitalSignature.title")}</CardTitle>
          <CardDescription>
            {t("procurement.digitalSignature.description")}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4 px-0 pb-0">
        {existingSignature && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">{t("procurement.digitalSignature.currentSignature")}:</p>
            <div className="border rounded-xl p-4 bg-white flex justify-center shadow-sm">
              <img src={existingSignature} alt={t("images.currentSignature")} className="max-h-24 object-contain" />
            </div>
          </div>
        )}
        
        <div className="border-2 border-dashed rounded-2xl bg-white overflow-hidden shadow-inner relative" style={{ height: '200px' }}>
          <canvas
            ref={setCanvasRef}
            width={800} 
            height={400}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            className="cursor-crosshair block"
            onMouseDown={handleStart as any}
            onMouseMove={handleMove as any}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={clearSignature}
            disabled={!hasSignature}
            className="w-full sm:flex-1 rounded-xl h-12"
          >
            <Eraser className="h-4 w-4 mr-2" />
            {t("common.clear")}
          </Button>
          <Button
            onClick={saveSignature}
            disabled={!hasSignature}
            className="w-full sm:flex-1 rounded-xl h-12"
          >
            <Save className="h-4 w-4 mr-2" />
            {t("procurement.digitalSignature.saveButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
