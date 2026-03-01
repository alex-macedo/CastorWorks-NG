import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function CameraCapture({ onCapture, disabled, label, size = "default" }: CameraCaptureProps) {
  const { t } = useLocalization();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const displayLabel = label || t("common.actions.takePhoto");

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onCapture(file);
    }
    // Reset input so same file can be selected again
    if (event.target) {
      event.target.value = '';
    }
  }, [onCapture]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={handleButtonClick}
        disabled={disabled}
        className="w-full"
      >
        <Camera className="h-4 w-4 mr-2" />
        {displayLabel}
      </Button>
    </>
  );
}
