import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatCurrency } from "@/utils/materialsCalculator";
import { Plus } from "lucide-react";

interface SinapiResultsTableProps {
  items: any[];
  isLoading: boolean;
  onAddToProject: (item: any) => void;
}

export function SinapiResultsTable({ items, isLoading, onAddToProject }: SinapiResultsTableProps) {
  const { t, language, currency } = useLocalization();

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("materials:sinapi.loading")}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("materials:sinapi.noResults")}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("materials:sinapi.code")}</TableHead>
          <TableHead>{t("materials:table.description")}</TableHead>
          <TableHead>{t("materials:sinapi.category")}</TableHead>
          <TableHead>{t("materials:table.unit")}</TableHead>
          <TableHead className="text-right">{t("materials:sinapi.price")}</TableHead>
          <TableHead className="text-right"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-sm">{item.sinapi_code}</TableCell>
            <TableCell className="max-w-md">{item.description}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell>{item.unit}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(item.reference_price || 0, language, currency)}
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAddToProject(item)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("materials:sinapi.addToProject")}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
