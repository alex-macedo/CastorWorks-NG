import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalization } from "@/contexts/LocalizationContext";

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, duration: number, sequence: number) => void;
  maxSequence: number;
}

export function AddActivityDialog({
  open,
  onOpenChange,
  onAdd,
  maxSequence,
}: AddActivityDialogProps) {
  const { t } = useLocalization();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(5);
  const [sequence, setSequence] = useState(maxSequence + 1);

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name, duration, sequence);
      setName("");
      setDuration(5);
      setSequence(maxSequence + 1);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("schedule:dialog.addTitle")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-activity-name">{t("schedule:dialog.activityName")}</Label>
            <Input
              id="new-activity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("additionalPlaceholders.enterActivityName")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-duration">{t("schedule:dialog.duration")}</Label>
              <Input
                id="new-duration"
                type="number"
                min="1"
                max="365"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-sequence">{t("schedule:dialog.insertPosition")}</Label>
              <Input
                id="new-sequence"
                type="number"
                min="1"
                value={sequence}
                onChange={(e) => setSequence(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("schedule:dialog.cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>
            {t("schedule:actions.addActivity")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
