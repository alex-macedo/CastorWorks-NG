import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useSinapiCatalog } from "@/hooks/useSinapiCatalog";
import { SinapiResultsTable } from "./SinapiResultsTable";
import { BRAZILIAN_STATES } from "@/constants/brazilianStates";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SinapiSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToProject: (item: any) => void;
}

export function SinapiSearchModal({ open, onOpenChange, onAddToProject }: SinapiSearchModalProps) {
  const { t } = useLocalization();
  const [state, setState] = useState("SP");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const { items, totalPages, isLoading } = useSinapiCatalog({
    state,
    searchTerm,
    page,
    pageSize: 25,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t("materials:sinapi.search")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("materials:sinapi.selectState")}</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("materials:sinapi.searchPlaceholder")}</Label>
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder={t("materials:sinapi.searchPlaceholder")}
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <SinapiResultsTable
              items={items}
              isLoading={isLoading}
              onAddToProject={onAddToProject}
            />
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
