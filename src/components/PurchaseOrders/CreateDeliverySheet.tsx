import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus } from "lucide-react";

interface CreateDeliverySheetProps {
  purchaseOrderId: string;
}

export function CreateDeliverySheet({ purchaseOrderId }: CreateDeliverySheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Delivery Confirmation
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create Delivery Confirmation</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <p className="text-muted-foreground">
            Delivery confirmation functionality is being restored.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

