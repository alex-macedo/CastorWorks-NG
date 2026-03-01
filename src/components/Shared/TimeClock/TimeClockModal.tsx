
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TimeClock } from "./TimeClock";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface TimeClockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TimeClockModal = ({ open, onOpenChange }: TimeClockModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <VisuallyHidden>
          <DialogTitle>Time Clock</DialogTitle>
        </VisuallyHidden>
        <TimeClock onClose={() => onOpenChange(false)} className="mx-auto" />
      </DialogContent>
    </Dialog>
  );
};
