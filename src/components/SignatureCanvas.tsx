import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface SignatureCanvasProps {
  onSave: (signatureData: string) => void;
  onClear: () => void;
}

export function SignatureCanvas({ onSave, onClear }: SignatureCanvasProps) {
  const { t } = useLocalization();
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  const initCanvas = (canvasElement: HTMLCanvasElement | null) => {
    if (!canvasElement) return;
    
    setCanvas(canvasElement);
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    
    setContext(ctx);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context || !canvas) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context || !canvas) return;
    
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    if (!context || !canvas) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  const save = () => {
    if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");
    onSave(signatureData);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <Label>{t("commonUI.digitalSignature")}</Label>
        <div className="border-2 border-dashed rounded-lg p-2">
          <canvas
            ref={initCanvas}
            width={400}
            height={200}
            className="w-full touch-none bg-white rounded"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clear} className="w-full">
            <X className="h-4 w-4 mr-2" />
            {t("common.clear")}
          </Button>
          <Button onClick={save} className="w-full">
            {t("settings:digitalSignature.saveButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
